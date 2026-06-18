/**
 * QuantumBTC — Transaction Lab Canvas Area
 *
 * Interactive canvas rendering fixed infrastructure nodes, draggable wallet
 * tokens, an SVG connector layer for animated transaction paths, and floating
 * step message bubbles during simulation playback.
 *
 * All UI state is driven declaratively via React state and refs (Rule III).
 * Refs are used only for reading element dimensions via getBoundingClientRect().
 *
 * @see QL_Transaction_Lab_Spec.md §3.1 — CanvasArea
 */
'use client';
import React, { useRef, useCallback, useState, useEffect } from 'react';
import styles from './CanvasArea.module.css';
import Legend from './Legend';
import type { Wallet, SimulationStep } from './types';

// ---------------------------------------------------------------------------
// Infrastructure node definitions
// ---------------------------------------------------------------------------

interface InfraNode {
  id: string;
  label: string;
  icon: string;
  top: number;
  left: number;
  colorVar: string;
}

const INFRA_NODES: ReadonlyArray<InfraNode> = [
  { id: 'node-mempool',   label: 'Mempool',           icon: '📦', top: 8,  left: 12, colorVar: '--infra-mempool' },
  { id: 'node-blockchain', label: 'Blockchain',       icon: '⛓️', top: 8,  left: 55, colorVar: '--infra-blockchain' },
  { id: 'node-lsp',       label: 'LSP Node',          icon: '🔌', top: 40, left: 5,  colorVar: '--infra-lsp' },
  { id: 'node-ln',        label: 'Lightning Network', icon: '⚡', top: 40, left: 35, colorVar: '--infra-ln' },
  { id: 'node-mint',      label: 'Chaumian Mint',     icon: '🏛️', top: 40, left: 72, colorVar: '--infra-mint' },
  { id: 'node-swap',      label: 'Swap Provider',     icon: '🔄', top: 76, left: 12, colorVar: '--infra-swap' },
  { id: 'node-custodial', label: 'Custodial Servers', icon: '🏢', top: 76, left: 55, colorVar: '--infra-custodial' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CanvasAreaProps {
  /** All active wallets. */
  wallets: Wallet[];
  /** Currently selected wallet ID (for highlight). */
  selectedWalletId: number | null;
  /** Current simulation step (null when idle). */
  currentStep: SimulationStep | null;
  /** Current step index (-1 when idle). */
  stepIdx: number;
  /** Callback: select a wallet by clicking. */
  onSelectWallet: (id: number) => void;
  /** Callback: update wallet position after drag. */
  onUpdateWalletPosition: (walletId: number, x: number, y: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute effective category key for display badge. */
function getEffCatKey(
  category: number,
  subCategory: string | null,
): string {
  if (category === 2) return `2${subCategory ?? 'a'}`;
  return String(category);
}

/** Format large numbers compactly (e.g. 500k, 1.5M). */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Coordinate helpers for SVG connector paths
// ---------------------------------------------------------------------------

/** Center point of an element relative to a parent rect. */
interface Point {
  x: number;
  y: number;
}

function getCenterRelative(
  el: HTMLElement,
  parentRect: DOMRect,
): Point {
  const r = el.getBoundingClientRect();
  return {
    x: r.left - parentRect.left + r.width / 2,
    y: r.top - parentRect.top + r.height / 2,
  };
}

/**
 * Build a smooth SVG quadratic bezier path string between two points.
 * The control point is offset perpendicular to the midpoint for a subtle curve.
 */
function buildCurvePath(from: Point, to: Point): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // Perpendicular offset — creates a subtle arc
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(30, len * 0.15);
  // Perpendicular direction (rotate 90 degrees)
  const px = -dy / (len || 1);
  const py = dx / (len || 1);
  const cx = mx + px * offset;
  const cy = my + py * offset;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

// ---------------------------------------------------------------------------
// Drag state type
// ---------------------------------------------------------------------------

interface DragState {
  walletId: number;
  /** Pointer offset from the token center at drag start (in pixels). */
  offsetX: number;
  offsetY: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CanvasArea({
  wallets,
  selectedWalletId,
  currentStep,
  stepIdx,
  onSelectWallet,
  onUpdateWalletPosition,
}: CanvasAreaProps) {
  // -- Refs --
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const walletRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // -- Drag state --
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragState = useRef<DragState | null>(null);

  // -- SVG path coordinates (recomputed on render + resize) --
  const [svgPaths, setSvgPaths] = useState<{
    basePath: string;
    from: Point;
    to: Point;
  } | null>(null);

  // -- Message bubble position --
  const [bubblePos, setBubblePos] = useState<Point | null>(null);

  // -----------------------------------------------------------------------
  // Ref registration helpers
  // -----------------------------------------------------------------------

  const registerNodeRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) {
        nodeRefs.current.set(id, el);
      } else {
        nodeRefs.current.delete(id);
      }
    },
    [],
  );

  const registerWalletRef = useCallback(
    (id: number) => (el: HTMLDivElement | null) => {
      if (el) {
        walletRefs.current.set(id, el);
      } else {
        walletRefs.current.delete(id);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // SVG path & bubble position calculation
  // -----------------------------------------------------------------------

  const computeConnectorPaths = useCallback(() => {
    if (!canvasRef.current || !currentStep || stepIdx < 0) {
      setSvgPaths(null);
      setBubblePos(null);
      return;
    }

    const parentRect = canvasRef.current.getBoundingClientRect();

    // Resolve source element
    let sourceEl: HTMLElement | undefined;
    if (currentStep.sourceWalletId !== undefined) {
      sourceEl = walletRefs.current.get(currentStep.sourceWalletId);
    } else if (currentStep.sourceNodeId) {
      sourceEl = nodeRefs.current.get(currentStep.sourceNodeId);
    }

    // Resolve target element
    let targetEl: HTMLElement | undefined;
    if (currentStep.targetWalletId !== undefined) {
      targetEl = walletRefs.current.get(currentStep.targetWalletId);
    } else if (currentStep.targetNodeId) {
      targetEl = nodeRefs.current.get(currentStep.targetNodeId);
    }

    // Compute SVG path if both source and target exist
    if (sourceEl && targetEl) {
      const from = getCenterRelative(sourceEl, parentRect);
      const to = getCenterRelative(targetEl, parentRect);
      const basePath = buildCurvePath(from, to);
      setSvgPaths({ basePath, from, to });
    } else {
      setSvgPaths(null);
    }

    // Compute message bubble position
    if (currentStep.messageBubble) {
      const { targetId, targetType } = currentStep.messageBubble;
      let bubbleEl: HTMLElement | undefined;
      if (targetType === 'wallet') {
        bubbleEl = walletRefs.current.get(targetId as number);
      } else {
        bubbleEl = nodeRefs.current.get(targetId as string);
      }
      if (bubbleEl) {
        const center = getCenterRelative(bubbleEl, parentRect);
        setBubblePos(center);
      } else {
        setBubblePos(null);
      }
    } else {
      setBubblePos(null);
    }
  }, [currentStep, stepIdx]);

  // Recompute paths whenever step changes or wallets move (dragging)
  useEffect(() => {
    computeConnectorPaths();
  }, [computeConnectorPaths, wallets]);

  // Recompute on resize
  useEffect(() => {
    if (!canvasRef.current) return;

    const observer = new ResizeObserver(() => {
      computeConnectorPaths();
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [computeConnectorPaths]);

  // -----------------------------------------------------------------------
  // Pointer event handlers for dragging wallet tokens
  // -----------------------------------------------------------------------

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, walletId: number) => {
      e.preventDefault();
      e.stopPropagation();

      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - (rect.left + rect.width / 2);
      const offsetY = e.clientY - (rect.top + rect.height / 2);

      dragState.current = { walletId, offsetX, offsetY };
      setDraggingId(walletId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current || !canvasRef.current) return;

      const parentRect = canvasRef.current.getBoundingClientRect();
      const { offsetX, offsetY, walletId } = dragState.current;

      // Convert pointer position to percentage coordinates, accounting for offset
      const rawX = ((e.clientX - offsetX - parentRect.left) / parentRect.width) * 100;
      const rawY = ((e.clientY - offsetY - parentRect.top) / parentRect.height) * 100;

      // Clamp to canvas boundaries
      const x = Math.max(0, Math.min(100, rawX));
      const y = Math.max(0, Math.min(100, rawY));

      onUpdateWalletPosition(walletId, x, y);
    },
    [onUpdateWalletPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragState.current = null;
      setDraggingId(null);
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Determine highlighted entities from the active step
  // -----------------------------------------------------------------------

  const highlightSet = new Set<string>(currentStep?.highlightNodes ?? []);

  // -----------------------------------------------------------------------
  // SVG arrowhead marker ID (stable across renders)
  // -----------------------------------------------------------------------

  const markerId = 'arrowhead-marker';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      ref={canvasRef}
      className={styles.canvas}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Dot grid background */}
      <div className={styles.canvasGrid} aria-hidden="true" />

      {/* SVG Connector Layer */}
      <svg className={styles.svgLayer} aria-hidden="true">
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M 0 0 L 10 4 L 0 8 Z"
              fill="var(--primary)"
            />
          </marker>
        </defs>

        {svgPaths && (
          <>
            {/* Base path (subtle background) */}
            <path
              d={svgPaths.basePath}
              className={styles.connectorBase}
            />
            {/* Active animated path with arrowhead */}
            <path
              d={svgPaths.basePath}
              className={styles.connectorActive}
              markerEnd={`url(#${markerId})`}
            />
          </>
        )}
      </svg>

      {/* Infrastructure Nodes */}
      {INFRA_NODES.map((node) => {
        const isHighlighted = highlightSet.has(node.id);
        return (
          <div
            key={node.id}
            ref={registerNodeRef(node.id)}
            data-node-id={node.id}
            className={`${styles.infraNode} ${isHighlighted ? styles.infraNodeHighlighted : ''}`}
            style={{
              top: `${node.top}%`,
              left: `${node.left}%`,
              borderColor: isHighlighted ? `var(${node.colorVar})` : undefined,
              boxShadow: isHighlighted
                ? `0 0 18px color-mix(in srgb, var(${node.colorVar}) 40%, transparent)`
                : undefined,
            }}
          >
            <span className={styles.infraIcon}>{node.icon}</span>
            <span
              className={styles.infraLabel}
              style={{ color: isHighlighted ? `var(${node.colorVar})` : undefined }}
            >
              {node.label}
            </span>
          </div>
        );
      })}

      {/* Wallet Tokens */}
      {wallets.map((w) => {
        const ec = getEffCatKey(w.category, w.subCategory);
        const isSelected = w.id === selectedWalletId;
        const isDragging = w.id === draggingId;
        const isHighlightedWallet = highlightSet.has(`wallet-${w.id}`);

        const tokenClasses = [
          styles.walletToken,
          isSelected ? styles.walletTokenSelected : '',
          isDragging ? styles.walletTokenDragging : '',
          isHighlightedWallet ? styles.walletTokenHighlighted : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={w.id}
            ref={registerWalletRef(w.id)}
            data-wallet-id={w.id}
            className={tokenClasses}
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`,
              borderColor: `var(--cat-${w.category})`,
            }}
            onPointerDown={(e) => handlePointerDown(e, w.id)}
            onClick={() => {
              if (!isDragging) onSelectWallet(w.id);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectWallet(w.id);
              }
            }}
            aria-label={`${w.name} — ${w.balance.toLocaleString()} sats`}
          >
            <span
              className={styles.tokenBadge}
              style={{ color: `var(--cat-${w.category})` }}
            >
              {ec}
            </span>
            <span className={styles.tokenName}>{w.name}</span>
            <span className={styles.tokenBalance}>
              {w.balance.toLocaleString()} sats
            </span>
            {w.inboundLiquidity !== null && (
              <span
                className={styles.tokenInbound}
                style={w.inboundLiquidity <= 0 ? { color: 'var(--danger)' } : undefined}
              >
                ↓ {formatCompact(Math.max(0, w.inboundLiquidity))}
              </span>
            )}
          </div>
        );
      })}

      {/* Step Message Bubble */}
      {currentStep?.messageBubble && bubblePos && (
        <div
          className={`${styles.messageBubble} ${
            currentStep.messageBubble.type === 'warning'
              ? styles.messageBubbleWarning
              : styles.messageBubbleSuccess
          }`}
          style={{
            left: `${bubblePos.x}px`,
            top: `${bubblePos.y}px`,
          }}
        >
          {currentStep.messageBubble.text}
        </div>
      )}

      {/* Legend overlay */}
      <Legend />
    </div>
  );
}

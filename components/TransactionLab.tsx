/**
 * QuantumBTC — Transaction Lab Root Orchestrator
 *
 * Composes the Transaction Simulator dashboard from sub-components:
 * - Sidebar (controls, wallet CRUD, detail panel)
 * - Canvas placeholder (Phase 4 will replace with interactive SVG)
 * - PlaybackPanel (step navigation)
 * - Legend (category color key)
 *
 * @see QL_Transaction_Lab_Spec.md §3 — Component Architecture
 */
'use client';
import React from 'react';
import styles from './TransactionLab.module.css';
import { useTransactionLabState } from './TransactionLab/useTransactionLabState';
import Sidebar from './TransactionLab/Sidebar';
import PlaybackPanel from './TransactionLab/PlaybackPanel';
import Legend from './TransactionLab/Legend';
import type { EffectiveCategory } from './TransactionLab/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute effective category key for display. */
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
// Component
// ---------------------------------------------------------------------------

export default function TransactionLab() {
  const state = useTransactionLabState();
  const {
    wallets,
    selectedWalletId,
    activeCode,
    congestion,
    txSteps,
    stepIdx,
    addWallet,
    deleteWallet,
    selectWallet,
    setCongestion,
    generateCode,
    startTransaction,
    nextStep,
    prevStep,
    resetSimulation,
  } = state;

  const isSimulating = stepIdx >= 0;
  const currentStep = isSimulating ? txSteps[stepIdx] ?? null : null;

  return (
    <section className={styles.dashboard} aria-label="Transaction Lab">
      {/* Left sidebar */}
      <Sidebar
        wallets={wallets}
        selectedWalletId={selectedWalletId}
        activeCode={activeCode}
        congestion={congestion}
        isSimulating={isSimulating}
        onAddWallet={addWallet}
        onDeleteWallet={deleteWallet}
        onSelectWallet={selectWallet}
        onSetCongestion={setCongestion}
        onGenerateCode={generateCode}
        onStartTransaction={startTransaction}
        onResetSimulation={resetSimulation}
      />

      {/* Main area: canvas + playback */}
      <div className={styles.mainArea}>
        {/* Canvas placeholder — Phase 4 will replace with interactive SVG */}
        <div className={styles.canvasPlaceholder}>
          <div className={styles.canvasGrid} aria-hidden="true" />
          {wallets.map((w) => {
            const ec = getEffCatKey(w.category, w.subCategory);
            const isSelected = w.id === selectedWalletId;
            return (
              <div
                key={w.id}
                className={`${styles.walletToken} ${isSelected ? styles.walletTokenSelected : ''}`}
                style={{
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  borderColor: `var(--cat-${w.category})`,
                }}
                onClick={() => selectWallet(w.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectWallet(w.id);
                  }
                }}
                aria-label={`${w.name} — ${w.balance.toLocaleString()} sats`}
              >
                <span className={styles.tokenBadge} style={{ color: `var(--cat-${w.category})` }}>
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
          <Legend />
        </div>

        {/* Playback panel */}
        <PlaybackPanel
          stepText={currentStep?.text ?? null}
          stepTitle={currentStep?.title ?? null}
          canGoBack={isSimulating && stepIdx > 0}
          canGoNext={isSimulating}
          onPrev={prevStep}
          onNext={nextStep}
        />
      </div>
    </section>
  );
}

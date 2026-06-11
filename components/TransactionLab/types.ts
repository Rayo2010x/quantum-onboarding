/**
 * QuantumBTC — Transaction Lab Domain Types
 *
 * Strict TypeScript types for the Transaction Simulator module.
 * All wallet categories, payment code types, and simulation step
 * structures are defined here as the Single Source of Truth (SSOT).
 *
 * @see QL_Transaction_Lab_Spec.md §2 — Domain & State Models
 */

// ---------------------------------------------------------------------------
// Wallet Classification
// ---------------------------------------------------------------------------

/**
 * Technology category for a wallet.
 *
 * - `0` — L1 On-Chain (via Swap)
 * - `1` — Native Lightning (Auto-LSP)
 * - `2` — Own-Node Lightning (Advanced) — requires a subCategory
 * - `3` — Hybrid On-Chain/Swaps (Muun Style)
 * - `4` — Ecash / Chaumian Mint (Cashu Style)
 * - `5` — Pure Custodial (Centralized)
 */
export type WalletCategory = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Sub-category for category-2 wallets.
 *
 * - `'a'` — Remote Node (Sovereign Routing)
 * - `'b'` — Embedded Node (LSP-Assisted)
 * - `null` — Not applicable (all other categories)
 */
export type WalletSubCategory = 'a' | 'b' | null;

/**
 * Effective category string used for routing logic.
 * Combines category + subCategory for cat-2 wallets.
 */
export type EffectiveCategory = 0 | 1 | '2a' | '2b' | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Payment Codes
// ---------------------------------------------------------------------------

/**
 * Payment code types supported by the simulator.
 *
 * - `'L1'`    — Bitcoin address (bc1...) — static, sender defines amount
 * - `'LN'`    — BOLT11 Invoice — dynamic, receiver defines amount
 * - `'LNURL'` — Lightning Address — static, sender defines amount
 * - `'ECASH'` — NUT-18 Payment Request — static, sender defines amount
 */
export type PaymentCodeType = 'L1' | 'LN' | 'LNURL' | 'ECASH';

// ---------------------------------------------------------------------------
// Wallet Interface
// ---------------------------------------------------------------------------

/** Represents a user wallet on the Transaction Lab canvas. */
export interface Wallet {
  /** Unique identifier (auto-incremented). */
  id: number;

  /** Human-readable wallet name (e.g. "Alice (Phoenix)"). */
  name: string;

  /** Technology category of this wallet. */
  category: WalletCategory;

  /** Sub-category — only meaningful when `category === 2`. */
  subCategory: WalletSubCategory;

  /** Current spendable balance in satoshis. */
  balance: number;

  /**
   * Inbound Lightning liquidity in satoshis.
   * `null` for wallets without channel-based receiving (cat 0, 3, 4, 5).
   */
  inboundLiquidity: number | null;

  /** Horizontal position on the canvas (percentage 0-100). */
  x: number;

  /** Vertical position on the canvas (percentage 0-100). */
  y: number;
}

// ---------------------------------------------------------------------------
// Active Code (Receive Request)
// ---------------------------------------------------------------------------

/** Represents the current payment code broadcast to the network. */
export interface ActiveCode {
  /** Wallet ID of the entity that created/generated this code. */
  creatorId: number;

  /** The type of payment code generated. */
  type: PaymentCodeType;

  /**
   * Amount baked into the code.
   * `null` for static codes where the sender defines the amount.
   */
  amount: number | null;

  /** Which party defines the final transaction amount. */
  amountDefinedBy: 'sender' | 'receiver';
}

// ---------------------------------------------------------------------------
// Simulation Playback
// ---------------------------------------------------------------------------

/** Represents a single step in the transaction simulation playback. */
export interface SimulationStep {
  /** Short title for the step (e.g. "Broadcasting", "Splice-In"). */
  title: string;

  /**
   * Descriptive text for the playback panel.
   * May contain HTML highlight formatting (e.g. `<strong>`).
   */
  text: string;

  /**
   * ID of a fixed infrastructure node at the START of the arrow.
   * Values: 'node-mempool' | 'node-blockchain' | 'node-lsp' |
   *         'node-ln' | 'node-mint' | 'node-swap' | 'node-custodial'
   */
  sourceNodeId?: string;

  /** ID of a fixed infrastructure node at the END of the arrow. */
  targetNodeId?: string;

  /** ID of the sending wallet if it is at the START of the arrow. */
  sourceWalletId?: number;

  /** ID of the receiving wallet if it is at the END of the arrow. */
  targetWalletId?: number;

  /**
   * SVG path type descriptor indicating the active connection.
   * E.g. 'wallet-to-swap', 'swap-to-ln', 'wallet-to-mempool'.
   */
  activePath?: string;

  /** List of node or wallet IDs to visually highlight during this step. */
  highlightNodes?: string[];

  /** Optional message bubble to display near a node or wallet. */
  messageBubble?: {
    text: string;
    type: 'success' | 'warning';
    targetId: string | number;
    targetType: 'node' | 'wallet';
  };

  /**
   * Balance mutations to apply when the transaction completes.
   * Only present on the final settlement step.
   */
  balanceUpdates?: Array<{
    walletId: number;
    /** Change in spendable balance (negative = debit, positive = credit). */
    balanceDiff: number;
    /** Change in inbound liquidity (optional). */
    inboundDiff?: number;
  }>;
}

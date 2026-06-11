/**
 * QuantumBTC — Transaction Lab Legend
 *
 * Floating visual key showing wallet category colors (0–5).
 * Purely presentational — no props required.
 *
 * @see QL_Transaction_Lab_Spec.md §3.1
 */
import React from 'react';
import styles from './Legend.module.css';
import type { WalletCategory } from './types';

/** Category metadata for the legend key. */
const CATEGORIES: ReadonlyArray<{ cat: WalletCategory; label: string }> = [
  { cat: 0, label: 'L1 On-Chain (via Swap)' },
  { cat: 1, label: 'Native LN (Auto-LSP)' },
  { cat: 2, label: 'Own-Node LN' },
  { cat: 3, label: 'Hybrid Swaps' },
  { cat: 4, label: 'Ecash Mint' },
  { cat: 5, label: 'Custodial' },
];

export default function Legend() {
  return (
    <div className={styles.container} aria-label="Wallet category legend">
      <div className={styles.title}>Wallet Categories</div>
      {CATEGORIES.map(({ cat, label }) => (
        <div key={cat} className={styles.item}>
          <span
            className={styles.swatch}
            style={{ background: `var(--cat-${cat})` }}
            aria-hidden="true"
          />
          <span>{cat}. {label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * QuantumBTC — Transaction Lab Sidebar
 *
 * Controls panel for the Transaction Simulator:
 * - L1 Congestion toggle
 * - Wallet creation form (name, category, conditional node mode)
 * - Wallet list with category-colored borders
 * - Wallet detail panel (receive/send options, compatibility checks)
 *
 * All validation feedback is rendered inline — no `alert()` calls.
 *
 * @see QL_Transaction_Lab_Spec.md §3.1 — Sidebar
 */
'use client';
import React, { useState, useCallback } from 'react';
import styles from './Sidebar.module.css';
import type {
  Wallet,
  WalletCategory,
  WalletSubCategory,
  PaymentCodeType,
  ActiveCode,
  EffectiveCategory,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-readable labels for each effective category. */
const CAT_LABELS: Record<string, string> = {
  '0': 'L1 On-Chain (via Swap Service)',
  '1': 'Native Lightning (Auto-LSP)',
  '2a': 'Own-Node LN (Sovereign)',
  '2b': 'Own-Node LN (LSP-Assisted)',
  '3': 'Hybrid Swaps (Muun Style)',
  '4': 'Ecash / Chaumian Mint',
  '5': 'Pure Custodial',
};

/** Category options for the creation dropdown. */
const CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '0', label: '0 — L1 Bitcoin (Pure On-Chain)' },
  { value: '1', label: '1 — Native Lightning (Auto-LSP)' },
  { value: '2', label: '2 — Own-Node Lightning (Advanced)' },
  { value: '3', label: '3 — Hybrid On-Chain/Swaps (Muun Style)' },
  { value: '4', label: '4 — Ecash / Chaumian Mint (Cashu Style)' },
  { value: '5', label: '5 — Pure Custodial (Centralized)' },
];

/** Sub-category options for category 2. */
const SUB_CATEGORY_OPTIONS: ReadonlyArray<{ value: WalletSubCategory; label: string }> = [
  { value: 'a', label: '2a — Remote Node (Sovereign Routing)' },
  { value: 'b', label: '2b — Embedded Node (LSP-Assisted)' },
];

/** CSS module class name for each category border color. */
const CAT_CLASS: Record<WalletCategory, string> = {
  0: styles.cat0,
  1: styles.cat1,
  2: styles.cat2,
  3: styles.cat3,
  4: styles.cat4,
  5: styles.cat5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffCat(w: Wallet): EffectiveCategory {
  if (w.category === 2) return `2${w.subCategory ?? 'a'}` as '2a' | '2b';
  return w.category as Exclude<EffectiveCategory, '2a' | '2b'>;
}

function getEffCatKey(w: Wallet): string {
  return String(getEffCat(w));
}

/**
 * Validates a numeric input string.
 * Returns the parsed number on success, or an error message string on failure.
 */
function validateAmount(value: string): number | string {
  const trimmed = value.trim();
  if (trimmed === '') return 'Please enter an amount.';
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return 'Please enter a valid number.';
  if (num <= 0) return 'Amount must be greater than zero.';
  if (!Number.isInteger(num)) return 'Amount must be a whole number (satoshis).';
  if (num > 21_000_000_00_000_000) return 'Amount exceeds the Bitcoin supply cap.';
  return num;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  wallets: Wallet[];
  selectedWalletId: number | null;
  activeCode: ActiveCode | null;
  congestion: boolean;
  /** True when a simulation is actively playing (stepIdx >= 0). */
  isSimulating: boolean;
  onAddWallet: (name: string, cat: WalletCategory, sub: WalletSubCategory) => void;
  onDeleteWallet: (id: number) => void;
  onSelectWallet: (id: number) => void;
  onSetCongestion: (value: boolean) => void;
  onGenerateCode: (walletId: number, type: PaymentCodeType, amount: number | null) => void;
  onStartTransaction: (payerId: number, amountOverride?: number) => string | null;
  onResetSimulation: () => void;
}

// ---------------------------------------------------------------------------
// Compatibility check (mirrored from hook for UI display)
// ---------------------------------------------------------------------------

interface CompatResult {
  ok: boolean;
  reason?: string;
  note?: string;
}

function isPaymentCompatible(
  payerEffCat: EffectiveCategory,
  codeType: PaymentCodeType,
): CompatResult {
  if (codeType === 'ECASH') {
    if (payerEffCat === 4)
      return { ok: true, note: 'Same-Mint token transfer — instant, no fees.' };
    return {
      ok: false,
      reason: 'Only Ecash wallets on the same Mint can pay Ecash tokens.',
    };
  }
  if (codeType === 'L1') {
    if (payerEffCat === 0 || payerEffCat === 3) return { ok: true };
    if (payerEffCat === 4)
      return { ok: true, note: 'Requires Melt → LN → Submarine Swap → On-Chain.' };
    if (payerEffCat === 5)
      return { ok: true, note: 'Company handles the on-chain withdrawal.' };
    return { ok: true, note: 'Requires Submarine Swap (LN → On-Chain).' };
  }
  // LN or LNURL
  if (payerEffCat === 0)
    return { ok: true, note: 'Requires Submarine Swap (On-Chain → LN).' };
  if (payerEffCat === 3)
    return {
      ok: true,
      note: 'Co-signed with Muun servers (2-of-2). Full Submarine Swap only if L1 is congested.',
    };
  if (payerEffCat === 4)
    return { ok: true, note: 'Ecash tokens will be melted at the Mint.' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Receive option button with code type tag and hint. */
function ReceiveButton({
  label,
  codeType,
  tagType,
  hint,
  onClick,
}: {
  label: string;
  codeType: PaymentCodeType;
  tagType: 'Dynamic' | 'Static';
  hint: string;
  onClick: () => void;
}) {
  return (
    <div className={styles.receiveRow}>
      <button
        className={styles.btnSecondary}
        onClick={onClick}
        type="button"
        data-code-type={codeType}
      >
        {label}
        <span
          className={`${styles.codeTypeTag} ${
            tagType === 'Dynamic' ? styles.tagDynamic : styles.tagStatic
          }`}
        >
          {tagType}
        </span>
      </button>
      <span className={styles.receiveHint}>{hint}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Sidebar({
  wallets,
  selectedWalletId,
  activeCode,
  congestion,
  isSimulating,
  onAddWallet,
  onDeleteWallet,
  onSelectWallet,
  onSetCongestion,
  onGenerateCode,
  onStartTransaction,
  onResetSimulation,
}: SidebarProps) {
  // ── Wallet creation form state ──
  const [walletName, setWalletName] = useState('');
  const [walletCat, setWalletCat] = useState<string>('1');
  const [walletSub, setWalletSub] = useState<WalletSubCategory>('a');

  // ── Amount input state (for LN invoices and sending) ──
  const [invoiceAmount, setInvoiceAmount] = useState('2000');
  const [sendAmount, setSendAmount] = useState('2000');

  // ── Inline error state ──
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── Handlers ──

  const handleAddWallet = useCallback(() => {
    const cat = parseInt(walletCat, 10) as WalletCategory;
    const sub: WalletSubCategory = cat === 2 ? walletSub : null;
    onAddWallet(walletName, cat, sub);
    setWalletName('');
  }, [walletName, walletCat, walletSub, onAddWallet]);

  const handleGenerateInvoice = useCallback(
    (walletId: number) => {
      const result = validateAmount(invoiceAmount);
      if (typeof result === 'string') {
        setInvoiceError(result);
        return;
      }
      setInvoiceError(null);
      onGenerateCode(walletId, 'LN', result);
    },
    [invoiceAmount, onGenerateCode],
  );

  const handleScanAndPay = useCallback(
    (payerId: number) => {
      if (activeCode?.amountDefinedBy === 'sender') {
        const result = validateAmount(sendAmount);
        if (typeof result === 'string') {
          setSendError(result);
          return;
        }
        setSendError(null);
        const err = onStartTransaction(payerId, result);
        if (err) setSendError(err);
      } else {
        setSendError(null);
        const err = onStartTransaction(payerId);
        if (err) setSendError(err);
      }
    },
    [activeCode, sendAmount, onStartTransaction],
  );

  // ── Derived state ──

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) ?? null;

  // ── Render helpers ──

  function renderReceiveOptions(wallet: Wallet) {
    const ec = getEffCat(wallet);

    return (
      <>
        <div className={styles.sectionLabel}>── Receive ──</div>

        {/* L1 Address — Cat 0, Cat 3 */}
        {(ec === 0 || ec === 3) && (
          <ReceiveButton
            label="📦 Bitcoin Address (bc1...)"
            codeType="L1"
            tagType="Static"
            hint="Destination only — sender defines the amount"
            onClick={() => onGenerateCode(wallet.id, 'L1', null)}
          />
        )}

        {/* LN Invoice — All except Cat 0 */}
        {ec !== 0 && (
          <>
            <label className={styles.amountLabel}>Invoice Amount (sats):</label>
            <input
              type="number"
              className={`${styles.input} ${invoiceError ? styles.inputError : ''}`}
              value={invoiceAmount}
              onChange={(e) => {
                setInvoiceAmount(e.target.value);
                setInvoiceError(null);
              }}
              min="1"
              aria-label="Invoice amount in satoshis"
            />
            {invoiceError && (
              <div className={styles.inlineError} role="alert">
                {invoiceError}
              </div>
            )}
            <ReceiveButton
              label={`⚡ Lightning Invoice${ec === 3 ? ' (via Swap)' : ec === 4 ? ' (via Mint)' : ''}`}
              codeType="LN"
              tagType="Dynamic"
              hint="Single-use BOLT11 invoice — amount baked in"
              onClick={() => handleGenerateInvoice(wallet.id)}
            />
          </>
        )}

        {/* LNURL — Cat 1, 2b, 4, 5 */}
        {(ec === 1 || ec === '2b' || ec === 4 || ec === 5) && (
          <ReceiveButton
            label={`📧 Lightning Address${ec === 4 ? ' (via Mint)' : ''}`}
            codeType="LNURL"
            tagType="Static"
            hint="Reusable LNURL-pay endpoint — sender defines the amount"
            onClick={() => onGenerateCode(wallet.id, 'LNURL', null)}
          />
        )}

        {/* Ecash — Cat 4 only */}
        {ec === 4 && (
          <ReceiveButton
            label="🪙 Ecash Payment Request (Same Mint)"
            codeType="ECASH"
            tagType="Static"
            hint="NUT-18 request — sender defines amount, same-mint transfer"
            onClick={() => onGenerateCode(wallet.id, 'ECASH', null)}
          />
        )}
      </>
    );
  }

  function renderSendOptions(wallet: Wallet) {
    if (!activeCode) return null;
    const ec = getEffCat(wallet);
    const creator = wallets.find((w) => w.id === activeCode.creatorId);

    // Compatibility check
    const compat = isPaymentCompatible(ec, activeCode.type);

    return (
      <>
        <div className={styles.sectionLabel}>── Send ──</div>

        {/* Code info */}
        <div className={styles.detailInfo}>
          Active code: <strong>[{activeCode.type}]</strong>
          {activeCode.amountDefinedBy === 'receiver'
            ? ` ${(activeCode.amount ?? 0).toLocaleString()} sats`
            : ' — You define the amount'}
          <br />
          Destination: {creator?.name ?? 'Unknown'}
        </div>

        {/* Incompatible */}
        {!compat.ok && (
          <div className={styles.detailInfoDanger}>{compat.reason}</div>
        )}

        {/* Compatible — show notes + pay */}
        {compat.ok && (
          <>
            {compat.note && (
              <div className={styles.detailInfoWarning}>{compat.note}</div>
            )}

            {/* Sender-defined amount input */}
            {activeCode.amountDefinedBy === 'sender' && (
              <>
                <label className={styles.amountLabel}>Amount to send (sats):</label>
                <input
                  type="number"
                  className={`${styles.input} ${sendError ? styles.inputError : ''}`}
                  value={sendAmount}
                  onChange={(e) => {
                    setSendAmount(e.target.value);
                    setSendError(null);
                  }}
                  min="1"
                  aria-label="Amount to send in satoshis"
                />
                <div className={styles.balanceHint}>
                  Available balance: {wallet.balance.toLocaleString()} sats
                </div>
              </>
            )}

            {sendError && (
              <div className={styles.inlineError} role="alert">
                {sendError}
              </div>
            )}

            <button
              className={styles.btnPrimary}
              onClick={() => handleScanAndPay(wallet.id)}
              type="button"
            >
              ⚡ Scan &amp; Pay
            </button>
          </>
        )}
      </>
    );
  }

  function renderDetailPanel() {
    if (!selectedWallet || isSimulating) {
      return (
        <p className={styles.placeholder}>
          {isSimulating
            ? 'Simulation in progress — use the playback controls below.'
            : 'Click a wallet to view its details'}
        </p>
      );
    }

    const ec = getEffCat(selectedWallet);
    const ecKey = getEffCatKey(selectedWallet);

    return (
      <div className={styles.detailCard}>
        {/* Wallet info */}
        <h3 className={styles.detailHeading}>{selectedWallet.name}</h3>
        <div className={styles.detailInfo}>
          Cat {ecKey}: {CAT_LABELS[ecKey]}
        </div>
        <div className={styles.detailInfo}>
          Balance: <strong>{selectedWallet.balance.toLocaleString()}</strong> sats
        </div>

        {/* Inbound liquidity */}
        {selectedWallet.inboundLiquidity !== null && (
          <div
            className={
              selectedWallet.inboundLiquidity > 0
                ? styles.detailInfoAccent
                : styles.detailInfoDanger
            }
          >
            ⚡ Inbound Liquidity:{' '}
            {selectedWallet.inboundLiquidity.toLocaleString()} sats
          </div>
        )}

        {/* Active code from ANOTHER wallet → Send options */}
        {activeCode && activeCode.creatorId !== selectedWallet.id && (
          renderSendOptions(selectedWallet)
        )}

        {/* Active code from THIS wallet → Cancel */}
        {activeCode && activeCode.creatorId === selectedWallet.id && (
          <>
            <div className={styles.detailInfoSuccess}>
              Your [{activeCode.type}] code is active. Waiting for a sender to scan
              it.
            </div>
            <button
              className={styles.btnSecondary}
              onClick={() => onResetSimulation()}
              type="button"
            >
              ✕ Cancel Code
            </button>
          </>
        )}

        {/* No active code → Receive options */}
        {!activeCode && renderReceiveOptions(selectedWallet)}
      </div>
    );
  }

  // ── Main render ──

  return (
    <aside className={styles.sidebar} aria-label="Transaction Lab controls">
      {/* Congestion toggle */}
      <div className={styles.controlGroup}>
        <div className={styles.toggleContainer}>
          <span className={styles.toggleLabel}>L1 Congested</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={congestion}
              onChange={(e) => onSetCongestion(e.target.checked)}
              aria-label="Toggle L1 congestion"
            />
            <span className={styles.slider} />
          </label>
        </div>
        <p className={styles.toggleHint}>
          Raises L1 mining fees from ~1k to ~15k sats. Affects Submarine Swap
          costs.
        </p>
      </div>

      {/* Create Wallet */}
      <h2 className={styles.sectionHeading}>Create Wallet</h2>
      <div className={styles.controlGroup}>
        <label className={styles.controlLabel} htmlFor="txlab-wallet-name">
          Wallet Name
        </label>
        <input
          id="txlab-wallet-name"
          type="text"
          className={styles.input}
          placeholder="e.g. Alice's Phone"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
        />
      </div>
      <div className={styles.controlGroup}>
        <label className={styles.controlLabel} htmlFor="txlab-wallet-cat">
          Technology Category
        </label>
        <select
          id="txlab-wallet-cat"
          className={styles.select}
          value={walletCat}
          onChange={(e) => setWalletCat(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Conditional Node Mode dropdown */}
      {walletCat === '2' && (
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel} htmlFor="txlab-wallet-sub">
            Node Mode
          </label>
          <select
            id="txlab-wallet-sub"
            className={styles.select}
            value={walletSub ?? 'a'}
            onChange={(e) => setWalletSub(e.target.value as WalletSubCategory)}
          >
            {SUB_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value!}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        className={styles.btnPrimary}
        onClick={handleAddWallet}
        type="button"
      >
        Add to Board
      </button>



      {/* Detail panel */}
      <div className={styles.detailPanel}>{renderDetailPanel()}</div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerText}>
          QuantumBTC — In Satoshi We Trust. In Code We Verify.
        </span>
      </div>
    </aside>
  );
}

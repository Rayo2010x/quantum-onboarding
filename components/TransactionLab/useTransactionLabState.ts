/**
 * QuantumBTC — Transaction Lab State Hook
 *
 * Pure business-logic hook that manages all simulator state declaratively.
 * No DOM manipulation — React state is the SSOT.
 *
 * @see QL_Transaction_Lab_Spec.md §3.1 — useTransactionLabState
 * @see QL_Transaction_Lab_Spec.md §4   — Transaction Engine Flow Formulas
 */
import { useState, useCallback } from 'react';
import type {
  Wallet,
  WalletCategory,
  WalletSubCategory,
  PaymentCodeType,
  ActiveCode,
  SimulationStep,
  EffectiveCategory,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the effective category key for routing logic. */
function getEffCat(w: Wallet): EffectiveCategory {
  if (w.category === 2) return `2${w.subCategory ?? 'a'}` as '2a' | '2b';
  return w.category as Exclude<EffectiveCategory, '2a' | '2b'>;
}

/** Default inbound liquidity for a wallet based on its category. */
function getDefaultInbound(
  category: WalletCategory,
  subCat: WalletSubCategory,
): number | null {
  if (category === 1) return 500_000;
  if (category === 2 && subCat === 'b') return 500_000;
  if (category === 2 && subCat === 'a') return 2_000_000;
  return null;
}

// ---------------------------------------------------------------------------
// Initial Wallet Set
// ---------------------------------------------------------------------------

let nextId = 0;

function createInitialWallets(): Wallet[] {
  return [
    {
      id: nextId++,
      name: 'Alice (Phoenix)',
      category: 1,
      subCategory: null,
      balance: 100_000,
      inboundLiquidity: 500_000,
      x: 8,
      y: 56,
    },
    {
      id: nextId++,
      name: 'Bob (Muun)',
      category: 3,
      subCategory: null,
      balance: 100_000,
      inboundLiquidity: null,
      x: 15,
      y: 60,
    },
    {
      id: nextId++,
      name: 'Charlie (Cashu)',
      category: 4,
      subCategory: null,
      balance: 100_000,
      inboundLiquidity: null,
      x: 74,
      y: 58,
    },
    {
      id: nextId++,
      name: 'Treasury (Cold)',
      category: 0,
      subCategory: null,
      balance: 100_000,
      inboundLiquidity: null,
      x: 58,
      y: 22,
    },
  ];
}

// ---------------------------------------------------------------------------
// Fee Calculation
// ---------------------------------------------------------------------------

interface FeeBreakdown {
  mining: number;
  routing: number;
  swap: number;
  mint: number;
  total: number;
}

function calcFees(
  pCat: EffectiveCategory,
  _rCat: EffectiveCategory,
  codeType: 'L1' | 'LN',
  amount: number,
  congested: boolean,
): FeeBreakdown {
  let mining = 0;
  let routing = 0;
  let swap = 0;
  let mint = 0;

  const needsOnChain =
    codeType === 'L1' ||
    (pCat === 0 && codeType === 'LN') ||
    (pCat === 3 && codeType === 'LN' && congested);

  if (needsOnChain) mining = congested ? 15_000 : 1_000;

  if (codeType === 'LN') {
    if (pCat === 0) {
      swap = Math.max(50, Math.floor(amount * 0.005));
      routing = 2;
    } else if (pCat === 1 || pCat === '2b') {
      routing = 8;
    } else if (pCat === '2a') {
      routing = 4;
    } else if (pCat === 3) {
      swap = congested ? Math.max(50, Math.floor(amount * 0.003)) : 0;
      routing = congested ? 0 : 2;
    } else if (pCat === 4) {
      mint = 2;
      routing = 3;
    } else if (pCat === 5) {
      routing = 1;
    }
  }

  // LN-to-On-Chain swap fees when paying an L1 address from a non-L1 wallet
  if (codeType === 'L1' && pCat !== 0 && pCat !== 3 && pCat !== 5) {
    swap = Math.max(50, Math.floor(amount * 0.004));
    routing = 5;
  }

  return { mining, routing, swap, mint, total: mining + routing + swap + mint };
}

// ---------------------------------------------------------------------------
// Compatibility Check
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
    if (payerEffCat === 4) return { ok: true, note: 'Same-Mint token transfer — instant, no fees.' };
    return { ok: false, reason: 'Only Ecash wallets on the same Mint can pay Ecash tokens.' };
  }
  if (codeType === 'L1') {
    if (payerEffCat === 0 || payerEffCat === 3) return { ok: true };
    if (payerEffCat === 4) return { ok: true, note: 'Requires Melt → LN → Submarine Swap → On-Chain.' };
    if (payerEffCat === 5) return { ok: true, note: 'Company handles the on-chain withdrawal.' };
    return { ok: true, note: 'Requires Submarine Swap (LN → On-Chain).' };
  }
  // LN or LNURL
  if (payerEffCat === 0) return { ok: true, note: 'Requires Submarine Swap (On-Chain → LN).' };
  if (payerEffCat === 3) return { ok: true, note: 'Co-signed with Muun servers (2-of-2). Full Submarine Swap only if L1 is congested.' };
  if (payerEffCat === 4) return { ok: true, note: 'Ecash tokens will be melted at the Mint.' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Step Generation — Departure (sender → network)
// ---------------------------------------------------------------------------

function buildDepartureSteps(
  payer: Wallet,
  _receiver: Wallet,
  codeType: 'L1' | 'LN',
  congested: boolean,
): SimulationStep[] {
  const pCat = getEffCat(payer);
  const steps: SimulationStep[] = [];

  if (codeType === 'L1') {
    switch (pCat) {
      case 0:
      case 3:
        steps.push({
          title: 'Broadcasting',
          text: 'Your wallet signs and broadcasts the transaction to the Bitcoin P2P network. It enters the Mempool waiting for miners.',
          sourceWalletId: payer.id,
          targetNodeId: 'node-mempool',
          activePath: 'wallet-to-mempool',
          highlightNodes: [`wallet-${payer.id}`, 'node-mempool'],
          messageBubble: { text: '📡 Broadcasting', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        if (congested) {
          steps.push({
            title: 'Congestion Warning',
            text: '⚠️ High congestion! The Mempool is saturated. Your transaction competes for block space based on fee priority.',
            sourceWalletId: payer.id,
            targetNodeId: 'node-mempool',
            activePath: 'wallet-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
        }
        steps.push({
          title: 'Mining',
          text: 'The Mempool releases the transaction to the miners, who confirm it on the Blockchain.',
          sourceNodeId: 'node-mempool',
          targetNodeId: 'node-blockchain',
          activePath: 'mempool-to-blockchain',
          highlightNodes: ['node-mempool', 'node-blockchain'],
          messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
        });
        break;

      case 1:
      case '2b':
        steps.push({
          title: 'Swap Init',
          text: 'Your wallet initiates a Submarine Swap. The payment is sent to your LSP to begin the Lightning-to-On-Chain conversion.',
          sourceWalletId: payer.id,
          targetNodeId: 'node-lsp',
          activePath: 'wallet-to-lsp',
          highlightNodes: [`wallet-${payer.id}`, 'node-lsp'],
          messageBubble: { text: '⚡ Swap Init', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'Routing',
          text: 'The LSP routes the Lightning payment through the network toward the Swap Provider. *(Tech Note: If a transaction is very large, modern Lightning wallets automatically split the payment into smaller parts using Multi-Path Payments - MPP, routing them through different paths simultaneously to bypass channel capacity limits).*',
          sourceNodeId: 'node-lsp',
          targetNodeId: 'node-ln',
          activePath: 'lsp-to-ln',
          highlightNodes: ['node-lsp', 'node-ln'],
          messageBubble: { text: '🔀 Routing', type: 'success', targetId: 'node-lsp', targetType: 'node' },
        });
        steps.push({
          title: 'Swap Conversion',
          text: 'The Lightning Network delivers the payment to the Swap Provider, which prepares the on-chain Bitcoin transaction.',
          sourceNodeId: 'node-ln',
          targetNodeId: 'node-swap',
          activePath: 'ln-to-swap',
          highlightNodes: ['node-ln', 'node-swap'],
          messageBubble: { text: '🔄 Swap', type: 'success', targetId: 'node-ln', targetType: 'node' },
        });
        steps.push({
          title: 'On-Chain Broadcast',
          text: 'The Swap Provider broadcasts the on-chain transaction to the Bitcoin Mempool.',
          sourceNodeId: 'node-swap',
          targetNodeId: 'node-mempool',
          activePath: 'swap-to-mempool',
          highlightNodes: ['node-swap', 'node-mempool'],
          messageBubble: { text: '📡 On-Chain', type: 'success', targetId: 'node-swap', targetType: 'node' },
        });
        if (congested) {
          steps.push({
            title: 'Congestion Warning',
            text: '⚠️ High congestion! Transaction waiting in Mempool for block inclusion.',
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-mempool',
            activePath: 'swap-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
        }
        steps.push({
          title: 'Mining',
          text: 'The Mempool releases the transaction to the miners, who confirm it on the Blockchain.',
          sourceNodeId: 'node-mempool',
          targetNodeId: 'node-blockchain',
          activePath: 'mempool-to-blockchain',
          highlightNodes: ['node-mempool', 'node-blockchain'],
          messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
        });
        break;

      case '2a':
        steps.push({
          title: 'Sovereign Swap',
          text: 'Your sovereign node initiates a Submarine Swap payment directly through the Lightning Network. No LSP intermediary.',
          sourceWalletId: payer.id,
          targetNodeId: 'node-ln',
          activePath: 'wallet-to-ln',
          highlightNodes: [`wallet-${payer.id}`, 'node-ln'],
          messageBubble: { text: '⚡ Sovereign Swap', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'Swap Conversion',
          text: 'The Lightning Network delivers the payment to the Swap Provider for on-chain conversion.',
          sourceNodeId: 'node-ln',
          targetNodeId: 'node-swap',
          activePath: 'ln-to-swap',
          highlightNodes: ['node-ln', 'node-swap'],
          messageBubble: { text: '🔄 Swap', type: 'success', targetId: 'node-ln', targetType: 'node' },
        });
        steps.push({
          title: 'On-Chain Broadcast',
          text: 'The Swap Provider broadcasts the on-chain transaction to the Mempool.',
          sourceNodeId: 'node-swap',
          targetNodeId: 'node-mempool',
          activePath: 'swap-to-mempool',
          highlightNodes: ['node-swap', 'node-mempool'],
          messageBubble: { text: '📡 On-Chain', type: 'success', targetId: 'node-swap', targetType: 'node' },
        });
        if (congested) {
          steps.push({
            title: 'Congestion Warning',
            text: '⚠️ High congestion! Transaction waiting for block inclusion.',
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-mempool',
            activePath: 'swap-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
        }
        steps.push({
          title: 'Mining',
          text: 'The Mempool releases the transaction to the miners, who confirm it on the Blockchain.',
          sourceNodeId: 'node-mempool',
          targetNodeId: 'node-blockchain',
          activePath: 'mempool-to-blockchain',
          highlightNodes: ['node-mempool', 'node-blockchain'],
          messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
        });
        break;

      case 4:
        steps.push({
          title: 'Melting Tokens',
          text: 'Your wallet submits Ecash tokens to the Chaumian Mint. The Mint verifies the signatures and burns the tokens.',
          sourceWalletId: payer.id,
          targetNodeId: 'node-mint',
          activePath: 'wallet-to-mint',
          highlightNodes: [`wallet-${payer.id}`, 'node-mint'],
          messageBubble: { text: '🪙 Melting', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'Mint LN Payment',
          text: "The Mint's built-in Lightning node pays the Swap Provider through the Lightning Network.",
          sourceNodeId: 'node-mint',
          targetNodeId: 'node-ln',
          activePath: 'mint-to-ln',
          highlightNodes: ['node-mint', 'node-ln'],
          messageBubble: { text: '⚡ Mint LN', type: 'success', targetId: 'node-mint', targetType: 'node' },
        });
        steps.push({
          title: 'Swap Conversion',
          text: 'The Lightning Network delivers the payment to the Swap Provider, which constructs the on-chain transaction.',
          sourceNodeId: 'node-ln',
          targetNodeId: 'node-swap',
          activePath: 'ln-to-swap',
          highlightNodes: ['node-ln', 'node-swap'],
          messageBubble: { text: '🔄 Swap', type: 'success', targetId: 'node-ln', targetType: 'node' },
        });
        steps.push({
          title: 'On-Chain Broadcast',
          text: 'The Swap Provider broadcasts to the Bitcoin Mempool.',
          sourceNodeId: 'node-swap',
          targetNodeId: 'node-mempool',
          activePath: 'swap-to-mempool',
          highlightNodes: ['node-swap', 'node-mempool'],
          messageBubble: { text: '📡 On-Chain', type: 'success', targetId: 'node-swap', targetType: 'node' },
        });
        if (congested) {
          steps.push({
            title: 'Congestion Warning',
            text: '⚠️ High congestion! Waiting for block space.',
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-mempool',
            activePath: 'swap-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
        }
        steps.push({
          title: 'Mining',
          text: 'The Mempool releases the transaction to the miners, who confirm it on the Blockchain.',
          sourceNodeId: 'node-mempool',
          targetNodeId: 'node-blockchain',
          activePath: 'mempool-to-blockchain',
          highlightNodes: ['node-mempool', 'node-blockchain'],
          messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
        });
        break;

      case 5:
        steps.push({
          title: 'Custodial Debit',
          text: "Your app sends the withdrawal request to the company's backend. Your internal database balance is debited.",
          sourceWalletId: payer.id,
          targetNodeId: 'node-custodial',
          activePath: 'wallet-to-custodial',
          highlightNodes: [`wallet-${payer.id}`, 'node-custodial'],
          messageBubble: { text: '🏢 Debit', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'On-Chain Broadcast',
          text: 'The company constructs and broadcasts an on-chain Bitcoin transaction to the destination address.',
          sourceNodeId: 'node-custodial',
          targetNodeId: 'node-mempool',
          activePath: 'custodial-to-mempool',
          highlightNodes: ['node-custodial', 'node-mempool'],
          messageBubble: { text: '📡 On-Chain', type: 'success', targetId: 'node-custodial', targetType: 'node' },
        });
        if (congested) {
          steps.push({
            title: 'Congestion Warning',
            text: '⚠️ High congestion! Transaction waiting in Mempool.',
            sourceNodeId: 'node-custodial',
            targetNodeId: 'node-mempool',
            activePath: 'custodial-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
        }
        steps.push({
          title: 'Mining',
          text: 'The Mempool releases the transaction to the miners, who confirm it on the Blockchain.',
          sourceNodeId: 'node-mempool',
          targetNodeId: 'node-blockchain',
          activePath: 'mempool-to-blockchain',
          highlightNodes: ['node-mempool', 'node-blockchain'],
          messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
        });
        break;
    }
  } else {
    // ===== PAYING A LN INVOICE =====
    switch (pCat) {
      case 0:
        steps.push({
          title: 'HTLC Broadcast',
          text: 'Your wallet constructs an on-chain Hash Time-Locked Contract (HTLC) and broadcasts it to the Bitcoin Mempool.',
          sourceWalletId: payer.id,
          targetNodeId: 'node-mempool',
          activePath: 'wallet-to-mempool',
          highlightNodes: [`wallet-${payer.id}`, 'node-mempool'],
          messageBubble: { text: '🔒 HTLC', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        if (congested) {
          steps.push({
            title: 'Congestion Warning',
            text: '⚠️ High congestion! The HTLC transaction waits in the Mempool for miners.',
            sourceWalletId: payer.id,
            targetNodeId: 'node-mempool',
            activePath: 'wallet-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
        }
        steps.push({
          title: 'HTLC Locked',
          text: 'The Mempool releases the HTLC transaction to the miners, locking the funds into the Blockchain ledger.',
          sourceNodeId: 'node-mempool',
          targetNodeId: 'node-blockchain',
          activePath: 'mempool-to-blockchain',
          highlightNodes: ['node-mempool', 'node-blockchain'],
          messageBubble: { text: '⛏️ HTLC Locked', type: 'success', targetId: 'node-mempool', targetType: 'node' },
        });
        steps.push({
          title: 'Swap Detection',
          text: 'The Blockchain broadcasts the confirmed HTLC output, making the transaction visible to the Swap Provider.',
          sourceNodeId: 'node-blockchain',
          targetNodeId: 'node-swap',
          activePath: 'blockchain-to-swap',
          highlightNodes: ['node-blockchain', 'node-swap'],
          messageBubble: { text: '⛓️ Broadcast', type: 'success', targetId: 'node-blockchain', targetType: 'node' },
        });
        steps.push({
          title: 'LN Payment',
          text: 'The Swap Provider pays the Lightning invoice through the network, revealing the preimage to claim the on-chain HTLC.',
          sourceNodeId: 'node-swap',
          targetNodeId: 'node-ln',
          activePath: 'swap-to-ln',
          highlightNodes: ['node-swap', 'node-ln'],
          messageBubble: { text: '⚡ LN Payment', type: 'success', targetId: 'node-swap', targetType: 'node' },
        });
        break;

      case 1:
      case '2b':
        steps.push({
          title: 'Trampoline Payment',
          text: 'Your wallet constructs a trampoline payment and sends it to your LSP. The LSP computes the optimal route through the Lightning Network.',
          sourceWalletId: payer.id,
          targetNodeId: 'node-lsp',
          activePath: 'wallet-to-lsp',
          highlightNodes: [`wallet-${payer.id}`, 'node-lsp'],
          messageBubble: { text: '⚡ Trampoline', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'Routing',
          text: 'The LSP forwards the HTLC payment through the Lightning Network toward the destination. *(Tech Note: If a transaction is very large, modern Lightning wallets automatically split the payment into smaller parts using Multi-Path Payments - MPP, routing them through different paths simultaneously to bypass channel capacity limits).*',
          sourceNodeId: 'node-lsp',
          targetNodeId: 'node-ln',
          activePath: 'lsp-to-ln',
          highlightNodes: ['node-lsp', 'node-ln'],
          messageBubble: { text: '🔀 Routing', type: 'success', targetId: 'node-lsp', targetType: 'node' },
        });
        break;

      case '2a':
        steps.push({
          title: 'Sovereign Routing',
          text: 'Your sovereign node performs source-based pathfinding using its local network graph and sends the payment directly into the Lightning Network. No LSP intermediary. *(Tech Note: If a transaction is very large, modern Lightning wallets automatically split the payment into smaller parts using Multi-Path Payments - MPP, routing them through different paths simultaneously to bypass channel capacity limits).*',
          sourceWalletId: payer.id,
          targetNodeId: 'node-ln',
          activePath: 'wallet-to-ln',
          highlightNodes: [`wallet-${payer.id}`, 'node-ln'],
          messageBubble: { text: '⚡ Sovereign', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        break;

      case 3:
        if (!congested) {
          steps.push({
            title: 'Co-Sign',
            text: "Your wallet co-signs the payment authorization with Muun's servers (2-of-2 multisig). The Swap Provider routes through pre-funded Lightning liquidity for instant settlement.",
            sourceWalletId: payer.id,
            targetNodeId: 'node-swap',
            activePath: 'wallet-to-swap',
            highlightNodes: [`wallet-${payer.id}`, 'node-swap'],
            messageBubble: { text: '🔐 Co-Sign', type: 'success', targetId: payer.id, targetType: 'wallet' },
          });
          steps.push({
            title: 'Optimized Payment',
            text: 'The Swap Provider pays the Lightning invoice through the network. On-chain settlement is batched for fee efficiency.',
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-ln',
            activePath: 'swap-to-ln',
            highlightNodes: ['node-swap', 'node-ln'],
            messageBubble: { text: '⚡ Optimized', type: 'success', targetId: 'node-swap', targetType: 'node' },
          });
        } else {
          steps.push({
            title: 'Co-Sign (Congested)',
            text: "Your wallet and Muun's servers co-sign an on-chain HTLC (2-of-2 multisig). Full Submarine Swap required due to congestion.",
            sourceWalletId: payer.id,
            targetNodeId: 'node-swap',
            activePath: 'wallet-to-swap',
            highlightNodes: [`wallet-${payer.id}`, 'node-swap'],
            messageBubble: { text: '🔐 Co-Sign', type: 'success', targetId: payer.id, targetType: 'wallet' },
          });
          steps.push({
            title: 'HTLC Broadcast',
            text: 'The Swap Provider broadcasts the on-chain HTLC to the Bitcoin Mempool.',
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-mempool',
            activePath: 'swap-to-mempool',
            highlightNodes: ['node-swap', 'node-mempool'],
            messageBubble: { text: '📡 HTLC', type: 'success', targetId: 'node-swap', targetType: 'node' },
          });
          steps.push({
            title: 'Congestion Warning',
            text: "⚠️ High congestion! HTLC waiting in Mempool. This increases Muun's transaction cost significantly.",
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-mempool',
            activePath: 'swap-to-mempool',
            highlightNodes: ['node-mempool'],
            messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
          });
          steps.push({
            title: 'Mining',
            text: 'The Mempool releases the HTLC transaction to the miners, who confirm it on the Blockchain.',
            sourceNodeId: 'node-mempool',
            targetNodeId: 'node-blockchain',
            activePath: 'mempool-to-blockchain',
            highlightNodes: ['node-mempool', 'node-blockchain'],
            messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
          });
          steps.push({
            title: 'LN Payment',
            text: 'The Swap Provider detects the confirmed HTLC and pays the Lightning invoice, claiming the on-chain funds with the preimage.',
            sourceNodeId: 'node-swap',
            targetNodeId: 'node-ln',
            activePath: 'swap-to-ln',
            highlightNodes: ['node-swap', 'node-ln'],
            messageBubble: { text: '⚡ LN Payment', type: 'success', targetId: 'node-swap', targetType: 'node' },
          });
        }
        break;

      case 4:
        steps.push({
          title: 'Melting Tokens',
          text: 'Your wallet submits Ecash tokens to the Chaumian Mint. The Mint verifies the signatures and burns the tokens (double-spend check).',
          sourceWalletId: payer.id,
          targetNodeId: 'node-mint',
          activePath: 'wallet-to-mint',
          highlightNodes: [`wallet-${payer.id}`, 'node-mint'],
          messageBubble: { text: '🪙 Melting', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'Mint Pays',
          text: "The Mint's built-in Lightning node pays the invoice through the Lightning Network.",
          sourceNodeId: 'node-mint',
          targetNodeId: 'node-ln',
          activePath: 'mint-to-ln',
          highlightNodes: ['node-mint', 'node-ln'],
          messageBubble: { text: '⚡ Mint Pays', type: 'success', targetId: 'node-mint', targetType: 'node' },
        });
        break;

      case 5:
        steps.push({
          title: 'Custodial Debit',
          text: "Your app sends the payment request to the company's backend servers. The company debits your internal account balance.",
          sourceWalletId: payer.id,
          targetNodeId: 'node-custodial',
          activePath: 'wallet-to-custodial',
          highlightNodes: [`wallet-${payer.id}`, 'node-custodial'],
          messageBubble: { text: '🏢 Debit', type: 'success', targetId: payer.id, targetType: 'wallet' },
        });
        steps.push({
          title: 'Company LN Payment',
          text: "The company's Lightning node pays the invoice through the Lightning Network.",
          sourceNodeId: 'node-custodial',
          targetNodeId: 'node-ln',
          activePath: 'custodial-to-ln',
          highlightNodes: ['node-custodial', 'node-ln'],
          messageBubble: { text: '⚡ Company LN', type: 'success', targetId: 'node-custodial', targetType: 'node' },
        });
        break;
    }
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Step Generation — Arrival (network → receiver)
// ---------------------------------------------------------------------------

function buildArrivalSteps(
  payer: Wallet,
  receiver: Wallet,
  codeType: 'L1' | 'LN',
  congested: boolean,
  amount: number,
  totalCost: number,
): SimulationStep[] {
  const rCat = getEffCat(receiver);
  const steps: SimulationStep[] = [];

  // Pre-compute splice requirements
  const needsSplice =
    (rCat === 1 || rCat === '2b') &&
    codeType === 'LN' &&
    receiver.inboundLiquidity !== null &&
    amount > receiver.inboundLiquidity;

  const spliceMiningFee = congested ? 15_000 : 1_000;
  const spliceFee = Math.floor(amount * 0.01) + spliceMiningFee;

  if (codeType === 'L1') {
    // All L1 arrivals: Blockchain → Receiver
    steps.push({
      title: 'Settled',
      text: "The Blockchain records the new UTXO output, allowing the receiver's wallet to update its balance.",
      sourceNodeId: 'node-blockchain',
      targetWalletId: receiver.id,
      activePath: 'blockchain-to-wallet',
      highlightNodes: ['node-blockchain', `wallet-${receiver.id}`],
      messageBubble: { text: '⛓️ Confirm', type: 'success', targetId: 'node-blockchain', targetType: 'node' },
      balanceUpdates: [
        { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
        { walletId: receiver.id, balanceDiff: amount },
      ],
    });
  } else {
    // LN arrivals depend on receiver category
    switch (rCat) {
      case 1:
      case '2b':
        if (needsSplice) {
          // Splice-In / Channel Setup required
          steps.push({
            title: 'Splice-In Required',
            text: `The Lightning Network attempts to route the payment (<strong>${amount.toLocaleString()} sats</strong>), but detects that the receiver's inbound liquidity (<strong>${(receiver.inboundLiquidity ?? 0).toLocaleString()} sats</strong> available) is insufficient. It requests a channel splice from the LSP.`,
            sourceNodeId: 'node-ln',
            targetNodeId: 'node-lsp',
            activePath: 'ln-to-lsp',
            highlightNodes: ['node-ln', 'node-lsp'],
            messageBubble: { text: '⚠️ Limit', type: 'warning', targetId: 'node-ln', targetType: 'node' },
          });
          steps.push({
            title: 'Splice TX Broadcast',
            text: `The LSP broadcasts the splice transaction to the Mempool. Splice fee: 1% (<strong>${Math.floor(amount * 0.01).toLocaleString()} sats</strong>) + mining (<strong>${spliceMiningFee.toLocaleString()} sats</strong>) = <strong>${spliceFee.toLocaleString()} sats</strong> total — deducted from the received amount.`,
            sourceNodeId: 'node-lsp',
            targetNodeId: 'node-mempool',
            activePath: 'lsp-to-mempool',
            highlightNodes: ['node-lsp', 'node-mempool'],
            messageBubble: { text: '📡 Splice TX', type: 'success', targetId: 'node-lsp', targetType: 'node' },
          });
          if (congested) {
            steps.push({
              title: 'Congestion Warning',
              text: '⚠️ High L1 congestion! The splice transaction competes for block space. The mining fee component is significantly higher, increasing the cost to the receiver.',
              sourceNodeId: 'node-lsp',
              targetNodeId: 'node-mempool',
              activePath: 'lsp-to-mempool',
              highlightNodes: ['node-mempool'],
              messageBubble: { text: '⚠️ Congested', type: 'warning', targetId: 'node-mempool', targetType: 'node' },
            });
          }
          steps.push({
            title: 'Splice Mining',
            text: 'The Mempool releases the splice transaction to the miners, who include it in a new block on the Blockchain.',
            sourceNodeId: 'node-mempool',
            targetNodeId: 'node-blockchain',
            activePath: 'mempool-to-blockchain',
            highlightNodes: ['node-mempool', 'node-blockchain'],
            messageBubble: { text: '⛏️ Confirming', type: 'success', targetId: 'node-mempool', targetType: 'node' },
          });
          const netReceived = amount - spliceFee;
          steps.push({
            title: 'Channel Expanded',
            text: `The Blockchain confirms the splice transaction, expanding the channel capacity and settling <strong>${netReceived.toLocaleString()} sats</strong> (net of ${spliceFee.toLocaleString()} sats splice fee). Inbound liquidity increased by 500,000 sats.`,
            sourceNodeId: 'node-blockchain',
            targetWalletId: receiver.id,
            activePath: 'blockchain-to-wallet',
            highlightNodes: ['node-blockchain', `wallet-${receiver.id}`],
            messageBubble: { text: '⛓️ Confirm', type: 'success', targetId: 'node-blockchain', targetType: 'node' },
            balanceUpdates: [
              { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
              { walletId: receiver.id, balanceDiff: netReceived, inboundDiff: 500_000 },
            ],
          });
        } else {
          // Normal LN arrival — fits within existing capacity
          steps.push({
            title: 'Received',
            text: `The Lightning Network routes and delivers the payment directly to the receiver's wallet, settling it instantly within existing capacity (${(receiver.inboundLiquidity ?? 0).toLocaleString()} sats inbound available).`,
            sourceNodeId: 'node-ln',
            targetWalletId: receiver.id,
            activePath: 'ln-to-wallet',
            highlightNodes: ['node-ln', `wallet-${receiver.id}`],
            messageBubble: { text: '⚡ Delivery', type: 'success', targetId: 'node-ln', targetType: 'node' },
            balanceUpdates: [
              { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
              {
                walletId: receiver.id,
                balanceDiff: amount,
                inboundDiff: receiver.inboundLiquidity !== null ? -amount : undefined,
              },
            ],
          });
        }
        break;

      case '2a':
        if (receiver.inboundLiquidity !== null && amount > receiver.inboundLiquidity) {
          steps.push({
            title: 'Low Capacity Warning',
            text: `⚠️ This payment (<strong>${amount.toLocaleString()} sats</strong>) exceeds the receiver's channel inbound capacity (<strong>${receiver.inboundLiquidity.toLocaleString()} sats</strong>). In practice, a sovereign node operator would need to open a new channel or acquire more inbound liquidity. Proceeding for demonstration purposes.`,
            sourceNodeId: 'node-ln',
            targetWalletId: receiver.id,
            activePath: 'ln-to-wallet',
            highlightNodes: ['node-ln', `wallet-${receiver.id}`],
            messageBubble: { text: '⚠️ Low Capacity', type: 'warning', targetId: 'node-ln', targetType: 'node' },
          });
        }
        steps.push({
          title: 'Received',
          text: "The Lightning Network delivers the payment directly to the receiver's sovereign node, updating the local channel state.",
          sourceNodeId: 'node-ln',
          targetWalletId: receiver.id,
          activePath: 'ln-to-wallet',
          highlightNodes: ['node-ln', `wallet-${receiver.id}`],
          messageBubble: { text: '⚡ Delivery', type: 'success', targetId: 'node-ln', targetType: 'node' },
          balanceUpdates: [
            { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
            {
              walletId: receiver.id,
              balanceDiff: amount,
              inboundDiff: receiver.inboundLiquidity !== null ? -amount : undefined,
            },
          ],
        });
        break;

      case 3:
        steps.push({
          title: 'Reverse Swap',
          text: "The Lightning Network routes the HTLC payment to the Swap Provider, triggering a Reverse Submarine Swap.",
          sourceNodeId: 'node-ln',
          targetNodeId: 'node-swap',
          activePath: 'ln-to-swap',
          highlightNodes: ['node-ln', 'node-swap'],
          messageBubble: { text: '⚡ Route to Swap', type: 'success', targetId: 'node-ln', targetType: 'node' },
        });
        steps.push({
          title: 'Settled',
          text: "The Swap Provider broadcasts the on-chain settlement transaction to the receiver's multisig address, updating the wallet balance.",
          sourceNodeId: 'node-swap',
          targetWalletId: receiver.id,
          activePath: 'swap-to-wallet',
          highlightNodes: ['node-swap', `wallet-${receiver.id}`],
          messageBubble: { text: '🔄 Settle', type: 'success', targetId: 'node-swap', targetType: 'node' },
          balanceUpdates: [
            { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
            { walletId: receiver.id, balanceDiff: amount },
          ],
        });
        break;

      case 4:
        steps.push({
          title: 'Minting',
          text: "The Lightning Network routes the payment to the Chaumian Mint, triggering the Mint's issuance of new Ecash tokens.",
          sourceNodeId: 'node-ln',
          targetNodeId: 'node-mint',
          activePath: 'ln-to-mint',
          highlightNodes: ['node-ln', 'node-mint'],
          messageBubble: { text: '⚡ Fulfill', type: 'success', targetId: 'node-ln', targetType: 'node' },
        });
        steps.push({
          title: 'Tokens Delivered',
          text: "The Chaumian Mint issues and delivers the fresh Ecash bearer tokens directly to the receiver's wallet.",
          sourceNodeId: 'node-mint',
          targetWalletId: receiver.id,
          activePath: 'mint-to-wallet',
          highlightNodes: ['node-mint', `wallet-${receiver.id}`],
          messageBubble: { text: '🏛️ Issue', type: 'success', targetId: 'node-mint', targetType: 'node' },
          balanceUpdates: [
            { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
            { walletId: receiver.id, balanceDiff: amount },
          ],
        });
        break;

      case 5:
        steps.push({
          title: 'Credited',
          text: "The Lightning Network routes the payment to the company's node, which credits the receiver's internal database balance.",
          sourceNodeId: 'node-ln',
          targetWalletId: receiver.id,
          activePath: 'ln-to-wallet',
          highlightNodes: ['node-ln', `wallet-${receiver.id}`],
          messageBubble: { text: '⚡ Delivery', type: 'success', targetId: 'node-ln', targetType: 'node' },
          balanceUpdates: [
            { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
            { walletId: receiver.id, balanceDiff: amount },
          ],
        });
        break;

      default:
        steps.push({
          title: 'Delivered',
          text: "The Lightning Network delivers the payment to the receiver's wallet.",
          sourceNodeId: 'node-ln',
          targetWalletId: receiver.id,
          activePath: 'ln-to-wallet',
          highlightNodes: ['node-ln', `wallet-${receiver.id}`],
          messageBubble: { text: '⚡ Delivery', type: 'success', targetId: 'node-ln', targetType: 'node' },
          balanceUpdates: [
            { walletId: payer.id, balanceDiff: -totalCost, inboundDiff: payer.inboundLiquidity !== null ? amount : undefined },
            { walletId: receiver.id, balanceDiff: amount },
          ],
        });
    }
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Ecash Steps (Same-Mint Transfer)
// ---------------------------------------------------------------------------

function buildEcashSteps(
  payer: Wallet,
  receiver: Wallet,
  amount: number,
): SimulationStep[] {
  return [
    {
      title: 'Token Swap',
      text: 'Your wallet sends existing Ecash tokens to the recipient, who submits them to the Chaumian Mint to swap for fresh ones (double-spend prevention).',
      sourceWalletId: payer.id,
      targetNodeId: 'node-mint',
      activePath: 'wallet-to-mint',
      highlightNodes: [`wallet-${payer.id}`, 'node-mint'],
      messageBubble: { text: '🪙 Token Swap', type: 'success', targetId: payer.id, targetType: 'wallet' },
    },
    {
      title: 'Minted',
      text: 'The Chaumian Mint validates and burns the old tokens, issuing and delivering fresh Ecash tokens to the receiver. No Lightning Network involved — instant and private.',
      sourceNodeId: 'node-mint',
      targetWalletId: receiver.id,
      activePath: 'mint-to-wallet',
      highlightNodes: ['node-mint', `wallet-${receiver.id}`],
      messageBubble: { text: '🏛️ Issue', type: 'success', targetId: 'node-mint', targetType: 'node' },
      balanceUpdates: [
        { walletId: payer.id, balanceDiff: -amount },
        { walletId: receiver.id, balanceDiff: amount },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// LNURL Resolution Steps
// ---------------------------------------------------------------------------

function buildLnurlResolutionSteps(
  payer: Wallet,
  receiver: Wallet,
  amount: number,
): SimulationStep[] {
  const rCat = getEffCat(receiver);
  const steps: SimulationStep[] = [];

  let endpointNode: string;
  let endpointLabel: string;

  if (rCat === 1 || rCat === '2b') {
    endpointNode = 'node-lsp';
    endpointLabel = "receiver's LSP";
  } else if (rCat === 4) {
    endpointNode = 'node-mint';
    endpointLabel = "Chaumian Mint's server";
  } else if (rCat === 5) {
    endpointNode = 'node-custodial';
    endpointLabel = "company's backend server";
  } else {
    endpointNode = 'node-ln';
    endpointLabel = "receiver's Lightning node";
  }

  steps.push({
    title: 'LNURL Resolve',
    text: `Your wallet contacts the LNURL-pay endpoint hosted by the ${endpointLabel}. It requests payment parameters (metadata, callback URL).`,
    sourceWalletId: payer.id,
    targetNodeId: endpointNode,
    activePath: 'wallet-to-' + endpointNode.replace('node-', ''),
    highlightNodes: [`wallet-${payer.id}`, endpointNode],
    messageBubble: { text: '🔗 LNURL Resolve', type: 'success', targetId: payer.id, targetType: 'wallet' },
  });

  steps.push({
    title: 'Invoice Ready',
    text: `The ${endpointLabel} generates a fresh single-use BOLT11 invoice for ${amount.toLocaleString()} sats and returns it to your wallet. From here, payment proceeds as a standard Lightning transaction.`,
    sourceNodeId: endpointNode,
    targetWalletId: payer.id,
    activePath: endpointNode.replace('node-', '') + '-to-wallet',
    highlightNodes: [endpointNode, `wallet-${payer.id}`],
    messageBubble: { text: '📄 Invoice Ready', type: 'success', targetId: endpointNode, targetType: 'node' },
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Hook Return Type
// ---------------------------------------------------------------------------

export interface TransactionLabState {
  wallets: Wallet[];
  selectedWalletId: number | null;
  activeCode: ActiveCode | null;
  congestion: boolean;
  txSteps: SimulationStep[];
  stepIdx: number;

  addWallet: (name: string, category: WalletCategory, subCategory: WalletSubCategory) => void;
  deleteWallet: (id: number) => void;
  selectWallet: (id: number) => void;
  updateWalletPosition: (walletId: number, x: number, y: number) => void;
  setCongestion: (value: boolean) => void;
  generateCode: (walletId: number, type: PaymentCodeType, amount: number | null) => void;
  startTransaction: (payerId: number, amountOverride?: number) => string | null;
  nextStep: () => void;
  prevStep: () => void;
  resetSimulation: () => void;
}

// ---------------------------------------------------------------------------
// Main Hook
// ---------------------------------------------------------------------------

export function useTransactionLabState(): TransactionLabState {
  const [wallets, setWallets] = useState<Wallet[]>(() => createInitialWallets());
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [activeCode, setActiveCode] = useState<ActiveCode | null>(null);
  const [congestion, setCongestion] = useState<boolean>(false);
  const [txSteps, setTxSteps] = useState<SimulationStep[]>([]);
  const [stepIdx, setStepIdx] = useState<number>(-1);

  // -- Wallet CRUD --

  const addWallet = useCallback(
    (name: string, category: WalletCategory, subCategory: WalletSubCategory) => {
      setWallets((prev) => {
        const id = nextId++;
        const trimmed = name.trim() || `Wallet ${id}`;
        const newWallet: Wallet = {
          id,
          name: trimmed,
          category,
          subCategory: category === 2 ? (subCategory ?? 'a') : null,
          balance: 100_000,
          inboundLiquidity: getDefaultInbound(category, category === 2 ? (subCategory ?? 'a') : null),
          x: 50 + (Math.random() * 10 - 5),
          y: 50 + (Math.random() * 10 - 5),
        };
        return [...prev, newWallet];
      });
    },
    [],
  );

  const deleteWallet = useCallback(
    (id: number) => {
      setWallets((prev) => prev.filter((w) => w.id !== id));
      setSelectedWalletId((prev) => (prev === id ? null : prev));
      // Clear simulation if involved wallet is deleted
      setActiveCode((prev) => (prev && prev.creatorId === id ? null : prev));
      setTxSteps([]);
      setStepIdx(-1);
    },
    [],
  );

  const selectWallet = useCallback((id: number) => {
    setSelectedWalletId(id);
  }, []);

  const updateWalletPosition = useCallback(
    (walletId: number, x: number, y: number) => {
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));
      setWallets((prev) =>
        prev.map((w) =>
          w.id === walletId ? { ...w, x: clampedX, y: clampedY } : w,
        ),
      );
    },
    [],
  );

  // -- Code Generation --

  const generateCode = useCallback(
    (walletId: number, type: PaymentCodeType, amount: number | null) => {
      const amountDefinedBy: 'sender' | 'receiver' = type === 'LN' ? 'receiver' : 'sender';

      if (amountDefinedBy === 'receiver' && (amount === null || amount <= 0)) {
        return; // Invalid — receiver must define a positive amount
      }

      setActiveCode({ creatorId: walletId, type, amount, amountDefinedBy });
      setTxSteps([]);
      setStepIdx(-1);
    },
    [],
  );

  // -- Transaction Engine --

  const startTransaction = useCallback(
    (payerId: number, amountOverride?: number): string | null => {
      if (!activeCode) return 'No active payment code.';

      const payer = wallets.find((w) => w.id === payerId);
      const receiver = wallets.find((w) => w.id === activeCode.creatorId);
      if (!payer || !receiver) return 'Wallet not found.';

      // Resolve final amount
      let amount: number;
      if (activeCode.amountDefinedBy === 'sender') {
        amount = amountOverride ?? 0;
        if (amount <= 0) return 'Please enter a valid amount in satoshis.';
      } else {
        amount = activeCode.amount ?? 0;
        if (amount <= 0) return 'Invalid code amount.';
      }

      const pCat = getEffCat(payer);
      const originalType = activeCode.type;
      const codeType: 'L1' | 'LN' | 'ECASH' =
        originalType === 'LNURL' ? 'LN' : originalType;

      // Compatibility check
      const compat = isPaymentCompatible(pCat, activeCode.type);
      if (!compat.ok) return compat.reason ?? 'Incompatible payment.';

      // Ecash — special handling (no fees)
      if (codeType === 'ECASH') {
        if (payer.balance < amount) {
          return `Insufficient funds in ${payer.name}. Balance: ${payer.balance.toLocaleString()} sats, needed: ${amount.toLocaleString()} sats.`;
        }
        const steps: SimulationStep[] = [
          {
            title: 'Approval',
            text: `Transfer Ecash tokens to another wallet on the same Mint? Amount: <strong>${amount.toLocaleString()} sats</strong>. Instant and private.`,
            highlightNodes: [`wallet-${payer.id}`],
            messageBubble: { text: '🔐 Approval', type: 'success', targetId: payer.id, targetType: 'wallet' },
          },
          ...buildEcashSteps(payer, receiver, amount),
        ];
        setTxSteps(steps);
        setStepIdx(0);
        return null;
      }

      // Fee calculation
      const rCat = getEffCat(receiver);
      const fees = calcFees(pCat, rCat, codeType as 'L1' | 'LN', amount, congestion);
      const totalCost = amount + fees.total;

      if (payer.balance < totalCost) {
        return `Insufficient funds. Need ${totalCost.toLocaleString()} sats (${amount.toLocaleString()} + ${fees.total.toLocaleString()} fees). Balance: ${payer.balance.toLocaleString()} sats.`;
      }

      // Build step pipeline
      const steps: SimulationStep[] = [];

      // Step 0: Approval
      steps.push({
        title: 'Approval',
        text: `Authorize payment of <strong>${amount.toLocaleString()} sats</strong>? Estimated fees: <strong>${fees.total.toLocaleString()} sats</strong>. Total cost: <strong>${totalCost.toLocaleString()} sats</strong>.`,
        highlightNodes: [`wallet-${payer.id}`],
        messageBubble: { text: '🔐 Approval', type: 'success', targetId: payer.id, targetType: 'wallet' },
      });

      // LNURL resolution (before standard LN departure)
      if (originalType === 'LNURL') {
        steps.push(...buildLnurlResolutionSteps(payer, receiver, amount));
      }

      // Departure
      steps.push(
        ...buildDepartureSteps(payer, receiver, codeType as 'L1' | 'LN', congestion),
      );

      // Arrival
      steps.push(
        ...buildArrivalSteps(payer, receiver, codeType as 'L1' | 'LN', congestion, amount, totalCost),
      );

      setTxSteps(steps);
      setStepIdx(0);
      return null; // success
    },
    [wallets, activeCode, congestion],
  );

  // -- Playback Controls --

  const nextStep = useCallback(() => {
    setStepIdx((prev) => {
      const next = prev + 1;
      if (next >= txSteps.length) {
        // Final step reached — apply balance updates from the last step
        const lastStep = txSteps[txSteps.length - 1];
        if (lastStep?.balanceUpdates) {
          setWallets((wPrev) =>
            wPrev.map((w) => {
              const update = lastStep.balanceUpdates!.find((u) => u.walletId === w.id);
              if (!update) return w;
              const newBalance = w.balance + update.balanceDiff;
              let newInbound = w.inboundLiquidity;
              if (update.inboundDiff !== undefined && newInbound !== null) {
                newInbound = Math.max(0, newInbound + update.inboundDiff);
              }
              return { ...w, balance: newBalance, inboundLiquidity: newInbound };
            }),
          );
        }
        // Reset simulation state
        setActiveCode(null);
        setTxSteps([]);
        return -1;
      }
      return next;
    });
  }, [txSteps]);

  const prevStep = useCallback(() => {
    setStepIdx((prev) => Math.max(0, prev - 1));
  }, []);

  const resetSimulation = useCallback(() => {
    setActiveCode(null);
    setTxSteps([]);
    setStepIdx(-1);
  }, []);

  return {
    wallets,
    selectedWalletId,
    activeCode,
    congestion,
    txSteps,
    stepIdx,

    addWallet,
    deleteWallet,
    selectWallet,
    updateWalletPosition,
    setCongestion,
    generateCode,
    startTransaction,
    nextStep,
    prevStep,
    resetSimulation,
  };
}

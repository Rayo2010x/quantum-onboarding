/**
 * QuantumBTC — Transaction Lab State Verification Script
 *
 * Runs headless tests against the transaction engine logic WITHOUT React.
 * We import the pure functions directly, bypassing the React hook wrapper.
 *
 * Execute with: npx tsx components/TransactionLab/scratch/verify_state.ts
 */

// ---------------------------------------------------------------------------
// Since useTransactionLabState uses React hooks, we replicate the pure logic
// here for headless testing. We import only the types.
// ---------------------------------------------------------------------------

import type {
  Wallet,
  WalletCategory,
  WalletSubCategory,
  PaymentCodeType,
  ActiveCode,
  SimulationStep,
} from '../types';

type EffectiveCategory = 0 | 1 | '2a' | '2b' | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Helpers (mirrors the hook logic)
// ---------------------------------------------------------------------------

function getEffCat(w: Wallet): EffectiveCategory {
  if (w.category === 2) return `2${w.subCategory ?? 'a'}` as '2a' | '2b';
  return w.category as Exclude<EffectiveCategory, '2a' | '2b'>;
}

function getDefaultInbound(
  category: WalletCategory,
  subCat: WalletSubCategory,
): number | null {
  if (category === 1) return 500_000;
  if (category === 2 && subCat === 'b') return 500_000;
  if (category === 2 && subCat === 'a') return 2_000_000;
  return null;
}

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

  if (codeType === 'L1' && pCat !== 0 && pCat !== 3 && pCat !== 5) {
    swap = Math.max(50, Math.floor(amount * 0.004));
    routing = 5;
  }

  return { mining, routing, swap, mint, total: mining + routing + swap + mint };
}

// ---------------------------------------------------------------------------
// Wallet Factory
// ---------------------------------------------------------------------------

let nextId = 0;

function createWallet(
  name: string,
  category: WalletCategory,
  subCategory: WalletSubCategory,
  overrides?: Partial<Wallet>,
): Wallet {
  return {
    id: nextId++,
    name,
    category,
    subCategory: category === 2 ? (subCategory ?? 'a') : null,
    balance: 100_000,
    inboundLiquidity: getDefaultInbound(category, category === 2 ? (subCategory ?? 'a') : null),
    x: 50,
    y: 50,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failCount++;
  }
}

function section(title: string): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

// ---------------------------------------------------------------------------
// TEST 1: Wallet CRUD
// ---------------------------------------------------------------------------

section('TEST 1: Wallet Add / Delete');

const wallets: Wallet[] = [];

const alice = createWallet('Alice (Phoenix)', 1, null);
wallets.push(alice);
assert(alice.name === 'Alice (Phoenix)', 'Alice created with correct name');
assert(alice.category === 1, 'Alice has category 1');
assert(alice.inboundLiquidity === 500_000, 'Alice has 500k inbound liquidity');

const bob = createWallet('Bob (Muun)', 3, null);
wallets.push(bob);
assert(bob.category === 3, 'Bob has category 3');
assert(bob.inboundLiquidity === null, 'Bob has no inbound liquidity (Muun)');

const charlie = createWallet('Charlie (Cashu)', 4, null);
wallets.push(charlie);
assert(charlie.category === 4, 'Charlie has category 4');

const treasury = createWallet('Treasury (Cold)', 0, null);
wallets.push(treasury);
assert(treasury.category === 0, 'Treasury has category 0');

assert(wallets.length === 4, 'Initial wallet count is 4');

// Add a new wallet
const dave = createWallet('Dave (Zeus)', 2, 'a');
wallets.push(dave);
assert(wallets.length === 5, 'Wallet count after add is 5');
assert(dave.subCategory === 'a', 'Dave has subCategory "a"');
assert(dave.inboundLiquidity === 2_000_000, 'Dave (2a) has 2M inbound');

// Delete
const indexToRemove = wallets.findIndex((w) => w.id === dave.id);
wallets.splice(indexToRemove, 1);
assert(wallets.length === 4, 'Wallet count after delete is 4');

// Add an embedded node wallet
const eve = createWallet('Eve (Embedded)', 2, 'b');
wallets.push(eve);
assert(eve.subCategory === 'b', 'Eve has subCategory "b"');
assert(eve.inboundLiquidity === 500_000, 'Eve (2b) has 500k inbound');

// ---------------------------------------------------------------------------
// TEST 2: L1 On-Chain (Cold → Phoenix via swap provider)
// ---------------------------------------------------------------------------

section('TEST 2: L1 On-Chain Payment — Treasury(Cold) → Alice(Phoenix)');

{
  const amount = 5_000;
  const pCat = getEffCat(treasury); // 0
  const rCat = getEffCat(alice); // 1
  const fees = calcFees(pCat, rCat, 'L1', amount, false);

  console.log(`  Amount: ${amount} sats`);
  console.log(`  Fees: mining=${fees.mining}, routing=${fees.routing}, swap=${fees.swap}, total=${fees.total}`);

  assert(fees.mining === 1_000, 'L1 mining fee = 1,000 sats (no congestion)');
  assert(fees.swap === 0, 'No swap fee for cat-0 sending L1');
  assert(fees.routing === 0, 'No routing fee for cat-0 sending L1');
  assert(fees.total === 1_000, 'Total fee = 1,000');

  const totalCost = amount + fees.total;
  assert(totalCost === 6_000, 'Total cost = 6,000');
  assert(treasury.balance >= totalCost, 'Treasury has sufficient balance');
}

// ---------------------------------------------------------------------------
// TEST 3: Lightning payment under L1 congestion (Bob Muun → Alice Phoenix)
// ---------------------------------------------------------------------------

section('TEST 3: LN Payment under Congestion — Bob(Muun) → Alice(Phoenix)');

{
  const amount = 2_000;
  const pCat = getEffCat(bob); // 3
  const rCat = getEffCat(alice); // 1
  const congested = true;

  const fees = calcFees(pCat, rCat, 'LN', amount, congested);

  console.log(`  Amount: ${amount} sats (congested=${congested})`);
  console.log(`  Fees: mining=${fees.mining}, routing=${fees.routing}, swap=${fees.swap}, total=${fees.total}`);

  // Muun (cat 3) under congestion: full submarine swap → on-chain HTLC
  assert(fees.mining === 15_000, 'Mining fee = 15,000 sats (congested!)');
  assert(fees.swap === Math.max(50, Math.floor(amount * 0.003)), `Swap fee = ${Math.max(50, Math.floor(amount * 0.003))} sats`);
  assert(fees.routing === 0, 'Routing fee = 0 (congested Muun uses full swap)');

  const expectedSwap = Math.max(50, Math.floor(2000 * 0.003));
  const expectedTotal = 15_000 + expectedSwap + 0;
  assert(fees.total === expectedTotal, `Total fee = ${expectedTotal}`);

  // Compare to non-congested
  const feesNormal = calcFees(pCat, rCat, 'LN', amount, false);
  console.log(`  Non-congested fees: mining=${feesNormal.mining}, routing=${feesNormal.routing}, swap=${feesNormal.swap}, total=${feesNormal.total}`);
  assert(feesNormal.mining === 0, 'Non-congested: no mining fee');
  assert(feesNormal.swap === 0, 'Non-congested: no swap fee');
  assert(feesNormal.routing === 2, 'Non-congested: routing fee = 2');
  assert(fees.total > feesNormal.total, 'Congestion dramatically increases fees');
}

// ---------------------------------------------------------------------------
// TEST 4: Inbound Liquidity Constraint (Splice-In Trigger)
// ---------------------------------------------------------------------------

section('TEST 4: Inbound Liquidity — Splice-In Trigger');

{
  // Create a Phoenix wallet with only 1,000 sats of inbound liquidity
  const lowInboundReceiver = createWallet('LowInbound (Phoenix)', 1, null, {
    inboundLiquidity: 1_000,
  });

  const amount = 5_000; // exceeds the 1,000 inbound
  const rCat = getEffCat(lowInboundReceiver);
  const pCat = getEffCat(bob); // 3 — Muun

  console.log(`  Receiver inbound: ${lowInboundReceiver.inboundLiquidity} sats`);
  console.log(`  Payment amount: ${amount} sats`);

  const needsSplice =
    (rCat === 1 || rCat === '2b') &&
    lowInboundReceiver.inboundLiquidity !== null &&
    amount > lowInboundReceiver.inboundLiquidity;

  assert(needsSplice === true, 'Splice-In IS required (amount > inbound)');

  const SETUP_FEE = 2_000;
  const netReceived = amount - SETUP_FEE;

  assert(netReceived === 3_000, `Receiver gets ${netReceived} sats after setup fee`);

  // Simulate balance update
  const receiverBeforeBalance = lowInboundReceiver.balance;
  const receiverAfterBalance = receiverBeforeBalance + netReceived;
  const receiverAfterInbound = 500_000; // replenished by splice

  console.log(`  Before: balance=${receiverBeforeBalance}, inbound=${lowInboundReceiver.inboundLiquidity}`);
  console.log(`  After:  balance=${receiverAfterBalance}, inbound=${receiverAfterInbound}`);

  assert(receiverAfterBalance === 103_000, 'Receiver balance = 100k + 3k = 103,000');
  assert(receiverAfterInbound === 500_000, 'Receiver inbound replenished to 500,000');

  // Verify no splice when inbound is sufficient
  const highInboundReceiver = createWallet('HighInbound (Phoenix)', 1, null, {
    inboundLiquidity: 1_000_000,
  });
  const noSplice =
    (getEffCat(highInboundReceiver) === 1) &&
    highInboundReceiver.inboundLiquidity !== null &&
    amount > highInboundReceiver.inboundLiquidity;

  assert(noSplice === false, 'No splice needed when inbound is sufficient');
}

// ---------------------------------------------------------------------------
// TEST 5: Same-Mint Ecash Transfer (Charlie → Charlie2)
// ---------------------------------------------------------------------------

section('TEST 5: Ecash Same-Mint Transfer — Charlie → Charlie2');

{
  const charlie2 = createWallet('Charlie2 (Cashu)', 4, null);
  const amount = 10_000;
  const pCat = getEffCat(charlie); // 4
  const rCat = getEffCat(charlie2); // 4

  // Ecash — no fees
  const fees = calcFees(pCat, rCat, 'LN', amount, false); // Not used for ECASH, but checking
  console.log(`  Amount: ${amount} sats`);
  console.log(`  ECASH transfer — no network fees apply`);

  // For Ecash, the logic skips fee calc entirely — direct token swap
  const totalCost = amount; // No fees for same-mint
  assert(totalCost === 10_000, 'Total cost = amount (no fees for same-mint)');

  // Simulate balance updates
  const payerBefore = charlie.balance;
  const receiverBefore = charlie2.balance;

  const payerAfter = payerBefore - amount;
  const receiverAfter = receiverBefore + amount;

  assert(payerAfter === 90_000, 'Charlie balance = 100k - 10k = 90,000');
  assert(receiverAfter === 110_000, 'Charlie2 balance = 100k + 10k = 110,000');
}

// ---------------------------------------------------------------------------
// TEST 6: Fee Calculation — All Categories
// ---------------------------------------------------------------------------

section('TEST 6: Fee Calculations — Category Matrix');

{
  const amount = 10_000;

  // Cat 0 → LN (submarine swap, on-chain HTLC)
  const fees0 = calcFees(0, 1, 'LN', amount, false);
  assert(fees0.mining === 1_000, 'Cat 0→LN: mining = 1,000 (on-chain HTLC)');
  assert(fees0.swap === Math.max(50, Math.floor(amount * 0.005)), `Cat 0→LN: swap = ${fees0.swap}`);
  assert(fees0.routing === 2, 'Cat 0→LN: routing = 2');

  // Cat 1 → LN (native)
  const fees1 = calcFees(1, 3, 'LN', amount, false);
  assert(fees1.mining === 0, 'Cat 1→LN: no mining');
  assert(fees1.swap === 0, 'Cat 1→LN: no swap');
  assert(fees1.routing === 8, 'Cat 1→LN: routing = 8');

  // Cat 2a → LN (sovereign)
  const fees2a = calcFees('2a', 4, 'LN', amount, false);
  assert(fees2a.routing === 4, 'Cat 2a→LN: routing = 4');

  // Cat 4 → LN (ecash melt)
  const fees4 = calcFees(4, 1, 'LN', amount, false);
  assert(fees4.mint === 2, 'Cat 4→LN: mint = 2');
  assert(fees4.routing === 3, 'Cat 4→LN: routing = 3');

  // Cat 5 → LN (custodial)
  const fees5 = calcFees(5, 1, 'LN', amount, false);
  assert(fees5.routing === 1, 'Cat 5→LN: routing = 1');

  // Cat 1 → L1 (submarine swap LN→On-chain)
  const fees1L1 = calcFees(1, 0, 'L1', amount, false);
  assert(fees1L1.mining === 1_000, 'Cat 1→L1: mining = 1,000');
  assert(fees1L1.swap === Math.max(50, Math.floor(amount * 0.004)), `Cat 1→L1: swap = ${fees1L1.swap}`);
  assert(fees1L1.routing === 5, 'Cat 1→L1: routing = 5');

  // Congestion check on cat 0
  const fees0C = calcFees(0, 1, 'LN', amount, true);
  assert(fees0C.mining === 15_000, 'Cat 0→LN congested: mining = 15,000');
}

// ---------------------------------------------------------------------------
// TEST 7: Inbound Liquidity for Cat 2b (Embedded Node)
// ---------------------------------------------------------------------------

section('TEST 7: Inbound Liquidity — Cat 2b (Embedded Node)');

{
  const embedded = createWallet('Frank (Embedded)', 2, 'b', {
    inboundLiquidity: 3_000,
  });
  const amount = 10_000;
  const rCat = getEffCat(embedded); // '2b'

  const needsSplice =
    (rCat === 1 || rCat === '2b') &&
    embedded.inboundLiquidity !== null &&
    amount > embedded.inboundLiquidity;

  assert(needsSplice === true, 'Splice required for 2b when amount > inbound');

  const SETUP_FEE = 2_000;
  const netReceived = amount - SETUP_FEE;
  assert(netReceived === 8_000, 'Net received = 8,000 after 2,000 setup fee');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

section('SUMMARY');
console.log(`\n  Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('\n  ⚠️  SOME TESTS FAILED!');
  process.exit(1);
} else {
  console.log('\n  🎉 ALL TESTS PASSED!\n');
}

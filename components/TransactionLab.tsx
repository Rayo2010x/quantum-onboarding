/**
 * QuantumBTC — Transaction Lab Root Orchestrator
 *
 * Composes the Transaction Simulator dashboard from sub-components:
 * - Sidebar (controls, wallet CRUD, detail panel)
 * - CanvasArea (interactive infrastructure nodes, draggable tokens, SVG paths)
 * - PlaybackPanel (step navigation)
 *
 * @see QL_Transaction_Lab_Spec.md §3 — Component Architecture
 */
'use client';
import React from 'react';
import styles from './TransactionLab.module.css';
import { useTransactionLabState } from './TransactionLab/useTransactionLabState';
import Sidebar from './TransactionLab/Sidebar';
import CanvasArea from './TransactionLab/CanvasArea';
import PlaybackPanel from './TransactionLab/PlaybackPanel';

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
    updateWalletPosition,
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
        {/* Interactive canvas */}
        <div className={styles.canvasContainer}>
          <CanvasArea
            wallets={wallets}
            selectedWalletId={selectedWalletId}
            currentStep={currentStep}
            stepIdx={stepIdx}
            onSelectWallet={selectWallet}
            onUpdateWalletPosition={updateWalletPosition}
            onDeleteWallet={deleteWallet}
          />
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

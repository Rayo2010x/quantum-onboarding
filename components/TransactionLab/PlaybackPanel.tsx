/**
 * QuantumBTC — Transaction Lab Playback Panel
 *
 * Bottom-bar component showing the current simulation step description
 * and Back/Next navigation buttons.
 *
 * Uses a safe JSX parser (`renderSafeStepText`) instead of
 * `dangerouslySetInnerHTML` to prevent XSS — wallet names are user input
 * and flow into step text via `<strong>` tags.
 *
 * @see QL_Transaction_Lab_Spec.md §3.1 — PlaybackPanel
 */
import React from 'react';
import styles from './PlaybackPanel.module.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlaybackPanelProps {
  /** Raw step text — may contain `<strong>` markup. `null` when idle. */
  stepText: string | null;
  /** Step title (e.g. "Broadcasting", "Splice-In"). `null` when idle. */
  stepTitle: string | null;
  /** Whether the Back button should be enabled. */
  canGoBack: boolean;
  /** Whether the Next button should be enabled. */
  canGoNext: boolean;
  /** Navigate to the previous step. */
  onPrev: () => void;
  /** Advance to the next step. */
  onNext: () => void;
}

// ---------------------------------------------------------------------------
// Safe HTML → JSX parser (XSS prevention)
// ---------------------------------------------------------------------------

/**
 * Splits a string by `<strong>...</strong>` tags and returns React elements.
 * Content inside `<strong>` tags is rendered as `<strong>` JSX elements.
 * All other text is rendered as plain text, automatically escaped by React.
 *
 * This prevents XSS when step text contains user-supplied wallet names.
 */
function renderSafeStepText(text: string): React.ReactNode {
  const parts = text.split(/(<strong>.*?<\/strong>)/g);
  return parts.map((part, index) => {
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      const innerText = part.slice(8, -9);
      return <strong key={index}>{innerText}</strong>;
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_TEXT = 'ℹ️ Click a wallet on the board to generate a receive code, or click to send if a code is already active.';

export default function PlaybackPanel({
  stepText,
  stepTitle,
  canGoBack,
  canGoNext,
  onPrev,
  onNext,
}: PlaybackPanelProps) {
  const isActive = stepText !== null;

  return (
    <div className={styles.panel} role="region" aria-label="Playback controls">
      <div className={styles.stepText}>
        {isActive && stepTitle && (
          <span className={styles.stepTitle}>{stepTitle}: </span>
        )}
        {isActive ? renderSafeStepText(stepText) : DEFAULT_TEXT}
      </div>

      <div className={styles.controls}>
        <button
          className={styles.btnSecondary}
          onClick={onPrev}
          disabled={!canGoBack}
          aria-label="Previous step"
        >
          ⏮ Back
        </button>
        <button
          className={styles.btnPrimary}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next step"
        >
          Next ⏭
        </button>
      </div>
    </div>
  );
}

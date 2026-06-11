'use client';
import React from 'react';
import styles from './TransactionLab.module.css';

/**
 * TransactionLab — placeholder shell for the Transaction Simulator tab.
 *
 * This component will be replaced with the full interactive simulator
 * as defined in QL_Transaction_Lab_Spec.md (Section 3 — Component Architecture).
 */
export default function TransactionLab() {
    return (
        <section className={styles.container} aria-label="Transaction Lab">
            <h2 className={styles.heading}>⚡ Transaction Lab</h2>
            <p className={styles.description}>
                Interactive Bitcoin transaction simulator — coming soon.
            </p>
        </section>
    );
}

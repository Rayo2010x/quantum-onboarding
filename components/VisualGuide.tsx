import React from 'react';
import styles from './VisualGuide.module.css';

export default function VisualGuide({ dict }: { dict: any }) {
    return (
        <section className={styles.guideContainer}>
            <h2 className={styles.sectionTitle}>{dict.title}</h2>

            <div className={styles.cardsGrid}>
                {/* Layer 1 Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.iconBase} ${styles.l1Icon}`}>L1</div>
                        <h3 className={styles.cardTitle}>Bitcoin (Vault)</h3>
                    </div>
                    <p className={styles.cardContent}>{dict.l1}</p>
                </div>

                {/* Layer 2 Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.iconBase} ${styles.l2Icon}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 3L4 14h7v7l9-11h-7V3z" />
                            </svg>
                        </div>
                        <h3 className={styles.cardTitle}>Lightning (Pocket)</h3>
                    </div>
                    <p className={styles.cardContent}>{dict.l2}</p>
                </div>
            </div>
        </section>
    );
}

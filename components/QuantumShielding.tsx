import React from 'react';
import styles from './QuantumShielding.module.css';

export default function QuantumShielding({ dict }: { dict: any }) {
    if (!dict) return null;

    return (
        <section className={styles.container}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>
                </div>
                <h2 className={styles.title}>{dict.title}</h2>
                <p className={styles.intro}>{dict.intro}</p>
            </div>

            <div className={styles.grid}>
                {/* Section 1 */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>{dict.title1}</h3>
                    <p className={styles.cardText}>{dict.desc1}</p>
                    <ul className={styles.list}>
                        <li>{dict.bullet1_1}</li>
                        <li className={styles.warning}>{dict.bullet1_2}</li>
                    </ul>
                </div>

                {/* Section 2 */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>{dict.title2}</h3>
                    <div className={styles.strategyItem}>
                        <h4>BIP-360</h4>
                        <p>{dict.bip360}</p>
                    </div>
                    <div className={styles.strategyItem}>
                        <h4>Commit-then-Reveal</h4>
                        <p>{dict.commit}</p>
                    </div>
                </div>

                {/* Section 3 */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>{dict.title3}</h3>
                    <p className={styles.cardText}>{dict.strategy}</p>
                </div>

                {/* Section 4 */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>{dict.title4}</h3>
                    <ol className={styles.numberedList}>
                        <li>{dict.step1}</li>
                        <li>{dict.step2}</li>
                        <li>{dict.step3}</li>
                        <li>{dict.step4}</li>
                    </ol>
                </div>
            </div>

            <div className={styles.conclusion}>
                <p>{dict.conclusion}</p>
            </div>
        </section>
    );
}

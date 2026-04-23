import React from 'react';
import styles from './Manifesto.module.css';

export default function Manifesto({ dict }: { dict: any }) {
    return (
        <section className={styles.manifestoContainer}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <h2 className={styles.title}>{dict.title}</h2>
                <p className={styles.content}>{dict.content}</p>
                <div className={styles.buttonGroup}>
                    <a href="https://github.com/Rayo2010x/the_sword_of_damocles" target="_blank" rel="noopener noreferrer" className={`${styles.ctaButton} ${styles.secondary}`}>
                        🛡️ Read 'The Sword of Damocles'
                    </a>
                    <a href="https://quantumbtc.dev" target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
                        ⚡ Start the LN Stress-Test
                    </a>
                </div>
            </div>
        </section>
    );
}

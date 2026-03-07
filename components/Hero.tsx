import React from 'react';
import styles from './Hero.module.css';

export default function Hero({ dict }: { dict: any }) {
    return (
        <section className={styles.heroContainer}>
            <div className={styles.glowBlob}></div>
            <div className={styles.content}>
                <h1 className={styles.title}>{dict.title}</h1>
                <h2 className={styles.subtitle}>{dict.subtitle}</h2>
                <p className={styles.description}>{dict.description}</p>
                <div className={styles.ctaWrapper}>
                    <a href="https://quantumbtc.dev" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
                        {dict.cta}
                    </a>
                </div>
            </div>
        </section>
    );
}

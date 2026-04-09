import React from 'react';
import styles from './BrandHero.module.css';

/**
 * BrandHero — Tab 1 "Overview" hero section for learn.quantumbtc.dev.
 *
 * Replicates the Logo + Banner pattern from quantumbtc.dev's WhitePaper tab:
 * - Full-width og-image banner with gradient overlay
 * - Logo (favicon.png) overlapping the banner's bottom edge
 * - Project title + tagline
 */
export default function BrandHero() {
    return (
        <div className={styles.heroWrapper}>
            {/* Banner Image */}
            <div className={styles.bannerContainer}>
                <img
                    src="/og-image.png"
                    alt="QuantumBTC — Securing Satoshi's Vision in the Quantum Era"
                    className={styles.bannerImage}
                />
                {/* Gradient overlay — blends banner into page background */}
                <div className={styles.bannerOverlay} />
            </div>

            {/* Logo — centered, overlapping the banner bottom edge */}
            <div className={styles.logoWrapper}>
                <div className={styles.logoFrame}>
                    <img
                        src="/favicon.png"
                        alt="QuantumBTC Logo"
                        className={styles.logoImage}
                    />
                </div>
            </div>

            {/* Title + tagline */}
            <div className={styles.titleBlock}>
                <h1 className={styles.title}>
                    Quantum<span className={styles.titleAccent}>BTC</span>
                </h1>
                <p className={styles.tagline}>
                    Securing Satoshi's Vision in the Quantum Era
                </p>
                <a
                    href="https://quantumbtc.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.ctaButton}
                >
                    ⚡ Start the LN Stress-Test
                </a>
            </div>
        </div>
    );
}

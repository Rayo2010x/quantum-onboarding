import React from 'react';
import Image from 'next/image';
import styles from './BrandHero.module.css';

/**
 * BrandHero — Tab 1 "Overview" hero section for learn.quantumbtc.dev.
 *
 * Replicates the Logo + Banner pattern from quantumbtc.dev's WhitePaper tab:
 * - Full-width og-image banner with gradient overlay (served as og-image.webp)
 * - Logo (favicon.png) overlapping the banner's bottom edge
 * - Project title + tagline
 *
 * Uses next/image for automatic WebP conversion, lazy loading, and CLS prevention.
 */
export default function BrandHero() {
    return (
        <div className={styles.heroWrapper}>
            {/* Banner Image — priority loaded as it is the LCP element */}
            <div className={styles.bannerContainer}>
                <Image
                    src="/og-image.webp"
                    alt="QuantumBTC — Securing Satoshi's Vision in the Quantum Era"
                    width={1200}
                    height={630}
                    priority
                    className={styles.bannerImage}
                    style={{ width: '100%', height: 'auto' }}
                />
                {/* Gradient overlay — blends banner into page background */}
                <div className={styles.bannerOverlay} />
            </div>

            {/* Logo — centered, overlapping the banner bottom edge */}
            <div className={styles.logoWrapper}>
                <div className={styles.logoFrame}>
                    <Image
                        src="/favicon.png"
                        alt="QuantumBTC Logo"
                        width={112}
                        height={112}
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

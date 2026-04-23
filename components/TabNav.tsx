'use client';
import React, { useState } from 'react';
import styles from './TabNav.module.css';

export type TabId = 'trilemma' | 'wallets' | 'quantumshield' | 'faq' | 'walletlab';
interface Tab {
    id: TabId;
    label: string;
    icon: string;
}

const TABS: Tab[] = [
    { id: 'trilemma',       label: 'The Sword of Damocles',  icon: '⚔️' },
    { id: 'wallets',       label: 'Wallets',        icon: '👛' },
    { id: 'quantumshield', label: 'QuantumShield',  icon: '🛡️' },
    { id: 'faq',           label: 'FAQ',            icon: '❓' },
    { id: 'walletlab',     label: 'Wallet Lab',     icon: '🔬' },
];

interface TabNavProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleTabClick = (id: TabId) => {
        onTabChange(id);
        setMenuOpen(false); // Close mobile menu after selecting a tab
    };

    return (
        <header className={styles.header}>
            <div className={styles.inner}>

                {/* ── Brand mark ─────────────────────────── */}
                <div className={styles.brand}>
                    <img src="/favicon.png" alt="QuantumBTC" className={styles.brandIcon} />
                    <span className={styles.brandName}>QuantumBTC</span>
                </div>

                {/* ── Desktop tab bar (hidden on mobile) ─── */}
                <nav className={styles.tabBar} role="tablist" aria-label="Section navigation">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`panel-${tab.id}`}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            onClick={() => handleTabClick(tab.id)}
                        >
                            <span className={styles.tabIcon}>{tab.icon}</span>
                            <span className={styles.tabLabel}>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* ── Hamburger button (visible only on mobile) ── */}
                <button
                    className={styles.hamburger}
                    aria-label="Open navigation menu"
                    aria-expanded={menuOpen}
                    aria-controls="mobile-menu"
                    onClick={() => setMenuOpen((prev) => !prev)}
                >
                    <span className={`${styles.bar} ${menuOpen ? styles.barTop : ''}`} />
                    <span className={`${styles.bar} ${menuOpen ? styles.barMid : ''}`} />
                    <span className={`${styles.bar} ${menuOpen ? styles.barBot : ''}`} />
                </button>
            </div>

            {/* ── Mobile dropdown menu ─────────────────── */}
            {menuOpen && (
                <div id="mobile-menu" className={styles.mobileMenu}>
                    <nav className={styles.mobileNav} role="tablist" aria-label="Section navigation (mobile)">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                id={`tab-mobile-${tab.id}`}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                className={`${styles.mobileTab} ${activeTab === tab.id ? styles.mobileTabActive : ''}`}
                                onClick={() => handleTabClick(tab.id)}
                            >
                                <span className={styles.mobileTabIcon}>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}

'use client';
import React from 'react';
import styles from './TabNav.module.css';

export type TabId = 'overview' | 'l1l2' | 'wallets' | 'quantumshield' | 'faq';

interface Tab {
    id: TabId;
    label: string;
    icon: string;
}

const TABS: Tab[] = [
    { id: 'overview',      label: 'Overview',      icon: '⚡' },
    { id: 'l1l2',         label: 'L1 / L2',       icon: '🔐' },
    { id: 'wallets',      label: 'Wallets',        icon: '👛' },
    { id: 'quantumshield',label: 'QuantumShield',  icon: '🛡️' },
    { id: 'faq',          label: 'FAQ',            icon: '❓' },
];

interface TabNavProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                {/* Brand mark */}
                <div className={styles.brand}>
                    <img src="/favicon.png" alt="QuantumBTC" className={styles.brandIcon} />
                    <span className={styles.brandName}>QuantumBTC</span>
                </div>

                {/* Tab buttons */}
                <nav className={styles.tabBar} role="tablist" aria-label="Section navigation">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`panel-${tab.id}`}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            <span className={styles.tabIcon}>{tab.icon}</span>
                            <span className={styles.tabLabel}>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
}

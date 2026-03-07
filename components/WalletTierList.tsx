import React from 'react';
import styles from './WalletTierList.module.css';

export default function WalletTierList({ dict }: { dict: any }) {
    const wallets = [
        { name: 'Muun Wallet', tier: 'S', type: 'Self-Custody', desc: dict.muun, url: 'https://muun.com' },
        { name: 'Phoenix', tier: 'A', type: 'Self-Custody', desc: dict.phoenix, url: 'https://phoenix.acinq.co' },
        { name: 'Wallet of Satoshi', tier: 'B', type: 'Custodial', desc: dict.wos, url: 'https://walletofsatoshi.com' }
    ];

    return (
        <section className={styles.tierContainer}>
            <h2 className={styles.title}>{dict.title}</h2>
            <div className={styles.list}>
                {wallets.map((wallet) => (
                    <a key={wallet.name} href={wallet.url} target="_blank" rel="noopener noreferrer" className={styles.walletItem}>
                        <div className={styles.walletHeader}>
                            <span className={`${styles.badge} ${styles['tier' + wallet.tier]}`}>
                                Tier {wallet.tier}
                            </span>
                            <h3 className={styles.walletName}>{wallet.name}</h3>
                            <span className={styles.typeTag}>{wallet.type}</span>
                        </div>
                        <p className={styles.walletDesc}>{wallet.desc}</p>
                    </a>
                ))}
            </div>
        </section>
    );
}

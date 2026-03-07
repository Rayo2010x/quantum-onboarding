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
            </div>
        </section>
    );
}

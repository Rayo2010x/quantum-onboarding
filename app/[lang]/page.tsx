import styles from "./page.module.css";
import React from 'react';
import Hero from "../../components/Hero";
import Manifesto from "../../components/Manifesto";
import VisualGuide from "../../components/VisualGuide";
import WalletTierList from "../../components/WalletTierList";
import FAQ from "../../components/FAQ";

// Using dynamic import of dictionaries
const getDictionary = async (locale: string) => {
    if (locale === 'es') {
        return import("../../dictionaries/es.json").then((module) => module.default);
    }
    return import("../../dictionaries/en.json").then((module) => module.default);
};

export default async function Home({ params }: { params: { lang: string } }) {
    const dict = await getDictionary(params.lang);

    return (
        <main className={styles.main}>
            <nav className={styles.nav}>
                <div className={styles.logo}>⚡ Quantum BTC</div>
                <div className={styles.langSwitch}>
                    <a href="/en" className={params.lang === 'en' ? styles.activeLang : ''}>EN</a>
                    <span>|</span>
                    <a href="/es" className={params.lang === 'es' ? styles.activeLang : ''}>ES</a>
                </div>
            </nav>

            <Hero dict={dict.hero} />
            <Manifesto dict={dict.manifesto} />
            <VisualGuide dict={dict.l1_l2} />
            <WalletTierList dict={dict.wallets} />
            <FAQ dict={dict.faq} />

            <footer className={styles.footer}>
                <p>© 2026 Quantum BTC. Support Post-Quantum Research.</p>
            </footer>
        </main>
    );
}

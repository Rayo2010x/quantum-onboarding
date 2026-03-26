import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
    alternates: {
        canonical: "/",
        languages: {
            en: "/en",
            es: "/es",
        },
    },
};

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.hero}>
                <h1>QuantumBTC</h1>
                <p>The Ultimate Lightning Network Stress-Test</p>
            </div>
        </main>
    );
}

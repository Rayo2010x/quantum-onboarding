import styles from "./page.module.css";

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

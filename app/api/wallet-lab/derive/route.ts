import { NextRequest, NextResponse } from 'next/server';
import { getPublicKey } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { base58check, bech32 } from '@scure/base';

// ── Runtime: Node.js ───────────────────────────────────────────────────
export const runtime = 'nodejs';

// ── Helpers ────────────────────────────────────────────────────────────

function hash160(pub: Uint8Array): Uint8Array {
    return ripemd160(sha256(pub));
}

/**
 * Encode a version-prefixed payload in Base58Check.
 * @scure/base's base58check expects the raw payload WITHOUT the version byte;
 * it prepends the version internally via the hash function context here.
 *
 * In v2 the API is: base58check(sha256).encode(versionedBytes)
 * where the hash is used for the 4-byte checksum.
 */
function encodeBase58Check(version: number, payload: Uint8Array): string {
    const versionedPayload = new Uint8Array(1 + payload.length);
    versionedPayload[0] = version;
    versionedPayload.set(payload, 1);
    // base58check(sha256) returns a codec; .encode() expects the full versioned bytes
    return base58check(sha256).encode(versionedPayload);
}

function encodeBech32Segwit(witnessProgram: Uint8Array): string {
    // bech32 from @scure/base has .encode(prefix, words)
    // For P2WPKH (witness v0), prepend witnessVersion=0 after converting to 5-bit words
    const words = bech32.toWords(witnessProgram);
    return bech32.encode('bc', [0, ...words]);
}

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Core derivation ────────────────────────────────────────────────────

function deriveAddresses(phrase: string): Record<string, string> {
    // Private key = SHA-256(utf8(phrase)) — intentionally insecure, educational only
    const privBytes = sha256(new TextEncoder().encode(phrase));

    // Derive public keys from the secp256k1 curve
    const pubCompBytes   = getPublicKey(privBytes, true);   // compressed  (33 bytes)
    const pubUncompBytes = getPublicKey(privBytes, false);  // uncompressed (65 bytes)

    const pubHex = toHex(pubUncompBytes); // 130 hex chars

    // HASH160 = SHA-256 then RIPEMD-160
    const h160comp   = hash160(pubCompBytes);
    const h160uncomp = hash160(pubUncompBytes);

    // 1. Legacy P2PKH — uncompressed (1…)
    const legacyUncomp = encodeBase58Check(0x00, h160uncomp);

    // 2. Legacy P2PKH — compressed (1…)
    const legacyComp = encodeBase58Check(0x00, h160comp);

    // 3. P2SH-P2WPKH (3…)
    //    Redeem script = OP_0 (0x00) || PUSH20 (0x14) || hash160(compressed_pubkey)
    const redeemScript = new Uint8Array(2 + h160comp.length);
    redeemScript[0] = 0x00;
    redeemScript[1] = 0x14;
    redeemScript.set(h160comp, 2);
    const p2sh = encodeBase58Check(0x05, hash160(redeemScript));

    // 4. Native SegWit P2WPKH bech32 (bc1q…)
    const bech32Addr = encodeBech32Segwit(h160comp);

    // 5. P2PK scripthash for mempool.space scripthash API
    //    P2PK script = OP_PUSHDATA(65) || uncompressed_pubkey || OP_CHECKSIG
    const p2pkScript = new Uint8Array(1 + pubUncompBytes.length + 1);
    p2pkScript[0] = 0x41;
    p2pkScript.set(pubUncompBytes, 1);
    p2pkScript[1 + pubUncompBytes.length] = 0xac;
    const p2pkScriptSHA = sha256(p2pkScript);
    // mempool.space requires little-endian (reversed) SHA-256 of the script
    const p2pkScripthash = toHex(p2pkScriptSHA.slice().reverse());

    // ⚠️  Security: zero out the private key buffer immediately after use
    privBytes.fill(0);

    return {
        pubkey_hex:      pubHex,
        p2pk_scripthash: p2pkScripthash,
        legacy_uncomp:   legacyUncomp,
        legacy_comp:     legacyComp,
        p2sh:            p2sh,
        bech32:          bech32Addr,
    };
}

// ── Route handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null || !('phrase' in body)) {
        return NextResponse.json({ error: 'Missing "phrase" field.' }, { status: 400 });
    }

    const phrase = String((body as Record<string, unknown>).phrase).trim();

    if (!phrase) {
        return NextResponse.json({ error: 'Phrase cannot be empty.' }, { status: 400 });
    }
    if (phrase.length > 500) {
        return NextResponse.json({ error: 'Phrase exceeds maximum length of 500 characters.' }, { status: 400 });
    }

    try {
        const result = deriveAddresses(phrase);
        return NextResponse.json(result);
    } catch (err) {
        // Do NOT expose error details that might hint at key material
        console.error('[wallet-lab/derive] Derivation error:', err instanceof Error ? err.message : 'unknown');
        return NextResponse.json({ error: 'Key derivation failed. Please try again.' }, { status: 500 });
    }
}

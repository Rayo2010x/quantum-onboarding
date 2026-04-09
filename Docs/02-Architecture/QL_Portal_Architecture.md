# QL_Portal_Architecture — QuantumBTC Onboarding Portal

> **ID:** QL_Portal_Architecture
> **Version:** 1.1
> **Last Updated:** 2026-04-09
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

The page is a **5-tab SPA** driven by React `useState` in `page.tsx`. `'use client'` is required.

| Tab ID | Label | Primary Component |
| :--- | :--- | :--- |
| `overview` | Overview | `BrandHero` + `Manifesto` |
| `l1l2` | L1 / L2 | `VisualGuide` |
| `wallets` | Wallets | `WalletTierList` |
| `quantumshield` | QuantumShield | `QuantumShielding` |
| `faq` | FAQ | `FAQ` |

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

## 7. Deployment

- Git repository: `onboarding-portal/` subfolder within `quantum-btc-marketing/`.
- Deployments are triggered by git push to `main` branch.
- See `QL_Operations_Manual.md` for deployment procedures.

# QL_SEO_Strategy — QuantumBTC Onboarding Portal

> **ID:** QL_SEO_Strategy
> **Version:** 1.0
> **Last Updated:** 2026-04-09
> **Status:** APPROVED

## 1. Objective

Document the SEO strategy for `learn.quantumbtc.dev`, ensuring consistent indexing, strong keyword positioning, and technical compliance.

## 2. Keyword Strategy

| Keyword | Intent | Priority |
| :--- | :--- | :--- |
| `QuantumBTC` | Brand | Critical |
| `Bitcoin post-quantum security` | Informational | High |
| `Lightning Network stress test` | Informational | High |
| `quantum resistant Bitcoin` | Informational | High |
| `post-quantum cryptography Bitcoin` | Informational | Medium |
| `Bitcoin wallet quantum threat` | Informational | Medium |
| `Lightning Network onboarding` | Navigational | Medium |
| `learn.quantumbtc.dev` | Navigational | High |

## 3. Technical SEO Implementation

### 3.1 Metadata (app/layout.tsx)
- `<title>`: `QuantumBTC | Secure Bitcoin's Future Against the Quantum Threat`
- `<meta name="description">`: Includes brand name and primary keywords.
- Canonical: `https://learn.quantumbtc.dev` (no trailing slash).
- `robots`: `index, follow`.

### 3.2 Open Graph
- `og:title`, `og:description`, `og:image` (`/og-image.png`, 1200×630), `og:url` fully configured.
- Twitter Card: `summary_large_image`.

### 3.3 Core Web Vitals
- Next.js App Router with SSR ensures fast First Contentful Paint (FCP).
- `next/font` for Inter (eliminates FOUT/CLS from font loading).
- Images in `/public` served statically — no external CDN dependencies.

### 3.4 Crawlability
- `robots.ts`: Allows all crawlers.
- `sitemap.ts`: Exposes root URL.
- `next.config.js`: 301 redirects from `/en` and `/es` → `/` to resolve Google Search Console duplicate canonical issues.

### 3.5 Google Search Console
- Ownership verification token: (configured in `layout.tsx` `verification.google` field).
- Known issue (resolved): Multilingual routes caused "Duplicate without user-selected canonical."

## 4. Inter-Property SEO Alignment

Both `quantumbtc.dev` and `learn.quantumbtc.dev` must maintain:
- Identical brand name spelling: **QuantumBTC** (no spaces, no hyphens).
- Consistent OG image and favicon.
- Reciprocal internal linking (Hero CTA on `learn.` links to `quantumbtc.dev`).

## 5. Future SEO Actions

| Action | Status | Reference |
| :--- | :--- | :--- |
| JSON-LD structured data (`Organization`, `WebSite`) | Pending | QL-013 in Backlog |
| Blog / Research content for long-tail keywords | Pending | QL-008 in Backlog |
| Sitemap expansion for future routes | Pending | QL-014 in Backlog |

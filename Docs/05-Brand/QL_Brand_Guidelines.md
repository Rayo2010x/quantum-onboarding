# QL_Brand_Guidelines — QuantumBTC Brand Identity

> **ID:** QL_Brand_Guidelines
> **Version:** 1.0
> **Last Updated:** 2026-04-09
> **Status:** APPROVED

## 1. Identity Rules

### 1.1 Project Name
- **Correct:** `QuantumBTC` — one word, no space, no hyphen, capital Q and BTC.
- **Incorrect:** ~~Quantum BTC~~, ~~Quantum-BTC~~, ~~QBTC~~, ~~quantum btc~~.

### 1.2 Tagline
- **Primary:** `Securing Satoshi's Vision in the Quantum Era`
- **Signature:** `In Satoshi We Trust. In Code We Verify.`

---

## 2. Color Palette

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--background` | `#0a0a0a` | Page/app background |
| `--foreground` | `#ededed` | Primary text |
| `--primary` | `#f7931a` | Bitcoin Orange — CTAs, active states, accents |
| `--primary-hover` | `#e08210` | Hover state of primary |
| `--accent` | `#8b5cf6` | Electric Violet — gradient secondary, highlights |

**Gradient (title accent):**
```css
background: linear-gradient(135deg, #f7931a 0%, #8b5cf6 100%);
```

---

## 3. Typography

| Role | Font | Weight | Notes |
| :--- | :--- | :--- | :--- |
| Body | Inter (Google Fonts) | 400 | Via `next/font/google` |
| Headings | Inter | 700–800 | Letter-spacing: `-0.04em` |
| Monospace | System mono | 400 | For addresses, hashes |

---

## 4. Logo

- **File:** `/public/favicon.png`
- **Dimensions:** 96×96 px (square)
- **Usage:** Always displayed on a dark background.
- **Clear space:** Minimum 8px on all sides.
- **Do not:** Stretch, recolor, or place on a light background without a dark frame.

**Logo Frame (for UI use):**
```css
padding: 6px;
border-radius: 1rem;
background: rgba(10, 10, 10, 0.85);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 0 40px rgba(247, 147, 26, 0.2);
backdrop-filter: blur(8px);
```

---

## 5. Open Graph / Social Image

- **File:** `/public/og-image.png`
- **Dimensions:** 1200×630 px
- **Used for:** OG image on both `quantumbtc.dev` and `learn.quantumbtc.dev`.
- **Alt text:** `QuantumBTC — Securing Satoshi's Vision in the Quantum Era`

---

## 6. Asset Locations

| Asset | Path (Backend) | Path (Marketing Portal) |
| :--- | :--- | :--- |
| Logo | `frontend/public/favicon.png` | `onboarding-portal/public/favicon.png` |
| OG Image | `frontend/public/og-image.png` | `onboarding-portal/public/og-image.png` |

> **Rule:** Both repositories must always carry identical copies of `favicon.png` and `og-image.png`.

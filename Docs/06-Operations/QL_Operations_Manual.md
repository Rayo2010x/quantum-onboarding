# QL_Operations_Manual — QuantumBTC Onboarding Portal

> **ID:** QL_Operations_Manual
> **Version:** 1.0
> **Last Updated:** 2026-04-09
> **Status:** APPROVED

## 1. Overview

This document defines the operational procedures for deploying and maintaining `learn.quantumbtc.dev` (the QuantumBTC Onboarding Portal).

## 2. Repository Structure

| Path | Description |
| :--- | :--- |
| `C:\Dev\quantum-btc-marketing\onboarding-portal\` | Next.js application (git repository) |
| `C:\Dev\quantum-btc-marketing\Docs\` | Technical documentation (tracked by onboarding-portal git) |
| `C:\Dev\quantum-btc-marketing\MKT_Docs\` | Marketing strategy documents |

> **Note:** `quantum-btc-marketing/` root is **not** a separate git repository. All version control is managed through `onboarding-portal/.git`.

## 3. Git Workflow

```bash
# Navigate to the portal repository
cd C:\Dev\quantum-btc-marketing\onboarding-portal

# Stage all changes (includes ../Docs/ via relative path)
git add .

# Commit with descriptive message
git commit -m "[scope]: descriptive message"

# Push to main branch
git branch -M main
git push -u origin main
```

### Quick Push (using push.bat)
```bat
# From onboarding-portal directory:
push.bat
```
> ⚠️ Update the commit message in `push.bat` before each push — it currently has a hardcoded message.

## 4. Development Server

```bash
cd C:\Dev\quantum-btc-marketing\onboarding-portal
npm run dev
# Access at: http://localhost:3000
```

## 5. Production Build

```bash
npm run build
npm run start
```

## 6. Deployment

- Deployments are triggered automatically on `git push` to `main`.
- Hosting provider: Vercel (linked to the `onboarding-portal` repository root).
- Domain: `learn.quantumbtc.dev`

## 7. Environment Notes

- No secret environment variables required (no backend API calls from the portal).
- All content is static (dictionary-driven via `dictionaries/en.json`).

## 8. Critical Files — Do Not Delete

| File | Reason |
| :--- | :--- |
| `public/favicon.png` | Brand logo; also used as apple-touch-icon |
| `public/og-image.png` | OG social sharing image |
| `app/layout.tsx` | Global metadata and Google Search Console verification |
| `next.config.js` | Critical 301 redirects for SEO |

## 9. Commit Message Conventions

| Prefix | Usage |
| :--- | :--- |
| `feat:` | New feature or page section |
| `fix:` | Bug fix |
| `style:` | CSS/layout changes only |
| `docs:` | Documentation-only changes |
| `seo:` | SEO metadata, sitemap, robots changes |
| `refactor:` | Code restructuring without behavior change |
| `chore:` | Dependency updates, tooling |

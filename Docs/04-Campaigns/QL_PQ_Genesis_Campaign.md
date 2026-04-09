# QL_PQ_Genesis_Campaign — Post-Quantum Genesis Campaign

> **ID:** QL_PQ_Genesis_Campaign
> **Version:** 1.0
> **Last Updated:** 2026-04-09
> **Status:** APPROVED

## 1. Overview

The **Post-Quantum Genesis** campaign is QuantumBTC's inaugural awareness and reward initiative. It runs in parallel with the backend campaign managed in `QM_Post_Quantum_Genesis.md`.

This document covers the **marketing and portal-side** aspects of the campaign.

## 2. Campaign Goals

| Goal | Metric | Target |
| :--- | :--- | :--- |
| Brand awareness | Unique visitors to `learn.quantumbtc.dev` | 10,000 / month |
| Community growth | Discord + Telegram members | 1,000 total |
| LN onboarding | CTA clicks from portal → `quantumbtc.dev` | 15% conversion |
| Stress-test participation | Registered LN addresses | 500 unique |

## 3. Campaign Messaging

- **Hook:** "The first 1,000 Bitcoin addresses registered in the QuantumBTC stress-test earn a share of the future post-quantum reward."
- **Supporting message:** "Every transaction is a vote for Bitcoin's survival."
- **CTA:** "Register your Lightning address at quantumbtc.dev →"

## 4. Distribution Channels

| Channel | Content Type | Frequency |
| :--- | :--- | :--- |
| Nostr | Research updates, technical threads | Weekly |
| X (Twitter) | Short-form announcements, milestones | 3x / week |
| Discord | Community discussion, Q&A | Daily |
| Telegram | Announcements | On milestone events |
| GitHub | Code releases, documentation | On release |

## 5. Portal Integration

The campaign banner visible on `quantumbtc.dev` frontend (`CampaignBanner.tsx`) directs users to register. The portal `learn.quantumbtc.dev` supports campaign discovery by:
- Hero CTA button: "Start the LN Stress-Test" → `https://quantumbtc.dev`
- QuantumShield tab Step 4: "Support the stress-test at quantumbtc.dev"

## 6. Campaign Status

> Refer to `QM_Post_Quantum_Genesis.md` in the backend repository for real-time registration data and reward pool status.

> **ID:** QL_Transaction_Lab_Spec
> **Version:** 0.2
> **Last Updated:** 2026-06-11
> **Status:** DRAFT

# Technical Specification & Development Rules: Transaction Lab

This document defines the structural architecture, interface design, and development rules for porting the vanilla Bitcoin Transaction Simulator (`bitcoin_transaction_simulator.html`) to a React component (`TransactionLab.tsx`) within the QuantumBTC Onboarding Portal.

---

## 1. Core Development Rules

All developers and sub-conversations executing code changes must strictly adhere to the following rules:

### I. Naming & Branding Rules
* **Brand Identity:** The project name must always be represented as **"QuantumBTC"** in all code, comments, classes, logs, and interfaces. Never use "Quantum BTC" or "Quantum-BTC".
* **Project Prefixes:** Any accompanying documents must continue to use the `QL_` prefix.

### II. Language Constraints
* **English Only:** All code variables, components, functions, comments, logs, and UI strings must be written in English. UI text must reside in the English localization dictionary files where appropriate, or as constants inside the components.

### III. React Declarative State Rule
* **No Direct DOM Manipulation:** Direct DOM methods such as `document.getElementById()`, `document.querySelector()`, `element.classList`, or manual style injection are strictly forbidden. 
* **State as SSOT:** All UI states, dragging offsets, selected wallets, active codes, and connection pathways must be governed by React state (`useState`, `useReducer`, or custom hooks).
* **React Refs:** Refs (`useRef`) may only be used to read dimensions (such as `getBoundingClientRect()`) of elements on the canvas to calculate relative SVG path coordinates.

### IV. Styling & Design Tokens Rule
* **No Inline Style Colors:** Do not hardcode colors. Use CSS custom properties defined in `app/globals.css` (e.g., `--background`, `--primary`, `--accent`, `--border`, `--success`, `--danger`).
* **CSS Modules:** Styling must be written in vanilla CSS using CSS Modules. Do not introduce Tailwind CSS or utility-first frameworks.

### V. Input & Error Handling Rules
* **No `alert()` Calls:** Replace all legacy `alert()` dialogs with in-UI validation feedback (e.g., inline warning text beneath inputs, or custom modal panels within the details view).
* **Robust Input Validation:** Validate wallet names, custom transaction amounts, and liquidity values to prevent UI crashes, overflow numbers, or visual breakdown.

### VI. TypeScript Strictness
* **No `any` Types:** All state structures, event handlers, and data models must be fully typed. Use explicit union types and interfaces for the domain model.

### VII. Simulator Reference & Logical Consistency Rules
* **Source Reference:** The primary reference code is: `c:\Dev\quantum-btc-marketing\onboarding-portal\Docs\assets\bitcoin_transaction_simulator.html`.
* **Logical Validation & Realism:** Do not copy reference code blindly. The developer agent must review every process to ensure it is logically consistent and reflects actual Bitcoin L1/L2 network operations. If any simulated behavior appears illogical or unrealistic, the agent must raise questions for clarification before proceeding.
* **Canvas Directionality & Animation Rules:**
  - **Dashed Connectors:** An active process between entities (wallets and nodes) must be visualised using a dashed line segment with an arrowhead (`----->`) pointing in the direction of value or information flow.
  - **Action Responsibility:** Playback descriptions and step bubbles must describe the actions of the entity at the *start* (origin) of the arrow. The entity at the origin is the one performing the action and passing information to the next entity.

---

## 2. Domain & State Models

### 2.1 Technology Categories
Wallets are classified into six technology categories:
* `0`: L1 On-Chain (via Swap)
* `1`: Native Lightning (Auto-LSP)
* `2`: Own-Node Lightning (Advanced)
  * Sub-mode `a`: Remote Node (Sovereign Routing)
  * Sub-mode `b`: Embedded Node (LSP-Assisted)
* `3`: Hybrid On-Chain/Swaps (Muun Style)
* `4`: Ecash / Chaumian Mint (Cashu Style)
* `5`: Pure Custodial (Centralized)

### 2.2 Payment Code Types
Interaction begins when a receiving wallet generates a payment code. The supported types are:
* `L1`: Pay-to-Witness-PubKey-Hash / Taproot address (`bc1...`) — Static (sender defines amount)
* `LN`: BOLT11 Invoice — Dynamic (amount baked in by receiver)
* `LNURL`: Lightning Address — Static (sender defines amount)
* `ECASH`: NUT-18 Payment Request — Static (sender defines amount)

---

## 3. Component Architecture

To maintain readability and clean separation of concerns, the module must be decomposed as follows:

```
components/TransactionLab/
├── types.ts                    ← Data structures and union types
├── useTransactionLabState.ts   ← Custom state hook (pure business logic)
├── TransactionLab.tsx          ← Root orchestrator component
├── TransactionLab.module.css   ← Grid layout and container styles
├── Sidebar.tsx                 ← Wallet creator & list controls
├── CanvasArea.tsx              ← Fixed infrastructure and draggable wallet tokens
├── PlaybackPanel.tsx           ← Text explanation and step navigation
└── Legend.tsx                  ← Key for technology colors
```

### 3.1 Component Breakdown

#### 1. `useTransactionLabState.ts`
Holds the core state and exports functions to modify it. It contains:
* Initial wallet list:
  - Alice (Phoenix, Cat `1`)
  - Bob (Muun, Cat `3`)
  - Charlie (Cashu, Cat `4`)
  - Treasury (Cold, Cat `0`)
* Transition formulas for simulating transaction flows, updating balances, checking inbound liquidity, and generating playback steps.

#### 2. `CanvasArea.tsx`
Renders the relative-positioned drag board (100% width/height of available space).
* **Fixed Infrastructure Nodes:** Renders the 7 system nodes (Mempool, Blockchain, LSP Node, Lightning Network, Chaumian Mint, Swap Provider, Custodial Servers) at relative coordinates.
* **Draggable Wallet Tokens:** Rendered at coordinates `x%` and `y%`. Pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) track dragging coordinates relative to the canvas bounding rect.
* **SVG Layer:** An absolute overlay behind the tokens. Draws the `<path>` line between nodes for the active step. The active line uses `stroke-dasharray` and CSS animation for flow simulation.

#### 3. `Sidebar.tsx`
Provides controls to create new wallets and configure L1 Congestion.
* When a wallet technology option `2` is selected, a conditional drop-down appears to select between mode `2a` (Sovereign) and `2b` (LSP-Assisted).
* Displays the active wallet details panel. If a code is active, renders compatibility checks, warnings, and the "Scan & Pay" trigger.

#### 4. `PlaybackPanel.tsx`
Shows a description of the current step in the process, styled dynamically with highlights, and includes buttons to go back, proceed, or cancel the simulation.

---

## 4. Transaction Engine Flow Formulas

When a transaction is initiated, the engine dynamically generates a series of steps based on the sender's category, the receiver's category, and the payment code type. The rules for routing are:

### 4.1 Compatibility Matrix
Before sending, verify if the sender wallet type is compatible with the code type:
* **Ecash Code (`ECASH`):** Only sender category `4` (Ecash Mint) can pay.
* **L1 Address (`L1`):** All wallets can pay, but:
  - Category `0` & `3` send directly on-chain.
  - Category `1`, `2a`, `2b`, `4`, and `5` require swaps (LN to On-chain) or corporate processing.
* **LN Invoice / LNURL:** Supported by all except category `0`.

### 4.2 Congestion Impact
* When **L1 Congested** is toggled, submarine swap steps must add `15,000 sats` to the transaction cost (representing mining fees). Otherwise, the swap fee defaults to `1,000 sats`.

### 4.3 Inbound Liquidity Rule
* Receiving channels (categories `1` and `2b`) must verify they have sufficient inbound liquidity to receive the transaction amount.
* If inbound liquidity is insufficient, the transaction logic must simulate a **Splice-In** or **On-The-Fly Channel Creation** step, charging the receiver a setup fee (e.g. `2,000 sats`) and increasing their inbound liquidity.

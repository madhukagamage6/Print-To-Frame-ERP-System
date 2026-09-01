# Walkthrough — Single-Page Role-Dedicated Dashboard Architecture

We have transformed the ERP Dashboard into a modern, single-page, clutter-free command center that fits above-the-fold with zero unnecessary vertical scrolling, while strictly confining non-admin users to their single functional category without cross-domain tabs.

---

## 1. Key Upgrades Delivered

### A. Strict Role Locking & Zero Cross-Domain Tabs for Staff
- **Keyword-Aware Domain Resolution (`resolveDashboardDomain`):**
  - Users with roles containing `Sales`, `SNS`, `Social`, `Marketing`, or `Support` are strictly locked to **`crm`** (CRM & Sales).
  - Users with roles containing `Operations`, `Logistics`, `Fabricat`, or `Partner` are locked to **`operations`** (Production & Logistics).
  - Users with `Accounts` or `Billing` are locked to **`finance`** (Finance & Billing).
  - The fallback for unrecognized roles is safely **`crm`** (minimal front-office view, never executive 'all').
- **Hidden Category Switcher Tabs:** Non-admin staff see NO tab switchers. Only verified Super Admins and Operations Managers receive the category selector.

### B. Single-Page 2-Zone Command Center (Fits On Screen)
- **Top 4-Card KPI Strip:** High-impact, domain-specific metrics (e.g. Open Intake Leads, Active Deals, Quoted Value, Customer Accounts).
- **Left Column (65% Width):**
  - Interactive visual pipeline progression bar (clickable stages).
  - **Priority Action Work Queue:** Top 4 actionable tasks with **1-click status advancement buttons** (`Mark Processed`, `Submit 75% Inv`, `Start Job`, `Ready Inspection`, `Send to Fab`).
- **Right Column (35% Width):**
  - **Domain Quick Action Launcher:** 4 elevated shortcut triggers (+ Add Lead, Open Deals, Pricing Estimator, Team Chat).
  - **Smart Attention Box:**
    - For `crm`: **Stale Follow-up Alert Box** (leads stuck in stage $\ge$ 5 days).
    - For `finance`: **Aging Exposure Summary** (0-30d, 31-60d, 61-90d, 90d+ Overdue).
    - For `operations` & `all`: **AI Business Brief**.

### C. Performance & Asset Optimization
- Removed heavy full-width stacked charts and redundant markup.
- Dashboard chunk size reduced by **92.8%** (from `442.60 kB` down to `31.56 kB`), delivering near-instant initial render times.

---

## 2. Validation & Deployment

| Check Item | Validation Method | Result |
|---|---|---|
| **AST Verification** | `scratch/ast_check_dashboard.js` | ✅ 100% clean imports and declarations |
| **Vite Production Build** | `npm run build` | ✅ Built in 14.45s (0 errors) |
| **Git Promotion** | Commit `20ca25d` | ✅ Pushed to `staging` and merged to `main` |

---

## 3. Live Environments
- **Staging Preview:** [https://print-to-frame-erp-git-staging-print-to-frame.vercel.app/](https://print-to-frame-erp-git-staging-print-to-frame.vercel.app/)
- **Production Live:** `portal.print2frame.xyz`

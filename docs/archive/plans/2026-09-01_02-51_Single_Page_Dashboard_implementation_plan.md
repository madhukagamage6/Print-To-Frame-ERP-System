# Implementation Plan — Single-Page Role-Dedicated Dashboard Architecture

## 1. Problem Statement & Objectives
The previous dashboard stacked 7 large sections vertically (> 2500px height), causing visual fatigue and extensive scrolling. Furthermore, non-admin roles (such as Sales Reps and SNS Managers) were presented with cross-domain tab switchers, and unmapped custom roles previously fell back to the executive "All Operations" view due to a permissive fallback.

### Objectives:
1. **Strict Role Locking (No Tabs for Non-Admins):** Non-admin staff (Sales, SNS Managers, Operations, Accounts) see ONLY their dedicated functional command center with no switchable tabs.
2. **Robust Keyword-Aware Role Resolution:** Ensure roles like `"SNS Manager"`, `"Sales Representative"`, `"Social Media"`, and `"Marketing"` strictly resolve to `"crm"`. The fail-safe default is always `"crm"`, never `"all"`.
3. **Single-Page SaaS Ergonomics (Zero Scroll Clutter):** Re-architect the dashboard into a standard 2-zone command center:
   - **Zone 1:** Top 4-card KPI metric strip.
   - **Zone 2 (Left 65%):** Visual pipeline status bar + Priority Action work queue with 1-click status advancement buttons.
   - **Zone 3 (Right 35%):** Domain-specific Quick Action Launcher + Smart Attention Alerts & AI Brief.
4. **Admin Executive Mode:** Only Super Admins and Operations Managers retain the multi-domain overview with administrative drill-down tabs.

---

## 2. User Review Required

> [!IMPORTANT]
> **Role Confinement Matrix:**
> - `Sales`, `SNS Manager`, `Support`, `Marketing`, `Business Client` $\rightarrow$ **CRM & Sales Command Center** (Tabs Hidden).
> - `Operations`, `Logistics`, `Partner`, `Workshop Master` $\rightarrow$ **Production & Logistics Command Center** (Tabs Hidden).
> - `Accounts`, `Billing`, `Finance` $\rightarrow$ **Finance & Accounts Command Center** (Tabs Hidden).
> - `Admin`, `Super Admin`, `Manager`, `Director` $\rightarrow$ **Executive Command Center** (Tabs Visible for Admin only).

---

## 3. Proposed Changes

### [MODIFY] [`src/components/dashboard/Dashboard.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/dashboard/Dashboard.jsx)
- Implement `resolveDashboardDomain(role)` with keyword matching (`sales`, `sns`, `social`, `marketing`, `operation`, `logistics`, `account`, `billing`, `admin`).
- Set `isAdmin = resolveDashboardDomain(currentUser?.role) === 'all'`.
- Conditionally render the Category Switcher Toolbar **ONLY if `isAdmin` is true**.
- Reorganize the dashboard layout into a compact single-page 2-zone grid:
  - **Top Bar:** 4 Domain-Specific KPIs.
  - **Left Column:** Interactive Pipeline Progression Bar + Action-Required Priority Queue (4 items with 1-click stage advancement buttons).
  - **Right Column:** Domain Quick Action Launchers + Smart Attention Box (Stale leads for Sales, Pending Dispatch for Ops, Aging alerts for Finance, System Audit stream for Admin).
- Remove redundant full-page vertically stacked blocks for non-admin single views.

---

## 4. Verification Plan

### Automated Tests
- Run `npm run build` to verify clean JSX/Vite compilation.
- Run AST syntax checks to verify zero missing imports or undeclared variables.

### Manual Verification
- Test with `currentUser = { role: 'SNS Manager' }` $\rightarrow$ Verify CRM & Sales view renders without category tabs.
- Test with `currentUser = { role: 'Operations' }` $\rightarrow$ Verify Workshop & Logistics view renders without tabs.
- Test with `currentUser = { role: 'Accounts' }` $\rightarrow$ Verify Finance view renders without tabs.
- Test with `currentUser = { role: 'Admin' }` $\rightarrow$ Verify Executive Command Center renders with Admin tabs.
- Verify entire view fits on screen with minimal/zero vertical scrolling.

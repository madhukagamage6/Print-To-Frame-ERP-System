# Implementation Plan — Complete Design & Layout Harmonization

Synchronize the styling, layout, and visual architecture across **Dashboard**, **Notifications**, **Messages (Main & Mini)**, and **System Overview** to strictly match the authoritative ERP Design System established in **Leads**, **Deals**, **Customers**, **Partners**, and **User Management**.

## User Review Required

> [!IMPORTANT]
> **Comprehensive Harmonization Scope**:
> 1. **Dashboard Module (`Dashboard.jsx`)**:
>    - Standard `<PageHeader>` with real-time operational KPI pills (`Active Leads`, `Pipeline Deals`, `Ongoing Fabrication`, `Pending Logistics`, `Pending Revenue`) and AI Strategic Advisor quick-action.
>    - Standard `<FilterBar>` with search and domain tabs: `All Operations`, `CRM & Sales`, `Production & Logistics`, `Finance & Billing`.
>    - Symmetrical 2-column grid with glassmorphic containers and priority action work queues.
> 2. **Notifications Module (`NotificationsView.jsx`)**:
>    - Standard `<PageHeader>` with KPI pills (`Total Alerts`, `Team Messages`, `System Alerts`, `Unread`) and `Clear Alerts` action button.
>    - Standard `<FilterBar>` with search filter and category tabs (`All Activity`, `Team Messages`, `System Alerts`).
>    - Clean glassmorphic feed container with sender `<UserAvatar>`, timestamp chips, and quick-action response triggers.
> 3. **Messages Module (`Messages.jsx` & `MiniChatDrawer.jsx`)**:
>    - **Full-Page (`Messages.jsx`)**: Harmonized to Master-Detail 2-Panel layout (1/3 Colleague Registry $\leftrightarrow$ 2/3 Chat Workspace) with top contact banner, phone/WhatsApp triggers, `<UserAvatar showStatus={true}>`, and glassmorphic input bar.
>    - **Mini Version (`MiniChatDrawer.jsx`)**: Styled with matching cyan glassmorphic borders (`border-primary/40`), contact banner, `<UserAvatar>`, and 1-click expand button.
> 4. **System Overview Module (`AdminPanel.jsx`)**:
>    - Standard `<PageHeader>` with executive KPI pills (`Pipeline Value`, `Invoiced Receivables`, `Database Records`, `System Health: READY`) and `Export CSV` action button.
>    - Standard `<FilterBar>` with domain tabs: `Executive Analytics`, `RBAC Permissions Matrix`, `Database Telemetry`, `Audit Log`.
>    - Standardized card containers and permissions table.

---

## Proposed Changes

### 1. Dashboard Module

#### [MODIFY] [`Dashboard.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/dashboard/Dashboard.jsx)
- Replace ad-hoc `<h1>` with `<PageHeader>` and domain-aware subtitle + executive KPI badges.
- Replace button group with `<FilterBar>` for domain switching and live search.
- Harmonize cards to `bg-surface-container/60 border border-outline-variant/60 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]`.

---

### 2. Notifications Module

#### [MODIFY] [`NotificationsView.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/dashboard/NotificationsView.jsx)
- Integrate `<PageHeader>` with live notification counts and clear-all button.
- Integrate `<FilterBar>` with alert text search and category tabs.
- Restructure feed cards with standardized typography, sender avatars, and action buttons.

---

### 3. Messages Module (Main & Mini)

#### [MODIFY] [`Messages.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/Messages.jsx)
- Standardize `<PageHeader>` and `<FilterBar>`.
- Refactor to Master-Detail 2-Panel layout:
  - Left panel: Colleague directory with `<UserAvatar showStatus={true}>` and unread badges.
  - Right panel: Selected conversation workspace with Top Contact Banner, Call/Email buttons, and message stream.

#### [MODIFY] [`MiniChatDrawer.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/MiniChatDrawer.jsx)
- Harmonize floating drawer container with glassmorphic borders, `<UserAvatar>`, and consistent action buttons.

---

### 4. System Overview Module

#### [MODIFY] [`AdminPanel.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/admin/AdminPanel.jsx)
- Replace custom header with `<PageHeader>` and executive KPI metric pills.
- Add `<FilterBar>` to switch between Executive Analytics, Permissions Matrix, Database Telemetry, and Audit Log.
- Harmonize container borders and table styling.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` in `c:\Users\User\Documents\print-to-frame-erp-system` to ensure 0 compile or syntax errors.

### Manual Verification
1. Test **Dashboard**: Verify `<PageHeader>`, `<FilterBar>` domain switching, and 2-column work queues.
2. Test **Notifications**: Verify `<PageHeader>`, `<FilterBar>`, and notification feed cards.
3. Test **Messages (Main & Mini)**: Verify 2-panel layout on full page and floating drawer on any page.
4. Test **System Overview**: Verify executive metrics, permissions matrix, and database telemetry.
5. Deploy live to production.

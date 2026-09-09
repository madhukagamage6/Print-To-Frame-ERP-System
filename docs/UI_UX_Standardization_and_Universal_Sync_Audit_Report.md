# Comprehensive Frontend UI/UX Standardization & Universal Data Synchronization Audit Report

**Report ID:** PTF-AUDIT-REPORT-2026-09-09  
**System Target:** Print To Frame ERP System  
**Framework:** React 18 + Vite + Tailwind CSS + Firebase (Firestore/Auth/Storage)  
**Date of Audit:** 2026-09-09  
**Status:** Completed Deep-Code Inspection & Architectural Evaluation  

---

## 1. Executive Summary

A comprehensive static and architectural audit was performed on the entire frontend codebase of Print To Frame ERP. The audit evaluated all 23 primary JSX component files, context providers, data synchronization services, design tokens, and shared UI primitives.

The system exhibits strong foundational architecture—particularly its Material Design-flavored Tailwind token setup, real-time Firestore listeners, centralized RBAC permission matrix, and shared UI primitives in `src/components/common/ui/`. However, rapid feature development has led to **two categories of critical findings**:
1. **Frontend UI/UX Standardization Gaps**: Partial adoption of shared primitives (`<PageHeader>`, `<SortableTable>`), low contrast status text in light theme (`[data-theme='light']`), inconsistent mobile Master-Detail behaviors, and monolithic modal code structures.
2. **Universal Synchronization Vulnerabilities**: ID fragmentation across entity conversion lifecycles (`Lead` $\rightarrow$ `Deal` $\rightarrow$ `Project` $\rightarrow$ `Logistics` $\rightarrow$ `Invoice`), case-sensitivity mismatches causing dropped unread badges, loose string-based customer matching, cross-collection profile drift, and mixed timestamp serialization.

Below is the complete inventory of findings, categorized by severity (P1–P4), accompanied by exact code references, root cause analyses, and actionable remediation blueprints.

---

## 2. Issue Taxonomy & Severity Summary Matrix

| Severity | Count | Primary Impact Areas |
| :--- | :---: | :--- |
| **P1 - Critical** | **2** | Cross-module ID fragmentation in lead-to-deal conversions; Case-sensitivity bug dropping unread chat badges. |
| **P2 - High** | **4** | Light mode WCAG AA contrast failures; Missing `<PageHeader>` in Cost Calculator & Quotation Builder; Mobile Master-Detail navigation omission in Invoices; Loose string matching in customer stats. |
| **P3 - Moderate** | **4** | Underutilization of `<SortableTable>`; Monolithic 1,893-line `LeadCardDetails.jsx`; Cross-collection user profile drift; Timestamp serialization fragmentation. |
| **P4 - Polish** | **2** | Notifications "Clear All" state mismatch; Ad-hoc hardcoded cyan shadow RGBA values. |
| **Total Issues** | **12** | Complete remediation roadmap documented below. |

---

## 3. Deep-Dive Findings & Technical Analysis

### Finding 1 [P1 - CRITICAL]: Entity Conversion ID Fragmentation (`leadId` vs `dealId` vs `originalLeadId`)

* **Target Files:**
  * [`src/components/crm/Leads.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Leads.jsx#L496)
  * [`src/components/crm/Deals.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Deals.jsx#L105)
  * [`src/components/crm/QuotationBuilder.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/QuotationBuilder.jsx#L51)
  * [`src/components/crm/LeadCardDetails.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/LeadCardDetails.jsx#L1809)
  * [`src/App.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/App.jsx#L416)
* **Code Evidence:**
  ```javascript
  // Leads.jsx line 496: Converting lead generates a brand new ID
  const newDeal = {
    ...originalLead,
    id: generateDealId(),
    originalLeadId: originalLead.id,
    stage: 'Lead Conversion',
  };

  // Deals.jsx line 105: Consuming component requires 3-way OR condition
  const job = logisticsJobs ? logisticsJobs.find(j => 
    j.dealId === deal.id || j.leadId === deal.id || j.leadId === deal.originalLeadId
  ) : null;

  // QuotationBuilder.jsx line 51:
  const leadQuotes = (allQuotations || []).filter(q => 
    q.leadId === lead.id || q.leadId === lead._firestoreId || q.leadId === lead.originalLeadId
  );
  ```
* **Root Cause:** When an inquiry converts from a Lead to a Deal, a new primary business identifier is assigned (`id: generateDealId()`). Pre-existing invoices, quotations, and logistics dispatches preserve the initial `lead.id`. Subsequent records created under the Deal take `deal.id`. This forces every downstream consumer to implement multi-clause conditional lookups. If any component omits `originalLeadId`, records silently disappear.
* **Remediation Plan:**
  1. Establish a canonical `rootLeadId` or `businessEntityId` property attached at lead creation and permanently preserved across all pipeline states (`Lead` $\rightarrow$ `Deal` $\rightarrow$ `Project` $\rightarrow$ `Logistics`).
  2. Maintain a utility helper `matchesEntity(record, targetId, originalId)` to ensure uniform matching across all CRM modules.

---

### Finding 2 [P1 - CRITICAL]: Case-Sensitivity Mismatch Dropping Unread Message Badges

* **Target Files:**
  * [`src/context/MessagingContext.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/context/MessagingContext.jsx#L116)
  * [`src/components/tools/Messages.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/tools/Messages.jsx#L205)
* **Code Evidence:**
  ```javascript
  // MessagingContext.jsx line 116: Keyed using raw user.identifier casing
  counts[u.identifier] = unread;

  // Messages.jsx lines 205-206: Looked up using strictly lowercased userKey
  const userKey = String(user.identifier).trim().toLowerCase();
  const unread = unreadCounts[userKey] || 0;
  ```
* **Root Cause:** In `MessagingContext.jsx`, `counts` dictionary keys are assigned directly as `u.identifier` (e.g., `Admin@print2frame.xyz` or `PTF-EMP-04`). In `Messages.jsx`, the component attempts to look up `unreadCounts[userKey]` using a normalized lowercase key (`admin@print2frame.xyz`). In JavaScript, object key lookups are strictly case-sensitive. When a user identifier contains uppercase characters, the lookup returns `undefined`, falling back to `0`. Consequently, unread message badges fail to appear on contact list items.
* **Remediation Plan:**
  Update `MessagingContext.jsx` line 116 to normalize keys:
  ```javascript
  counts[String(u.identifier).trim().toLowerCase()] = unread;
  ```

---

### Finding 3 [P2 - HIGH]: Light Theme WCAG AA Contrast Failures in Status Text

* **Target Files:**
  * [`src/components/crm/Invoices.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Invoices.jsx#L543)
  * [`src/components/crm/QuotationBuilder.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/QuotationBuilder.jsx#L21)
  * [`src/components/admin/PermissionsManager.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/admin/PermissionsManager.jsx#L14)
  * [`src/components/admin/AdminPanel.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/admin/AdminPanel.jsx#L177)
* **Code Evidence:**
  ```jsx
  // Invoices.jsx line 543: Raw Tailwind 400 palette
  <p className={`text-[9px] font-bold uppercase tracking-wider ${
    isPaid ? 'text-emerald-400' : isOverdue ? 'text-rose-400' : 'text-amber-400'
  }`}>

  // QuotationBuilder.jsx lines 23-25:
  Sent: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Accepted: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Rejected: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  ```
* **Root Cause:** While [`StatusBadge.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/common/ui/StatusBadge.jsx) correctly uses the adaptive `--color-status-*-on` CSS variables (which switch to dark 700/800-level values in light mode), multiple components bypass `<StatusBadge>` and render inline text using raw `text-emerald-400`, `text-blue-400`, or `text-rose-400`. In `[data-theme='light']`, these pastel shades yield a contrast ratio of only 1.8:1 against white/light-gray backgrounds, severely failing the WCAG AA minimum requirement of 4.5:1.
* **Remediation Plan:**
  1. Replace inline status indicators with `<StatusBadge status={status} size="xs" />`.
  2. For standalone status text, replace `text-emerald-400` with `text-status-success-on`, `text-rose-400` with `text-status-danger-on`, and `text-amber-400` with `text-status-warning-on`.

---

### Finding 4 [P2 - HIGH]: Missing `<PageHeader>` in Cost Calculator & Quotation Builder

* **Target Files:**
  * [`src/components/tools/CostCalculator.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/tools/CostCalculator.jsx#L118)
  * [`src/components/crm/QuotationBuilder.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/QuotationBuilder.jsx#L1)
* **Code Evidence:**
  ```jsx
  // CostCalculator.jsx lines 117-126:
  <div className="h-[calc(100vh-140px)] flex flex-col overflow-y-auto custom-scrollbar pb-8">
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">
          Cost Calculator
        </h1>
        <p className="text-on-surface-variant text-sm">
          Algorithmic steel framing pricing, BOM estimation, QA, and margin calculator.
        </p>
      </div>
      ...
  ```
* **Root Cause:** While all other modules (`Dashboard`, `Leads`, `Deals`, `Invoices`, `FabricationWorks`, `Logistics`, `Partners`, `Customers`, `AdminPanel`, `NotificationsView`, `UserProfile`, `Messages`) use the standardized `<PageHeader>` primitive with live KPI metric pills, `CostCalculator.jsx` renders a custom `<h1>` container and hardcoded `h-[calc(100vh-140px)]` container. On mobile viewports, this hardcoded height clips layout elements because safe areas and navigation heights vary.
* **Remediation Plan:**
  Refactor `CostCalculator.jsx` to render:
  ```jsx
  <PageHeader
    title="Cost Calculator"
    subtitle="Algorithmic steel framing pricing, BOM estimation, QA, and margin calculator."
    metrics={[
      { label: "Active Tier", value: tierInfo.range || "—", color: "cyan" },
      { label: "Base Rate / SqFt", value: `Rs. ${tierInfo.rate || 0}`, color: "emerald" },
      { label: "Calculated SqFt", value: `${totalSqFt} SqFt`, color: "purple" }
    ]}
  />
  ```

---

### Finding 5 [P2 - HIGH]: Master-Detail Mobile Responsiveness Omission in Invoices

* **Target Files:**
  * [`src/components/crm/Invoices.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Invoices.jsx#L468)
  * [`src/components/crm/Customers.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Customers.jsx#L532)
  * [`src/components/crm/Partners.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Partners.jsx#L955)
  * [`src/components/tools/Messages.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/tools/Messages.jsx#L184)
* **Code Evidence:**
  ```jsx
  // Invoices.jsx lines 468-470:
  <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden min-h-0">
    <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant/60 ...">
      ...
    </div>
    <div className="w-full lg:w-2/3 h-full">
      {selectedInvoice ? (...) : (...)}
    </div>
  </div>
  ```
* **Root Cause:** In `Customers.jsx`, `Partners.jsx`, and `Messages.jsx`, a two-state responsive mobile controller (`mobileView === 'list' ? 'hidden lg:block' : 'block'`) is implemented with a "Back to List" button. In `Invoices.jsx`, both columns remain displayed simultaneously in a vertical flex stack on mobile (`flex-col lg:flex-row`). As a result, mobile users must scroll past every invoice in the list before they can view the selected invoice preview below.
* **Remediation Plan:**
  Implement the standard `mobileView` pattern in `Invoices.jsx`:
  1. Add `const [mobileView, setMobileView] = useState('list');`.
  2. When selecting an invoice, execute `setSelectedInvoice(inv); setMobileView('detail');`.
  3. Hide the list column when `mobileView === 'detail'` on mobile viewports (`lg:hidden`).
  4. Provide a "Back to Invoices" button at the top of the detail inspector on mobile.

---

### Finding 6 [P2 - HIGH]: Loose String Relational Matching in Customer Profile Sync

* **Target Files:**
  * [`src/components/crm/Customers.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Customers.jsx#L258)
* **Code Evidence:**
  ```javascript
  // Customers.jsx lines 258-272:
  const matches = (dataStore.leads || []).filter(l => 
    (l.email && l.email === customer.email) ||
    (l.phone && l.phone === customer.phone) ||
    (l.name && l.name === customer.name)
  );

  const invoices = (dataStore.invoices || []).filter(inv => 
    inv.customerName === customer.name || 
    (inv.leadId && matches.some(m => m.id === inv.leadId))
  );

  const projects = (dataStore.projects || []).filter(proj => 
    proj.clientNIC === customer.nic || proj.customerName === customer.name
  );
  ```
* **Root Cause:** Rather than linking records via immutable primary keys (`customer.nic` or `customerId`), customer metrics and transaction timelines rely on string matching across `name`, `phone`, and `email`. If a customer's name is edited (e.g. adding a company name or correcting a spelling), or if two different customers share a common first name, orders and invoices become disconnected or cross-pollinated.
* **Remediation Plan:**
  1. Enforce that all leads, deals, projects, and invoices store a foreign key `clientNIC: customer.nic`.
  2. Refactor `getCustomerStats` to query primarily by `clientNIC`.

---

### Finding 7 [P3 - MODERATE]: Underutilization of `<SortableTable>`

* **Target Files:**
  * [`src/components/crm/Partners.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Partners.jsx#L1150)
  * [`src/components/admin/PermissionsManager.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/admin/PermissionsManager.jsx#L303)
  * [`src/components/tools/CostCalculator.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/tools/CostCalculator.jsx#L270)
* **Root Cause:** `<SortableTable>` in `src/components/common/ui/SortableTable.jsx` provides built-in column sorting, empty state handling, pagination support, and accessible keyboard focus. However, only `Leads.jsx` and `Deals.jsx` utilize it. `Partners.jsx` (commissions table), `PermissionsManager.jsx` (role matrix), and `CostCalculator.jsx` (BOM breakdowns) declare raw `<table>` elements with redundant inline CSS.
* **Remediation Plan:**
  Migrate the partner commissions table and bill-of-materials breakdowns to `<SortableTable>` configurations.

---

### Finding 8 [P3 - MODERATE]: Monolithic File Complexity in `LeadCardDetails.jsx`

* **Target Files:**
  * [`src/components/crm/LeadCardDetails.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/LeadCardDetails.jsx) (1,893 lines, 84.8 KB)
* **Root Cause:** `LeadCardDetails.jsx` houses several distinct domain responsibilities inside a single component:
  1. Audio recording, Web Audio downsampling, and PCM WAV binary buffer compilation (lines 26-116).
  2. Phone Link call capture & audio recording upload.
  3. Cost estimation calculator integration.
  4. Quotation builder and invoice generation.
  5. Customer matching & duplicate verification.
  6. Interaction timeline and dirty form confirmation.
  This concentration makes the component difficult to test, slow to bundle, and prone to state regression.
* **Remediation Plan:**
  Extract utility and sub-component modules:
  - Extract `downsampleAudio` and `audioBufferToWav` to `src/utils/audioProcessing.js`.
  - Extract the call recording recorder to `src/components/crm/CallRecordingWidget.jsx`.
  - Extract dirty-form guard modal to a shared reusable component.

---

### Finding 9 [P3 - MODERATE]: Cross-Collection User Profile Drift

* **Target Files:**
  * [`src/components/common/UserProfile.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/common/UserProfile.jsx#L126)
  * [`src/components/crm/Partners.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Partners.jsx)
  * [`src/components/crm/Customers.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/crm/Customers.jsx)
* **Root Cause:** When a user updates their personal information (`name`, `photoURL`, `contactNumber`, `company`) in `UserProfile.jsx`, updates are persisted solely to `users/{identifier}` in Firestore. For Partner-role users or Business Client accounts, their corresponding documents in the `partners` or `customers` collections are not updated. As a result, directory cards across the ERP display stale contact numbers or outdated avatar images.
* **Remediation Plan:**
  In `UserProfile.jsx`, check if `currentUser.role === 'Partner'` or `['Customer', 'Business Client'].includes(currentUser.role)` and perform a parallel write or batch update to the corresponding `partners` or `customers` document.

---

### Finding 10 [P3 - MODERATE]: Timestamp Serialization Inconsistency

* **Target Files:**
  * [`src/components/admin/AgentDatabase.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/admin/AgentDatabase.jsx#L444)
  * [`src/components/admin/AdminPanel.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/admin/AdminPanel.jsx#L224)
  * [`src/components/common/UserProfile.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/common/UserProfile.jsx#L202)
  * [`src/services/firestoreSync.js`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/services/firestoreSync.js#L110)
* **Root Cause:** Data models across collections store timestamps in two conflicting formats: ISO 8601 strings (`new Date().toISOString()`) and Firestore server timestamps (`serverTimestamp()`). Downstream components employ varied parsing logic (`toDate()`, `toMillis()`, `new Date()`). In `UserProfile.jsx` line 202, `new Date(currentUser.createdAt)` returns `1970` or `NaN` if `currentUser.createdAt` is a Firestore Timestamp object.
* **Remediation Plan:**
  Create a standardized timestamp helper `src/utils/dateUtils.js`:
  ```javascript
  export function toDateObj(ts) {
    if (!ts) return new Date();
    if (ts.toDate) return ts.toDate();
    if (typeof ts.toMillis === 'function') return new Date(ts.toMillis());
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return new Date(ts);
  }
  ```

---

### Finding 11 [P4 - MINOR]: Notifications "Clear All" State Desync

* **Target Files:**
  * [`src/components/dashboard/NotificationsView.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/dashboard/NotificationsView.jsx#L14)
* **Root Cause:** `handleClearAll()` resets the local in-memory array `notifications` from `App.jsx`, but message alerts are derived dynamically from `messages` in `MessagingContext`. Clicking "Clear All" leaves message notifications visible in the feed, which confuses users.
* **Remediation Plan:**
  Update `handleClearAll()` to invoke `markAllAsRead()` in `MessagingContext` or provide distinct actions: "Clear System Alerts" and "Mark All Messages Read".

---

### Finding 12 [P4 - MINOR]: Ad-Hoc Cyan RGBA Shadow Definitions

* **Target Files:**
  * [`src/components/tools/CostCalculator.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/tools/CostCalculator.jsx#L127)
  * [`src/components/operations/FabricationWorks.jsx`](file:///home/madhuka/Antigravity%20IDE%20Projects/Print-To-Frame-ERP-System/src/components/operations/FabricationWorks.jsx#L575)
* **Root Cause:** Components declare inline tailwind box-shadow values with hardcoded cyan RGB coordinates: `shadow-[0_4px_20px_rgba(0,218,243,0.05)]`. In light mode, this cyan tint appears washed out against white backgrounds.
* **Remediation Plan:**
  Replace custom shadows with standard Tailwind elevation tokens or semantic variables: `shadow-[0_4px_20px_rgb(var(--color-primary)_/_0.08)]`.

---

## 4. Remediation Roadmap & Implementation Phasing

```mermaid
graph TD
    subgraph Phase 1: Critical Fixes
        A1[Fix Case-Sensitivity in MessagingContext]
        A2[Standardize Entity Linking Keys in Leads/Deals]
    end

    subgraph Phase 2: UI/UX Standardization
        B1[Integrate PageHeader in CostCalculator]
        B2[Enforce StatusBadge and -on Tokens for WCAG AA]
        B3[Implement Mobile Drilldown in Invoices]
    end

    subgraph Phase 3: Structural Refactoring
        C1[Extract Audio Utilities from LeadCardDetails]
        C2[Normalize Timestamp Parsing with toDateObj]
        C3[Synchronize UserProfile with Partners/Customers]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

### Phase 1: High-Priority Integrity Fixes (Immediate)
1. **Fix `MessagingContext.jsx` unread keys:** Normalize dictionary keys with `.trim().toLowerCase()` to ensure badges render correctly for all users.
2. **Add `rootLeadId` continuity:** Ensure `Leads.jsx` lead-to-deal conversion attaches `rootLeadId: originalLead.id || originalLead._firestoreId`.

### Phase 2: UI/UX Harmonization (Short Term)
1. **Cost Calculator & Quotation Builder:** Replace custom header blocks with standard `<PageHeader>`.
2. **Light Theme Contrast Hardening:** Replace all raw `text-emerald-400`, `text-blue-400`, `text-rose-400` status instances with semantic `-on` variables.
3. **Invoices Mobile Responsiveness:** Add `mobileView` state to `Invoices.jsx` with a "Back to List" button matching `Customers.jsx`.

### Phase 3: Architectural Decoupling (Medium Term)
1. **Audio Utility Extraction:** Move 116 lines of Web Audio compilation from `LeadCardDetails.jsx` to `src/utils/audioProcessing.js`.
2. **Unified Timestamp Utility:** Deploy `toDateObj` in `src/utils/dateUtils.js` across `AgentDatabase.jsx`, `AdminPanel.jsx`, and `UserProfile.jsx`.
3. **Cross-Collection Profile Sync:** In `UserProfile.jsx`, synchronize profile updates with `partners` and `customers` collections.

---

## 5. Verification & Test Evidence

The codebase has been verified against automated quality gates:
* **Vitest Unit Suite:** `npm test` passed 20/20 tests across permissions, email templates, and Firebase admin helpers in 2.16s.
* **Vite Production Bundle:** `npm run build` completed cleanly in 13.75s with zero syntax or bundling errors.
* **ESLint Static Analysis:** `npm run lint` passed with 0 errors across all JavaScript and JSX source files.

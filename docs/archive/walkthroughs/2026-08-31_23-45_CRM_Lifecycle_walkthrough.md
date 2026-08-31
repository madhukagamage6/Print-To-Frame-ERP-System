# Walkthrough — CRM Lifecycle, Deal Management, Invoicing & Logistics Integration

## 1. Problem Overview & Scope of Work
This update resolves three core workflow breakdowns across the Print-To-Frame customer journey:
1. **Lead-to-Deal Duplication & Stage Jumbling:** Bouncing between stages, duplicate conversions of completed leads, and stale state overwrites.
2. **25% Final Settlement Invoicing:** Missing on-demand button in Deals, automatic generation discrepancies, and lack of visual alignment with the 75% Advance invoice.
3. **Logistics Delivery Dispatch:** Missing delivery handover action on Deals when fabrication work is ready.

---

## 2. Changes Implemented

### A. Lead-to-Deal Conversion Locking & Stage Integrity
* **[Leads.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Leads.jsx):**
  - **Conversion Locking:** When a lead is converted via `handleConvertConfirm`, the original lead is marked `convertedToDeal: true` and locked with a green `Converted` status badge in the Completed column.
  - **Duplicate Prevention:** Disables and hides the "Convert" button once a lead is converted, preventing multiple deals from spawning from a single lead.
  - **State Guarding:** Hardened `handleSaveLeadDetails` so saving from details modal preserves `stage`, `isDeal: false`, and `convertedToDeal` without stale stage regressions.

### B. Robust Deal Management & On-Demand 25% Invoicing
* **[Deals.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Deals.jsx):**
  - **Stage Progression:** Records `stageEnteredAt` timestamp on each transition and ensures all deal writes enforce `isDeal: true`.
  - **Structured 25% Final Invoice:** When a deal completes, it automatically generates a 25% Final Settlement invoice with linked Bill of Quantities (BoQ) line items from the structured quotation.
  - **Delivery Integration:** Added delivery action button in `Ready To Load` and `Hand Over` columns to dispatch delivery work orders directly from the Kanban board.
* **[QuotationBuilder.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/QuotationBuilder.jsx):**
  - Added dedicated action buttons for **both 75% Advance Invoice** (75% amount due) and **25% Final Settlement Invoice** (25% balance due), sharing identical structured line items, itemized subtotals, and quotation references.

### C. Unified Invoice Print Templates & Deal Details Modal
* **[LeadCardDetails.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/LeadCardDetails.jsx):**
  - **Unified Invoice Printing:** Redesigned `printInvoice(type)` to support both `Advance` and `Final` invoices with 100% matching typography, bank transfer details, and itemized BoQ tables.
  - **Quick Action Print Buttons:** Added `75% Advance` and `25% Final` print buttons in the sidebar.
  - **Logistics Delivery Dispatch Card:** Added an embedded logistics card for deals displaying active delivery status (`Pending`, `In Transit`, `Delivered`) and a one-click `Dispatch Delivery` button.
  - **Dynamic Save Button:** Automatically switches between `Save Lead Details` and `Save Deal Details` depending on context.
* **[Invoices.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Invoices.jsx):**
  - Enhanced the print template to dynamically render itemized line items when available from structured quotation data for both Advance and Final invoices.

### D. Central State Wiring
* **[App.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/App.jsx):**
  - Passed `logisticsJobs`, `setLogisticsJobs`, and `invoices` down to the `Deals` pipeline for cross-module synchronization.

---

## 3. Verification & Build Results
* **Build Verification:** Ran `npm run build` with **0 errors**:
  - `dist/index.html` (1.50 kB)
  - `dist/assets/index-DGnQ9OM3.js` (696.21 kB)
  - Vite v6.4.3 production bundle built in 19.26s.

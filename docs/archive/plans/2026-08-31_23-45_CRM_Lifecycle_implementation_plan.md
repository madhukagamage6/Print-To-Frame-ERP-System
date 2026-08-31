# Implementation Plan — CRM Lifecycle, Deals Management, Unified Invoicing & Logistics Dispatch

## Executive Summary & Root Cause Investigation

This report and implementation plan addresses the critical workflow breakdowns across the CRM customer journey:
1. **Lead-to-Deal Duplication & Stage Jumbling:** Bouncing between stages, stale data overwriting, and duplicate deal creation.
2. **25% Final Settlement Invoicing:** Missing on-demand button in Deals, automatic generation discrepancies, and invoice visual formatting divergence.
3. **Logistics Final Delivery Dispatch:** Missing "Notify Logistics" action on Deals for handover and customer delivery.

---

## 1. Deep Root Cause Analysis

### Issue A: Lead-to-Deal Conversion Duplication & Stage Jumble
* **Root Cause 1: Duplicate Conversion on Completed Leads:**  
  When a lead is converted via `handleConvertConfirm`, the original lead was moved to `stage: 'Completed'`, and a new deal was created (`id: D-XXXXXX, isDeal: true, stage: 'Waiting'`). However, the `Leads.jsx` Kanban board still showed the "Convert" button on the Completed column. Clicking or moving it created duplicate deals (`D-YYYYYY`).
* **Root Cause 2: Shared Stage Name Collision ("Completed"):**  
  Both Leads (`STAGES = ["Intake", "Processing", "75% Invoice Submitted", "Received", "Completed"]`) and Deals (`DEALS_STAGES = ["Waiting", "Fabricating", "Ready To Load", "Hand Over", "Completed"]`) use `"Completed"`. In Firestore, both are in the `leads` collection. When `isDeal` wasn't strictly guarded on every write, a converted lead could be re-ingested into Deals.
* **Root Cause 3: Stale Modal State Overwriting Stages:**  
  When `LeadCardDetails` was opened from a lead and saved, `handleSaveLead` saved `{ ...lead, ...formData }`. If `formData.stage` had stale initial data, it overwrote the Firestore stage back to the initial stage, causing the lead/deal to **bounce back to the first stage and jumble**.

### Issue B: 25% Balance Invoicing Discrepancy & Missing Actions
* **Root Cause 1: Hardcoded Automatic Generation Only on Last Stage:**  
  In `Deals.jsx` (`handleMoveForward`), a 25% invoice was ONLY generated when moving from `Hand Over` $\rightarrow$ `Completed`. There was no button to generate, preview, or edit the 25% invoice on earlier stages (`Waiting`, `Fabricating`, `Ready To Load`, `Hand Over`).
* **Root Cause 2: Schema & Styling Discrepancy:**  
  The 75% Advance invoice generated via `QuotationBuilder` contains structured line items, itemized subtotals, tax/discount breakdowns, and metadata. The 25% invoice generated in `Deals.jsx` had no line items and plain text `aiDraft: "Final Settlement (25%)"`, making the printout look completely mismatched.

### Issue C: Missing Logistics Delivery Handover Action in Deals
* **Root Cause 1:**  
  `Leads.jsx` has a pickup button (`type: "Pickup"`), but `Deals.jsx` had zero buttons or actions to dispatch finished goods.
* **Root Cause 2:**  
  When fabrication finishes (`Ready To Load` or `Hand Over`), there was no integration with `COLLECTIONS.LOGISTICS` to schedule a `"Delivery"` work order with the customer's `deliveryLocation`.

---

## Proposed Changes & Solution Architecture

### 1. Robust Lead-to-Deal Conversion & State Synchronization

#### [MODIFY] [Leads.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Leads.jsx)
- **Prevent Duplicate Conversions:** Mark converted leads with `convertedToDeal: true, dealId: D-XXXXXX, isDeal: false`.
- **Lock Converted Leads:** Replace the "Convert" button on converted leads with a `Converted to Deal (D-XXXXXX)` link/badge that prevents re-conversion.
- **Strict Firestore Filtering:** Ensure all lead queries and state updates filter strictly by `!l.isDeal && !l.convertedToDeal` or display converted leads in a read-only archived state.

#### [MODIFY] [Deals.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Deals.jsx)
- **Strict Deal Identity:** Ensure all deal state operations enforce `isDeal: true`.
- **Stage Progression Integrity:** Guard against stage-jumping and ensure `stageEnteredAt` timestamp is recorded on every forward/backward movement.
- **Pass Logistics & Invoice Props:** Pass `logisticsJobs`, `setLogisticsJobs`, `onSaveInvoice`, `invoices`, and `quotations` to `Deals` and `LeadCardDetails`.

---

### 2. Unified 25% Final Settlement Invoicing System

#### [MODIFY] [QuotationBuilder.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/QuotationBuilder.jsx) & [LeadCardDetails.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/LeadCardDetails.jsx)
- **Dedicated 25% Invoice Button in Deals Mode:**  
  When viewing a Deal in `LeadCardDetails` or `Deals.jsx`:
  - Show status for both **75% Advance Invoice** (Paid/Unpaid) and **25% Final Balance Invoice** (Drafted/Unpaid/Paid).
  - Add a dedicated **"Generate 25% Final Settlement Invoice"** button that uses the exact same structured line items from the accepted quotation, calculating $25\%$ balance due with identical styling.
- **Unified Invoice Print Template:**  
  Synchronize `printInvoice` in `LeadCardDetails.jsx` and `Invoices.jsx` so 25% Final Settlement invoices have the exact same branding, table structure, line items, and bank details as the 75% Advance invoice.

---

### 3. Logistics Delivery Notification & Dispatch in Deals

#### [MODIFY] [Deals.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Deals.jsx) & [LeadCardDetails.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/LeadCardDetails.jsx)
- **Kanban Card Action in Deals:**  
  In stages `Ready To Load` and `Hand Over`, display an action button:
  `<Truck size={13} /> Dispatch Delivery`
- **In-Modal Dispatch Section:**  
  Inside `LeadCardDetails` (in Deal mode), add a **Logistics Dispatch Section**:
  - Displays linked delivery job status (`Pending`, `In Transit`, `Delivered`).
  - Button: **"Notify Logistics for Delivery & Customer Handover"**.
  - Automatically creates a job in `COLLECTIONS.LOGISTICS` with:
    - `type: "Delivery"`
    - `subType: "Framed Works / Finished Goods"`
    - `location: lead.deliveryLocation`
    - `customer: lead.name`
    - `company: lead.company`
    - `phone: lead.phone`
    - `scope: lead.jobScope`
    - `dealId: deal.id`
    - `status: "Pending"`

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify clean JSX compilation and zero linting/build errors.

### Manual Verification
1. **Lead Conversion Flow:**
   - Create a lead $\rightarrow$ advance through stages to `Received` $\rightarrow$ click `Convert to Deal`.
   - Confirm deal appears in Deals board under `Waiting` with ID `D-XXXXXX`.
   - Confirm original lead in Leads board is marked `Converted` and CANNOT be re-converted or duplicated.
2. **Deal Stage Transitions:**
   - Move deal from `Waiting` $\rightarrow$ `Fabricating` $\rightarrow$ `Ready To Load` $\rightarrow$ `Hand Over` $\rightarrow$ `Completed`.
   - Confirm stages advance smoothly without jumping or duplicating.
3. **25% Final Invoice Generation & Printing:**
   - Open deal modal $\rightarrow$ click `Generate 25% Final Settlement Invoice`.
   - Confirm invoice appears in `Invoices` table with matching styling, line items, and totals.
   - Click `Print Invoice` and verify visual design matches the 75% Advance invoice.
4. **Logistics Delivery Dispatch:**
   - On `Ready To Load` or `Hand Over`, click `Notify Logistics for Delivery`.
   - Navigate to `Logistics` module and verify the new Delivery work order is created with customer name, phone, and delivery address.

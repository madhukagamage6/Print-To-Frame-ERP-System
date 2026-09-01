# Implementation Plan — Partner Registration, Dynamic QR Referral & Commission Engine

## 1. Problem Statement & Objectives
Print To Frame relies on an expanding network of external framing artisans, print agencies, interior designers, and freelance art consultants. This implementation delivers a complete, fraud-proof partner ecosystem:
1. **Public Partner Registration & Document Upload:** Without backend server bloat, using direct Firebase Storage uploads.
2. **Admin Vetting Queue & Automated Provisioning:** 1-click approval that generates credentials and a unique referral code.
3. **Dynamic QR Code Marketing Card:** High-resolution printable counter display card with embedded tracking URL.
4. **Client Intake Landing Page:** Mobile-first intake form with hidden partner attribution.
5. **5-Minute Callback SLA Countdown:** Real-time timer and instant alerts for Sales reps in Leads Intake.
6. **Automated Commission Calculation & Monthly Settlement Ledger:** Automatic calculation from quotation values and monthly bank transfer reconciliation.

---

## 2. User Review Required

> [!IMPORTANT]
> **Data Integrity & Storage Architecture:**
> - Uploaded partner documents (BR Certificate, NIC, Work Samples) and client artwork images are uploaded directly to Firebase Storage (`partners/documents/{partnerId}/` and `leads/referrals/{leadId}/`), saving only HTTPS download URLs in Firestore to keep database reads ultra-fast.
> - Commissions automatically track deal lifecycle: Accrued upon 75% Advance, and Eligible for Payout upon 100% Deal Completion.

---

## 3. Proposed Changes Across Components

### A. Routing & Public Application Portal
#### [NEW] [`src/components/public/PartnerRegistration.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/public/PartnerRegistration.jsx)
- Multi-step / structured partner application form.
- Captures Studio Name, Contact Person, Phone (+94 mask), Email, BR Number, Artisan Specialty, Bank Account details (Bank, Branch, Account Number, Account Name).
- Direct file upload for BR Certificate and NIC/Passport.
- Submits to Firestore `partner_applications` with `status: 'Pending'`.

#### [MODIFY] [`src/main.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/main.jsx)
- Add route matcher for `/partner/register` and `/register-partner` rendering `PartnerRegistration.jsx`.

---

### B. Admin Vetting Queue & Partner Management
#### [MODIFY] [`src/components/crm/Partners.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Partners.jsx)
- Add sub-navigation tabs: **Partner Network Directory**, **Onboarding Applications (Vetting Queue)**, and **Monthly Commission Settlements**.
- Vetting Drawer: View applicant details, document previews, commission rate slider (1%–15%), and 1-click Approve / Request Info / Reject triggers.
- Approval provisions Partner ID (e.g. `P-1004`), Referral Code (e.g. `PTF-REF-104`), and generates printable QR Code.

#### [NEW] [`src/components/crm/PartnerQRModal.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/PartnerQRModal.jsx)
- High-res vector QR generator linked to `https://portal.print2frame.xyz/referral?ref=[partnerId]`.
- Features: 1-Click Copy Link, Download Printable Counter Display Flyer (SVG/PNG), and Live QR Test Scanner.

---

### C. Upgraded Dynamic Client Referral Intake Form
#### [MODIFY] [`src/components/public/ReferralForm.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/public/ReferralForm.jsx)
- Co-branded header: *"Recommended by [Partner Studio Name]"*.
- Fields: Customer Name, Phone (+94), Email, Scope / Dimensions, Framing Type, and optional artwork image upload.
- Ingestion: Creates Lead with `source: 'Partner Referral'`, `partnerId`, `partnerName`, `referralCode`, `commissionRate`, and `callbackSlaDeadline: Date.now() + 5 * 60 * 1000`.
- Success screen promises: *"Our framing specialist will call you within 5 minutes."*

---

### D. Leads Module 5-Minute Callback SLA & Alerts
#### [MODIFY] [`src/components/crm/Leads.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Leads.jsx)
- Displays pulsating **5-Minute SLA Callback Countdown Badge** (`5:00 → 4:59...`) on Partner Referral lead cards.
- Flags overdue callbacks (> 5 mins) in amber/red alert styling.
- 1-Click "Call Customer" trigger logs response time.

---

### E. Monthly Partner Settlement Ledger & Commission Engine
#### [MODIFY] [`src/components/crm/Partners.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Partners.jsx)
- Automated Commission Calculator: Computes `Quotation Net Amount * commissionRate`.
- Monthly Settlement Ledger: Aggregates eligible payouts per partner, displays bank transfer instructions, CSV export for online banking batch upload, and 1-click "Mark Settled" with bank transaction reference logging.

---

## 4. Verification Plan

### Automated Tests
- Run `npm run build` to verify clean Vite compilation with zero errors.
- Run AST syntax checks on all modified and newly created components.

### Manual Verification Flows
1. **Public Registration:** Open `/partner/register` $\rightarrow$ Submit sample partner application with documents $\rightarrow$ Verify staged in `partner_applications`.
2. **Admin Vetting:** Open Partner Network $\rightarrow$ Open Applications Queue $\rightarrow$ Click "Approve Partner" $\rightarrow$ Verify partner created with QR code.
3. **QR Referral Intake:** Open `/referral?ref=P-1001` $\rightarrow$ Submit client form $\rightarrow$ Verify Lead created in Leads Intake with 5-minute SLA timer and hidden partner attribution.
4. **Commission Settlement:** Convert lead to Deal $\rightarrow$ Verify commission accrual in Partner Settlement Ledger.
5. Deploy to `staging` and `main` live production.

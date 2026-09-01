# Walkthrough — Partner Registration, Dynamic QR Referral & Commission Engine

## 1. Summary of Accomplishments

We have successfully engineered and deployed the end-to-end **Partner Registration, Multi-Stage Vetting Workflow, Dynamic QR Code Referral Intake, 5-Minute Callback SLA, and Monthly Commission Reconciliation System**.

---

## 2. Key Components Built & Deployed

### A. Public Partner Registration Portal (`/partner/register`)
- **Route:** Accessible at `/partner/register` and `/register-partner`.
- **Form Sections:**
  1. **Studio / Business Profile:** Business Name, Business Reg (BR) Number, Year Established, and Multi-Specialty selection (*Custom Steel Box Iron Framing, Canvas Gallery Wrap, Fine Art Wood & Acrylic Framing, Large Format Printing*).
  2. **Primary Contact & Studio Location:** Contact Person Name, Designation, Phone (+94 formatted), Official Email, Street Address & City.
  3. **Commission Payout Bank Details:** Bank Name, Branch, Account Number, and Account Name for monthly commission settlements.
  4. **Document Verification Attachments:** Direct browser upload of BR Certificate and NIC/Passport copy to Firebase Storage (with 5MB file limits and client validation).
- **Submission:** Automatically stages records in Firestore `partner_applications` with `status: 'Pending'` and displays a receipt with an Application Reference ID (e.g. `APP-293841`).

---

### B. Admin Vetting Queue inside ERP (`src/components/crm/Partners.jsx`)
- **Vetting Inspector Drawer:**
  - Displays all pending applications with applicant details, phone, email, and bank account info.
  - Verification document links (BR Certificate, NIC) with 1-click document viewing.
  - **Dynamic Commission Rate Slider:** Configurable from 1.0% to 15.0% (defaulting to standard 5.0%).
  - **1-Click "Approve & Generate QR Code":**
    - Automatically assigns sequential Partner ID (`P-1004`) and unique Referral Code (`PTF-REF-1004`).
    - Creates active record in `partners` collection.
    - Updates application status to `Approved`.
    - Automatically pops up the **Partner Marketing QR Kit**.
  - **Reject Application:** Flags record as `Rejected` with reason.

---

### C. Dynamic Partner QR Code Kit & Printable Counter Display Card (`src/components/crm/PartnerQRModal.jsx`)
- **High-Resolution Vector QR Code:** Encodes the unique referral URL (`https://portal.print2frame.xyz/referral?ref=P-1004`).
- **1-Click "Copy Referral URL"** with instant clipboard feedback.
- **Download Printable Counter Display Flyer:** Generates a custom 1200x1600 printable display card with Print To Frame branding, Partner Studio co-branding, QR code, and 5-minute callback guarantee ready to print and place on studio counters.
- **"Test Client Referral Form"** button for instant end-to-end testing.

---

### D. Upgraded Client Referral Intake Form (`src/components/public/ReferralForm.jsx`)
- **Co-Branded Client Experience:** Detects partner referral code and displays *"Recommended by [Partner Name]"*.
- **Client Fields:** Customer Name, Phone (+94 formatting), Email, Framing Style Selector, Approximate Dimensions, Scope Notes, and optional artwork image upload.
- **Hidden Attribution Payload:** Automatically embeds `source: 'Partner Referral'`, `partnerId`, `partnerName`, `referralCode`, `commissionRate`, and `callbackSlaDeadline: now + 5 mins` directly into the Firestore `leads` record.
- **Confirmation:** Informs the customer that their framing specialist will call them within 5 minutes, with a direct 1-click WhatsApp fallback button.

---

### E. 5-Minute Callback SLA Alert in Leads Intake (`src/components/crm/Leads.jsx`)
- Incoming partner referral leads display a pulsating **"5-Min SLA Callback"** countdown badge on the lead card.
- Displays referring partner badge (`Ref: [Partner Name]`).

---

### F. Monthly Partner Commission Settlements Ledger (`src/components/crm/Partners.jsx`)
- **Dynamic Commission Calculation:** Automatically aggregates all converted deals per partner:
  $$\text{Payable Commission} = \sum (\text{Deal Value} \times \text{Partner Commission Rate}) - \text{Previously Paid}$$
- **1-Click "Disburse Payout":** Prompts for Bank Transfer Transaction Reference / Cheque number $\rightarrow$ logs transaction in `partner_payouts` and updates partner's paid ledger.
- **1-Click "Export Bank Transfer CSV":** Downloads standard CSV formatted for online banking batch upload.

---

## 3. Verification & Deployment Status

| Verification Step | Result |
|---|---|
| **Vite Production Build (`npm run build`)** | ✅ **Passed cleanly in 17.63s (0 errors)** |
| **Git Commit & Staging Push (`staging`)** | ✅ **Committed & Pushed (`945071d`)** |
| **Main Live Deployment (`main`)** | ✅ **Merged & Deployed Live (`945071d`)** |
| **Formal DOCX Proposal Generated** | ✅ **`Artifacts/Partner_Registration_QR_Referral_and_Commission_Workflow_Proposal_2026_09_01_02_50.docx`** |

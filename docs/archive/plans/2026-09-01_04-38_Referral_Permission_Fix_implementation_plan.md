# Implementation Plan — Simplified Referral Form & Comprehensive Partner Details Management

## 1. Problem Statement & User Requirements
Based on user review and screenshots:
1. **Streamline Client Referral Intake Form (`ReferralForm.jsx`):**
   - The current form is too detailed. We only need: **Full Name**, **Mobile Number (+94)**, and optional **Email Address**.
   - Style must match our **Portal Access Request / Login card** (`Login.jsx`) with the official Print To Frame logo (`/logo-dark.png`).
   - Catchy topic: *"Claim Exclusive 15% Framing Discount"* + *"Recommended by [Partner Name]"*.
   - Submission must reliably create a Lead in `leads` collection with `stage: 'Intake'`, `source: 'Partner Referral'`, and trigger the 5-minute callback SLA.
   - Success screen: *"Congratulations! Within 5 minutes, Print To Frame support will call you."*
2. **Partner Details Modal & Document Management (`Partners.jsx`):**
   - Clicking `Details >` on a partner card currently does not open a modal.
   - Build a comprehensive, editable **Partner Details Drawer/Modal** showing:
     - Business Registration (BR) number, Business Name, Contact Person, Phone, Email, Address, Specialty.
     - Editable **Commission Rate (%)** slider / input.
     - Editable **Bank Account Details** (Bank, Branch, Account Number, Account Name).
     - **Agreements & Operational Guidelines Document Vault:** Upload, view, and store signed partner agreements, BR certificate, quality guidelines PDF, and NIC scans via Firebase Storage.
     - **Save Changes Button** to update Firestore in real time.

---

## 2. User Review Required

> [!IMPORTANT]
> - **Zero Friction Client Form:** The referral landing page will now only contain 3 fields (Name, Phone, Email), removing all dimensions/specialty selectors so customers can claim the 15% discount effortlessly in under 15 seconds.
> - **Secure Document Vault:** Partner agreements and guidelines will be stored under Firebase Storage path `partners/documents/{partnerId}/` with direct preview links and real-time Firestore synchronization.

---

## 3. Proposed Changes Across Components

### A. Client Referral Landing Page
#### [MODIFY] [`src/components/public/ReferralForm.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/public/ReferralForm.jsx)
- Adopt the exact card geometry, logo header, backdrop blur, and dark technical grid background from `Login.jsx`.
- Heading:
  - Header: Logo + *"Print To Frame — Fabrication Portal"*
  - Topic: **"Claim Exclusive 15% Framing Discount"**
  - Subtitle: *"Special partner offer referred by [Partner Name]"*
- 3 Clean Input Fields:
  1. `Full Name` (with `User` icon)
  2. `Mobile Number` (with `Phone` icon, formatted for Sri Lanka `+94 7X XXX XXXX`)
  3. `Email Address (Optional)` (with `Mail` icon)
- Submit Button: **"Claim 15% Discount & Request Callback →"**
- Robust Submission Handler:
  - Creates Firestore document in `leads` collection with `stage: 'Intake'`, `source: 'Partner Referral'`, `partnerId`, `partnerName`, `value: 0`, `callbackSlaDeadline: now + 5 mins`.
- Success Confirmation Card:
  - Header: *"Congratulations!"*
  - Body: *"Print To Frame support will call you within 5 minutes to confirm your exclusive 15% discount."*
  - Shows Lead Reference ID and 1-click WhatsApp fallback button.

---

### B. Partner Details & Document Management in ERP
#### [MODIFY] [`src/components/crm/Partners.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Partners.jsx)
- Wire `selectedPartner` state to open a new modal: `PartnerDetailModal`.
- Sections in `PartnerDetailModal`:
  1. **Header & Status:** Partner ID (`P-1001`), Referral Code (`PTF-REF-1001`), Status pill (`Active`).
  2. **Studio Profile & Contact (Editable):**
     - Business / Studio Name
     - BR Number
     - Contact Person Name & Role
     - Mobile Number (+94) & Email Address
     - Street Address & City
  3. **Commission Rate Configuration (Editable):**
     - Commission Rate slider (1.0% – 15.0%) and numeric input.
  4. **Bank Account Details for Settlements (Editable):**
     - Bank Name, Branch, Account Number, Account Name.
  5. **Agreements & Operational Guidelines Document Vault:**
     - List of uploaded documents (BR Certificate, Signed Agreement, Operational Guidelines PDF, NIC).
     - Upload new agreement/guidelines document with direct Firebase Storage upload.
     - View / Download document in new tab.
  6. **Save Changes Action:**
     - Updates the Firestore `partners` document in real time and updates local state with toast confirmation.

---

## 4. Verification Plan

### Automated Tests
- Run `npm run build` to verify clean compilation with 0 errors.

### Manual Verification
1. **Public Referral Form Test:**
   - Open `/referral?ref=P-1001`.
   - Verify card style, logo, 15% discount header, and exactly 3 fields (Name, Phone, Email).
   - Submit form $\rightarrow$ Verify instant confirmation *"Congratulations! Within 5 minutes, Print To Frame support will call you."*
   - Verify Lead record is immediately created in **Leads Intake** with 5-minute SLA badge.
2. **Partner Details & Document Drawer Test:**
   - Go to **Partner Network** tab in ERP.
   - Click `Details >` on `Design Ranga` (`P-1001`).
   - Verify modal opens with editable business name, BR number, commission rate, bank details, and document upload vault.
   - Edit commission rate to 7.5%, edit business name, upload a sample agreement PDF $\rightarrow$ Click **Save Changes** $\rightarrow$ Verify Firestore updates and persists.
3. Deploy to `staging` and merge to `main`.

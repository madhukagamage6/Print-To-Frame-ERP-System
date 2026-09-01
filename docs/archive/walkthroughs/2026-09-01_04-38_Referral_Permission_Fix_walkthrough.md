# Walkthrough — Simplified Client Referral Form & Comprehensive Partner Details Vault

## 1. Summary of Accomplishments

We have resolved all 4 review items:
1. **Simplified Client Referral Intake Form (`ReferralForm.jsx`):**
   - Streamlined into only 3 fields: **Full Name**, **Mobile Number (+94)**, and optional **Email Address**.
   - Redesigned using the exact visual identity of the Access Request / Login card (`Login.jsx`) with the official Print To Frame logo (`/logo-dark.png`), dark technical grid, and backdrop blur.
   - Catchy topic: **"Get Your 15% Discount"** + *"Exclusive 15% Partner Discount"* tag + *"Recommended by [Partner Name]"*.
   - Instant 5-minute callback guarantee badge.
   - Robust Firestore submission creating a Lead record in `leads` collection with `stage: 'Intake'`, `source: 'Partner Referral'`, customer contact details, and 5-minute SLA timer.
   - Confirmation Screen: *"Congratulations! Within 5 minutes, Print To Frame support will call you to confirm your framing requirements and apply your discount."* + 1-click WhatsApp fallback.

2. **Comprehensive Partner Details & Document Vault Modal (`Partners.jsx`):**
   - Fixed the `Details >` button on partner cards to open the full **Partner Details & Document Vault** modal.
   - **Tab 1 — Studio Profile & Contacts (Editable):**
     - Business / Studio Name
     - Business Registration (BR) Number
     - Contact Person Name & Designation
     - Mobile Number (+94 formatted) & Official Email
     - Studio Street Address & City
   - **Tab 2 — Commission & Bank Details (Editable):**
     - Commission Rate slider (1.0% – 15.0%) and numeric input.
     - Payout Bank Name, Branch, Account Number, and Account Name.
   - **Tab 3 — Agreements & Operational Guidelines Document Vault:**
     - Status indicators and preview links for:
       1. Business Registration (BR) Certificate
       2. Signed Partner Framework Agreement
       3. Signed Operational Quality & Production Guidelines PDF
       4. Signatory Identity Verification (NIC/Passport)
     - Direct file upload to Firebase Storage path `partners/documents/{partnerId}/` with instant Firestore URL persistence.
   - **Save Changes Action:** Real-time persistence to Firestore `partners` collection.

---

## 2. Verification & Build Results

| Verification Step | Result |
|---|---|
| **Vite Production Build (`npm run build`)** | ✅ **Passed cleanly in 1m 2s (0 errors)** |
| **Git Commit & Staging Push (`staging`)** | ✅ **Committed & Pushed (`d5380a4`)** |
| **Main Live Deployment (`main`)** | ✅ **Merged & Deployed Live (`d5380a4`)** |

---

## 3. UI Progression & Verification

````carousel
```markdown
### 1. Client Referral Intake Form (/referral?ref=P-1001)
- Centered Print To Frame Logo + Fabrication Portal Branding
- "Exclusive 15% Partner Discount" Pill
- Heading: "Get Your 15% Discount" (Referred by Partner)
- 3 Frictionless Fields:
  1. Full Name (Kasun Perera)
  2. Mobile Number (+94 77 123 4567)
  3. Email Address (Optional)
- Button: "Claim 15% Discount & Request Callback →"
```
<!-- slide -->
```markdown
### 2. Client Submission Confirmation Screen
- Glowing Cyan Checkmark Icon
- "Congratulations!"
- "Within 5 minutes, Print To Frame support will call you..."
- Reference ID: LD-XXXXXX
- Referring Partner Studio Name
- "Open Direct WhatsApp Chat" Instant Fallback Button
```
<!-- slide -->
```markdown
### 3. Partner Details & Document Vault (Partners.jsx)
- Click "Details >" on any Partner Card -> Opens 3-Tab Modal:
  - Tab 1: Studio Profile & Contacts (Editable Name, BR, Person, Phone, Email, Address)
  - Tab 2: Commission & Bank Details (Editable 1%-15% Slider, Bank Name, Account No)
  - Tab 3: Document Vault (BR Cert, Signed Agreement, Operational Guidelines PDF, NIC)
- "Save Changes" Button saves to Firestore in real-time
```
````

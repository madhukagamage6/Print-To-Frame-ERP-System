# Implementation Plan — Partner Portal Navigation Streamlining, Consolidated Partner Hub & 100% Payment Commission Trigger

Consolidate all partner-related features (My Referrals, Converted Deals, QR Marketing Kit, Document Vault, Missing Referral Claims, Bank & Studio Profile) into the **Partner** and **My Profile** tabs, strictly lock the Partner navigation to 5 essential items, and trigger automatic commission eligibility upon 100% client payment.

## User Review Required

> [!IMPORTANT]
> **Strict 5-Item Navigation for the Partner Role:**
> When logged in as `role === 'Partner'`, the sidebar will exclusively show:
> 1. **Dashboard** (`dashboard`) — High-level partner snapshot (Total Referrals, Active Jobs, Month-End Eligible Payout Balance, Quick QR button).
> 2. **Notifications** (`notifications`) — System alerts, SLA notices, and 100% payment commission eligibility updates.
> 3. **Partner** (`partners`) — Consolidated Partner Hub containing:
>    - **My Referrals & Converted Deals** (with live stages: Inquiry $\rightarrow$ Quoted $\rightarrow$ In Production $\rightarrow$ 100% Paid $\rightarrow$ Settled).
>    - **Agreements & Document Vault** (BR Certificate, Signed Agreement, Operational Guidelines PDF, NIC Scans).
>    - **Marketing QR & Flyer Kit** (Instant QR modal & printable counter card download).
>    - **Claim Missing Referral** (Modal to submit offline client referrals for Sales verification).
> 4. **My Profile** (`profile`) — User details, studio business details, bank account for month-end payout, and password reset.
> 5. **Sign Out** (`signout`) — Secure logout.
> 
> *The **Messages** and **Invoices** modules will be completely hidden and permission-denied for the Partner role.*

---

## Proposed Changes

### 1. Security Matrix & Permissions (`src/context/PermissionsContext.jsx`)

#### [MODIFY] [PermissionsContext.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/context/PermissionsContext.jsx)
- Update `DEFAULT_PERMISSIONS.Partner`:
  - `invoices: none()` (Remove invoice module access)
  - `messages: none()` (Remove internal messaging access for partners)
  - `partners: full()` (Full access to manage own referrals, documents, and profile)
  - `leads: none()`, `pipeline: none()`, `customers: none()`, `projects: none()`, `logistics: none()`, `agents: none()`, `calculator: none()`, `admin: none()`

---

### 2. Streamlined Navigation & Sidebar Layout (`src/App.jsx`)

#### [MODIFY] [App.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/App.jsx)
- Update sidebar navigation logic so that when `currentUser?.role === 'Partner'`:
  - Grouping renders cleanly without empty accordion headers.
  - Sidebar displays only **Dashboard**, **Notifications**, **Partner**, **My Profile**, and **Sign Out**.
  - Route guard prevents manual URL navigation to `/invoices`, `/messages`, `/pipeline`, `/leads`, `/projects`, etc.

---

### 3. Consolidated Partner Hub (`src/components/crm/Partners.jsx`)

#### [MODIFY] [Partners.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Partners.jsx)
- **Partner-Role Adaptive View (`isPartnerRole`):**
  - Detects if `currentUser?.role === 'Partner'`.
  - Filters all leads, deals, and commission ledgers strictly by `currentUser.identifier` / `currentUser.partnerId` (zero data cross-visibility).
  - Displays 4 top KPI Cards:
    1. **Total Referrals Sent**
    2. **Active in Production (Accrued Commission)**
    3. **Eligible Month-End Payout Balance (100% Paid Deals)**
    4. **Total Paid Commission (Settled)**
  - Embedded Tabs:
    1. **My Referral Pipeline & Deals:** Displays list of referred clients with real-time status and commission breakdown.
    2. **Document Vault:** View and upload BR certificate, signed framework agreement, guidelines, and NIC.
    3. **QR Flyer & Marketing Kit:** Quick button to open QR modal and download counter display card.
    4. **+ Claim Missing Referral Modal:** Quick form to submit client name, phone, and date for Sales verification.
- **Admin/Internal View:**
  - Retains the full partner directory, onboarding vetting queue, and month-end settlement batch ledger.

---

### 4. My Profile (`src/components/common/UserProfile.jsx`)

#### [MODIFY] [UserProfile.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/UserProfile.jsx)
- Ensure the **My Profile** tab for partners cleanly houses:
  - Personal User Information (Name, Email, Mobile Number, Photo).
  - Studio Profile (Business Name, BR Number, Address, Specialty).
  - Bank Account Details for Payout (Bank Name, Branch, Account Number, Account Name).
  - Password Reset & Security.

---

### 5. 100% Full Payment Commission Eligibility Trigger (`src/components/crm/Invoices.jsx` & Deals)

#### [MODIFY] [Invoices.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Invoices.jsx)
- When a deal's final settlement invoice is marked as **`Paid`** (or when total payments equal 100% of deal value):
  - Automatically update the associated lead/deal referral status to **`Eligible for Payout`**.
  - Dispatch a notification to the referring partner:
    > *"Commission Eligible: Full payment cleared for [Client Name] (Deal [Deal ID]). LKR [Amount] added to your month-end payout balance."*

---

## Verification Plan

### Automated Build & Lint Check
- Run `npm run build` to verify clean compilation with 0 errors.

### Manual Verification Flow
1. **Partner Login Test:**
   - Log in with a Partner account.
   - Verify sidebar strictly shows: **Dashboard**, **Notifications**, **Partner**, **My Profile**, **Sign Out**.
   - Verify **Invoices**, **Messages**, **Deals**, and other internal tabs are completely hidden.
2. **Partner Hub Test:**
   - Open **Partner** tab as a partner.
   - Verify top 4 KPI cards calculate month-to-date earnings, accrued balance, and eligible month-end payout.
   - Test "Claim Missing Referral" button and document upload.
3. **100% Payment Trigger Test:**
   - As Admin/Accounts, mark a final invoice as `Paid` for a partner-referred deal.
   - Switch to the Partner portal and verify the commission moves to **`Eligible for Payout`** with the notification alert.

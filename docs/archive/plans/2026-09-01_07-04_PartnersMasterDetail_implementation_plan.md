# Implementation Plan — Standardize Partners Module Styling & Layout

Redesign and align the **Partners** module (`Partners.jsx`) to strictly follow the design system and master-detail layout established by the **Leads**, **Customers**, and **User Management** modules.

## User Review Required

> [!IMPORTANT]
> **Key Design System Harmonizations**:
> 1. **Title Standardized to "Partners"**:
>    - Replaces `"Partner Network & Referrals"` with **`"Partners"`**, matching the single-word naming style of `"Leads"` and `"Customers"`.
> 2. **Standardized Header & Filter Bar**:
>    - Uses **`<PageHeader>`** with KPI metrics (`Total Partners`, `Active`, `Vetting Queue`, `Missing Claims`) and action buttons (`Export CSV`, `+ Register Partner`).
>    - Uses **`<FilterBar>`** with real-time search and filter pill buttons (`All Partners`, `Active Studios`, `Vetting Queue`, `Referral Claims`).
> 3. **Master-Detail 2-Panel View**:
>    - Replaces the loose floating cards and huge blank space with the standardized **Master-Detail Split View**:
>      - **Left Panel (1/3 Width)**: `PARTNER DIRECTORY (X)` list with partner badges, commission tier, contact info, and click-to-inspect selection.
>      - **Right Panel (2/3 Width)**:
>        - **Empty State**: Centered `No Partner Selected` illustration matching Customers & User Management.
>        - **Selected State**: Full Partner Workspace featuring Partner Profile, Referrals & Deals ledger, Agreements Vault, Bank Details, and Counter QR Kit.

---

## Proposed Changes

### CRM / Partner Hub

#### [MODIFY] [`Partners.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Partners.jsx)
- **Header & Metric Standardization**:
  - Replace custom header markup with standard `<PageHeader>` component.
  - Set title to **`"Partners"`** and subtitle to `"Centralized framing partner studios, vetting queue, referral tracking, and monthly commission settlements."`.
  - Add standardized metric badges:
    - `Total Partners` (cyan)
    - `Active Studios` (emerald)
    - `Vetting Queue` (amber)
    - `Missing Claims` (rose)
  - Add `Export CSV` and `+ Register Partner` top actions.
- **Filter Bar Integration**:
  - Implement standardized `<FilterBar>` with search input and category pills (`All Partners`, `Active Studios`, `Vetting Queue`, `Referral Claims`).
- **Master-Detail Split Layout**:
  - **Left Column (`w-full lg:w-1/3`)**:
    - Header: `<Handshake size={14} className="text-primary" /> Partner Directory ({count})` `click to inspect`.
    - Scrollable directory cards with studio name, partner ID badge (`P-1001`), commission tag (`5.0% Comm`), and active referrals count.
  - **Right Column (`flex-1`)**:
    - **Empty State**: Clean placeholder with `<Handshake size={48} />` and `"No Partner Selected"`.
    - **Active Partner Workspace**:
      - Top Profile Card with contact actions (`Call Phone Link`, `WhatsApp`, `Email`, `QR Flyer`, `Edit`).
      - Tabbed Sub-Workspace:
        1. **Referrals & Deals**: Live table of all leads referred by this partner with deal values and commission status (`Eligible for Payout`, `Accrued`, `Paid`).
        2. **Agreements & Document Vault**: BR Certificate, Framework Agreement, Operational Quality Guidelines, NIC/Passport.
        3. **Bank & Payouts**: Bank name, Account number, Branch, and settlement ledger.
        4. **Marketing QR Kit**: Dedicated public referral URL and high-res counter display flyer.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` in `c:\Users\User\Documents\print-to-frame-erp-system` to ensure 100% clean compilation.

### Manual Verification
1. Navigate to the **Partners** module.
2. Confirm the title is **"Partners"** and that the PageHeader and FilterBar match **Customers** and **User Management** pixel-for-pixel.
3. Verify the **Master-Detail** split view:
   - Left side shows the Partner Directory list.
   - Right side shows the "No Partner Selected" placeholder when unselected, and the full interactive Partner Workspace when a partner is clicked.
4. Test clicking between tabs (`Referrals & Deals`, `Agreements Vault`, `Bank Details`, `Marketing QR Kit`).

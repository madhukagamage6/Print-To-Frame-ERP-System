# Full Mobile Responsive UX & Architecture Upgrade Plan

Transform the Print To Frame ERP into a touch-optimized, ergonomic web application across smartphones and tablets (iOS and Android).

## User Review Required

> [!IMPORTANT]
> **Mobile Bottom Navigation Dock:**
> A new glassmorphic bottom navigation dock will appear on mobile screens (`< md`) providing 1-thumb access to:
> 1. 📊 **Dashboard**
> 2. 🎯 **CRM** (Leads / Deals)
> 3. 🏭 **Operations** (Fabrication / Logistics / Invoices based on user role)
> 4. 💬 **Messages** (with live unread badge)
> 5. ☰ **Menu** (opens full drawer navigation for remaining modules)

---

## Proposed Changes

Grouped by layer and component:

### 1. Application Shell & Navigation (`src/App.jsx`)

#### [MODIFY] [App.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/App.jsx)
- Add `<MobileBottomDock />` with 1-thumb navigation targets based on active user role.
- Add bottom safe-area padding (`pb-28 md:pb-20`) to main content area to prevent bottom bar overlap with footers and action triggers.
- Optimize top mobile app bar with compact logo, role badge, quick theme toggle, and notification bell.

---

### 2. Common Modals & Pickers Touch Optimization

#### [MODIFY] [GoogleDrivePickerModal.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/GoogleDrivePickerModal.jsx)
- Wrap in authoritative `<ModalWrapper>` with bottom sheet drawer styling on mobile (`rounded-t-3xl`).
- Optimize search bar and 1-column mobile file list layout.

#### [MODIFY] [AddressPickerModal.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/AddressPickerModal.jsx)
- Wrap in `<ModalWrapper>` with touch-friendly search and responsive map canvas height (`h-60 sm:h-80`) ensuring confirm button stays above the fold.

#### [MODIFY] [ContactSyncModal.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/ContactSyncModal.jsx)
- Wrap in `<ModalWrapper>` with full-width search and large touch checkboxes.

---

### 3. Master-Detail Modules Polish

#### [MODIFY] [Customers.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Customers.jsx)
- Ensure clean full-width list mode on mobile that switches to detail mode with sticky `← Back to Customer List` header button.

#### [MODIFY] [Partners.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/admin/Partners.jsx)
- Ensure clean mobile card selection and full-screen detail view with back navigation.

#### [MODIFY] [Messages.jsx](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/Messages.jsx)
- Ensure 1-click transition between contacts list and chat room on mobile with smooth keyboard avoidance.

---

## Verification Plan

### Automated Tests
- `npm run build` — Verify zero compilation errors and clean asset minification.

### Manual Verification
- Test mobile viewports (375px iPhone SE, 390px iPhone 14/15, 412px Pixel 7) in browser responsive design mode.
- Verify bottom navigation bar tab switching and drawer toggle.
- Verify Google Drive, Google Maps, and Contacts modals on mobile screen sizes.
- Promote to `staging` and merge to `main` for live production testing on mobile devices.

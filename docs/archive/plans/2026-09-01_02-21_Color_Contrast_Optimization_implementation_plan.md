# Implementation Plan — System-Wide Color Contrast, Modal Readability & UI Optimization

## 1. Problem Statement & Objectives
Our forensic audit detected 249 instances of double-dimmed micro-typography (8px–10px fonts with secondary grey colors), 247 instances of sub-visible "ghost" borders (`border-outline-variant/30..50`), and 18 semi-transparent pop-ups where underlying page elements bleed through, causing white/grey text and form fields to appear desaturated, dull, and strenuous to read.

### Objectives:
1. **Achieve WCAG 2.1 AA Compliance:** Elevate all text contrast ratios above 4.5:1 and UI boundaries above 3:1.
2. **Solidify All Pop-up Modals:** Convert semi-transparent modal cards to 100% solid, opaque surfaces with deep backdrops (`bg-black/80 backdrop-blur-md`) and clean edge definitions.
3. **Upgrade Form Inputs & Labels:** Replace flat, low-contrast inputs with clearly bounded, elevated form fields featuring crisp `text-xs font-bold text-on-surface` labels and vibrant focus rings.
4. **Refine Tables & Quotation Builder:** Deliver bold, high-contrast table headers, distinct row striping, visible dividers, and vibrant status pills.

---

## 2. User Review Required

> [!IMPORTANT]
> **Zero Breaking Layout Changes:**
> All upgrades focus on color tokens, opacity removals, border contrast, and font weight clarity. No functional logic, Firestore schema, or button handlers will be altered.

---

## 3. Proposed Changes Across Components

### A. Theme & CSS Design Tokens
#### [MODIFY] [`src/index.css`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/index.css)
- Elevate `--color-on-surface-variant` from `161 161 170` to `180 185 200` in dark mode to prevent micro-typography from fading into backgrounds.
- Boost `--color-outline-variant` from `30 40 56` to `40 54 75` for crisp border definitions.
- Boost `--color-outline` to `65 82 112` for primary input and card outlines.

---

### B. Universal Modal Framework & Pop-ups
#### [MODIFY] [`src/components/common/ui/DetailModalLayout.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/ui/DetailModalLayout.jsx)
#### [MODIFY] [`src/components/common/ui/ModalWrapper.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/ui/ModalWrapper.jsx)
#### [MODIFY] [`src/components/common/DeleteModal.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/DeleteModal.jsx)
#### [MODIFY] [`src/components/common/ImageCropModal.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/ImageCropModal.jsx)
- Replace `bg-surface-container/90` and `backdrop-blur-sm` with 100% opaque `bg-surface-container-high` and `bg-black/80 backdrop-blur-md`.
- Ensure modal headers feature a solid `border-b border-outline` with high-contrast titles.

---

### C. CRM & Operations Dossier Modals
#### [MODIFY] [`src/components/crm/LeadCardDetails.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/LeadCardDetails.jsx)
#### [MODIFY] [`src/components/operations/FabricationCardDetails.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/operations/FabricationCardDetails.jsx)
#### [MODIFY] [`src/components/operations/LogisticsCardDetails.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/operations/LogisticsCardDetails.jsx)
#### [MODIFY] [`src/components/common/UserProfile.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/UserProfile.jsx)
- **Form Field Labels:** Upgrade from `text-[9px] uppercase font-bold text-on-surface-variant` to `text-xs font-bold text-on-surface uppercase tracking-wider`.
- **Form Inputs & Textareas:** Upgrade from `bg-surface-container-low border-outline-variant` to `bg-surface-container-highest/60 border border-outline text-on-surface font-semibold focus:ring-2 focus:ring-primary`.
- **Audio Scope Dropzone:** Upgrade to high-contrast `bg-surface-container-highest border-2 border-dashed border-primary/50 text-on-surface`.

---

### D. Structured Quotation Builder & Tables
#### [MODIFY] [`src/components/crm/QuotationBuilder.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/QuotationBuilder.jsx)
#### [MODIFY] [`src/components/common/ui/SortableTable.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/ui/SortableTable.jsx)
#### [MODIFY] [`src/components/common/ui/FilterBar.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/ui/FilterBar.jsx)
#### [MODIFY] [`src/components/common/ui/StatusBadge.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/ui/StatusBadge.jsx)
- Upgrade table headers to solid `bg-surface-container-highest text-on-surface font-extrabold uppercase border-b-2 border-outline`.
- Replace invisible `text-on-surface-variant/40` inactive status pills with solid `bg-surface-container border border-outline-variant text-on-surface hover:border-primary/50`.
- Enhance FilterBar search inputs with visible borders and distinct focus states.

---

### E. Floating Quick Messenger
#### [MODIFY] [`src/components/tools/MiniChatDrawer.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/MiniChatDrawer.jsx)
- Solidify drawer container to `bg-surface-container-high border-2 border-outline`.
- Increase contrast of recent message snippet text and active contact indicator pills.

---

## 4. Verification Plan

### Automated Verification
- Run `npm run build` to verify clean compilation with 0 JSX/CSS errors.
- Run `scratch/scan_colors_contrast.js` to verify significant reduction in low-contrast patterns.

### Manual Visual Verification
- Inspect Modal Inspectors (Lead, Fabrication, Logistics, Profile) in both Dark and Light themes.
- Verify text legibility, input boundary visibility, and button contrast.
- Deploy to `staging` and `main` live production.

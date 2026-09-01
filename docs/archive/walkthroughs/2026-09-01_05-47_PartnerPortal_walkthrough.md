# Walkthrough — Fixed Assigned Agent Dropdown Styling

## 1. Issue & Root Cause Analysis

### The Issue:
In `LeadCardDetails.jsx`, when opening a Referral lead modal, the **Assigned Agent** dropdown rendered with a white background and white/light text, making the agent names unreadable.

### Root Cause:
The `className` on the `select` element contained an invalid Tailwind class: `bg-primary/10/50`. Because Tailwind couldn't parse the double opacity slash, the browser fell back to its default unstyled `<select>` widget in light mode on Webkit/Blink, causing a white background with white text.

---

## 2. Changes Made

1. **Fixed Select Styling (`src/components/crm/LeadCardDetails.jsx`):**
   - Replaced invalid class with proper dark mode theme tokens: `bg-surface-container-low`, `border-primary/50`, and `text-on-surface`.
   - Added `[&>option]:bg-surface-container-high` and `[&>option]:text-on-surface` so the native option list renders with dark theme background and crisp white text.
   - Updated the custom SVG chevron arrow to high-contrast cyan (`%2300daf3`).
2. **Fixed `CostCalculator.jsx`:**
   - Corrected another instance of `bg-primary/10/60` to `bg-primary/10`.

---

## 3. Verification & Live Deployment

- `npm run build` passed cleanly in 18.63s with 0 errors.
- Deployed live in commit `decd015` on `staging` and merged into `main`.

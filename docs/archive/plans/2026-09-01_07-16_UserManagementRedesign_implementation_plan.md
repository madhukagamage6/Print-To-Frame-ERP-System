# Implementation Plan — User Management Decoupling & Compact Detail Showcase Redesign

Streamline the **User Management** module (`AgentDatabase.jsx`) by scoping it exclusively to **Internal Team Members** and **Client Accounts** (decoupling Partner management into the dedicated **Partners** tab), and redesign the right-panel individual user detail inspector to mirror the compact, robust workspace showcase style built for the Partner module.

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions**:
> 1. **Partner Decoupling**:
>    - Users with `role === 'Partner'` will be excluded from the **User Management** directory, metrics, and filters, as they are fully managed within the **Partners** module.
>    - User Management filters become: `All Members`, `Internal Team`, `Corporate & Retail Clients`.
> 2. **Compact & Robust User Showcase**:
>    - Upgrade the right-panel detail view to feature the exact same high-density glassmorphism layout:
>      - **Top Profile Banner**: UserAvatar (`lg`), Verified Status, Role Pill, Email, Direct Call/WhatsApp, Edit Profile, and Quick Action buttons.
>      - **4 Clean Sub-Tabs**:
>        1. `[🛡️ Role & Permissions (RBAC)]`: Dynamic role selector, role description, and granular capability toggles.
>        2. `[👤 Profile & Identity Details]`: Full Name, Contact Phone, Company, Job Title / Specialist Role, Workshop Base / Location, Bio notes.
>        3. `[📋 Activity & Audit Trail]`: Chronological user activity stream and timestamped event history.
>        4. `[🔐 Security & Credentials]`: Password reset dispatcher, authentication provider badge, account activation toggle.

---

## Proposed Changes

### Admin & RBAC

#### [MODIFY] [`AgentDatabase.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/admin/AgentDatabase.jsx)
- **Scope Scoping (Remove Partner Records)**:
  - Filter `users` list by `u.role !== 'Partner'`.
  - Update `PageHeader` metrics: `Total Members`, `Internal Team`, `Client Accounts`, `Pending Approvals`.
  - Update `FilterBar` filter options: `All Members`, `Internal Team`, `Corporate & Retail Clients`.
- **Right Panel Detail Showcase Redesign**:
  - Replace the old nested layout with the compact, robust **Member Workspace**:
    - **Header Card**: `<UserAvatar size="lg">` with hover-to-crop camera button, User name, Role badge, Status badge (`Active` / `Deactivated`), Email, Phone (with `tel:` Phone Link call button and WhatsApp action), `Email Templates` button, `Edit Profile` button, and `Revoke Access` button.
    - **Sub-Workspace Navigation Tabs**:
      - `Role & Permissions`
      - `Profile Details`
      - `Activity Trail`
      - `Security & Access`
    - **Sub-Tab Contents**:
      - High-contrast inputs, clean key-value attribute cards, and scrollable audit log stream.
- **Edit & Crop Modals**:
  - Integrate modal triggers matching the Partner workspace workflow.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` in `c:\Users\User\Documents\print-to-frame-erp-system` to ensure 0 build errors.

### Manual Verification
1. Navigate to **User Management** (`/agents`).
2. Verify that **Partner** accounts no longer clutter the User Management directory (they are isolated in **Partners**).
3. Verify the metric badges in `PageHeader` (`Total Members`, `Internal Team`, `Client Accounts`).
4. Click on any internal employee or client record on the left:
   - Confirm the right panel opens the compact, robust **Member Workspace**.
   - Verify the top banner with `<UserAvatar size="lg">`, contact quick-actions, and role pill.
   - Switch between the 4 sub-tabs (`Role & Permissions`, `Profile Details`, `Activity Trail`, `Security & Access`).
5. Test updating role, editing profile, and photo cropping.

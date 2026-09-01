# Implementation Plan — Super Admin Recovery, 14-Email Template Suite, & Messages Communication Hub

Restore Super Administrator authority to `madhukagamage6@gmail.com`, expand the Email Template Dispatcher to **14 specialized operational templates** covering all business workflows, and integrate **WhatsApp** and the **Email Template Dispatcher Modal** into the Messages module top header.

## User Review Required

> [!IMPORTANT]
> **Summary of Action Items**:
> 1. **Super Admin Privilege Recovery & Self-Healing Guard**:
>    - Immediate restoration of `madhukagamage6@gmail.com` to `role: "Admin"` with full system rights.
>    - Self-healing safeguard in `App.jsx` authentication check to prevent administrative lockout.
> 2. **Expanded 14-Template Operational Email Suite (`emailTemplates.js`)**:
>    - **CRM & Quotations**: Quotation Submission (with 75% terms), Quotation Follow-up, 75% Advance Invoice Reminder.
>    - **Production & Logistics**: Factory Work Order Commenced, Ready for Inspection, Dispatch & Driver Scheduled, 25% Final Settlement Notice.
>    - **Partners & Commissions**: Monthly / Job Partner Commission Statement (at LKR 53.50/SqFt), Partner Welcome.
>    - **Corporate & Operations**: Corporate B2B Portal Activation, Employee Workspace Onboarding, Password Reset, Additional Info Request, Job Completion & Feedback Request.
> 3. **Messages Module Communication Hub (`Messages.jsx`)**:
>    - Add **WhatsApp** 1-click trigger button (`https://wa.me/...`).
>    - Wire **Email** button to launch `<EmailTemplateModal recipient={activeUser} currentUser={currentUser} />` with direct **"Open in Gmail (Web)"** and **"Copy Draft"** actions.

---

## Proposed Changes

### 1. Authentication & Self-Healing Admin Guard

#### [MODIFY] [`App.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/App.jsx)
- In the Firebase auth state handler, verify if `emailKey === "madhukagamage6@gmail.com"` and ensure `userData.role = "Admin"`.
- If Firestore currently has `"Manager"`, automatically promote and sync `setDoc(doc(db, "users", emailKey), { role: "Admin" }, { merge: true })`.

---

### 2. Comprehensive 14-Template Email Suite

#### [MODIFY] [`emailTemplates.js`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/constants/emailTemplates.js)
- Expand `EMAIL_TEMPLATES` array with 14 full-text templates containing real Sri Lankan steel fabrication workflows, commission details, bank account placeholders, and dynamic variables (`recipientName`, `portalUrl`, `contactPhone`, `senderName`, `companyName`, `totalSqFt`, `amount`).

---

### 3. Messages Module Actions & Modal Integration

#### [MODIFY] [`Messages.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/Messages.jsx)
- Import `EmailTemplateModal` and `MessageCircle` (for WhatsApp).
- Add `isEmailModalOpen` state.
- Render Emerald **WhatsApp** button when `activeUser.contactNumber` exists.
- Convert **Email** button from dead `mailto:` link into state trigger `setIsEmailModalOpen(true)`.
- Render `<EmailTemplateModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} recipient={activeUser} currentUser={currentUser} />`.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` in `c:\Users\User\Documents\print-to-frame-erp-system` to ensure 0 compile errors.

### Manual Verification
1. Log in with `madhukagamage6@gmail.com` and verify full Super Administrator privileges (Users, System Overview, Settings).
2. Open **Email Template Dispatcher** on any partner, client, or team member and verify all 14 templates render and interpolate data.
3. Open **Messages** module, select any colleague, click **Email** to verify the modal opens with Gmail Web trigger, and click **WhatsApp** to verify instant chat redirection.
4. Deploy live to production.

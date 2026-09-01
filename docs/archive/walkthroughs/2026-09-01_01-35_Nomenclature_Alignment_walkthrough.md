# Walkthrough — ERP Nomenclature Standardization & 1:1 UI Alignment

## 1. Summary of Completed Standardization
We have completed a full system-wide nomenclature standardization across all 14 main navigation modules and internal entity definitions. Every navigation item now exhibits **100% word-for-word parity** with its corresponding Page Header H1 title, accompanied by clear, elegant explanatory subtitles.

### Final Verification Results: 14 / 14 Modules Aligned (100% Match)

| Nav Group | Sidebar Nav Label | Page Header Title | Subtitle Summary |
|:---:|:---:|:---:|:---|
| **Overview** | **Dashboard** | **Dashboard** | Real-time enterprise overview, project metrics, and financial performance. |
| **Overview** | **Notifications** | **Notifications** | Real-time feed of system status changes, alerts, and direct team messages. |
| **CRM** | **Leads** | **Leads** | Nurture incoming inquiries from intake to quotation and 75% advance payment. |
| **CRM** | **Deals** | **Deals** | Track committed projects from waiting queue through fabrication, handover, and final settlement. |
| **Databases** | **Customers** | **Customers** | Centralized client registry, relationship profiles, order histories, and communications. |
| **Databases** | **User Management** | **User Management** | Manage authenticated identities, dynamic RBAC role assignments, and pending registrations. |
| **Databases** | **Partners** | **Partners** | Collaborative network of Creative Agencies, Digital Art Printers, and Freelance Referral Agents. |
| **Databases** | **Invoices** | **Invoices** | Central billing repository for advance receipts, balance settlements, and financial audits. |
| **Operations** | **Fabrication Works** | **Fabrication Works** | Manage specialist manufacturing from raw steel fabrication to finished gallery-wraps. |
| **Operations** | **Logistics** | **Logistics** | Manage dispatch schedules, driver allocations, material pickups, and customer deliveries. |
| **Tools** | **Cost Calculator** | **Cost Calculator** | Algorithmic steel framing pricing, BOM estimation, QA, and margin calculator. |
| **Tools** | **Messages** | **Messages** | Direct 1-on-1 team messaging, real-time collaboration, and file sharing. |
| **Settings** | **My Profile** | **My Profile** | Manage your personal credentials, studio identity, contact details, and workspace preferences. |
| **Settings** | **System Overview** | **System Overview** | Executive system analytics, database storage health, and system audit logs. |

---

## 2. Key Code Changes

| File | Changes Made |
|---|---|
| [`src/App.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/App.jsx) | Standardized Databases group labels: `Customers`, `User Management`, `Partners`, `Invoices`. |
| [`src/components/dashboard/Dashboard.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/dashboard/Dashboard.jsx) | Aligned header `Admin Dashboard` $\rightarrow$ `Dashboard` with enterprise overview subtitle. |
| [`src/components/dashboard/NotificationsView.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/dashboard/NotificationsView.jsx) | Aligned header `Notifications & Activity Hub` $\rightarrow$ `Notifications`. |
| [`src/components/crm/Leads.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Leads.jsx) | Aligned PageHeader title `Leads Intake` $\rightarrow$ `Leads`. |
| [`src/components/crm/Deals.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Deals.jsx) | Aligned PageHeader title `Deals Pipeline` $\rightarrow$ `Deals`. |
| [`src/components/crm/Customers.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Customers.jsx) | Aligned PageHeader title `Customer Database` $\rightarrow$ `Customers`. |
| [`src/components/admin/AgentDatabase.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/admin/AgentDatabase.jsx) | Aligned PageHeader title `User & Access Directory` $\rightarrow$ `User Management`. |
| [`src/components/crm/Partners.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Partners.jsx) | Aligned PageHeader title `Partner Network` $\rightarrow$ `Partners`. |
| [`src/components/crm/Invoices.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/Invoices.jsx) | Aligned PageHeader title `Consolidated Invoices` $\rightarrow$ `Invoices`. |
| [`src/components/operations/Logistics.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/operations/Logistics.jsx) | Aligned PageHeader title `Logistics Hub` $\rightarrow$ `Logistics`. |
| [`src/components/tools/CostCalculator.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/CostCalculator.jsx) | Aligned PageHeader title `Pricing Engine` $\rightarrow$ `Cost Calculator`. |
| [`src/components/tools/Messages.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/Messages.jsx) | Embedded standardized PageHeader for `Messages` view with team metrics. |
| [`src/components/common/UserProfile.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/UserProfile.jsx) | Aligned PageHeader title `User Profile & Identity Settings` $\rightarrow$ `My Profile`. |
| [`src/components/admin/AdminPanel.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/admin/AdminPanel.jsx) | Aligned PageHeader title `PTF EXECUTIVE CONTROL` $\rightarrow$ `System Overview`. |

---

## 3. Verification & Deployment
- **Verification Script:** `scratch/scan_headers.js` (14/14 MATCH)
- **Vite Production Build:** `npm run build` (0 errors, built in 15.88s)

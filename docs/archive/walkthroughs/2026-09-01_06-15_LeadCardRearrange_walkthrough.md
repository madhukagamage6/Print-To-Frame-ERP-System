# Walkthrough — Rearranged Lead & Deal Card Modal Layout

## 1. Overview & Objectives Accomplished

We rearranged the internal structure of the universal Lead & Deal Card modal (`LeadCardDetails.jsx`):
1. **Left Column (Primary Operational Flow):**
   - **1. Client Profile Details:** Contact number with `+94`, Full Name, Company, Email, Lead Source, and Assigned Agent dropdown (with auto-fill customer prompt banner).
   - **2. Automated Pricing Engine:** Length & Height inputs, calculated SqFt, Tier rate indicator, and 1-click "Apply Calculator Results to Lead Quotation".
   - **3. AI Call Recording Analyzer:** Audio drag-and-drop dropzone, downsampling progress bar, audio playback preview, Gemini scope extractor, and "Confirm and Set as Job Scope" button.
   - **4. Job Requirement & Scope Details:** Scope Details multiline textarea and Delivery Address / Logistics Info with map pin icon.
   - **5. Quotation & Pricing Breakdown:** Total Contract Value, Gross Volume SqFt, and the structured line-item `QuotationBuilder` BoQ table with version history and 75%/25% split.

2. **Right Column (Document Previews, AI Drafts & Logistics Hub):**
   - **1. Quotation Summary & Financial KPI Card:** Current Total Contract Value snapshot, 75% Advance Due & 25% Final Settlement badges, and direct Print Action Buttons (`75% Advance` PDF & `25% Final` PDF).
   - **2. AI Text Quotation Drafts Card:** "AI Draft Formal Quotation Letter" action, syntax-font quotation body preview, 1-click "Copy to Clipboard", and "Erase Draft".
   - **3. AI Advance Invoice (75%) Card:** "AI Generate 75% Invoice" action, invoice draft preview, `Print PDF`, `Save to DB`, and `Mark Paid / Payment Received` status buttons.
   - **4. Delivery Logistics Dispatch Hub (For Deals):** Real-time tracking ID, delivery status pill, destination address, assigned driver, or 1-click "Dispatch Delivery" button.

3. **Pure Vertical Scrolling (No Horizontal Sliders):**
   - Both columns are contained in a unified scroll container (`overflow-y-auto overflow-x-hidden`) with responsive wrapping on mobile and clean side-by-side distribution on desktop.

---

## 2. Verification Results

| Verification Step | Result |
|---|---|
| **Babel AST & Syntax Validation** | ✅ Clean AST Parse |
| **Vite Production Build (`npm run build`)** | ✅ Passed in 15.26s (0 errors) |
| **Git Deployment (`staging` & `main`)** | ✅ Deployed live via commit `43e821e` |

---

## 3. Layout Flow Comparison

````carousel
```markdown
### 1. Left Column: Operational Input Sequence
1. 👤 Client Profile Details (Contact, Name, Company, Email, Source, Agent)
2. 🧮 Automated Pricing Engine (Length x Height, SqFt, Tier)
3. 🎙️ AI Call Recording Analyzer (Telecom Compressor + Gemini Extraction)
4. 📝 Job Requirement & Scope Details (Scope & Delivery Location)
5. 📋 Quotation & Pricing Breakdown (Line-Item BoQ Table)
```
<!-- slide -->
```markdown
### 2. Right Column: Document Previews & AI Drafts Hub
1. 📊 Quotation Summary & Financial Overview (75%/25% Split & Print Buttons)
2. ✨ AI Text Quotation Draft (Formal Letter Generator + Copy)
3. 📄 AI Advance Invoice (75% Invoice Generator + Save to DB + Mark Paid)
4. 🚚 Delivery Logistics Dispatch Hub (Live Status + Dispatch Button)
```
<!-- slide -->
```markdown
### 3. Unified Across Leads & Deals
- Shared modal component automatically updates both Leads CRM and Deals Pipeline views.
- Clean vertical scrolling without horizontal sliders or clipping.
```
````

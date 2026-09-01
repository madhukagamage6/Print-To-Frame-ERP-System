# Implementation Plan — Rearrange Lead Card Details Layout

Rearrange the internal sections of the Lead & Deal Card modal (`LeadCardDetails.jsx`) into a logical, ergonomic 2-column layout with pure vertical scrolling (eliminating horizontal sliders), placing operational data inputs in a natural top-to-bottom sequence on the left and balancing generated drafts, document actions, and summaries on the right.

## User Review Required

> [!IMPORTANT]
> **Layout Hierarchy Summary**:
> - **Left Column (Primary Operational Flow)**:
>   1. **Client Profile Details** (Contact No with `+94`, Full Name, Company, Email, Lead Source, Assigned Agent)
>   2. **Automated Pricing Engine** (Length, Height, SqFt, Tier rate calculation, "Apply Pricing" action)
>   3. **AI Call Recording Analyzer** (Audio upload, telecom downsampler, Gemini scope extraction, "Apply to Scope" action)
>   4. **Job Requirement & Scope Details** (Scope Details textarea, Delivery Address & Logistics Info)
>   5. **Quotation & Pricing Breakdown** (Contract Value, SqFt, Structured `QuotationBuilder` BoQ table)
> - **Right Column (Document Previews, AI Drafts & Logistics Hub)**:
>   1. **Quotation Summary & Financial KPI Card** (Contract Value snapshot, 75%/25% split, Print Quick-Actions)
>   2. **AI Text Quotation Drafts Card** ("AI Draft Formal Quotation Letter", Draft preview textarea, Erase/Copy)
>   3. **AI Advance Invoice (75%) Card** ("AI Generate 75% Invoice", Invoice draft preview, Print PDF, Save to DB, Mark Paid)
>   4. **Delivery Logistics Dispatch Hub** (Real-time tracking, Driver assignment, 1-click "Dispatch Delivery")
> - **Pure Vertical Scrolling**: The modal dialog uses a unified vertical scrollbar (`overflow-y-auto overflow-x-hidden`) with zero horizontal sliders.

---

## Proposed Changes

### CRM Module

#### [MODIFY] [`LeadCardDetails.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/crm/LeadCardDetails.jsx)
- **Reorder Left Column (`DetailModalContent` / 7-cols on large screens)**:
  1. Move **Client Profile Details** to the very top.
  2. Place **Automated Pricing Engine** directly below Client Profile.
  3. Place **AI Call Recording Analyzer** directly below Pricing Engine.
  4. Place **Job Requirements & Scope Details** (Scope Details & Delivery Address) directly below AI Analyzer.
  5. Place **Quotation & Pricing Breakdown** with the structured `QuotationBuilder` at the bottom of the left column.
- **Enrich Right Column (`DetailModalSidebar` / 5-cols on large screens)**:
  1. Keep **Quotation Summary** at the top with financial KPI cards and quick print buttons.
  2. Move **AI Text Quotation Draft** (Generator button + preview textarea + clear button) to the right column below Quotation Summary.
  3. Move **AI Advance Invoice (75%)** (Generator button + preview textarea + Print PDF + Save to DB + Mark Paid buttons) to the right column below Quotation Draft.
  4. Keep **Delivery Logistics Dispatch Card** (for Deals) at the bottom of the right column.
- **Responsive Layout & Scroll Tuning**:
  - Use `grid grid-cols-1 lg:grid-cols-12 gap-6` (`lg:col-span-7` for left, `lg:col-span-5` for right).
  - Ensure parent modal container has `overflow-y-auto overflow-x-hidden` for seamless downward scrolling without any horizontal clipping or slider controls.

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` in `c:\Users\User\Documents\print-to-frame-erp-system` to confirm 100% clean bundle compilation without syntax or React rendering errors.

### Manual Verification
- Open any Lead or Deal card in the CRM.
- Verify that **Client Profile** appears at the top left.
- Verify **Automated Pricing Engine**, **AI Call Recording Analyzer**, **Job Scope**, and **Quotation Breakdown** follow in exact sequence.
- Verify the right side displays **Quotation Summary**, **AI Text Quotation Draft**, and **AI 75% Advance Invoice** cleanly stacked without excessive whitespace.
- Verify scrolling is purely vertical with no horizontal sliding or clipping.

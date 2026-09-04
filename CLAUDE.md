# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Print To Frame ERP is a single-page React ERP/CRM for a Sri Lankan custom-framing business (leads → deals → fabrication → logistics → invoicing, plus a partner/referral network). It's a Vite + React 18 SPA with Firebase (Auth + Firestore + Storage) as the sole backend — there is no separate Node server; a single Vercel serverless function (`api/generate.js`) proxies Gemini AI calls.

## Commands

```bash
npm run dev          # Vite dev server on 0.0.0.0:3000 (also proxies POST /api/generate locally, see vite.config.js)
npm run build         # production build to dist/
npm run preview       # preview the production build on port 3000
npm run lint          # eslint .
```

There is no unit test runner configured. `tests/e2e.test.js` is a Puppeteer script written for a Windows/local Chrome path and a `localhost:5173` target — it is not wired into `npm test` and generally cannot be run as-is in this environment; don't treat it as a working CI gate.

### Branching & deployment workflow

This repo deploys via Vercel from two branches, and there are two skills under `.agents/skills/` that automate the flow — prefer invoking them over ad hoc git commands when the user asks to "push to staging" or "deploy live":

- `staging` branch → Vercel **preview** deployment (day-to-day work happens here).
- `main` branch → Vercel **production** deployment (`portal.print2frame.xyz`).
- Promotion is a straight merge: `staging` → `main`, then push, then switch back to `staging`. Never commit directly to `main`.

## Architecture

### Everything is one Firestore-backed SPA

`src/App.jsx` is the composition root: it owns all top-level state (`leads`, `customers`, `partners`, `projects`, `logisticsJobs`, `invoices`, `quotations`, `users`), subscribes to Firestore in real time via `subscribeToCollection` (`src/services/firestoreSync.js`), and passes state + setters down as props to each lazy-loaded route component in `src/components/{crm,operations,dashboard,admin,tools}`. There is no router library — `activeTab` (a string) selects which component renders in `<main>`, gated by `canAccess(role, tab)`.

- `src/services/firebase.js` — Firebase app/auth/firestore/storage init, Google OAuth (with Drive/Contacts scopes), email login/register, `handleFirestoreError`.
- `src/services/firestoreSync.js` — the CRUD/subscription layer every feature uses: `subscribeToCollection`, `addDocument`, `updateDocument`, `setDocument`, `deleteDocument`, `batchWrite`, and `COLLECTIONS` (the canonical Firestore collection-name map — always reference `COLLECTIONS.X` rather than hardcoding a collection string).
- `src/services/dataDefaults.js` — seed/fallback data shapes when Firestore collections are empty.
- `src/services/pricingEngine.js` — the quotation/cost-calculator pricing logic (frame sizing, sq ft, commission math).
- `src/services/auditLog.js` — writes to the `auditLog` collection; call `logActivity(userId, userName, action, module, details)` after any state-changing operation (invoice created, user approved, permissions changed, etc.) — this is the established pattern throughout `App.jsx`.
- `src/services/gemini.js` — client-side helper that calls `/api/generate` (dev: Vite middleware plugin in `vite.config.js`; prod: `api/generate.js` Vercel function).

### RBAC: two layers that must stay in sync

Permissions are enforced in **three** places that all need to agree when changing access rules:
1. `src/context/PermissionsContext.jsx` — `DEFAULT_PERMISSIONS` (per-role, per-module `{view, create, edit, delete, export}`), live-synced from the `settings/permissions` Firestore doc, exposed via `usePermissions()` → `canAccess(role, module, action?)`. `App.jsx` uses this to decide which nav links/routes render.
2. `firestore.rules` — `checkPermission(module, action)` re-derives the same view/create/edit/delete/export (and legacy read/write) logic server-side, reading the *same* `settings/permissions` document, so client-side gating is never trusted alone. `settings/permissions` itself is writable only by Admins.
3. `src/constants/roles.js` — `SYSTEM_ROLES`, `PUBLIC_REGISTRATION_ROLES`, and `ROLE_METADATA` (labels/badges/categories used in UI, e.g. `AgentDatabase.jsx`, `AdminPanel.jsx`).

There are two hardcoded "bootstrap super admin" emails (see `App.jsx`'s "Self-Healing Super Admin Guard" and the matching `isBootstrapSuperAdmin()` in `firestore.rules`) that always self-heal back to role `Admin` / `status: Active` on login — this is intentional and mirrored on both client and rules, don't "fix" it away.

New users self-provision into `pendingUsers` (or `users` directly for the bootstrap admin emails) on first sign-in; an Admin approves via `AgentDatabase.jsx`, which also auto-provisions a matching `partners` or `customers` record depending on the granted role (`Partner` / `Business Client`). `role`, `isApproved`, and `status` are user-profile fields that must never be client-settable outside these narrow approve/self-heal paths — see the security comments at the top of the `users` match block in `firestore.rules` before touching that collection's rules.

### AI proxy (`api/generate.js`)

Requires a valid Firebase ID token (`Authorization: Bearer <token>`) AND that the caller's `users/{email}` doc is approved/active — mirrors the client-side gate in `App.jsx`. It tries a list of Gemini models in order (`CANDIDATE_MODELS`) and falls through on 404/503/429, but stops immediately on a 400. CORS is restricted to `ALLOWED_ORIGINS` (no wildcard). When editing this file, preserve both checks — this endpoint burns metered Gemini quota if left open.

### UI conventions

- Material Design–flavored Tailwind theme driven by CSS custom properties (`surface`, `on-surface`, `primary`, `outline-variant`, etc. — see `tailwind.config.js` and `brand-tokens.json`), with a `data-theme="dark"|"light"` attribute on `<html>` toggled from `App.jsx` and persisted to `localStorage`.
- Shared primitives live in `src/components/common/ui/` (`SortableTable`, `FilterBar`, `KanbanCard`/`KanbanColumn`, `StatusBadge`, `UserAvatar`, `PageHeader`, and the `detail-modal/` compound-component set) and are re-exported from `src/components/common/ui/index.js` — prefer these over building new list/table/modal chrome from scratch.
- Route components are `React.lazy`-loaded from `App.jsx` and each module's feature components live under `src/components/{crm,operations,dashboard,admin,tools,public,auth}/`.
- `src/context/MessagingContext.jsx` drives the in-app messaging system (floating toast + mini chat drawer + full `Messages` view) — real-time, per-user unread counts feed the sidebar badge.
- Partner-role users get a deliberately restricted nav/routing (`dashboard`, `notifications`, `partners`, `profile` only) — this restriction is enforced redundantly in `App.jsx`'s route-protection `useEffect` and in `DEFAULT_PERMISSIONS.Partner`.

### Docs and generated artifacts

`docs/archive/` holds historical implementation plans and walkthroughs (dated filenames) from prior work sessions — useful for context on why something looks the way it does, but not living documentation. The `.docx`/`.pdf` report files at the repo root are one-off generated audit artifacts, not source of truth. Per `.agents/AGENTS.md`, if the user asks to save something "as an artifact," generate it as `.docx`/`.pdf` (not `.md`) named `Title_YYYY_MM_DD_HH_MM.ext`.

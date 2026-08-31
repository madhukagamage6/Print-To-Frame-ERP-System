# Implementation Plan: Git Repository Migration & 2-Tier Staging/Preview Branching Workflow

## Overview & Objective
This plan outlines:
1. Migrating the remote repository to the official target:  
   **`https://github.com/madhukagamage6/Print-To-Frame-ERP-System`**
2. Setting up a professional **2-Tier Branching Strategy (`staging` → `main`)** where all ongoing work is pushed to a `staging` branch for **Vercel Preview Testing**, and only promoted/merged to `main` once satisfied for automatic **Live Production Deployment**.

---

## 2-Tier Branching Architecture & Workflow

```
               [Development & Feature Work]
                            │
                            ▼
              ┌───────────────────────────┐
              │      `staging` Branch     │
              └─────────────┬─────────────┘
                            │ (git push origin staging)
                            ▼
              ┌───────────────────────────┐
              │  Vercel Preview URL Build │  <-- Test on mobile, tablet & desktop
              └─────────────┬─────────────┘
                            │ (When verified & satisfied)
                            ▼
              ┌───────────────────────────┐
              │       `main` Branch       │
              └─────────────┬─────────────┘
                            │ (git merge staging & git push origin main)
                            ▼
              ┌───────────────────────────┐
              │ Live Production Domain    │  <-- Live custom domain (portal.print2frame.xyz)
              └───────────────────────────┘
```

---

## Technical Step-by-Step Execution Plan

### Phase 1: Remote Repository Configuration
1. **Preserve Current Remote as Backup:**
   ```bash
   git remote rename origin backup-dev
   ```
2. **Add New Official Target Repository:**
   ```bash
   git remote add origin https://github.com/madhukagamage6/Print-To-Frame-ERP-System.git
   ```
3. **Initialize Production Baseline (`main`):**
   Push our tested codebase to `main` on the new repository:
   ```bash
   git push -u origin main --force
   ```

---

### Phase 2: Create & Initialize `staging` Branch
1. **Create `staging` branch locally:**
   ```bash
   git checkout -b staging
   ```
2. **Publish `staging` branch to new repository:**
   ```bash
   git push -u origin staging
   ```

---

### Phase 3: How It Works in Daily Operation

#### 1. Daily Development (Working on `staging`)
* All development tasks, refactors, and AI assists will be committed and pushed to `staging`:
  ```bash
  git add .
  git commit -m "Your task description"
  git push origin staging
  ```
* **Instant Vercel Preview:**  
  Vercel automatically detects the push to `staging` and generates a dedicated **Preview URL** (e.g. `https://print-to-frame-erp-system-git-staging-xxx.vercel.app`).
* You can test and inspect changes on your phone, tablet, and PC without affecting your live customers.

#### 2. Promoting to Live Production (`main`)
* Once you review the preview and confirm you are 100% satisfied:
  - **Via Git CLI (Fast 1-Step Merge):**
    ```bash
    git checkout main
    git merge staging
    git push origin main
    git checkout staging
    ```
  - **Or Via GitHub Pull Request:** Open a PR from `staging` into `main` on GitHub and click "Merge".
* **Instant Live Deployment:**  
  Vercel automatically deploys the updated `main` branch to your live custom domain.

---

## Vercel Dashboard Settings Verification

In your **Vercel Project Settings**:
1. **Git Repository:** Connected to `madhukagamage6/Print-To-Frame-ERP-System`.
2. **Production Branch:** Set to `main` (Deploys directly to live domain).
3. **Preview Deployments:** Automatically enabled for all non-production branches (including `staging`).
4. **Environment Variables:** Available in both *Production* and *Preview* environments.

---

## Verification Plan

### Automated Verification
1. Run `git remote -v` to confirm `origin` is `https://github.com/madhukagamage6/Print-To-Frame-ERP-System.git`.
2. Run `git branch -a` to verify both `main` and `staging` branches exist locally and remotely.
3. Test a push to `staging` and verify upstream tracking with `git status`.

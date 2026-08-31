---
name: push-staging-preview
description: >-
  Automates verifying, committing, and pushing code changes to the 'staging' branch
  to trigger a private Vercel Preview Deployment for testing.
  Use when the user asks to push to staging, test in preview, create a preview build,
  or commit current work for review.
---

# Push to Staging & Vercel Preview Deployment Skill

This skill executes the automated pipeline to safely push changes to the `staging` branch, triggering a dedicated Vercel Preview deployment for cross-device testing.

## Execution Workflow

When invoked:

1. **Verify Build Health:**
   Run `npm run build` to ensure there are no build, bundle, or linting errors before pushing.
   If the build fails, STOP and resolve the build issues first.

2. **Verify Active Branch:**
   Ensure the current active branch is `staging`:
   ```powershell
   git branch --show-current
   ```
   If not on `staging`, checkout `staging` (or merge working branch into `staging`).

3. **Stage and Commit:**
   Stage all modified and created files:
   ```powershell
   git add .
   git commit -m "<Clear, concise summary of the changes made>"
   ```

4. **Push to Staging Remote:**
   Push commits to `origin/staging`:
   ```powershell
   git push origin staging
   ```

5. **Report to User:**
   - Report the latest commit hash and summary.
   - Instruct the user to open their **Vercel Dashboard** or preview link to inspect the changes on mobile, tablet, and desktop.
   - Remind the user that once they are satisfied, they can invoke `deploy-production-live` to promote the changes to the live site.

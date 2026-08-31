---
name: deploy-production-live
description: >-
  Automates promoting the tested and approved 'staging' branch into 'main'
  and deploying live to production on Vercel.
  Use when the user is satisfied with the preview, asks to deploy to live,
  merge staging to main, or release to production.
---

# Deploy Production Live Skill

This skill executes the safe promotion of the verified `staging` branch to `main`, triggering Vercel's automated live production deployment.

## Execution Workflow

When invoked:

1. **Safety Check:**
   Confirm that all working directory changes are clean on `staging`:
   ```powershell
   git status
   ```
   If there are unstaged or uncommitted changes, commit them to `staging` first.

2. **Switch to Main Branch:**
   ```powershell
   git checkout main
   ```

3. **Merge Staging into Main:**
   ```powershell
   git merge staging
   ```

4. **Push to Production Remote:**
   Push the updated `main` branch to trigger Vercel's live production build:
   ```powershell
   git push origin main
   ```

5. **Return to Staging Branch:**
   Immediately switch back to `staging` so future development continues in the sandbox:
   ```powershell
   git checkout staging
   ```

6. **Report to User:**
   - Confirm that `main` has been successfully updated and pushed.
   - Notify the user that Vercel is deploying the updates to the live domain (e.g. `portal.print2frame.xyz`).
   - Confirm that the local active branch is safely back on `staging`.

# Deployment & Release Runbook

This project uses a branch-based Gitflow-style deployment for the backend via Vercel and a manual release process for the mobile app (APK) via GitHub Actions + Expo EAS.

## 🌿 Branching & Environment Strategy

- **`develop` branch**: Default working branch.
  - **Backend Deploy**: Automatically deployed to the staging environment (`mymemory-server-stage.vercel.app`) on push.
  - **Mobile App**: Local development (`pnpm dev`, `expo run:android`) automatically targets the staging backend url.
  
- **`main` branch**: Production branch.
  - **Backend Deploy**: Automatically deployed to the production environment (`mymemory-server-rosti.vercel.app`) on push.
  - **Mobile App**: Production EAS builds target the production backend url.

## 🚀 Workflows

### 1. Backend Deploy (Vercel)
**File**: `.github/workflows/backend-deploy.yml`

This workflow triggers on pushes to `develop` and `main`, but *only* if backend or shared code changes (`apps/server/**`, `packages/**`, etc.).
- It uses a single fast job with the Vercel CLI (`vercel pull`, `vercel build`, `vercel deploy`).
- It determines the target Vercel project based on the branch.
- Concurrent runs on the same branch are automatically canceled to save CI time.

### 2. Mobile APK Release (Expo EAS)
**File**: `.github/workflows/mobile-release.yml`

This workflow is **manual only** (via `workflow_dispatch` in the GitHub Actions tab) to prevent CI spam and cost on every commit.

**How to create a release:**
1. Go to the **Actions** tab in GitHub.
2. Select **Mobile APK Release** on the left.
3. Click **Run workflow**.
4. Enter the release **Tag** you want to create (e.g., `v1.2.0`).
5. Choose the branch (usually `main`).
6. Click **Run workflow**.

**What it does:**
- Checks out the code and installs dependencies.
- Runs an EAS local production build (`eas build --platform android --profile production --local`).
- Creates a new GitHub Release using the provided tag.
- Attaches the resulting `app-release.apk` to the GitHub Release.

## 🔑 Required GitHub Secrets

To make these workflows function, the repository must have the following secrets configured in **Settings > Secrets and variables > Actions**:

| Secret Name | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel personal access token for CLI deployment. |
| `VERCEL_ORG_ID` | Your Vercel Organization ID or Team ID. |
| `VERCEL_PROJECT_ID_SERVER_STAGE` | The Vercel Project ID for the Staging backend application. |
| `VERCEL_PROJECT_ID_SERVER_PROD` | The Vercel Project ID for the Production backend application. |
| `EXPO_TOKEN` | Expo access token for EAS CLI authentication. |
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions (ensure it has Read/Write repository permissions for releases). |

## 📦 App Config Details

The `apps/mobile/app.config.ts` dynamically switches the app identifiers so you can have the Dev and Production apps installed on the same device side-by-side:

- **Local/Dev**: `com.rostise.mymemory.dev`
- **EAS Production**: `com.rostise.mymemory`

The environment URLs for the backend are injected via `apps/mobile/eas.json` (for production) and `apps/mobile/.env` (for dev).

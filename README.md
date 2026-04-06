# 🚀 Full-Stack Expo + Hono + oRPC Monorepo Template

This repository is a production-ready **Turborepo monorepo** starter. It provides a complete, end-to-end type-safe architecture featuring a React Native mobile app (Expo) and an Edge-ready backend API (Hono), seamlessly connected via contract-first RPC (oRPC).

Use this as a **checkpoint template**: fork or copy this repository when you want to start a new highly-scalable, type-safe full-stack application.

---

## 🌟 What's in the Box?

| Layer | Technology |
|-------|------------|
| **Monorepo** | [Turborepo](https://turbo.build) + [pnpm workspaces](https://pnpm.io/workspaces) |
| **Frontend (Mobile)** | [Expo](https://expo.dev) SDK 55, [Expo Router](https://docs.expo.dev/router/introduction/) |
| **Backend (API)** | [Hono](https://hono.dev/) (Edge/Node), [oRPC Server](https://orpc.dev/) |
| **API Contract** | [oRPC Contract](https://orpc.dev/), [Zod](https://zod.dev/) |
| **Client Data Fetching** | [oRPC Client](https://orpc.dev/) + [TanStack Query](https://tanstack.com/query) |
| **Database ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **UI & Styling** | [HeroUI Native](https://github.com/heroui-inc/heroui-native), [Tailwind CSS v4](https://tailwindcss.com) + [Uniwind](https://github.com/uniwind/uniwind) |
| **Auth & DB Hosting** | [Supabase](https://supabase.com/) |

---

## 📚 Documentation

For a comprehensive guide on how this architecture works, how to build new features, and how to deploy to production, please read the **Architectural Guide**:

👉 **[Read the Full Architecture & Template Guide](./docs/ARCHITECTURE.md)** 👈

---

## 📂 Monorepo Structure

```text
/
├── apps/
│   ├── mobile/         # 📱 The Expo React Native app
│   └── server/         # ⚙️ The Hono backend server
│
├── packages/
│   ├── shared/         # 🤝 The Single Source of Truth (oRPC Contracts & Zod schemas)
│   └── db/             # 🗄️ Drizzle schemas, migrations, and database connection
│
├── turbo.json          # Turborepo task configuration (build, dev, lint)
├── pnpm-workspace.yaml # Defines the workspaces
└── eas.json            # Expo deployment configuration
```

---

## 🚦 Quick Start

### 1. Prerequisites
- **Node.js** (v20+ recommended for native `--env-file` support)
- **pnpm** (Required for the workspace lockfile)

### 2. Install Dependencies
Always use `pnpm install` at the root of the project. If you experience lockfile issues when adding packages, use the `--no-frozen-lockfile` flag.
```bash
pnpm install
```

### 3. Environment Variables
You need two environment files: one for the mobile app (public keys) and one for the server (secret keys).

**For the Mobile App:**
Create `apps/mobile/.env` and add your public variables:
```bash
EXPO_PUBLIC_SUPABASE_URL="your-supabase-url"
EXPO_PUBLIC_SUPABASE_KEY="your-anon-key"
# Leave this undefined locally to automatically resolve to your computer's IP
# EXPO_PUBLIC_API_URL="http://your-production-api.com"
```

**For the Backend API:**
Create `apps/server/.env` and add your secret variables:
```bash
DATABASE_URL="postgresql://..."
JINA_API_KEY="..."
OPENAI_API_KEY="..."
```

### 4. Start the Development Servers
Run the following command from the **root** of the monorepo:
```bash
pnpm dev
```
Turborepo will concurrently start both the Hono backend server (on port `8787`) and the Expo Metro Bundler (on port `8081`). 

Open your iOS Simulator, Android Emulator, or scan the QR code with the Expo Go / Dev Client app to begin!

---

## 📝 Using this Repo as a Template

When spinning up a new project from this template:

1. **Clone or Copy**: Duplicate the tree into a new folder.
2. **Rename the Apps**: 
   - Update `"name"` in `apps/mobile/package.json` and `apps/server/package.json`.
   - Update the Expo config in `apps/mobile/app.json` (`expo.name`, `expo.slug`, `expo.scheme`, `expo.android.package`, `expo.ios.bundleIdentifier`).
3. **Reset Database/Auth**: Point the `.env` files to your new Supabase instance or custom database.
4. **Define Your API**: Open `packages/shared/src/index.ts` and replace the placeholder API contract with your own domain logic!

Happy building! 🚀
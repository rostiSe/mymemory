# 🏗️ Full-Stack Expo + Hono + oRPC Monorepo Template

Welcome to your ultimate full-stack React Native / API template! This codebase is designed to be highly scalable, 100% type-safe from database to mobile app, and built on the most modern edge-ready technologies.

This document serves as your "Source of Truth" for how the architecture works, why certain technologies were chosen, and how to replicate or build upon this template for future projects.

---

## 🛠️ The Tech Stack

### Monorepo & Tooling
- **[pnpm workspaces](https://pnpm.io/workspaces)**: Manages dependencies efficiently across multiple packages via hoisting.
- **[Turborepo](https://turbo.build/)**: Orchestrates tasks (`pnpm dev`, `pnpm build`) with advanced caching. It ensures that when you run `dev`, both the frontend and backend boot up simultaneously.

### The Backend (`apps/server`)
- **[Hono](https://hono.dev/)**: An ultra-fast, lightweight web framework designed for the Edge (Vercel, Cloudflare, Bun) and Node.js. It replaces traditional Express.
- **[oRPC](https://orpc.dev/) (Server)**: A contract-first RPC framework. Instead of manually maintaining API types, oRPC ensures your server strictly implements a predefined contract, and the client inherently knows exactly what to expect.

### The Frontend (`apps/mobile`)
- **[Expo](https://expo.dev/) & React Native**: The universal React framework for native apps.
- **[Expo Router](https://docs.expo.dev/router/introduction/)**: File-based routing for React Native.
- **[oRPC](https://orpc.dev/) (Client) + TanStack Query**: Automatically generates React Query hooks (`useQuery`, `useMutation`) directly from your backend contract. You never have to manually type a `fetch` request again.
- **[HeroUI Native](https://heroui.com/) / Tailwind v4**: Modern, utility-first styling tailored for React Native.

**Mobile-only deep dives** (Share Quick, cache/sync, feed, workspace `dist/`): see [docs/mobile/README.md](./mobile/README.md).

### The Data Layer
- **[Drizzle ORM](https://orm.drizzle.team/)**: A headless TypeScript ORM that lets you write SQL-like queries with perfect type safety.
- **[Zod](https://zod.dev/)**: Used for defining API inputs, outputs, and validation schemas.

---

## 📂 Project Structure

The project is split into isolated "workspaces" to separate concerns and prevent backend code (like Node.js libraries) from accidentally leaking into the mobile app bundle.

```text
/
├── apps/
│   ├── mobile/         # 📱 The Expo React Native app
│   └── server/         # ⚙️ The Hono backend server
│
├── packages/
│   ├── shared/         # 🤝 The Single Source of Truth (Contracts & Zod schemas)
│   └── db/             # 🗄️ Drizzle schemas, migrations, and database connection
│
├── turbo.json          # Turborepo task configuration (build, dev, lint)
├── pnpm-workspace.yaml # Defines the workspaces
└── eas.json            # Expo deployment configuration
```

---

## 🚀 How to Build a New Feature

Because we use a **Contract-First** approach with oRPC, building a new feature always follows a strict 3-step lifecycle. This guarantees that your frontend and backend are never out of sync.

### Step 1: Define the Contract (`packages/shared`)
Everything starts in `@mymemory/shared`. You define the route, what it expects as input, and what it promises to return.

```typescript
// packages/shared/src/index.ts
import { oc } from '@orpc/contract';
import { z } from 'zod';

export const appContract = oc.router({
  // Existing routes...
  
  // 1. Add your new route contract
  users: oc.router({
    getUser: oc
      .input(z.object({ id: z.string() }))
      .output(z.object({ name: z.string(), email: z.string() }))
  })
});
```

### Step 2: Implement the Backend (`apps/server`)
Now, switch to the server. Because the server `implements` the contract, TypeScript will throw an error until you fulfill the promise you just made.

```typescript
// apps/server/src/index.ts
const router = os.router({
  // Existing routes...

  // 2. Implement the logic
  users: {
    getUser: os.users.getUser.handler(async ({ input }) => {
      // TS knows `input.id` is a string!
      const user = await db.query.users.findFirst({ ... });
      
      // TS will yell at you if you don't return { name, email }
      return { name: user.name, email: user.email }; 
    })
  }
});
```

### Step 3: Consume in the Frontend (`apps/mobile`)
Finally, go to your Expo app. Your new route is instantly available as a fully-typed TanStack Query hook!

```tsx
// apps/mobile/src/app/profile.tsx
import { orpc } from '@/lib/orpc';

export default function ProfileScreen() {
  // 3. Just use it! No fetch, no manual types.
  const { data, isLoading } = orpc.users.getUser.useQuery({ input: { id: "123" } });

  if (isLoading) return <Text>Loading...</Text>;
  
  // TS knows `data` has `.name` and `.email`!
  return <Text>Hello {data.name}</Text>;
}
```

---

## 💻 Local Development Workflow

To start the entire stack (both frontend and backend) simultaneously, simply run:

```bash
pnpm install
pnpm dev
```

### 🌐 Mobile Network Constraints (Crucial Concept)
When developing a mobile app on a physical device or Android emulator, `localhost` refers to the **phone itself**, not your computer! 

To fix this, the app dynamically detects your computer's IP address (e.g., `192.168.1.10`) using `Constants.expoConfig.hostUri` and rewrites the API URL automatically. This logic lives in `apps/mobile/src/lib/orpc.ts`.

### 🔒 Environment Variables
- **Backend (`apps/server/.env`)**: Contains secrets like `DATABASE_URL` or `OPENAI_API_KEY`. The server uses `import "dotenv/config"` at the top of `index.ts` to ensure `tsx` loads them correctly.
- **Frontend (`apps/mobile/.env`)**: Contains public variables. In Expo, any variable must be prefixed with `EXPO_PUBLIC_` to be bundled into the app (e.g., `EXPO_PUBLIC_API_URL`).

---

## 📦 Dependency Management (Gotchas)

Because this is a `pnpm` monorepo, installing dependencies has specific rules:

1. **Adding a package to a specific workspace**:
   ```bash
   pnpm add <package-name> --filter @mymemory/server
   ```
2. **Lockfile Mismatches**:
   If you ever manually edit a `package.json` file or get a frozen lockfile error, run:
   ```bash
   pnpm install --no-frozen-lockfile
   ```
3. **Expo Metro Bundler**:
   React Native's bundler (Metro) doesn't natively understand monorepos. `apps/mobile/metro.config.js` has been specially configured with `workspaceRoot` and `disableHierarchicalLookup` to force it to look up the directory tree to the hoisted `node_modules` at the root.

---

## 🌍 Deployment Strategy

### Backend (Hono to Vercel/Cloudflare)
Hono is exceptionally well-suited for serverless edge deployments. 
- You can deploy `apps/server` directly to **Vercel** by configuring the Vercel project root directory to `apps/server`.
- Make sure to add your `.env` variables to the Vercel dashboard.

### Frontend (Expo to EAS)
The mobile app is built using **Expo Application Services (EAS)**.
- `eas.json` is located at the root of the monorepo, but it contains `"baseDirectory": "apps/mobile"`.
- This tells EAS build servers to navigate into the mobile folder before executing the build process, ensuring standard Expo behavior within the monorepo.

---

## ⚠️ Common Troubleshooting

### `EADDRINUSE 0.0.0.0:8787` (Ghost Processes)
If you crash your development environment forcefully, Node.js might leave an orphaned process running in the background holding your API port. 
**Fix (Windows)**:
```bash
taskkill //F //IM node.exe
```
**Fix (Mac/Linux)**:
```bash
killall node
```

### `Module not found: @mymemory/shared`
If the mobile app or server complains it can't find your shared workspace:
1. Run **`pnpm --filter @mymemory/shared build`** so **`dist/`** exists (see [docs/mobile/workspace-and-build.md](./mobile/workspace-and-build.md)).
2. Ensure the workspace `package.json` has **`exports`** pointing at **`dist/`** and the consumer has `"@mymemory/shared": "workspace:*"`.
3. Restart the TS Server in your IDE (`Ctrl+Shift+P` -> `TypeScript: Restart TS server`).

---

## 🎉 Summary
By isolating your database, sharing a strict contract, and utilizing modern Edge and Native tooling, this template prevents the classic "frontend expects X, backend sent Y" bugs. Build confidently!

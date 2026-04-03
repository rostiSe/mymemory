# Stack Decision Reference

## Backend shape

### tRPC + Hono (default)
- Full type safety from DB to UI with zero codegen
- Hono runs on Railway, Fly.io, or Cloudflare Workers
- tRPC middleware handles Supabase JWT validation cleanly
- Best when: app has meaningful business logic, multiple clients, or complex queries
- Cost: separate deployment, more initial setup

### Supabase direct (fast-MVP escape hatch)
- Query Supabase from the Expo app directly via @supabase/supabase-js
- Row Level Security enforces access control
- Best when: CRUD-heavy, simple auth rules, need to ship in days not weeks
- Cost: business logic leaks into the client, harder to migrate later

### Expo API Routes + EAS Hosting
- Serverless functions co-located in the Expo repo
- Best when: small number of endpoints, want monorepo simplicity
- Cost: immature tooling, limited runtime, ties you to EAS hosting

---

## State management shape

### Zustand + MMKV (default)
- MMKV is 10x faster than AsyncStorage for reads/writes
- Zustand slices per domain (auth, ui, preferences)
- Persist only what genuinely needs to survive app restarts
- Never persist derived state — recompute from source of truth

### TanStack Query only
- Let server state drive everything
- Use React context for minimal local UI state
- Best when: app is mostly read-heavy with simple local state
- Cost: awkward for offline-first or complex optimistic updates

---

## Auth shape

### Supabase Auth + expo-secure-store (default)
- Tokens stored in expo-secure-store (encrypted native keychain)
- Session refresh handled by @supabase/supabase-js
- Social OAuth requires custom URL scheme and app.json config
- Apple Sign In requires dev client for native flow

### Clerk
- Best native OAuth UX out of the box
- Pre-built UI components
- Best when: app needs Google/Apple/GitHub OAuth with minimal setup
- Cost: vendor dependency, adds ~$25/month at scale

---

## Navigation patterns

### File-based (Expo Router default)
- Routes mirror filesystem: app/(tabs)/index.tsx = /
- Groups: (auth), (tabs), (modals) for layout isolation
- Deep linking works automatically
- Always ensure a route matches "/"

### Stack + Tab hybrid (most common pattern)
```
app/
  _layout.tsx          # Root layout (auth check)
  (auth)/
    _layout.tsx        # Auth stack
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx        # Tab bar
    index.tsx          # Home
    profile.tsx
  [modal].tsx          # Full-screen modal
```

---

## Offline-first considerations

Only recommend if the user explicitly needs it — offline-first adds significant complexity.

### WatermelonDB
- Reactive, lazy-loaded, works with Supabase sync
- Best for: complex relational data, heavy offline usage

### PowerSync
- Supabase-native sync engine
- Best for: simpler data models, want managed sync

### AsyncStorage + manual sync
- Simple, but error-prone at scale
- Only for: very small local state, non-critical data

---

## Animation depth

### Lightweight (Expo Go compatible)
- Animated API (built-in React Native)
- expo-linear-gradient
- Simple transitions via Expo Router

### Standard (most apps)
- Reanimated 3 — requires dev client
- Gesture Handler — requires dev client
- expo-blur, expo-haptics

### Heavy (complex interactions)
- Reanimated 3 + Gesture Handler + Skia
- Lottie animations
- WebGPU / Three.js via expo-gl (very advanced)

---

## EAS Build profiles

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### When to use a dev client vs Expo Go
- Expo Go: no custom native code, fastest iteration, start here always
- Dev client: custom config plugins, Reanimated, Gesture Handler, any native module not in Expo Go

# Agent notes

TanStack Intent (`pnpm dlx @tanstack/intent@latest list`) currently finds **no** intent-enabled packages in this repo. Skill files live under `.agents/skills/`; use those paths in `load` until packaged skills are added.

<!-- intent-skills:start -->
# Skill mappings - when working in these areas, load the linked skill file into context.
skills:
  - task: "Expo Router screens, tabs, navigation, and mobile UI patterns"
    load: ".agents/skills/building-native-ui/SKILL.md"
  - task: "Expo Router API routes, EAS Hosting, or server handlers under src/app/api"
    load: ".agents/skills/expo-api-routes/SKILL.md"
  - task: "Vercel AI SDK, agents, tools, streaming, or src/modules/ai"
    load: ".agents/skills/ai-sdk/SKILL.md"
  - task: "HeroUI Native, Uniwind, or mobile components with heroui-native"
    load: ".agents/skills/heroui-native/SKILL.md"
  - task: "Tailwind v4, Uniwind, or global.css theme setup in Expo"
    load: ".agents/skills/expo-tailwind-setup/SKILL.md"
  - task: "TanStack Query, fetch, caching, or network errors in the app"
    load: ".agents/skills/native-data-fetching/SKILL.md"
  - task: "Postgres queries, schema, or Supabase SQL performance"
    load: ".agents/skills/supabase-postgres-best-practices/SKILL.md"
  - task: "Hono apps, middleware, validation, or streaming on the server"
    load: ".agents/skills/hono-server/SKILL.md"
  - task: "EAS Build, Submit, updates, or store deployment"
    load: ".agents/skills/expo-deployment/SKILL.md"
  - task: "EAS workflow YAML, CI/CD pipelines for Expo"
    load: ".agents/skills/expo-cicd-workflows/SKILL.md"
<!-- intent-skills:end -->

import { defineConfig } from "drizzle-kit";

// We fall back to a dummy URL if not defined so drizzle-kit doesn't crash during build tests
// But it will fail if you try to push/migrate without a real DATABASE_URL
const dbUrl = process.env.DATABASE_DIRECT_URL || "";

export default defineConfig({
  schema: "./src/db/schema/*.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
});

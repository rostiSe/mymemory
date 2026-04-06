import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

serve(
  {
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(`Server is running on http://${info.address}:${info.port}`);
  },
);

import { appContract } from "@mymemory/shared/contracts";
import { base, authed } from "../orpc.js";
import { aiRouter } from "./ai.router.js";
import { entryRouter } from "./entry.router.js";
import { spaceRouter } from "./space.router.js";
import { wikiRouter } from "./wiki.router.js";

export const appRouter = base.router({
  ping: authed.handler(() => "pong"),
  entries: entryRouter,
  spaces: spaceRouter,
  ai: aiRouter,
  wiki: wikiRouter,
});

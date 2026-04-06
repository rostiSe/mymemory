import { implement } from "@orpc/server";
import { appContract } from "@mymemory/shared/contracts";
import { entryRouter } from "./entry.router.js";
import { spaceRouter } from "./space.router.js";
import { aiRouter } from "./ai.router.js";

export const appRouter = implement(appContract).router({
  ping: implement(appContract.ping).handler(() => "pong"),
  entries: entryRouter as any,
  spaces: spaceRouter as any,
  ai: aiRouter as any,
});

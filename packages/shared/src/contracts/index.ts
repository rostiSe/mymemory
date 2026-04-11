export * from "./ai.contract.js";
export * from "./entry.contract.js";
export * from "./space.contract.js";

import { oc } from "@orpc/contract";
import { z } from "zod";
import { aiContract } from "./ai.contract.js";
import { entryContract } from "./entry.contract.js";
import { spaceContract } from "./space.contract.js";

export const appContract = oc.router({
  ping: oc.output(z.string()),
  entries: entryContract,
  spaces: spaceContract,
  ai: aiContract,
});

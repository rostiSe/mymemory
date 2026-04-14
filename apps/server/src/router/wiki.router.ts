import {
  agentLogSchema,
  compileResultSchema,
  compilationStatusSchema,
  lintResultSchema,
  wikiCompileInputSchema,
  wikiContract,
  wikiGetPageInputSchema,
  wikiGetPageVersionsInputSchema,
  wikiListPagesInputSchema,
  wikiLogsInputSchema,
  wikiPageSchema,
  wikiPageVersionSchema,
} from "@mymemory/shared/contracts";
import { implement } from "@orpc/server";
import { z } from "zod";
import type { ORPCContext } from "../context.js";
import { wikiService } from "../modules/wiki/services/wiki.service.js";
import { authed } from "../orpc.js";

export const wikiRouter = implement(wikiContract)
  .$context<ORPCContext>()
  .router({
    compile: authed
      .input(wikiCompileInputSchema)
      .output(compileResultSchema)
      .handler(async ({ input, context }) => {
        return wikiService.compile(context.db, context.user!.id, input.mode);
      }),
    lint: authed.output(lintResultSchema).handler(async ({ context }) => {
      return wikiService.lint(context.db, context.user!.id);
    }),
    status: authed
      .output(compilationStatusSchema)
      .handler(async ({ context }) => {
        return wikiService.getStatus(context.db, context.user!.id);
      }),
    logs: authed
      .input(wikiLogsInputSchema)
      .output(z.array(agentLogSchema))
      .handler(async ({ input, context }) => {
        return wikiService.getLogs(context.db, context.user!.id, input);
      }),
    listPages: authed
      .input(wikiListPagesInputSchema)
      .output(z.array(wikiPageSchema))
      .handler(async ({ input, context }) => {
        return wikiService.listPages(context.db, context.user!.id, input);
      }),
    getPage: authed
      .input(wikiGetPageInputSchema)
      .output(wikiPageSchema.nullable())
      .handler(async ({ input, context }) => {
        return wikiService.getPage(context.db, context.user!.id, input);
      }),
    getPageVersions: authed
      .input(wikiGetPageVersionsInputSchema)
      .output(z.array(wikiPageVersionSchema))
      .handler(async ({ input, context }) => {
        return wikiService.getPageVersions(context.db, context.user!.id, input);
      }),
  });

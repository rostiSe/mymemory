import { os } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import type { ORPCContext } from "./context.js";

export const base = os.$context<ORPCContext>();

export const authed = base.use(({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "You must be logged in to access this resource.",
    });
  }

  return next({
    context: {
      ...context,
      user: context.user,
    },
  });
});

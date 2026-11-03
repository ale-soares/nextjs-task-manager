import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";
import { firstFieldMessage } from "../tasks/errors.ts";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    headers: opts.headers,
  };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? error.cause : null;

    return {
      ...shape,
      message: zodError ? firstFieldMessage(zodError) : shape.message,
      data: {
        ...shape.data,
        zodError: zodError ? zodError.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

export const appRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
});

export type AppRouter = typeof appRouter;

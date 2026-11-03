import { createTRPCRouter } from "../init.ts";
import { taskRouter } from "./task.ts";

export const appRouter = createTRPCRouter({
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

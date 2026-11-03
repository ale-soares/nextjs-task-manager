import { TRPCError } from "@trpc/server";
import {
  TaskNotFoundError,
  TaskValidationError,
  taskService,
  type TaskService,
} from "../../server/tasks/service.ts";
import {
  createTaskSchema,
  deleteTaskSchema,
  listTasksSchema,
  updateTaskSchema,
} from "../../tasks/schema.ts";
import { createTRPCRouter, publicProcedure } from "../init.ts";

export function createTaskRouter(service: TaskService = taskService) {
  return createTRPCRouter({
    list: publicProcedure.input(listTasksSchema).query(({ input }) => {
      return runTask(() => service.list(input));
    }),
    create: publicProcedure.input(createTaskSchema).mutation(({ input }) => {
      return runTask(() => service.create(input));
    }),
    update: publicProcedure.input(updateTaskSchema).mutation(({ input }) => {
      return runTask(() => service.update(input));
    }),
    delete: publicProcedure.input(deleteTaskSchema).mutation(({ input }) => {
      return runTask(() => service.delete(input));
    }),
  });
}

export const taskRouter = createTaskRouter();

function runTask<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }

    if (error instanceof TaskValidationError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
        cause: error.zodError,
      });
    }

    throw error;
  }
}

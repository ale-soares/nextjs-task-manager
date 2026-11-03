import { z } from "zod";

export const TASK_PAGE_SIZE = 20;

const PAGE_SIZE_MESSAGE = "Page size must be between 1 and 50.";

export const titleSchema = z
  .string("Title is required.")
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be 200 characters or fewer.");

export const descriptionSchema = z
  .string("Description must be text.")
  .trim()
  .max(2000, "Description must be 2000 characters or fewer.")
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const taskIdSchema = z.uuid("Task id must be a valid UUID.");

export const taskFormSchema = z.object({
  name: titleSchema,
  description: descriptionSchema,
});

export const createTaskSchema = z.object({
  titulo: titleSchema,
  descricao: descriptionSchema,
});

export const updateTaskSchema = z.object({
  id: taskIdSchema,
  titulo: titleSchema,
  descricao: descriptionSchema,
});

export const deleteTaskSchema = z.object({
  id: taskIdSchema,
});

export const listTasksSchema = z.object({
  cursor: taskIdSchema.nullish(),
  limit: z
    .number(PAGE_SIZE_MESSAGE)
    .int(PAGE_SIZE_MESSAGE)
    .min(1, PAGE_SIZE_MESSAGE)
    .max(50, PAGE_SIZE_MESSAGE)
    .default(TASK_PAGE_SIZE),
});

export const taskListInput = { limit: TASK_PAGE_SIZE } as const;

export function nextTaskCursor(page: { nextCursor: string | null }) {
  return page.nextCursor ?? undefined;
}

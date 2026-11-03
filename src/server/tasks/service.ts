import { ZodError } from "zod";
import { firstFieldMessage } from "../../tasks/errors.ts";
import {
  createTaskSchema,
  deleteTaskSchema,
  listTasksSchema,
  updateTaskSchema,
} from "../../tasks/schema.ts";
import type { TaskRecord } from "../../tasks/types.ts";
import { createMemoryStore, getSharedStore, type TaskStore } from "./store.ts";

type SortPoint = {
  id: string;
  dataCriacao: string;
};

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`No task found with id ${id}.`);
    this.name = "TaskNotFoundError";
  }
}

export class TaskValidationError extends Error {
  readonly zodError: ZodError;

  constructor(zodError: ZodError) {
    super(firstFieldMessage(zodError));
    this.name = "TaskValidationError";
    this.zodError = zodError;
  }
}

export type TaskService = {
  list(input: unknown): { items: TaskRecord[]; nextCursor: string | null };
  create(input: unknown): TaskRecord;
  update(input: unknown): TaskRecord;
  delete(input: unknown): { id: string };
};

export function createTaskService(options?: {
  store?: TaskStore;
  now?: () => Date;
  createId?: () => string;
}): TaskService {
  const store = options?.store ?? createMemoryStore();
  const now = options?.now ?? (() => new Date());
  const createId = options?.createId ?? (() => crypto.randomUUID());

  return {
    list(input) {
      const parsed = parse(listTasksSchema, input ?? {});
      const sorted = store.getAll().sort(compareNewestFirst);
      let start = 0;

      if (parsed.cursor) {
        const point = cursorPoint(store, parsed.cursor);
        if (!point) {
          return { items: [], nextCursor: null };
        }
        start = startIndex(sorted, point);
      }

      const items = sorted.slice(start, start + parsed.limit);
      const hasMore = start + items.length < sorted.length;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      };
    },
    create(input) {
      const parsed = parse(createTaskSchema, input);
      const task: TaskRecord = {
        id: createId(),
        titulo: parsed.titulo,
        dataCriacao: now().toISOString(),
      };

      if (parsed.descricao !== undefined) {
        task.descricao = parsed.descricao;
      }

      store.insert(task);
      return { ...task };
    },
    update(input) {
      const parsed = parse(updateTaskSchema, input);
      const existing = store.find(parsed.id);

      if (!existing) {
        throw new TaskNotFoundError(parsed.id);
      }

      const task: TaskRecord = {
        id: existing.id,
        titulo: parsed.titulo,
        dataCriacao: existing.dataCriacao,
      };

      if (parsed.descricao !== undefined) {
        task.descricao = parsed.descricao;
      }

      store.replace(task);
      return { ...task };
    },
    delete(input) {
      const parsed = parse(deleteTaskSchema, input);
      const removed = store.remove(parsed.id);

      if (!removed) {
        throw new TaskNotFoundError(parsed.id);
      }

      return { id: removed.id };
    },
  };
}

export const taskService = createTaskService({ store: getSharedStore() });

function parse<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: ZodError } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new TaskValidationError(result.error);
  }
  return result.data;
}

function compareNewestFirst(a: SortPoint, b: SortPoint) {
  if (a.dataCriacao !== b.dataCriacao) {
    return a.dataCriacao < b.dataCriacao ? 1 : -1;
  }

  if (a.id === b.id) {
    return 0;
  }

  return a.id < b.id ? 1 : -1;
}

function cursorPoint(store: TaskStore, cursor: string): SortPoint | undefined {
  const live = store.find(cursor);
  if (live) {
    return live;
  }

  const dataCriacao = store.deletedDataCriacao(cursor);
  if (!dataCriacao) {
    return undefined;
  }

  return { id: cursor, dataCriacao };
}

function startIndex(sorted: SortPoint[], cursor: SortPoint | undefined) {
  if (!cursor) {
    return 0;
  }

  const index = sorted.findIndex((item) => compareNewestFirst(cursor, item) < 0);
  return index === -1 ? sorted.length : index;
}

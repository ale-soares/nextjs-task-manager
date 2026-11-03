import type { TaskRecord } from "../../tasks/types.ts";

export type TaskStore = {
  getAll(): TaskRecord[];
  find(id: string): TaskRecord | undefined;
  deletedDataCriacao(id: string): string | undefined;
  insert(task: TaskRecord): void;
  replace(task: TaskRecord): void;
  remove(id: string): TaskRecord | undefined;
};

export function createMemoryStore(): TaskStore {
  const tasks: TaskRecord[] = [];
  const deleted = new Map<string, string>();

  return {
    getAll() {
      return tasks.map((task) => ({ ...task }));
    },
    find(id) {
      const task = tasks.find((item) => item.id === id);
      return task ? { ...task } : undefined;
    },
    deletedDataCriacao(id) {
      return deleted.get(id);
    },
    insert(task) {
      tasks.push({ ...task });
    },
    replace(task) {
      const index = tasks.findIndex((item) => item.id === task.id);
      if (index === -1) {
        return;
      }
      tasks[index] = { ...task };
    },
    remove(id) {
      const index = tasks.findIndex((item) => item.id === id);
      if (index === -1) {
        return undefined;
      }
      const [removed] = tasks.splice(index, 1);
      deleted.set(removed.id, removed.dataCriacao);
      return { ...removed };
    },
  };
}

const globalForTasks = globalThis as { __taskManagerStore?: TaskStore };

export function getSharedStore() {
  globalForTasks.__taskManagerStore ??= createMemoryStore();
  return globalForTasks.__taskManagerStore;
}

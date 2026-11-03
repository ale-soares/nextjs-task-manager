// Stored tasks use titulo, descricao, and dataCriacao. The screen uses name, description, and date.
// This file is the only translation between those two shapes.
import type { TaskRecord } from "./types";

export type TaskView = {
  id: string;
  name: string;
  description?: string;
  date: string;
};

export function formatTaskDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
}

export function toTaskView(task: TaskRecord): TaskView {
  return {
    id: task.id,
    name: task.titulo,
    ...(task.descricao !== undefined ? { description: task.descricao } : {}),
    date: formatTaskDate(task.dataCriacao),
  };
}

export function toTaskWriteInput(input: { name: string; description?: string }) {
  return {
    titulo: input.name,
    ...(input.description !== undefined ? { descricao: input.description } : {}),
  };
}

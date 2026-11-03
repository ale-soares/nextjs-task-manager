import assert from "node:assert/strict";
import test from "node:test";
import { formatTaskDate, toTaskView, toTaskWriteInput } from "../../tasks/view.ts";
import { createTaskService, TaskNotFoundError, TaskValidationError } from "./service.ts";
import { createMemoryStore } from "./store.ts";

const MISSING_ID = "00000000-0000-4000-8000-000000000099";

test("create trims text, keeps symbols, and sets id and date on the server", () => {
  const now = new Date("2026-11-02T15:00:00.000Z");
  const service = createTaskService({
    store: createMemoryStore(),
    now: () => now,
    createId: () => "00000000-0000-4000-8000-000000000001",
  });

  const task = service.create({
    titulo: "  #1 — 100%  ",
    descricao: "  a & b <c>  ",
    id: MISSING_ID,
    dataCriacao: "2000-01-01T00:00:00.000Z",
  });

  assert.equal(task.id, "00000000-0000-4000-8000-000000000001");
  assert.equal(task.titulo, "#1 — 100%");
  assert.equal(task.descricao, "a & b <c>");
  assert.equal(task.dataCriacao, now.toISOString());
});

test("create omits a blank description", () => {
  const service = serviceWithClock();
  const task = service.create({ titulo: "Hello", descricao: "   " });
  assert.equal(task.descricao, undefined);
});

test("create rejects an empty title", () => {
  const service = serviceWithClock();
  assertValidation(() => service.create({ titulo: "   " }), "titulo", "Title is required.");
  assertValidation(() => service.create({}), "titulo", "Title is required.");
});

test("create enforces title and description length after trim", () => {
  const service = serviceWithClock();
  service.create({ titulo: "a".repeat(200), descricao: "b".repeat(2000) });
  assertValidation(
    () => service.create({ titulo: "a".repeat(201) }),
    "titulo",
    "Title must be 200 characters or fewer.",
  );
  assertValidation(
    () => service.create({ titulo: "Ok", descricao: `  ${"b".repeat(2001)}  ` }),
    "descricao",
    "Description must be 2000 characters or fewer.",
  );
});

test("update keeps id, date, and list position, and can clear a description", () => {
  let tick = 0;
  const service = createTaskService({
    store: createMemoryStore(),
    now: () => new Date(Date.UTC(2026, 10, 2, 0, 0, tick++)),
    createId: sequenceIds(),
  });
  const older = service.create({ titulo: "Older", descricao: "note" });
  const newer = service.create({ titulo: "Newer" });

  const updated = service.update({
    id: older.id,
    titulo: "  Older title  ",
    descricao: "   ",
    dataCriacao: "1999-01-01T00:00:00.000Z",
  });

  assert.equal(updated.id, older.id);
  assert.equal(updated.titulo, "Older title");
  assert.equal(updated.descricao, undefined);
  assert.equal(updated.dataCriacao, older.dataCriacao);
  assert.deepEqual(
    service.list({}).items.map((task) => task.id),
    [newer.id, older.id],
  );
});

test("update and delete reject a bad id and a missing task", () => {
  const service = serviceWithClock();
  const task = service.create({ titulo: "Keep me" });

  assertValidation(
    () => service.update({ id: "not-a-uuid", titulo: "A" }),
    "id",
    "Task id must be a valid UUID.",
  );
  assertValidation(
    () => service.delete({ id: "not-a-uuid" }),
    "id",
    "Task id must be a valid UUID.",
  );
  assertNotFound(() => service.update({ id: MISSING_ID, titulo: "A" }), MISSING_ID);
  assertNotFound(() => service.delete({ id: MISSING_ID }), MISSING_ID);
  assert.equal(service.list({}).items.length, 1);
  assert.equal(service.list({}).items[0]?.id, task.id);
});

test("delete removes only the requested task", () => {
  const service = serviceWithClock();
  const first = service.create({ titulo: "First" });
  const second = service.create({ titulo: "Second" });

  assert.deepEqual(service.delete({ id: first.id }), { id: first.id });
  assert.deepEqual(
    service.list({}).items.map((task) => task.titulo),
    ["Second"],
  );
  assert.equal(service.list({}).items[0]?.id, second.id);
});

test("list returns the newest tasks first and continues after a deleted cursor", () => {
  let tick = 0;
  const service = createTaskService({
    store: createMemoryStore(),
    now: () => new Date(Date.UTC(2026, 10, 2, 0, 0, tick++)),
    createId: sequenceIds(),
  });

  for (const titulo of ["A", "B", "C", "D", "E"]) {
    service.create({ titulo });
  }

  const firstPage = service.list({ limit: 2 });
  assert.deepEqual(
    firstPage.items.map((task) => task.titulo),
    ["E", "D"],
  );
  assert.equal(firstPage.nextCursor, firstPage.items[1]?.id);

  service.delete({ id: firstPage.nextCursor! });

  const secondPage = service.list({ cursor: firstPage.nextCursor, limit: 2 });
  assert.deepEqual(
    secondPage.items.map((task) => task.titulo),
    ["C", "B"],
  );

  const thirdPage = service.list({ cursor: secondPage.nextCursor, limit: 2 });
  assert.deepEqual(
    thirdPage.items.map((task) => task.titulo),
    ["A"],
  );
  assert.equal(thirdPage.nextCursor, null);
  assert.deepEqual(service.list({ cursor: MISSING_ID }), { items: [], nextCursor: null });
});

test("tasks created in the same second stay in id order after an edit", () => {
  const now = new Date("2026-11-02T15:00:00.000Z");
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];
  const service = createTaskService({
    store: createMemoryStore(),
    now: () => now,
    createId: () => ids.shift()!,
  });
  const first = service.create({ titulo: "First" });
  const second = service.create({ titulo: "Second" });

  service.update({ id: first.id, titulo: "First edited" });

  assert.deepEqual(
    service.list({}).items.map((task) => task.id),
    [second.id, first.id],
  );
});

test("the view maps backend fields and formats the creation date", () => {
  const view = toTaskView({
    id: "00000000-0000-4000-8000-000000000001",
    titulo: "Name",
    descricao: "Details",
    dataCriacao: new Date(2026, 10, 2, 12).toISOString(),
  });

  assert.deepEqual(view, {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Name",
    description: "Details",
    date: "02-11-26",
  });
  assert.equal(formatTaskDate(new Date(2026, 0, 5, 9)), "05-01-26");
  assert.deepEqual(toTaskWriteInput({ name: "Name", description: "Details" }), {
    titulo: "Name",
    descricao: "Details",
  });
  assert.deepEqual(toTaskWriteInput({ name: "Name" }), { titulo: "Name" });
});

function serviceWithClock() {
  let tick = 0;
  return createTaskService({
    store: createMemoryStore(),
    now: () => new Date(Date.UTC(2026, 10, 2, 0, 0, tick++)),
    createId: sequenceIds(),
  });
}

function sequenceIds() {
  let next = 0;
  return () => {
    next += 1;
    return `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`;
  };
}

function assertValidation(run: () => void, field: string, message: string) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof TaskValidationError);
    const fieldErrors = error.zodError.flatten().fieldErrors as Record<string, string[] | undefined>;
    const messages = fieldErrors[field];
    assert.ok(
      messages?.includes(message),
      `expected ${field} to include "${message}", got ${JSON.stringify(error.zodError.flatten())}`,
    );
    assert.equal(error.message, message);
    return true;
  });
}

function assertNotFound(run: () => void, id: string) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof TaskNotFoundError);
    assert.equal(error.message, `No task found with id ${id}.`);
    return true;
  });
}

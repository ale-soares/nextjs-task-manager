import assert from "node:assert/strict";
import test from "node:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { TRPCError } from "@trpc/server";
import { createTaskService } from "../../server/tasks/service.ts";
import { createMemoryStore } from "../../server/tasks/store.ts";
import { createCallerFactory, createTRPCContext, createTRPCRouter } from "../init.ts";
import { createTaskRouter } from "./task.ts";

const MISSING_ID = "00000000-0000-4000-8000-000000000099";

test("procedures return stored tasks and structured errors", async () => {
  let tick = 0;
  const service = createTaskService({
    store: createMemoryStore(),
    now: () => new Date(Date.UTC(2026, 10, 2, 0, 0, tick++)),
    createId: (() => {
      let next = 0;
      return () => {
        next += 1;
        return `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`;
      };
    })(),
  });
  const router = createTRPCRouter({
    task: createTaskRouter(service),
  });
  const caller = createCallerFactory(router)({
    headers: new Headers(),
  });

  const created = await caller.task.create({
    titulo: "  Buy milk  ",
    descricao: "  2 liters  ",
  });
  assert.equal(created.titulo, "Buy milk");
  assert.equal(created.descricao, "2 liters");

  const listed = await caller.task.list({});
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0]?.id, created.id);

  const updated = await caller.task.update({ id: created.id, titulo: "Buy oat milk" });
  assert.equal(updated.titulo, "Buy oat milk");
  assert.equal(updated.dataCriacao, created.dataCriacao);

  const invalid = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request("http://localhost/api/trpc/task.create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: { titulo: "   " } }),
    }),
    router,
    createContext: () => createTRPCContext({ headers: new Headers() }),
  });
  const invalidBody = (await invalid.json()) as {
    error?: {
      message?: string;
      data?: { code?: string; zodError?: { fieldErrors?: { titulo?: string[] } } };
    };
  };
  assert.equal(invalid.status, 400);
  assert.equal(invalidBody.error?.message, "Title is required.");
  assert.equal(invalidBody.error?.data?.code, "BAD_REQUEST");
  assert.equal(invalidBody.error?.data?.zodError?.fieldErrors?.titulo?.[0], "Title is required.");

  await assert.rejects(caller.task.delete({ id: MISSING_ID }), (error: unknown) => {
    assert.ok(error instanceof TRPCError);
    assert.equal(error.code, "NOT_FOUND");
    assert.equal(error.message, `No task found with id ${MISSING_ID}.`);
    return true;
  });

  await caller.task.delete({ id: created.id });
  assert.deepEqual(await caller.task.list({}), { items: [], nextCursor: null });
});

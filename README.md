# Task manager

A small task list: add a task, edit it, delete it, and scroll through pages of older tasks. Each task has a title, an optional description, and the date it was created.

Tasks live in the Node process. Restarting the server clears them. There is no database and no login.

## Run

The repo pins pnpm (`packageManager` in `package.json`).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm test` | Service and tRPC tests, with no browser and no Next.js server |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |

## How the system works

```text
Browser (TaskBoard)
  → tRPC client + React Query  →  POST/GET /api/trpc/<procedure>
                                      → app router
                                      → task service
                                      → in-memory store

First paint
  TaskBoardLoader calls the same router in-process, then hydrates that cache into the browser
```

The screen is one page, `src/app/page.tsx`. It renders `TaskBoardLoader`, which loads the first page on the server, then `TaskBoard`, which is the interactive list.

`TaskBoard` reads `task.list` as an infinite query of 20 tasks. A sentinel under the list asks for the next page when it nears the viewport. Creating a task inserts it at the top of the cache. Editing replaces that record. Deleting removes it. Those updates stay on the pages already loaded, so the list does not refetch from the top and the scroll position stays put.

The form speaks English (`name`, `description`). Before the mutation it maps those fields to the record names (`titulo`, `descricao`) in `src/tasks/view.ts`. The service checks the input with Zod, assigns `id` and `dataCriacao`, and stores the task. The router turns a validation failure into a tRPC `BAD_REQUEST` and a missing task into `NOT_FOUND`. The form reads `zodError.fieldErrors` and accepts either the English or the Portuguese field name, so a `titulo` error still highlights Title.

Dates on the card are `DD-MM-YY` in local time, formatted from `dataCriacao`. Descriptions longer than 200 characters collapse to a preview with an ellipsis and a control to expand them.

### Layout

| Path | Role |
| --- | --- |
| `src/app` | Page, root layout, and the `/api/trpc/[trpc]` route |
| `src/components/tasks` | List, card, form dialog, toasts |
| `src/components/ui` | Chakra provider and the Emotion style registry |
| `src/server/tasks` | Store and task service |
| `src/tasks` | Record type, Zod schemas, view mapping, error text |
| `src/trpc` | tRPC context, React client, routers |

### Calling it over HTTP

With `pnpm dev` running, the same procedures are available as HTTP. A query is a GET. A mutation is a POST whose JSON body is the procedure input.

```bash
curl 'http://localhost:3000/api/trpc/task.list?input={"limit":1}'

curl -X POST http://localhost:3000/api/trpc/task.create \
  -H 'content-type: application/json' \
  -d '{"titulo":"Buy milk","descricao":"2 liters"}'
```

`task.update` and `task.delete` are POSTs as well. `update` sends `id`, `titulo`, and `descricao`. `delete` sends `id`. Success looks like `{ "result": { "data": ... } }`. A validation error is HTTP 400 with `{ "error": { "message": "..." } }`.

`pnpm test` does not need this server. Service tests call `createTaskService` with a fresh memory store. Router tests call procedures through `createCallerFactory`, and one case sends a `Request` through `fetchRequestHandler`.

## Decisions

### Tasks stay in memory, and the store survives hot reload

A database would outlive this exercise and add a service to run. `createMemoryStore` keeps an array in the process. `getSharedStore` hangs that store on `globalThis`, because Next.js re-evaluates modules during development and a plain module variable would reset on every reload. Production and `next dev` share this behavior: one store per process, empty again after the process exits.

### The server owns the id and the creation time

`create` ignores any `id` or `dataCriacao` on the input and writes `crypto.randomUUID()` and the current time. An update keeps the original `dataCriacao`. The list is ordered by that timestamp, so an edit must not move the task, and a client must not choose its own place in the list by sending a timestamp.

Two tasks created in the same millisecond are ordered by id, so the order stays stable after an edit.

### The list is newest-first and paged by a cursor

Each page returns `nextCursor`, the id of its last task. The next request starts after that task. Page size defaults to 20 and must be from 1 to 50.

If that cursor task is deleted before the next page loads, the store still remembers its `dataCriacao`. The service uses that timestamp to find the following tasks. A cursor id the store has never seen returns an empty page.

### Stored fields are Portuguese, and the screen is English

Records and procedure inputs use `titulo`, `descricao`, and `dataCriacao`. Cards and the form use `name`, `description`, and `date`. `toTaskView` and `toTaskWriteInput` are the only mapping. Validation text is English in both places ("Title is required."). The client looks up field errors under both names so a failure on `titulo` still marks the Title input.

A description that is empty or only whitespace is omitted. The record then has no `descricao`, and the card treats that as no description.

### Rules live in the service, and tRPC only carries them

`createTaskService` validates, sorts, and talks to the store. It throws `TaskValidationError` or `TaskNotFoundError`. The router catches those and rethrows `TRPCError`. The error formatter copies the first Zod message onto `error.message` and attaches `zodError.flatten()` so the form can highlight a field.

The browser, the server loader, and the tests import the same `AppRouter` type. Procedure names are the API. The `/api/trpc/[trpc]` folder is the Next.js dynamic segment for that path, not a broken directory name.

### The first page is loaded on the server

`TaskBoardLoader` calls `connection()` so the page is rendered for each request, then runs `task.list` through the router and passes the React Query cache to the client with `HydrationBoundary`. The browser query client is created once and uses a 30 second `staleTime`, so that hydrated page is not immediately fetched again. A query client built during a server render is thrown away with the request.

Chakra writes CSS with Emotion. `EmotionRegistry` records the rules emitted during that server render and inserts them in the HTML, so the first paint includes the component styles.

### Saves and deletes patch the list that is already on screen

Refetching `task.list` would replace every loaded page and jump the user. `prependTask`, `replaceTask`, and `removeTask` write into the infinite-query cache for the current list key. A new task also scrolls to the top, because the list is newest-first and the new row is above the current viewport when the user has scrolled.

### Every card is at least as tall as a title, one description line, and the date

Cards with no description used to collapse. The description line is always rendered, with a minimum height of one line, so those cards match a card whose description is a single line. Longer text still grows the card. The preview ellipsis is added only when the description is longer than 200 characters.

### A toast is a fixed width, and a repeated message is shown once

The Chakra toast sits in a group that shrinks to its children, while the toast itself was `width: 100%`. The used width collapsed to the padding, and the message painted past the right edge of the window. Each toast now has an explicit width, capped to the viewport.

The board passes a new `{ tone, text }` object on every success. Comparing those objects by reference would treat every "Task deleted." as new. The banner compares tone and text, so the same notice does not open a second toast.

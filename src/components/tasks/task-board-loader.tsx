import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { connection } from "next/server";
import { TaskBoard } from "@/components/tasks/task-board";
import { taskListInput, taskListQueryConfig } from "@/tasks/list-query";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

export async function TaskBoardLoader() {
  // Tie the render to the request, load the first page through the router in-process, and hydrate that cache into the browser.
  await connection();

  const queryClient = new QueryClient();
  const trpc = createTRPCOptionsProxy({
    router: appRouter,
    ctx: () => createTRPCContext({ headers: new Headers() }),
    queryClient,
  });

  await queryClient
    .infiniteQuery(trpc.task.list.infiniteQueryOptions(taskListInput, taskListQueryConfig))
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TaskBoard />
    </HydrationBoundary>
  );
}

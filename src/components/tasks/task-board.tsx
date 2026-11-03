"use client";

import { Box, Button, Text } from "@chakra-ui/react";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { NoticeBanner, type Notice } from "@/components/tasks/notice-banner";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { errorMessage } from "@/tasks/errors";
import { taskListInput, taskListQueryConfig } from "@/tasks/list-query";
import type { TaskRecord } from "@/tasks/types";
import { formatTaskDate, toTaskView, type TaskView } from "@/tasks/view";
import { useTRPC } from "@/trpc/client";

type TaskPage = {
  items: TaskRecord[];
  nextCursor: string | null;
};

type DialogState = { mode: "create" } | { mode: "edit"; task: TaskView } | null;

export function TaskBoard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useInfiniteQuery(trpc.task.list.infiniteQueryOptions(taskListInput, taskListQueryConfig));
  const remove = useMutation(trpc.task.delete.mutationOptions());
  const listKey = trpc.task.list.infiniteQueryKey(taskListInput);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const tasks = list.data?.pages.flatMap((page) => page.items) ?? [];
  const listError = list.isError ? errorMessage(list.error) : null;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function prependTask(task: TaskRecord) {
    queryClient.setQueryData<InfiniteData<TaskPage>>(listKey, (current) => {
      if (!current) {
        return { pages: [{ items: [task], nextCursor: null }], pageParams: [null] };
      }

      const [first, ...rest] = current.pages;
      if (!first) {
        return current;
      }

      return {
        ...current,
        pages: [{ ...first, items: [task, ...first.items] }, ...rest],
      };
    });
  }

  function replaceTask(task: TaskRecord) {
    queryClient.setQueryData<InfiniteData<TaskPage>>(listKey, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (item.id === task.id ? task : item)),
        })),
      };
    });
  }

  function removeTask(id: string) {
    queryClient.setQueryData<InfiniteData<TaskPage>>(listKey, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.id !== id),
        })),
      };
    });
  }

  async function onDelete(id: string) {
    try {
      await remove.mutateAsync({ id });
      removeTask(id);
      setNotice({ tone: "success", text: "Task deleted." });
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  return (
    <Box mt="6">
      <Button disabled={list.isPending} onClick={() => setDialog({ mode: "create" })}>
        Add task
      </Button>
      <NoticeBanner listError={listError} notice={notice} />
      {list.isPending ? <Text mt="4">Loading tasks…</Text> : null}
      {!list.isPending && tasks.length === 0 ? <Text mt="4">No tasks yet.</Text> : null}
      {tasks.length > 0 ? (
        <Box as="ul" mt="4" p="0" display="flex" flexDirection="column" gap="2" listStyleType="none">
          {tasks.map((task) => {
            const view = toTaskView(task);
            const deleting = remove.isPending && remove.variables?.id === task.id;

            return (
              <TaskCard
                key={task.id}
                task={view}
                deleting={deleting}
                onEdit={() => setDialog({ mode: "edit", task: view })}
                onDelete={() => void onDelete(task.id)}
              />
            );
          })}
        </Box>
      ) : null}
      {hasNextPage ? <Box ref={sentinelRef} h="1px" /> : null}
      {isFetchingNextPage ? <Text mt="3">Loading more…</Text> : null}
      {dialog ? (
        <TaskFormDialog
          key={dialog.mode === "edit" ? dialog.task.id : "create"}
          mode={dialog.mode}
          task={dialog.mode === "edit" ? dialog.task : undefined}
          date={dialog.mode === "edit" ? dialog.task.date : formatTaskDate(new Date())}
          onClose={() => setDialog(null)}
          onSaved={(task, mode) => {
            if (mode === "create") {
              prependTask(task);
              window.scrollTo({ top: 0 });
            } else {
              replaceTask(task);
            }
            setNotice({
              tone: "success",
              text: mode === "create" ? "Task created." : "Task updated.",
            });
            setDialog(null);
          }}
        />
      ) : null}
    </Box>
  );
}

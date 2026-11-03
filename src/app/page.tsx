import { Box, Heading } from "@chakra-ui/react";
import { Suspense } from "react";
import { TaskBoardLoader } from "@/components/tasks/task-board-loader";
import { TaskListFallback } from "@/components/tasks/task-list-fallback";

export default function Home() {
  return (
    <Box p="8">
      <Heading size="2xl">Task manager</Heading>
      <Suspense fallback={<TaskListFallback />}>
        <TaskBoardLoader />
      </Suspense>
    </Box>
  );
}

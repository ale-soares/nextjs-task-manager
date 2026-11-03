import { Box, Button, Text } from "@chakra-ui/react";

export function TaskListFallback() {
  return (
    <Box mt="6">
      <Button disabled>Add task</Button>
      <Text mt="4">Loading tasks…</Text>
    </Box>
  );
}

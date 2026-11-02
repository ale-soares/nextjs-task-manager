import { Box, Heading } from "@chakra-ui/react";
import { Greeting } from "@/components/greeting";

export default function Home() {
  return (
    <Box p="8">
      <Heading size="2xl">Task manager</Heading>
      <Greeting />
    </Box>
  );
}

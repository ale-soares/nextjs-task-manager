"use client";

import { Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function Greeting() {
  const trpc = useTRPC();
  const hello = useQuery(trpc.hello.queryOptions({ text: "world" }));

  return <Text mt="4">{hello.data?.greeting ?? "Loading..."}</Text>;
}

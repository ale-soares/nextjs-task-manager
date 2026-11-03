"use client";

import { Box, Icon, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuChevronDown, LuEllipsisVertical } from "react-icons/lu";
import type { TaskView } from "@/tasks/view";

const DESCRIPTION_PREVIEW_LENGTH = 200;

type TaskCardProps = {
  task: TaskView;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function previewDescription(description: string) {
  if (description.length <= DESCRIPTION_PREVIEW_LENGTH) {
    return description;
  }

  return `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;
}

export function TaskCard({ task, deleting, onEdit, onDelete }: TaskCardProps) {
  const description = task.description ?? "";
  const expandable = description.length > DESCRIPTION_PREVIEW_LENGTH;
  const [open, setOpen] = useState(false);
  const shownDescription = expandable && !open ? previewDescription(description) : description;

  return (
    <Box as="li" borderWidth="1px" borderRadius="lg" px="3" py="2">
      <Box display="flex" alignItems="flex-start" gap="1">
        <Box minW="0" flex="1">
          <Text fontSize="sm" fontWeight="semibold" wordBreak="break-word">
            {task.name}
          </Text>
          <Text
            mt="1"
            minH="1.5em"
            fontSize="sm"
            lineHeight="1.5"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            aria-hidden={shownDescription ? undefined : true}
          >
            {shownDescription}
          </Text>
          <Text mt="0.5" fontSize="xs" lineHeight="1rem" color="fg.muted">
            {task.date}
          </Text>
        </Box>
        <Box display="flex" alignItems="center" flexShrink={0}>
          {expandable ? (
            <IconButton
              aria-label={open ? "Show less" : "Read more"}
              aria-expanded={open}
              size="2xs"
              variant="ghost"
              onClick={() => {
                setOpen((current) => !current);
              }}
            >
              <Icon size="sm" transform={open ? "rotate(180deg)" : undefined} transition="transform 0.2s ease">
                <LuChevronDown />
              </Icon>
            </IconButton>
          ) : null}
          <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
              <IconButton aria-label="Task options" size="2xs" variant="ghost" loading={deleting} disabled={deleting}>
                <Icon size="sm">
                  <LuEllipsisVertical />
                </Icon>
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="edit" disabled={deleting} onClick={onEdit}>
                    Edit
                  </Menu.Item>
                  <Menu.Item value="delete" disabled={deleting} color="fg.error" onClick={onDelete}>
                    Delete
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Box>
        {deleting ? <Text srOnly>Deleting task…</Text> : null}
      </Box>
    </Box>
  );
}

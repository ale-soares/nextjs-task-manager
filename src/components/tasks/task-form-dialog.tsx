"use client";

import { Button, CloseButton, Dialog, Field, Input, Text, Textarea } from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useState, type SubmitEvent } from "react";
import { errorMessage, fieldErrorsFromUnknown, type TaskFieldErrors } from "@/tasks/errors";
import { taskFormSchema } from "@/tasks/schema";
import type { TaskRecord } from "@/tasks/types";
import { toTaskWriteInput, type TaskView } from "@/tasks/view";
import { useTRPC } from "@/trpc/client";

type TaskFormDialogProps = {
  mode: "create" | "edit";
  task?: TaskView;
  date: string;
  onClose: () => void;
  onSaved: (task: TaskRecord, mode: "create" | "edit") => void;
};

export function TaskFormDialog({ mode, task, date, onClose, onSaved }: TaskFormDialogProps) {
  const trpc = useTRPC();
  const createTask = useMutation(trpc.task.create.mutationOptions());
  const updateTask = useMutation(trpc.task.update.mutationOptions());
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<TaskFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const saving = createTask.isPending || updateTask.isPending;
  const canSave = name.trim().length > 0 && !saving;

  function close() {
    if (!saving) {
      onClose();
    }
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    const parsed = taskFormSchema.safeParse({ name, description });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const nextErrors = {
        name: flat.name?.[0],
        description: flat.description?.[0],
      };
      setFieldErrors(nextErrors);
      setFormError(nextErrors.name ?? nextErrors.description ?? "Check the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setFormError(null);

    try {
      const write = toTaskWriteInput(parsed.data);
      const saved =
        mode === "edit" && task
          ? await updateTask.mutateAsync({ id: task.id, ...write })
          : await createTask.mutateAsync(write);
      onSaved(saved, mode);
    } catch (error) {
      const nextErrors = fieldErrorsFromUnknown(error);
      setFieldErrors(nextErrors);
      setFormError(errorMessage(error));
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => {
        if (!details.open) {
          close();
        }
      }}
      closeOnInteractOutside={!saving}
      closeOnEscape={!saving}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content w="full" maxW="lg">
          <Dialog.Header>
            <Dialog.Title>{mode === "create" ? "Add task" : "Edit task"}</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton disabled={saving} />
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <form noValidate onSubmit={(event) => void onSubmit(event)}>
            <Dialog.Body display="flex" flexDirection="column" gap="4">
              {formError ? (
                <Text color="fg.error" role="alert">
                  {formError}
                </Text>
              ) : null}
              {saving ? <Text>Saving task…</Text> : null}
              <Field.Root invalid={Boolean(fieldErrors.name)} required>
                <Field.Label htmlFor="task-title">
                  Title <Field.RequiredIndicator />
                </Field.Label>
                <Input
                  id="task-title"
                  value={name}
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.name)}
                  borderColor={fieldErrors.name ? "red.500" : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldErrors((current) => ({ ...current, name: undefined }));
                    setFormError(null);
                  }}
                />
                {fieldErrors.name ? <Field.ErrorText>{fieldErrors.name}</Field.ErrorText> : null}
              </Field.Root>
              <Field.Root invalid={Boolean(fieldErrors.description)}>
                <Field.Label htmlFor="task-description">Description</Field.Label>
                <Textarea
                  id="task-description"
                  value={description}
                  disabled={saving}
                  rows={4}
                  aria-invalid={Boolean(fieldErrors.description)}
                  borderColor={fieldErrors.description ? "red.500" : undefined}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setFieldErrors((current) => ({ ...current, description: undefined }));
                    setFormError(null);
                  }}
                />
                {fieldErrors.description ? (
                  <Field.ErrorText>{fieldErrors.description}</Field.ErrorText>
                ) : null}
              </Field.Root>
              <Field.Root disabled>
                <Field.Label htmlFor="task-date">Date</Field.Label>
                <Input id="task-date" value={date} disabled readOnly />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <Button type="button" variant="outline" disabled={saving} onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                Save
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

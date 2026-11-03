import { ZodError } from "zod";

export type TaskFieldErrors = {
  name?: string;
  description?: string;
};

export function firstFieldMessage(error: ZodError) {
  return error.issues[0]?.message ?? "Invalid task.";
}

export function fieldErrorsFromUnknown(error: unknown): TaskFieldErrors {
  const fieldErrors = zodFieldErrors(error);

  return {
    name: fieldErrors?.name?.[0] ?? fieldErrors?.titulo?.[0],
    description: fieldErrors?.description?.[0] ?? fieldErrors?.descricao?.[0],
  };
}

export function errorMessage(error: unknown) {
  const fields = fieldErrorsFromUnknown(error);
  if (fields.name) {
    return fields.name;
  }
  if (fields.description) {
    return fields.description;
  }
  if (error instanceof Error && error.message.trim() && !error.message.trim().startsWith("[")) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function zodFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return undefined;
  }

  const data = error.data;
  if (!data || typeof data !== "object" || !("zodError" in data)) {
    return undefined;
  }

  const zodError = data.zodError;
  if (!zodError || typeof zodError !== "object" || !("fieldErrors" in zodError)) {
    return undefined;
  }

  const fieldErrors = zodError.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") {
    return undefined;
  }

  return fieldErrors as Record<string, string[] | undefined>;
}

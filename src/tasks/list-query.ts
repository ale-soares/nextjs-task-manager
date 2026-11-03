import { nextTaskCursor, taskListInput } from "./schema";

export { taskListInput };

export const taskListQueryConfig = {
  initialCursor: null,
  getNextPageParam: nextTaskCursor,
};

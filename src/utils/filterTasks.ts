/**
 * utils/filterTasks.ts
 *
 * Pure filtering function applied to the full task list before sorting.
 * Keeps the filtering logic out of the slice so it is easily unit-testable.
 */

import { Task } from '../types/task.types';
import { FilterBy, TaskStatus, Priority } from '../constants/enums';

/**
 * filterTasks
 * Returns a new array containing only the tasks that match the active filter.
 * Never mutates the input array.
 *
 * @param tasks    - The full (unfiltered) task array from the Redux store
 * @param filter   - The active FilterBy value from the Redux store
 * @param searchQuery - Optional free-text search (matches title / description)
 */
export const filterTasks = (
  tasks: Task[],
  filter: FilterBy,
  searchQuery: string = '',
): Task[] => {
  let result = tasks;

  // ── 1. Category filter ────────────────────────────────────────────────────
  switch (filter) {
    case FilterBy.Pending:
      // Show tasks that have NOT been completed yet
      result = tasks.filter((t) => t.status !== TaskStatus.Completed);
      break;

    case FilterBy.Completed:
      result = tasks.filter((t) => t.status === TaskStatus.Completed);
      break;

    case FilterBy.HighPri:
      result = tasks.filter(
        (t) => t.priority === Priority.High && t.status !== TaskStatus.Completed,
      );
      break;

    case FilterBy.Overdue: {
      const now = new Date();
      result = tasks.filter(
        (t) =>
          t.deadline !== null &&
          new Date(t.deadline) < now &&
          t.status !== TaskStatus.Completed,
      );
      break;
    }

    case FilterBy.DueToday: {
      // Tasks whose deadline falls on today's calendar date (any time),
      // including already-overdue tasks from today, excluding completed tasks.
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      result = tasks.filter(
        (t) =>
          t.deadline !== null &&
          new Date(t.deadline) >= todayStart &&
          new Date(t.deadline) <= todayEnd &&
          t.status !== TaskStatus.Completed,
      );
      break;
    }

    case FilterBy.All:
    default:
      result = tasks;
      break;
  }

  // ── 2. Free-text search ───────────────────────────────────────────────────
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  return result;
};

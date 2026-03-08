/**
 * utils/sortTasks.ts
 *
 * Composite sort algorithm for the task list.
 *
 * STANDARD SORTS (SortBy enum values other than "score"):
 *   Sorting by deadline, priority level, or creation date.
 *
 * SMART SORT (SortBy.Score):
 *   A weighted composite score that balances PRIORITY and URGENCY:
 *
 *     score = (PRIORITY_WEIGHT × priorityScore) + (URGENCY_WEIGHT × urgencyScore)
 *
 *   where:
 *     priorityScore  = { high: 3, medium: 2, low: 1 }
 *     urgencyScore   = 1 / max(hoursUntilDeadline, 0.5)
 *                      (0.5 floor prevents division-by-zero / infinity)
 *     PRIORITY_WEIGHT = 0.4
 *     URGENCY_WEIGHT  = 0.6
 *
 *   Tasks with no deadline get urgencyScore = 0 and rank purely by priority.
 *   Completed tasks are always pushed to the bottom regardless of sort mode.
 */

import { Task } from '../types/task.types';
import { SortBy, Priority, TaskStatus } from '../constants/enums';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT = 0.4;
const URGENCY_WEIGHT  = 0.6;

const PRIORITY_SCORE: Record<Priority, number> = {
  [Priority.High]:   3,
  [Priority.Medium]: 2,
  [Priority.Low]:    1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * hoursUntil
 * Returns the number of hours between now and the given ISO date string.
 * Returns Infinity if the date is null (no deadline set).
 * Returns a negative number if the deadline has already passed.
 */
const hoursUntil = (isoDate: string | null): number => {
  if (!isoDate) return Infinity;
  const ms = new Date(isoDate).getTime() - Date.now();
  return ms / (1000 * 60 * 60);
};

/**
 * compositeScore
 * Higher score = should appear earlier in the list.
 */
const compositeScore = (task: Task): number => {
  const priorityScore = PRIORITY_SCORE[task.priority] ?? 1;

  const hours = hoursUntil(task.deadline);

  // For tasks with deadlines: urgency rises as deadline approaches.
  // For tasks without deadlines: urgency = 0 (rank purely by priority).
  const urgencyScore = isFinite(hours)
    ? 1 / Math.max(hours, 0.5)
    : 0;

  return PRIORITY_WEIGHT * priorityScore + URGENCY_WEIGHT * urgencyScore;
};

// ─── Main sort function ───────────────────────────────────────────────────────

/**
 * sortTasks
 * Returns a new sorted array — never mutates the input.
 * Completed tasks are always placed after pending/in-progress tasks.
 *
 * @param tasks  - Array of tasks to sort
 * @param sortBy - SortBy enum value (from the Redux tasks slice)
 */
export const sortTasks = (tasks: Task[], sortBy: SortBy): Task[] => {
  // Shallow copy so we don't mutate the Redux state array
  const arr = [...tasks];

  arr.sort((a, b) => {
    // ── Completed tasks always sink to the bottom ───────────────────────
    const aCompleted = a.status === TaskStatus.Completed;
    const bCompleted = b.status === TaskStatus.Completed;
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;

    // ── Apply the chosen sort mode ─────────────────────────────────────
    switch (sortBy) {

      case SortBy.Score: {
        // Composite smart sort — higher score first
        return compositeScore(b) - compositeScore(a);
      }

      case SortBy.DeadlineAsc: {
        // Earliest deadline first; no-deadline tasks go last
        const aHours = hoursUntil(a.deadline);
        const bHours = hoursUntil(b.deadline);
        return aHours - bHours;
      }

      case SortBy.DeadlineDesc: {
        // Latest deadline first
        const aHours = hoursUntil(a.deadline);
        const bHours = hoursUntil(b.deadline);
        return bHours - aHours;
      }

      case SortBy.PriorityDeadline: {
        // ── 1. Priority: High (3) → Medium (2) → Low (1) ────────────────
        const prioA = PRIORITY_SCORE[a.priority];
        const prioB = PRIORITY_SCORE[b.priority];
        if (prioA !== prioB) return prioB - prioA; // higher score = earlier

        // ── 2. Deadline: earliest first; tasks without a deadline go last ─
        const dlA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dlB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (dlA !== dlB) return dlA - dlB;

        // ── 3. Created date: newest first ────────────────────────────────
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      case SortBy.PriorityHigh: {
        // High priority first; tiebreak: deadline asc → newest first
        const d = PRIORITY_SCORE[b.priority] - PRIORITY_SCORE[a.priority];
        if (d !== 0) return d;
        const dlA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dlB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (dlA !== dlB) return dlA - dlB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      case SortBy.PriorityLow: {
        // Low priority first; tiebreak: deadline asc → newest first
        const d = PRIORITY_SCORE[a.priority] - PRIORITY_SCORE[b.priority];
        if (d !== 0) return d;
        const dlA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dlB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (dlA !== dlB) return dlA - dlB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      case SortBy.CreatedNewest: {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      case SortBy.CreatedOldest: {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      default:
        return 0;
    }
  });

  return arr;
};

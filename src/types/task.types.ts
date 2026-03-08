/**
 * types/task.types.ts
 *
 * Central TypeScript definitions for the Task domain.
 * Every slice, service, screen, and component imports from here.
 */

import { Priority, TaskStatus, SortBy, FilterBy } from '../constants/enums';

// ─── Core entity ──────────────────────────────────────────────────────────────

/**
 * Task
 * The single source-of-truth shape for a to-do item.
 * Stored in Firestore and in the Redux tasks slice.
 */
export interface Task {
  /** Unique identifier (Firestore document ID or local nanoid) */
  id: string;

  /** Firebase UID of the owner — used to scope Firestore queries */
  userId: string;

  /** Short headline shown in the task card */
  title: string;

  /** Optional longer description / notes */
  description: string;

  /** Whether the task has been completed — mirrors status === Completed */
  completed: boolean;

  /** Current lifecycle state (richer than the boolean — supports InProgress) */
  status: TaskStatus;

  /** Importance level — drives the sort score calculation */
  priority: Priority;

  /**
   * ISO-8601 string for when the task was scheduled to begin.
   * Stored as a string so it is safely serialisable in Redux.
   */
  dateTime: string | null;

  /**
   * ISO-8601 string for the hard deadline.
   * Used by the urgency component of the sort algorithm.
   */
  deadline: string | null;

  /** Category tags, e.g. ["work", "urgent"] */
  tags: string[];

  /** ISO-8601 creation timestamp */
  createdAt: string;

  /** ISO-8601 last-updated timestamp */
  updatedAt: string;

  /** ISO-8601 timestamp when the task was marked completed, or null */
  completedAt: string | null;
}

// ─── Form payloads ────────────────────────────────────────────────────────────

/**
 * CreateTaskPayload
 * The data submitted by the AddTask form.
 * The server-generated fields (id, userId, status, completed, createdAt,
 * updatedAt, completedAt) are filled in by the service / reducer.
 */
export type CreateTaskPayload = Pick<
  Task,
  'title' | 'description' | 'priority' | 'deadline' | 'dateTime' | 'tags'
>;

/**
 * AddTaskLocalPayload
 * Minimum payload for the synchronous `addTask` reducer action.
 * Only the fields a user actually provides — the reducer fills in
 * id, completed, status, createdAt, updatedAt, completedAt, etc.
 */
export interface AddTaskLocalPayload {
  /** Required: task headline */
  title:       string;
  /** Optional longer notes */
  description?: string;
  /** Importance level — defaults to Medium */
  priority?:   Priority;
  /** Hard deadline ISO string — defaults to null */
  deadline?:   string | null;
  /** Scheduled start ISO string — defaults to null */
  dateTime?:   string | null;
  /** Category tags — defaults to [] */
  tags?:       string[];
  /** Owner UID — required when using a backend; optional for local-only tasks */
  userId?:     string;
}

/**
 * UpdateTaskPayload
 * Any subset of a Task that can be changed by the user in the EditTask form.
 * The `id` is always required so the slice knows which document to update.
 */
export type UpdateTaskPayload = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'dateTime' | 'deadline' | 'tags' | 'status'>
> & { id: string };

// ─── Slice state ──────────────────────────────────────────────────────────────

/**
 * TasksState
 * Shape of the `tasks` key in the Redux store.
 */
export interface TasksState {
  /** Flat array of all tasks for the current user */
  items: Task[];

  /** Which subset to display in the TaskList */
  filter: FilterBy;

  /** Which ordering algorithm to apply after filtering */
  sortBy: SortBy;

  /** In-flight flag for any async operation (fetch, create, update, delete) */
  isLoading: boolean;

  /** Tracks the task currently being deleted/updated for per-item spinners */
  operatingId: string | null;

  /** Human-readable error message from the last failed operation */
  error: string | null;

  /** ISO timestamp of the last successful Firestore sync */
  lastSyncedAt: string | null;
}

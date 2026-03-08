/**
 * store/selectors/taskSelectors.ts
 *
 * Memoized selectors built with Redux Toolkit's `createSelector` (re-reselect).
 *
 * WHY MEMOIZE?
 * Selectors that are derived from multiple slice fields (e.g. "apply filter THEN sort")
 * run on every state change if written inline in a component. `createSelector` caches
 * the result and only re-runs the projector function when its inputs actually change.
 * This prevents unnecessary re-renders on unrelated state updates.
 *
 * USAGE in a component:
 *   const tasks = useSelector(selectDisplayedTasks);
 *   const counts = useSelector(selectTaskCounts);
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { filterTasks } from '../../utils/filterTasks';
import { sortTasks } from '../../utils/sortTasks';
import { TaskStatus } from '../../constants/enums';

// ─── Input selectors (raw slice fields) ───────────────────────────────────────

/** All raw task items from the slice */
const selectAllItems    = (state: RootState) => state.tasks.items;

/** Active filter (All | Pending | Completed | …) */
const selectFilter      = (state: RootState) => state.tasks.filter;

/** Active sort mode (Score | DeadlineAsc | …) */
const selectSortBy      = (state: RootState) => state.tasks.sortBy;

/** Search query — passed in by the TaskListScreen, not stored in Redux */
// (If you later add searchQuery to the slice, add it here)

// ─── Derived selectors ────────────────────────────────────────────────────────

/**
 * selectDisplayedTasks
 * The final array shown in TaskListScreen:
 *   all items → filter → sort
 *
 * Recomputes ONLY when items, filter, or sortBy changes.
 */
export const selectDisplayedTasks = createSelector(
  [selectAllItems, selectFilter, selectSortBy],
  (items, filter, sortBy) => {
    const filtered = filterTasks(items, filter);
    return sortTasks(filtered, sortBy);
  },
);

/**
 * selectDisplayedTasksWithSearch
 * Like selectDisplayedTasks but accepts an external search query.
 * Since the query is an argument (not from the store), we use a "factory"
 * pattern — call this selector factory with the query to get a stable selector.
 *
 * Usage:
 *   const selector = useMemo(() => selectDisplayedTasksWithSearch(query), [query]);
 *   const tasks = useSelector(selector);
 */
export const selectDisplayedTasksWithSearch = (searchQuery: string) =>
  createSelector([selectAllItems, selectFilter, selectSortBy], (items, filter, sortBy) => {
    const filtered = filterTasks(items, filter, searchQuery);
    return sortTasks(filtered, sortBy);
  });

/**
 * selectTaskById
 * Factory selector — returns a stable selector for a single task by ID.
 *
 * Usage:
 *   const selector = useMemo(() => selectTaskById(taskId), [taskId]);
 *   const task = useSelector(selector);
 */
export const selectTaskById = (taskId: string) =>
  createSelector([selectAllItems], (items) => items.find((t) => t.id === taskId) ?? null);

/**
 * selectTaskCounts
 * Computes the badge numbers shown on the filter bar.
 * Returns { all, pending, completed, highPriority, overdue }.
 *
 * Recalculates only when items change.
 */
export const selectTaskCounts = createSelector([selectAllItems], (items) => {
  const now = new Date();

  // Today's midnight boundaries (recalculated from `now` so we don't capture
  // a stale closure — createSelector recomputes when items change).
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const pending    = items.filter((t) => t.status !== TaskStatus.Completed);
  const completed  = items.filter((t) => t.status === TaskStatus.Completed);

  return {
    all:          items.length,
    pending:      pending.length,
    completed:    completed.length,

    // High-priority incomplete tasks
    highPriority: pending.filter((t) => t.priority === 'high').length,

    // Overdue: past deadline, not complete
    overdue: pending.filter(
      (t) => t.deadline !== null && new Date(t.deadline) < now,
    ).length,

    // Due today: deadline within today's calendar day, not complete
    dueToday: pending.filter(
      (t) =>
        t.deadline !== null &&
        new Date(t.deadline) >= todayStart &&
        new Date(t.deadline) <= todayEnd,
    ).length,
  };
});

/**
 * selectTasksLoading
 * Convenience selector for the task list's skeleton/spinner state.
 */
export const selectTasksLoading = (state: RootState) => state.tasks.isLoading;

/**
 * selectTaskError
 * Convenience selector for error banners in task screens.
 */
export const selectTaskError = (state: RootState) => state.tasks.error;

/**
 * selectOperatingId
 * The ID of the task currently being mutated (for per-row loading indicators).
 */
export const selectOperatingId = (state: RootState) => state.tasks.operatingId;

/**
 * selectActiveFilter
 * Current filter — used by TaskFilterBar to highlight the active pill.
 */
export const selectActiveFilter = (state: RootState) => state.tasks.filter;

/**
 * selectActiveSortBy
 * Current sort mode — used by the sort picker UI.
 */
export const selectActiveSortBy = (state: RootState) => state.tasks.sortBy;

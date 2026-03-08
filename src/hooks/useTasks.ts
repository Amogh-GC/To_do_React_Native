/**
 * hooks/useTasks.ts
 *
 * Custom hook that encapsulates all task CRUD operations and derived state.
 * Screens import `useTasks` instead of calling `useDispatch` + `useSelector`
 * directly — this keeps component files thin and the logic centralised.
 *
 * Mirrors the same pattern as `useAuth.ts`.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchTasks,
  createTask,
  updateTaskAsync,
  toggleCompleteAsync,
  deleteTaskAsync,
  setFilter,
  setSortBy,
  clearTaskError,
} from '../store/slices/tasksSlice';
import {
  selectDisplayedTasks,
  selectDisplayedTasksWithSearch,
  selectTaskById,
  selectTaskCounts,
  selectTasksLoading,
  selectTaskError,
  selectOperatingId,
  selectActiveFilter,
  selectActiveSortBy,
} from '../store/selectors/taskSelectors';
import { Task, CreateTaskPayload, UpdateTaskPayload } from '../types/task.types';
import { FilterBy, SortBy } from '../constants/enums';

const useTasks = (searchQuery: string = '') => {
  const dispatch = useDispatch<AppDispatch>();

  // ── Selectors ─────────────────────────────────────────────────────────────

  // Apply filter + sort (+ optional search) — memoized by createSelector
  const displayedTasks = useSelector(
    searchQuery
      ? selectDisplayedTasksWithSearch(searchQuery)
      : selectDisplayedTasks,
  );

  const taskCounts  = useSelector(selectTaskCounts);
  const isLoading   = useSelector(selectTasksLoading);
  const error       = useSelector(selectTaskError);
  const operatingId = useSelector(selectOperatingId);
  const activeFilter  = useSelector(selectActiveFilter);
  const activeSortBy  = useSelector(selectActiveSortBy);

  // ── Action dispatchers ────────────────────────────────────────────────────

  /** Load all tasks for a user from Firestore. Call on screen mount + after login. */
  const loadTasks = useCallback(
    (userId: string) => dispatch(fetchTasks(userId)),
    [dispatch],
  );

  /** Create a new task. Returns true on success. */
  const addTask = useCallback(
    async (userId: string, payload: CreateTaskPayload): Promise<boolean> => {
      const result = await dispatch(createTask({ userId, payload }));
      return createTask.fulfilled.match(result);
    },
    [dispatch],
  );

  /** Update fields on an existing task. Returns true on success. */
  const editTask = useCallback(
    async (payload: UpdateTaskPayload): Promise<boolean> => {
      const result = await dispatch(updateTaskAsync(payload));
      return updateTaskAsync.fulfilled.match(result);
    },
    [dispatch],
  );

  /**
   * toggleTaskComplete
   * Calls the Firestore-backed async thunk. Flip is optimistic.
   */
  const toggleTaskComplete = useCallback(
    (task: Task) => dispatch(toggleCompleteAsync(task)),
    [dispatch],
  );

  /**
   * removeTask
   * Deletes a task via Firestore. Passes the full task snapshot so the slice can
   * roll back the optimistic delete if Firestore rejects it.
   */
  const removeTask = useCallback(
    (task: Task) =>
      dispatch(deleteTaskAsync({ taskId: task.id, snapshot: task })),
    [dispatch],
  );

  /** Change the active filter pill. */
  const changeFilter = useCallback(
    (filter: FilterBy) => dispatch(setFilter(filter)),
    [dispatch],
  );

  /** Change the active sort mode. */
  const changeSort = useCallback(
    (sort: SortBy) => dispatch(setSortBy(sort)),
    [dispatch],
  );

  /** Dismiss any task-layer error banner. */
  const clearError = useCallback(
    () => dispatch(clearTaskError()),
    [dispatch],
  );

  // ── Convenience — select a single task by ID ──────────────────────────────
  // Not a hook itself, but a helper for TaskDetailScreen / EditTaskScreen.
  const getTaskById = useCallback(
    (taskId: string): Task | null => {
      // useSelector with a factory selector — called inside the hook so rules are valid
      const state = dispatch((_dispatch, getState) => (getState as () => RootState)());
      if (!state) return null;
      const selector = selectTaskById(taskId);
      return selector(state as unknown as RootState);
    },
    [dispatch],
  );

  return {
    // Derived state
    displayedTasks,
    taskCounts,
    isLoading,
    error,
    operatingId,
    activeFilter,
    activeSortBy,

    // Actions
    loadTasks,
    addTask,
    editTask,
    toggleTaskComplete,
    removeTask,
    changeFilter,
    changeSort,
    clearError,
    getTaskById,
  };
};

export default useTasks;

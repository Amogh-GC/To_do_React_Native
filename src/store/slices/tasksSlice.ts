/**
 * store/slices/tasksSlice.ts
 *
 * Redux slice that owns the entire task domain.
 *
 * ── State ──────────────────────────────────────────────────────────────────────
 *   items        — flat array of all Task objects for the current user
 *   filter       — active FilterBy value (All | Pending | Completed | High | Overdue)
 *   sortBy       — active SortBy value (Score | DeadlineAsc | PriorityHigh | …)
 *   isLoading    — true while fetchTasks is in-flight
 *   operatingId  — ID of the task being deleted/toggled (for per-item spinners)
 *   error        — string error from the last failed operation
 *   lastSyncedAt — ISO timestamp of the last successful Firestore fetch
 *
 * ── Async Thunks ───────────────────────────────────────────────────────────────
 *   fetchTasks      — load all tasks from Firestore on login
 *   createTask      — optimistically add to store, then persist to Firestore
 *   updateTaskAsync — optimistically update in store, then persist to Firestore
 *   toggleComplete  — flip Pending ↔ Completed with an optimistic update
 *   deleteTask      — optimistically remove from store, then delete from Firestore
 *
 * Optimistic updates:
 *   The store is mutated immediately in the `pending` case so the UI feels instant.
 *   On `rejected`, the change is rolled back with the snapshot saved in the thunk.
 */

import { createSlice, createAsyncThunk, nanoid, PayloadAction } from '@reduxjs/toolkit';
import taskService from '../../services/taskService';
import {
  Task,
  TasksState,
  CreateTaskPayload,
  UpdateTaskPayload,
  AddTaskLocalPayload,
} from '../../types/task.types';
import { FilterBy, SortBy, TaskStatus, Priority } from '../../constants/enums';
// Cross-slice: listen for logout to wipe task state automatically
import { logoutUser } from './authSlice';

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: TasksState = {
  items:        [],
  filter:       FilterBy.All,
  sortBy:       SortBy.PriorityDeadline, // default: priority → deadline → created
  isLoading:    false,
  operatingId:  null,
  error:        null,
  lastSyncedAt: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * fetchTasks
 * Loads all tasks for the authenticated user from Firestore.
 * Called by the TaskList screen on mount and after login.
 */
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await taskService.fetchTasks(userId);
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to load tasks.');
    }
  },
);

/**
 * createTask
 * Creates a task document in Firestore.
 * The slice performs an optimistic add so the UI updates instantly.
 */
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (
    { userId, payload }: { userId: string; payload: CreateTaskPayload },
    { rejectWithValue },
  ) => {
    try {
      return await taskService.createTask(userId, payload);
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to create task.');
    }
  },
);

/**
 * updateTaskAsync
 * Persists a partial task update to Firestore after an optimistic local update.
 */
export const updateTaskAsync = createAsyncThunk(
  'tasks/updateTask',
  async (payload: UpdateTaskPayload, { rejectWithValue }) => {
    try {
      await taskService.updateTask(payload);
      return payload;
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to update task.');
    }
  },
);

/**
 * toggleCompleteAsync
 * Flips a task's completion status.
 * Optimistic: status changed immediately in pending; rolled back on rejected.
 */
export const toggleCompleteAsync = createAsyncThunk(
  'tasks/toggleComplete',
  async (task: Task, { rejectWithValue }) => {
    try {
      const patch = await taskService.toggleComplete(task);
      return { id: task.id, patch };
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to update task status.');
    }
  },
);

/**
 * deleteTaskAsync
 * Removes a task from Firestore.
 * Optimistic: task removed immediately from the store in `pending`;
 * re-inserted on `rejected` using a snapshot saved in the thunk arg.
 */
export const deleteTaskAsync = createAsyncThunk(
  'tasks/deleteTask',
  async (
    { taskId, snapshot }: { taskId: string; snapshot: Task },
    { rejectWithValue },
  ) => {
    try {
      await taskService.deleteTask(taskId);
      return taskId;
    } catch (error: any) {
      return rejectWithValue({ message: error.message, snapshot });
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,

  reducers: {
    /**
     * setFilter
     * Changes the active display filter (All | Pending | Completed | …).
     * No async operation — pure synchronous state update.
     */
    setFilter: (state, action: PayloadAction<FilterBy>) => {
      state.filter = action.payload;
    },

    /**
     * setSortBy
     * Changes the active sort algorithm.
     */
    setSortBy: (state, action: PayloadAction<SortBy>) => {
      state.sortBy = action.payload;
    },

    /**
     * clearTaskError
     * Dismisses any error banner in the task screens.
     */
    clearTaskError: (state) => {
      state.error = null;
    },

    /**
     * resetTasks
     * Wipes all task state — called on logout so the next user
     * starts with a clean slate.
     */
    resetTasks: () => initialState,

    // ─────────────────────────────────────────────────────────────────────────
    // Synchronous CRUD actions — update the Redux store only (no Firestore).
    // Use these when you want instant local state changes without a network call,
    // or when Firestore sync is handled separately (e.g., via a batch flush).
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * addTask
     * Synchronously adds a new task to the Redux store.
     * An auto-generated `nanoid` is used for the task id.
     *
     * Dispatch example:
     *   dispatch(addTask({ title: 'Buy groceries', priority: Priority.High }))
     */
    addTask: (
      state,
      action: PayloadAction<AddTaskLocalPayload>,
    ) => {
      const now = new Date().toISOString();
      const p   = action.payload;

      const newTask: Task = {
        id:          nanoid(),
        userId:      p.userId     ?? '',
        title:       p.title,
        description: p.description ?? '',
        priority:    p.priority    ?? Priority.Medium,
        deadline:    p.deadline    ?? null,
        dateTime:    p.dateTime    ?? null,
        tags:        p.tags        ?? [],
        status:      TaskStatus.Pending,
        completed:   false,
        createdAt:   now,
        updatedAt:   now,
        completedAt: null,
      };

      // Prepend so the newest task appears at the top of the list
      state.items.unshift(newTask);
    },

    /**
     * deleteTask
     * Synchronously removes a task by its id.
     *
     * Dispatch example:
     *   dispatch(deleteTask('abc-123'))
     */
    deleteTask: (
      state,
      action: PayloadAction<string>,          // taskId
    ) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },

    /**
     * toggleComplete
     * Synchronously flips a task between Pending and Completed.
     * Sets `completed`, `status`, `completedAt`, and `updatedAt`.
     *
     * Dispatch example:
     *   dispatch(toggleComplete('abc-123'))
     */
    toggleComplete: (
      state,
      action: PayloadAction<string>,          // taskId
    ) => {
      const index = state.items.findIndex((t) => t.id === action.payload);
      if (index === -1) return;

      const task         = state.items[index];
      const isCompleting = task.status !== TaskStatus.Completed;
      const now          = new Date().toISOString();

      state.items[index] = {
        ...task,
        completed:   isCompleting,
        status:      isCompleting ? TaskStatus.Completed : TaskStatus.Pending,
        completedAt: isCompleting ? now : null,
        updatedAt:   now,
      };
    },

    /**
     * updateTask
     * Synchronously applies a partial update to an existing task.
     * `id` is required; all other fields are optional.
     *
     * Dispatch example:
     *   dispatch(updateTask({ id: 'abc-123', title: 'New title', priority: Priority.Low }))
     */
    updateTask: (
      state,
      action: PayloadAction<UpdateTaskPayload>,
    ) => {
      const { id, ...patch } = action.payload;
      const index = state.items.findIndex((t) => t.id === id);
      if (index === -1) return;

      // Derive `completed` field whenever `status` is included in the patch
      const completedOverride =
        patch.status !== undefined
          ? { completed: patch.status === TaskStatus.Completed }
          : {};

      state.items[index] = {
        ...state.items[index],
        ...patch,
        ...completedOverride,
        updatedAt: new Date().toISOString(),
      };
    },
  },

  extraReducers: (builder) => {

    // ── fetchTasks ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading    = false;
        state.items        = action.payload;
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });

    // ── createTask ──────────────────────────────────────────────────────────
    builder
      .addCase(createTask.pending, (state) => {
        // No optimistic add here since we need the server-generated ID.
        // The UI shows a loading state on the submit button instead.
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.isLoading = false;
        // Prepend to the front so the new task appears at the top of the list
        state.items.unshift(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string;
      });

    // ── updateTaskAsync ─────────────────────────────────────────────────────
    builder
      .addCase(updateTaskAsync.pending, (state, action) => {
        // Optimistic update: apply the patch to the store immediately
        const { id, ...patch } = action.meta.arg;
        const index = state.items.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            ...patch,
            updatedAt: new Date().toISOString(),
          };
        }
        state.operatingId = id;
      })
      .addCase(updateTaskAsync.fulfilled, (state) => {
        state.operatingId = null;
      })
      .addCase(updateTaskAsync.rejected, (state, action) => {
        // Roll back: refetch would be ideal; for now flag the error
        state.operatingId = null;
        state.error       = action.payload as string;
      });

    // ── toggleCompleteAsync ──────────────────────────────────────────────────────
    builder
      .addCase(toggleCompleteAsync.pending, (state, action) => {
        // Optimistic toggle
        const task  = action.meta.arg;
        const index = state.items.findIndex((t) => t.id === task.id);
        if (index !== -1) {
          const isCompleting         = state.items[index].status !== TaskStatus.Completed;
          const now                  = new Date().toISOString();
          state.items[index].completed   = isCompleting;
          state.items[index].status      = isCompleting ? TaskStatus.Completed : TaskStatus.Pending;
          state.items[index].completedAt = isCompleting ? now : null;
          state.items[index].updatedAt   = now;
        }
        state.operatingId = task.id;
      })
      .addCase(toggleCompleteAsync.fulfilled, (state, action) => {
        // Confirm with server values (completedAt is authoritative)
        const { id, patch } = action.payload;
        const index = state.items.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            ...patch,
            completed: (patch as any).status === TaskStatus.Completed,
          };
        }
        state.operatingId = null;
      })
      .addCase(toggleCompleteAsync.rejected, (state, action) => {
        // Roll back the optimistic toggle by reverting the original task state
        const task  = action.meta.arg;
        const index = state.items.findIndex((t) => t.id === task.id);
        if (index !== -1) {
          state.items[index] = task; // restore the snapshot passed as the arg
        }
        state.operatingId = null;
        state.error       = action.payload as string;
      });

    // ── deleteTaskAsync ─────────────────────────────────────────────────────
    builder
      .addCase(deleteTaskAsync.pending, (state, action) => {
        // Optimistic delete: remove immediately so the list feels instant
        const { taskId } = action.meta.arg;
        state.items       = state.items.filter((t) => t.id !== taskId);
        state.operatingId = taskId;
      })
      .addCase(deleteTaskAsync.fulfilled, (state) => {
        state.operatingId = null;
      })
      .addCase(deleteTaskAsync.rejected, (state, action) => {
        // Roll back: re-insert the snapshot that was passed with the action
        const { message, snapshot } = action.payload as { message: string; snapshot: Task };
        state.items.unshift(snapshot);      // restore at the top
        state.operatingId = null;
        state.error       = message;
      });

    // ── logoutUser (cross-slice) ────────────────────────────────────────────
    // When the user logs out, wipe all task state so the next user
    // (or the same user on re-login) starts with a clean slate.
    builder.addCase(logoutUser.fulfilled, () => initialState);
  },
});

export const {
  setFilter,
  setSortBy,
  clearTaskError,
  resetTasks,
  // Synchronous CRUD actions
  addTask,
  deleteTask,
  toggleComplete,
  updateTask,
} = tasksSlice.actions;

export default tasksSlice.reducer;

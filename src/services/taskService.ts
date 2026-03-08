/**
 * services/taskService.ts
 *
 * Firestore CRUD operations for tasks.
 * The tasksSlice thunks call these methods exclusively — no screen
 * ever imports Firebase directly.
 *
 * Firestore data model:
 *   /tasks/{taskId}   — one document per task, userId field for security rules
 *
 * Security: Firestore rules (set in the Firebase console) should enforce:
 *   allow read, write: if request.auth.uid == resource.data.userId;
 */

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../config/firebase';
import { Task, CreateTaskPayload, UpdateTaskPayload } from '../types/task.types';
import { TaskStatus } from '../constants/enums';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * newId
 * Generates a new Firestore document ID without writing to the database.
 * Keeps the local Redux optimistic ID in sync with what will be persisted.
 */
const newId = (): string =>
  firestore().collection(COLLECTIONS.TASKS).doc().id;

/**
 * serverNow
 * Returns a Firestore server timestamp. Using server timestamps instead of
 * client clocks prevents issues with devices that have incorrect times.
 */
const serverNow = () => firestore.FieldValue.serverTimestamp();

/**
 * toTask
 * Converts a Firestore document snapshot to a plain Task object.
 * Firestore timestamps are converted to ISO strings for Redux serialisability.
 */
const toTask = (
  id: string,
  data: FirebaseFirestoreTypes.DocumentData,
): Task => {
  const status = data.status as TaskStatus;
  return {
    id,
    userId:      data.userId,
    title:       data.title,
    description: data.description ?? '',
    status,
    // `completed` is a convenience boolean derived from status
    completed:   status === TaskStatus.Completed,
    priority:    data.priority,
    dateTime:    data.dateTime ?? null,
    deadline:    data.deadline ?? null,
    tags:        data.tags ?? [],
    createdAt:   data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt:   data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
  };
};

// ─── Service ──────────────────────────────────────────────────────────────────

const taskService = {
  /**
   * fetchTasks
   * Fetches all tasks for the current user ordered by createdAt descending.
   * Returns a plain Task[] — the Redux slice can store it directly.
   */
  fetchTasks: async (userId: string): Promise<Task[]> => {
    const snapshot = await firestore()
      .collection(COLLECTIONS.TASKS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => toTask(doc.id, doc.data()));
  },

  /**
   * createTask
   * Writes a new task document to Firestore using an optimistic local ID.
   * Returns the complete Task object (with id and timestamps).
   */
  createTask: async (
    userId: string,
    payload: CreateTaskPayload,
  ): Promise<Task> => {
    const id  = newId();
    const now = new Date().toISOString();

    const taskData = {
      userId,
      title:       payload.title,
      description: payload.description,
      status:      TaskStatus.Pending,
      priority:    payload.priority,
      dateTime:    payload.dateTime,
      deadline:    payload.deadline,
      tags:        payload.tags,
      createdAt:   serverNow(),
      updatedAt:   serverNow(),
      completedAt: null,
    };

    await firestore().collection(COLLECTIONS.TASKS).doc(id).set(taskData);

    // Return a plain object — cannot store Firestore FieldValue sentinels in Redux
    return {
      id,
      userId,
      ...payload,
      completed:   false,
      status:      TaskStatus.Pending,
      createdAt:   now,
      updatedAt:   now,
      completedAt: null,
    };
  },

  /**
   * updateTask
   * Applies a partial update to an existing Firestore document.
   * Always updates `updatedAt` to the server timestamp.
   */
  updateTask: async (payload: UpdateTaskPayload): Promise<void> => {
    const { id, ...fields } = payload;
    await firestore()
      .collection(COLLECTIONS.TASKS)
      .doc(id)
      .update({
        ...fields,
        updatedAt: serverNow(),
      });
  },

  /**
   * toggleComplete
   * Flips a task between Pending ↔ Completed.
   * Sets completedAt to now when completing, null when un-completing.
   */
  toggleComplete: async (task: Task): Promise<Partial<Task>> => {
    const isCompleting = task.status !== TaskStatus.Completed;
    const now = new Date().toISOString();

    const patch: Partial<Task> = {
      status:      isCompleting ? TaskStatus.Completed : TaskStatus.Pending,
      completedAt: isCompleting ? now : null,
      updatedAt:   now,
    };

    await firestore()
      .collection(COLLECTIONS.TASKS)
      .doc(task.id)
      .update({
        ...patch,
        updatedAt:   serverNow(),
        completedAt: isCompleting ? serverNow() : null,
      });

    return patch;
  },

  /**
   * deleteTask
   * Permanently removes a task document from Firestore.
   */
  deleteTask: async (taskId: string): Promise<void> => {
    await firestore().collection(COLLECTIONS.TASKS).doc(taskId).delete();
  },
};

export default taskService;

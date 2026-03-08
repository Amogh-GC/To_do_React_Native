/**
 * navigation/types.ts
 *
 * Central file for all React Navigation TypeScript param-list definitions.
 * Every navigator (Auth, Main, Root) has its own ParamList so that:
 *   - `useNavigation<ScreenNavigationProp>()` is fully typed
 *   - `useRoute<ScreenRouteProp>()` gives typed route.params
 *   - navigate() and push() calls get compile-time checking
 */

// ─── Auth Stack ───────────────────────────────────────────────────────────────
// Screens that are shown when the user is NOT authenticated.

export type AuthStackParamList = {
  /** Login screen — no params required */
  Login: undefined;

  /** Register screen — no params required */
  Register: undefined;

  /** Forgot-password screen — optionally pre-fill the email field */
  ForgotPassword: { email?: string } | undefined;
};

// ─── Main Tab Bar ─────────────────────────────────────────────────────────────
// Root-level bottom tabs visible after login.

export type MainTabParamList = {
  /** The Tasks tab — hosts its own nested stack (TasksStack) */
  TasksTab: undefined;

  /** The Add Task tab — opens directly as a modal-style screen */
  AddTaskTab: undefined;

  /** The Profile tab */
  ProfileTab: undefined;
};

// ─── Tasks Stack (nested inside Tasks tab) ────────────────────────────────────

export type TasksStackParamList = {
  /** Main to-do list */
  TaskList: undefined;

  /**
   * Task detail / view screen.
   * Receives the task ID so the screen can fetch it from the Redux store.
   */
  TaskDetail: { taskId: string };

  /**
   * Edit an existing task.
   * Receives the task ID so the form can pre-populate from the store.
   */
  EditTask: { taskId: string };
};

// ─── Add Task Stack ───────────────────────────────────────────────────────────

export type AddTaskStackParamList = {
  /** Form screen for creating a brand-new task */
  AddTask: undefined;
};

// ─── Profile Stack ────────────────────────────────────────────────────────────

export type ProfileStackParamList = {
  /** User profile / settings screen */
  Profile: undefined;
};

// ─── Root Navigator ───────────────────────────────────────────────────────────
// Top-level navigator that switches between Auth and Main.

export type RootStackParamList = {
  /** Loading / splash screen shown while session is being restored */
  Splash: undefined;

  /** Auth flow — shown when user is not logged in */
  AuthStack: undefined;

  /** Main app flow — shown when user is logged in */
  MainStack: undefined;
};

// ─── Typed navigation & route helpers ────────────────────────────────────────
// Import these in screens instead of the raw types to get full type inference.

import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type {
  BottomTabNavigationProp,
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// Auth screens
export type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
export type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
export type ForgotPasswordNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

// Task screens — composite so they can also navigate to tabs
export type TaskListNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<TasksStackParamList, 'TaskList'>,
  BottomTabNavigationProp<MainTabParamList>
>;

export type TaskDetailScreenProps = NativeStackScreenProps<TasksStackParamList, 'TaskDetail'>;
export type EditTaskScreenProps = NativeStackScreenProps<TasksStackParamList, 'EditTask'>;

// Add Task screen
export type AddTaskNavigationProp = NativeStackNavigationProp<AddTaskStackParamList, 'AddTask'>;

// Profile screen
export type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

/**
 * navigation/MainNavigator.tsx
 *
 * Root navigator for authenticated users.
 * Architecture:
 *
 *   MainNavigator (Bottom Tab)
 *     ├── TasksTab  → TasksStack (TaskList → TaskDetail → EditTask)
 *     ├── AddTaskTab → AddTaskStack (AddTask) — renders as a floating modal
 *     └── ProfileTab → ProfileStack (Profile)
 *
 * The middle "+" tab is a custom button that opens AddTask as a modal
 * overlay so the form feels contextual without navigating away from the list.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screen imports
import TaskListScreen from '../screens/tasks/TaskListScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import EditTaskScreen from '../screens/tasks/EditTaskScreen';
import AddTaskScreen from '../screens/tasks/AddTaskScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Typed param lists
import {
  MainTabParamList,
  TasksStackParamList,
  AddTaskStackParamList,
  ProfileStackParamList,
} from './types';

// Theme constants
import { COLORS } from '../constants/colors';

// ─── Typed sub-stack navigators ───────────────────────────────────────────────
const TasksStack = createNativeStackNavigator<TasksStackParamList>();
const AddTaskStack = createNativeStackNavigator<AddTaskStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// ─── Nested Stacks ────────────────────────────────────────────────────────────

/**
 * TasksStackNavigator
 * Handles: TaskList → TaskDetail → EditTask
 * Lives inside the "Tasks" bottom tab.
 */
const TasksStackNavigator: React.FC = () => (
  <TasksStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <TasksStack.Screen name="TaskList" component={TaskListScreen} />
    <TasksStack.Screen
      name="TaskDetail"
      component={TaskDetailScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <TasksStack.Screen
      name="EditTask"
      component={EditTaskScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </TasksStack.Navigator>
);

/**
 * AddTaskStackNavigator
 * A single-screen stack presented as a bottom-sheet modal.
 * Using a stack (not just a screen) keeps the modal pattern consistent
 * and allows future sub-screens inside the add flow (e.g. tag picker).
 */
const AddTaskStackNavigator: React.FC = () => (
  <AddTaskStack.Navigator
    screenOptions={{
      headerShown: false,
      // Full-screen modal slide up from the bottom
      presentation: 'modal',
      animation: 'slide_from_bottom',
    }}
  >
    <AddTaskStack.Screen name="AddTask" component={AddTaskScreen} />
  </AddTaskStack.Navigator>
);

/**
 * ProfileStackNavigator
 * Single-screen stack for the profile tab.
 * Structured as a stack so we can push sub-screens (Edit Profile, Settings) later.
 */
const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
  </ProfileStack.Navigator>
);

// ─── Custom "+" Tab Button ────────────────────────────────────────────────────

/**
 * AddTaskTabButton
 * Replaces the default middle tab button with a floating circular button.
 * The `onPress` from React Navigation is forwarded so it still navigates correctly.
 */
interface AddTaskTabButtonProps {
  onPress?: () => void;
}

const AddTaskTabButton: React.FC<AddTaskTabButtonProps> = ({ onPress }) => (
  <TouchableOpacity
    style={styles.addButton}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityLabel="Add new task"
    accessibilityRole="button"
  >
    <Icon name="plus" size={30} color={COLORS.white} />
  </TouchableOpacity>
);

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="TasksTab"
      screenOptions={({ route }) => ({
        // Hide the default header — each nested stack / screen handles its own
        headerShown: false,

        // Tab bar visual config
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,

        // Render icon based on route name
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            TasksTab: focused ? 'format-list-checks' : 'format-list-checkbox',
            AddTaskTab: 'plus',                        // overridden by tabBarButton below
            ProfileTab: focused ? 'account-circle' : 'account-circle-outline',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      {/* ── Tasks Tab ─────────────────────────────────────────────────────── */}
      <Tab.Screen
        name="TasksTab"
        component={TasksStackNavigator}
        options={{
          tabBarLabel: 'Tasks',
          tabBarAccessibilityLabel: 'Tasks tab',
        }}
      />

      {/* ── Add Task Tab (custom button) ───────────────────────────────────── */}
      <Tab.Screen
        name="AddTaskTab"
        component={AddTaskStackNavigator}
        options={{
          tabBarLabel: '',                             // no label under the "+" button
          tabBarButton: (props) => (
            // Cast to satisfy the strict prop types from React Navigation
            <AddTaskTabButton onPress={props.onPress as () => void} />
          ),
        }}
      />

      {/* ── Profile Tab ───────────────────────────────────────────────────── */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 8,
    // Subtle shadow on iOS
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,                                   // Android shadow
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    // Float the button above the tab bar
    position: 'relative',
    top: -20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow to make it appear elevated
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default MainNavigator;

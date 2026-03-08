# TodoApp — React Native To-Do App with Firebase Auth

A fully-featured To-Do application built with **React Native CLI** and **TypeScript**.

## Features

### Core Requirements

- **User Authentication** — Register, Login, Logout, Forgot Password (Firebase Auth)
- **Task Management** — Create, Read, Update, Delete tasks
- **Task Fields** — Title, Description, Priority (Low/Medium/High), Scheduled Date-Time, Deadline, Tags
- **Mark Complete** — Toggle task between Pending ↔ Completed
- **Task List** — View all tasks with status indicators

### Bonus Features

- **Smart Sort Algorithm** — Composite score weighting Priority (40%) + Urgency (60%)
- **Multiple Sort Options** — Deadline ↑↓, Priority High/Low, Created Newest/Oldest
- **Filter Bar** — All, Pending, Completed, High Priority, Overdue
- **Live Search** — Filter tasks by title, description, or tags
- **Tags** — Add comma-separated category tags to tasks
- **Overdue Detection** — Tasks past their deadline are highlighted in red
- **Swipe to Delete** — Swipe left on any task card to reveal delete button
- **Pull to Refresh** — Pull down the task list to sync with Firestore
- **Session Persistence** — Login state survives app restarts (Keychain + redux-persist)
- **Optimistic Updates** — UI updates instantly; rolls back if Firestore rejects

## Tech Stack

| Category         | Library                                    |
| ---------------- | ------------------------------------------ |
| Framework        | React Native CLI 0.73                      |
| Language         | TypeScript                                 |
| Navigation       | React Navigation 6 (Stack + Bottom Tabs)   |
| State Management | Redux Toolkit + redux-persist              |
| Backend / Auth   | Firebase (Auth + Firestore)                |
| Storage          | Keychain (token), AsyncStorage (Redux)     |
| Forms            | react-hook-form + Yup                      |
| UI               | react-native-linear-gradient, vector-icons |
| Date Handling    | date-fns                                   |

## Project Structure

```
src/
├── components/
│   ├── common/          # AppButton, AppInput
│   └── tasks/           # TaskCard, TaskFilterBar, PrioritySelector
├── config/
│   └── firebase.ts      # Firebase re-exports + collection constants
├── constants/           # colors, typography, spacing, enums
├── hooks/
│   ├── useAuth.ts       # Auth actions wrapper
│   └── useTasks.ts      # Task CRUD wrapper
├── navigation/          # AppNavigator, AuthNavigator, MainNavigator, types
├── screens/
│   ├── auth/            # Login, Register, ForgotPassword
│   ├── tasks/           # TaskList, TaskDetail, AddTask, EditTask
│   └── profile/         # Profile
├── services/
│   ├── authService.ts   # Firebase Auth + Keychain
│   └── taskService.ts   # Firestore CRUD
├── store/
│   ├── index.ts         # Redux store + persistor
│   ├── selectors/       # Memoized selectors (createSelector)
│   └── slices/          # authSlice, tasksSlice
├── types/               # auth.types.ts, task.types.ts
└── utils/               # dateUtils, filterTasks, sortTasks, validators
```

## Setup Instructions

### 1. Prerequisites

- Node.js >= 18
- React Native CLI: `npm install -g react-native-cli`
- Android Studio (for Android emulator) OR Xcode (for iOS simulator)
- A Firebase project with **Email/Password** sign-in enabled

### 2. Clone and install

```bash
git clone <repo-url>
cd TodoApp
npm install
```

### 3. Configure Firebase

**Android:**

1. In the Firebase Console, register an Android app with package `com.todoapp`
2. Download `google-services.json` and place it in `android/app/`

**iOS:**

1. Register an iOS app with bundle ID `com.todoapp`
2. Download `GoogleService-Info.plist` and add it to `ios/TodoApp/` via Xcode

### 4. Link vector icon fonts

```bash
npx react-native link react-native-vector-icons
# or manually copy fonts per react-native-vector-icons README
```

### 5. Run the app

```bash
# Start Metro bundler
npm start

# In another terminal:
npm run android   # Android
npm run ios       # iOS
```

## Sort Algorithm

The **Smart Sort** (default) calculates a composite score for each task:

$$\text{score} = 0.4 \times \text{priorityScore} + 0.6 \times \text{urgencyScore}$$

Where:

- `priorityScore` = High: 3 | Medium: 2 | Low: 1
- `urgencyScore` = `1 / max(hoursUntilDeadline, 0.5)`
- Tasks without a deadline get `urgencyScore = 0` (ranked by priority only)
- **Completed tasks always sink to the bottom**, regardless of sort mode

## Firebase Security Rules

Add these Firestore rules to lock down task access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

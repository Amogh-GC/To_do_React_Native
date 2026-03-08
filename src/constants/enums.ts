/**
 * constants/enums.ts
 *
 * App-wide enumerations used across tasks, auth, and UI components.
 */

export enum Priority {
  Low    = 'low',
  Medium = 'medium',
  High   = 'high',
}

export enum TaskStatus {
  Pending    = 'pending',
  InProgress = 'in_progress',
  Completed  = 'completed',
}

export enum SortBy {
  /**
   * Multi-key natural sort: Priority (High→Low) → Deadline (earliest first,
   * no-deadline tasks last) → Created date (newest first).
   * This is the default sort shown when the app first opens.
   */
  PriorityDeadline = 'priority_deadline',

  DeadlineAsc   = 'deadline_asc',
  DeadlineDesc  = 'deadline_desc',
  PriorityHigh  = 'priority_high',
  PriorityLow   = 'priority_low',
  CreatedNewest = 'created_newest',
  CreatedOldest = 'created_oldest',
  Score         = 'score',            // composite priority + urgency algorithm
}

export enum FilterBy {
  All       = 'all',
  Pending   = 'pending',
  Completed = 'completed',
  HighPri   = 'high_priority',
  Overdue   = 'overdue',
  DueToday  = 'due_today',
}

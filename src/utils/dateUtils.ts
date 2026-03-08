/**
 * utils/dateUtils.ts
 *
 * Date formatting and comparison helpers used across task cards and forms.
 * All functions are pure and return plain strings/booleans — safe for Redux.
 */

import { format, formatDistanceToNow, isBefore, isToday, isTomorrow, parseISO } from 'date-fns';

/**
 * formatDeadline
 * Returns a human-friendly string for a task's deadline.
 *   - Today     → "Today at 3:00 PM"
 *   - Tomorrow  → "Tomorrow at 10:00 AM"
 *   - Overdue   → "2 days ago"  (relative)
 *   - Future    → "Mar 15"
 *   - null      → "No deadline"
 */
export const formatDeadline = (isoDate: string | null): string => {
  if (!isoDate) return 'No deadline';
  const date = parseISO(isoDate);
  const now = new Date();

  if (isBefore(date, now)) {
    // Overdue — show relative time with "ago"
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy');
};

/**
 * formatDateTime
 * Returns a formatted date-time string for task cards.
 *   null → "Not set"
 *   otherwise → "Mon, Mar 10 · 2:30 PM"
 */
export const formatDateTime = (isoDate: string | null): string => {
  if (!isoDate) return 'Not set';
  return format(parseISO(isoDate), "EEE, MMM d · h:mm a");
};

/**
 * isOverdue
 * Returns true if the given deadline has already passed and the task is not done.
 */
export const isOverdue = (deadline: string | null): boolean => {
  if (!deadline) return false;
  return isBefore(parseISO(deadline), new Date());
};

/**
 * isDueToday
 * Returns true if the deadline falls on today's date.
 */
export const isDueToday = (deadline: string | null): boolean => {
  if (!deadline) return false;
  return isToday(parseISO(deadline));
};

/**
 * toISOString
 * Converts a JS Date to an ISO string for Redux / Firestore storage.
 */
export const toISOString = (date: Date): string => date.toISOString();

/**
 * components/tasks/TaskCard.tsx
 *
 * Card representing a single task in the list.
 * Features:
 *  - Tap row  → navigate to TaskDetail
 *  - Checkbox → toggleTaskComplete (optimistic)
 *  - Swipe-left reveal → delete button
 *  - Priority colour strip on left edge
 *  - Deadline label with overdue tint
 */

import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Task } from '../../types/task.types';
import { Priority, TaskStatus } from '../../constants/enums';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { formatDeadline, formatDateTime, isOverdue } from '../../utils/dateUtils';
import type { TasksStackParamList } from '../../navigation/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  isOperating?: boolean; // true while an async op is pending for this task
}

type TasksNavProp = NativeStackNavigationProp<TasksStackParamList, 'TaskList'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.High]:   COLORS.priorityHigh,
  [Priority.Medium]: COLORS.priorityMedium,
  [Priority.Low]:    COLORS.priorityLow,
};

// Subtle tinted card backgrounds per priority
const PRIORITY_BG: Record<Priority, string> = {
  [Priority.High]:   COLORS.priorityHighLight,
  [Priority.Medium]: COLORS.priorityMediumLight,
  [Priority.Low]:    COLORS.priorityLowLight,
};

const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.High]:   'HIGH',
  [Priority.Medium]: 'MED',
  [Priority.Low]:    'LOW',
};

const SWIPE_THRESHOLD = 80; // px to reveal the delete button

// ─── Component ────────────────────────────────────────────────────────────────

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggle,
  onDelete,
  isOperating = false,
}) => {
  const navigation = useNavigation<TasksNavProp>();

  // Swipe animation ──────────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(0)).current;
  const [revealed, setRevealed] = React.useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,

      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -SWIPE_THRESHOLD));
      },

      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD / 2) {
          Animated.spring(translateX, { toValue: -SWIPE_THRESHOLD, useNativeDriver: true }).start();
          setRevealed(true);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setRevealed(false);
        }
      },
    }),
  ).current;

  const closeReveal = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setRevealed(false);
  };

  // Derived state ────────────────────────────────────────────────────────────
  const isCompleted   = task.status === TaskStatus.Completed;
  const overdue       = !isCompleted && isOverdue(task.deadline);
  const priorityColor = PRIORITY_COLOR[task.priority];
  const deadlineText  = formatDeadline(task.deadline);
  const scheduledText = task.dateTime ? formatDateTime(task.dateTime) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/* Delete backdrop (shows when swiped) */}
      <TouchableOpacity
        style={styles.deleteBackdrop}
        onPress={() => { closeReveal(); onDelete(task); }}
        activeOpacity={0.8}
      >
        <Icon name="trash-can-outline" size={22} color={COLORS.white} />
        <Text style={styles.deleteLabel}>Delete</Text>
      </TouchableOpacity>

      {/* Swipeable card row */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX }] },
          // Dim + neutralise completed tasks
          isCompleted && styles.cardCompleted,
          // Tint the card background to match priority (very subtle)
          !isCompleted && { backgroundColor: PRIORITY_BG[task.priority] },
          // Priority-coloured shadow glow (iOS only)
          !isCompleted && { shadowColor: PRIORITY_COLOR[task.priority] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Priority strip — colour + faint background echo */}
        <View style={[styles.priorityStrip, { backgroundColor: priorityColor }]} />

        {/* Checkbox / loading indicator */}
        <TouchableOpacity
          onPress={() => { if (revealed) { closeReveal(); return; } onToggle(task); }}
          style={styles.checkbox}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isOperating}
        >
          {isOperating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Icon
              name={isCompleted ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={24}
              color={isCompleted ? COLORS.success : COLORS.textDisabled}
            />
          )}
        </TouchableOpacity>

        {/* Content */}
        <TouchableOpacity
          style={styles.content}
          onPress={() => {
            if (revealed) { closeReveal(); return; }
            navigation.navigate('TaskDetail', { taskId: task.id });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isCompleted && styles.titleDone]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {/* Badges row */}
            <View style={styles.badgesRow}>
              {/* Status badge */}
              {isCompleted ? (
                <View style={[styles.statusBadge, styles.statusBadgeDone]}>
                  <Icon name="check" size={9} color={COLORS.success} />
                  <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>Done</Text>
                </View>
              ) : overdue ? (
                <View style={[styles.statusBadge, styles.statusBadgeOverdue]}>
                  <Icon name="clock-alert-outline" size={9} color={COLORS.danger} />
                  <Text style={[styles.statusBadgeText, { color: COLORS.danger }]}>Overdue</Text>
                </View>
              ) : null}
              {/* Priority badge */}
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22' }]}>
                <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                  {PRIORITY_LABEL[task.priority]}
                </Text>
              </View>
            </View>
          </View>

          {!!task.description && (
            <Text style={styles.description} numberOfLines={1}>
              {task.description}
            </Text>
          )}

          {/* Metadata row */}
          <View style={styles.metaRow}>
            {/* Deadline */}
            <Icon
              name="clock-outline"
              size={12}
              color={overdue ? COLORS.danger : COLORS.textSecondary}
              style={styles.metaIcon}
            />
            <Text style={[styles.metaText, overdue && styles.overdueText]}>
              {deadlineText}
            </Text>

            {/* Scheduled dateTime */}
            {!!scheduledText && (
              <>
                <Text style={styles.metaSep}>·</Text>
                <Icon name="calendar-clock" size={12} color={COLORS.textSecondary} style={styles.metaIcon} />
                <Text style={styles.metaText}>{scheduledText}</Text>
              </>
            )}

            {/* Tags */}
            {task.tags.length > 0 && (
              <>
                <Text style={styles.metaSep}>·</Text>
                <Icon name="tag-outline" size={12} color={COLORS.textSecondary} style={styles.metaIcon} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {task.tags.slice(0, 2).join(', ')}
                  {task.tags.length > 2 ? ` +${task.tags.length - 2}` : ''}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Chevron */}
        <Icon name="chevron-right" size={18} color={COLORS.textDisabled} style={styles.chevron} />
      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Delete backdrop
  deleteBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingLeft: SPACING.xl,
    gap: SPACING.xs,
  },
  deleteLabel: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    // Richer shadow — iOS
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    // Android
    elevation: 3,
  },
  // Completed cards: dimmed & tinted grey
  cardCompleted: {
    opacity: 0.62,
    backgroundColor: COLORS.surfaceRaised,
    shadowOpacity: 0.04,
    elevation: 1,
  },

  priorityStrip: {
    width: 5,          // slightly wider for visual emphasis
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },

  checkbox: {
    paddingHorizontal: SPACING.md,
  },

  content: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.xs,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
    flexWrap: 'nowrap',
  },
  // Badges row (status + priority side by side)
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
  },
  statusBadgeDone: { backgroundColor: COLORS.success + '22' },
  statusBadgeOverdue: { backgroundColor: COLORS.danger + '18' },
  statusBadgeText: { fontSize: 9, fontWeight: FONTS.bold, letterSpacing: 0.3 },
  title: {
    flex: 1,
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },

  priorityBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityBadgeText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    letterSpacing: 0.5,
  },

  description: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  metaIcon: { marginRight: 3 },
  metaText: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },
  overdueText: {
    color: COLORS.danger,
    fontWeight: FONTS.medium,
  },
  metaSep: {
    marginHorizontal: SPACING.xs,
    color: COLORS.textDisabled,
  },

  chevron: {
    marginRight: SPACING.sm,
  },
});

export default TaskCard;

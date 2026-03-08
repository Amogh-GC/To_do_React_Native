/**
 * screens/tasks/TaskDetailScreen.tsx
 *
 * Displays the full details of a single task.
 * Actions:
 *  - Toggle complete (header right button)
 *  - Navigate to EditTask
 *  - Delete (with confirmation)
 */

import React, { useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { TaskDetailScreenProps } from '../../navigation/types';
import { selectTaskById } from '../../store/selectors/taskSelectors';
import useTasks from '../../hooks/useTasks';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Priority, TaskStatus } from '../../constants/enums';
import { formatDeadline, formatDateTime, isOverdue } from '../../utils/dateUtils';
import { Task } from '../../types/task.types';

// ─── Priority display config ──────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.High]:   COLORS.priorityHigh,
  [Priority.Medium]: COLORS.priorityMedium,
  [Priority.Low]:    COLORS.priorityLow,
};
// Light tinted backgrounds that match each priority
const PRIORITY_BG_COLOR: Record<Priority, string> = {
  [Priority.High]:   COLORS.priorityHighLight,
  [Priority.Medium]: COLORS.priorityMediumLight,
  [Priority.Low]:    COLORS.priorityLowLight,
};
const PRIORITY_ICON: Record<Priority, string> = {
  [Priority.High]:   'arrow-up-circle',
  [Priority.Medium]: 'minus-circle',
  [Priority.Low]:    'arrow-down-circle',
};

// ─── Component ────────────────────────────────────────────────────────────────

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { taskId } = route.params;

  const task = useSelector(selectTaskById(taskId)) as Task | undefined;
  const { toggleTaskComplete, removeTask, operatingId } = useTasks();

  const isCompleted = task?.status === TaskStatus.Completed;
  const operating   = operatingId === taskId;
  const overdue     = task ? isOverdue(task.deadline) && !isCompleted : false;

  const handleDelete = useCallback(() => {
    if (!task) return;
    Alert.alert(
      'Delete Task',
      `Delete "${task.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => { removeTask(task); navigation.goBack(); },
        },
      ],
    );
  }, [task, removeTask, navigation]);

  if (!task) {
    return (
      <View style={styles.notFound}>
        <Icon name="alert-circle-outline" size={48} color={COLORS.textDisabled} />
        <Text style={styles.notFoundText}>Task not found</Text>
      </View>
    );
  }

  const priorityColor   = PRIORITY_COLOR[task.priority];
  const priorityBgColor = PRIORITY_BG_COLOR[task.priority];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Custom header — gradient tinted by task priority */}
      <LinearGradient
        colors={[COLORS.surface, priorityBgColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Task Detail</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('EditTask', { taskId })}
          >
            <Icon name="pencil-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <Icon name="trash-can-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Priority strip + title — background tinted to match priority */}
        <View style={[styles.titleCard, { borderLeftColor: priorityColor, backgroundColor: priorityBgColor }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isCompleted && styles.titleDone]}>
              {task.title}
            </Text>
            <TouchableOpacity
              onPress={() => toggleTaskComplete(task)}
              disabled={operating}
              style={styles.toggleBtn}
            >
              <Icon
                name={isCompleted ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                size={28}
                color={isCompleted ? COLORS.success : COLORS.textDisabled}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isCompleted ? COLORS.success + '22' : overdue ? COLORS.danger + '22' : COLORS.primaryLight }]}>
            <Text style={[styles.statusText, { color: isCompleted ? COLORS.success : overdue ? COLORS.danger : COLORS.primary }]}>
              {isCompleted ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {!!task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        )}

        {/* Details grid */}
        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Icon name={PRIORITY_ICON[task.priority]} size={18} color={priorityColor} />
            <Text style={styles.gridLabel}>Priority</Text>
            <Text style={[styles.gridValue, { color: priorityColor }]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Text>
          </View>

          <View style={[styles.gridCell, styles.gridCellBorder]}>
            <Icon name="clock-outline" size={18} color={overdue ? COLORS.danger : COLORS.textSecondary} />
            <Text style={styles.gridLabel}>Deadline</Text>
            <Text style={[styles.gridValue, overdue && { color: COLORS.danger }]} numberOfLines={2}>
              {formatDeadline(task.deadline)}
            </Text>
          </View>

          <View style={styles.gridCell}>
            <Icon name="calendar-clock" size={18} color={COLORS.textSecondary} />
            <Text style={styles.gridLabel}>Scheduled</Text>
            <Text style={styles.gridValue} numberOfLines={2}>{formatDateTime(task.dateTime)}</Text>
          </View>
        </View>

        {/* Tags */}
        {task.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.tagsRow}>
              {task.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Created / Updated */}
        <Text style={styles.footerMeta}>
          Created {formatDateTime(task.createdAt)}
          {task.completedAt ? `  ·  Completed ${formatDateTime(task.completedAt)}` : ''}
        </Text>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  notFoundText: { fontSize: FONTS.base, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
    // backgroundColor driven by LinearGradient — no override needed
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerBtn: { padding: SPACING.xs },
  headerTitle: { flex: 1, fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginHorizontal: SPACING.sm },
  headerActions: { flexDirection: 'row', gap: SPACING.xs },

  content: { padding: SPACING.base, gap: SPACING.base },

  titleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.base,
    borderLeftWidth: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  title: { flex: 1, fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, lineHeight: 28 },
  titleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  toggleBtn: { marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 4, marginTop: SPACING.sm },
  statusText: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.base,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  description: { fontSize: FONTS.base, color: COLORS.textPrimary, lineHeight: 22 },

  grid: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.base,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCell: { flex: 1, alignItems: 'center', gap: 4 },
  gridCellBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  gridLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, textAlign: 'center' },
  gridValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, textAlign: 'center' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tag: { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  tagText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium },

  footerMeta: { fontSize: FONTS.xs, color: COLORS.textDisabled, textAlign: 'center', marginTop: SPACING.sm },
});

export default TaskDetailScreen;

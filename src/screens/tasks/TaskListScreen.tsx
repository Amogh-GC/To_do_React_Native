/**
 * screens/tasks/TaskListScreen.tsx
 *
 * Main tasks list screen shown on the "Tasks" bottom tab.
 *
 * Layout (top → bottom):
 *  ┌─────────────────────────────────────┐
 *  │  Gradient header: greeting + stats  │
 *  │  Search bar                         │
 *  │  Filter pills (All/Pending/…)       │
 *  ├─────────────────────────────────────┤
 *  │  FlatList of TaskCards              │
 *  │    • swipe left  → delete           │
 *  │    • checkbox    → mark complete    │
 *  │    • tap row     → TaskDetail       │
 *  ├─────────────────────────────────────┤
 *  │  FAB (+)          Sort modal        │
 *  └─────────────────────────────────────┘
 *
 * Features:
 *  - Pull-to-refresh (syncs Firestore)
 *  - Animated FAB (scale-in on mount, pulses when list is empty)
 *  - Sort bottom-sheet with 7 options
 *  - Skeleton loading state while the first fetch is in-flight
 *  - Empty state illustration with contextual message
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import useAuth from '../../hooks/useAuth';
import useTasks from '../../hooks/useTasks';
import TaskCard from '../../components/tasks/TaskCard';
import TaskFilterBar from '../../components/tasks/TaskFilterBar';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { FilterBy, SortBy } from '../../constants/enums';
import { Task } from '../../types/task.types';
import type { TaskListNavigationProp } from '../../navigation/types';

// ─── Sort configuration ───────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortBy; label: string; icon: string; desc: string }[] = [
  { value: SortBy.PriorityDeadline, label: 'Default',      icon: 'sort-variant',             desc: 'Priority → Deadline → Date'  },
  { value: SortBy.Score,            label: 'Smart Sort',   icon: 'star-four-points-outline', desc: 'Priority + urgency score'    },
  { value: SortBy.DeadlineAsc,      label: 'Deadline ↑',  icon: 'clock-fast',               desc: 'Soonest deadline first'       },
  { value: SortBy.DeadlineDesc,     label: 'Deadline ↓',  icon: 'clock-outline',            desc: 'Latest deadline first'        },
  { value: SortBy.PriorityHigh,     label: 'High Priority',icon: 'flag',                    desc: 'High → Medium → Low'          },
  { value: SortBy.PriorityLow,      label: 'Low Priority', icon: 'flag-outline',            desc: 'Low → Medium → High'          },
  { value: SortBy.CreatedNewest,    label: 'Newest',       icon: 'calendar-plus',           desc: 'Recently added first'         },
  { value: SortBy.CreatedOldest,    label: 'Oldest',       icon: 'calendar-minus',          desc: 'Oldest tasks first'           },
];

// ─── Skeleton card placeholder ────────────────────────────────────────────────

const SkeletonCard: React.FC<{ opacity: Animated.Value }> = ({ opacity }) => (
  <Animated.View style={[skeletonStyles.card, { opacity }]}>
    <View style={skeletonStyles.strip} />
    <View style={skeletonStyles.circle} />
    <View style={skeletonStyles.body}>
      <View style={[skeletonStyles.line, { width: '70%' }]} />
      <View style={[skeletonStyles.line, { width: '45%', marginTop: 8 }]} />
      <View style={[skeletonStyles.line, { width: '55%', marginTop: 6 }]} />
    </View>
  </Animated.View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    height: 84,
  },
  strip: { width: 4, alignSelf: 'stretch', backgroundColor: COLORS.border },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  body: { flex: 1 },
  line: { height: 12, borderRadius: 6, backgroundColor: COLORS.border },
});

// ─── Stats pill ───────────────────────────────────────────────────────────────

const StatPill: React.FC<{ count: number; label: string; color: string }> = ({
  count,
  label,
  color,
}) => (
  <View style={[statStyles.pill, { backgroundColor: color + '22' }]}>
    <Text style={[statStyles.count, { color }]}>{count}</Text>
    <Text style={[statStyles.label, { color }]}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 12,
    minWidth: 58,
  },
  count: { fontSize: FONTS.xl, fontWeight: FONTS.bold, lineHeight: 26 },
  label: { fontSize: FONTS.xs, fontWeight: FONTS.medium },
});

// ─── Main component ───────────────────────────────────────────────────────────

const TaskListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TaskListNavigationProp>();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs
  const fabScale = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;
  const shimmer  = useRef(new Animated.Value(0.4)).current;

  const {
    displayedTasks,
    taskCounts,
    isLoading,
    operatingId,
    activeFilter,
    activeSortBy,
    loadTasks,
    toggleTaskComplete,
    removeTask,
    changeFilter,
    changeSort,
  } = useTasks(search);

  // ── Side effects ────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.uid) loadTasks(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // FAB entrance animation
  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      delay: 300,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [fabScale]);

  // Skeleton shimmer
  useEffect(() => {
    if (!isLoading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLoading, shimmer]);

  // Pulse FAB when task list is empty
  useEffect(() => {
    let anim: Animated.CompositeAnimation;
    if (displayedTasks.length > 0) {
      anim = Animated.spring(fabPulse, { toValue: 1, useNativeDriver: true });
    } else {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(fabPulse, { toValue: 1.14, duration: 600, useNativeDriver: true }),
          Animated.timing(fabPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
    }
    anim.start();
    return () => anim.stop();
  }, [displayedTasks.length, fabPulse]);

  // ── Callbacks ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    await loadTasks(user.uid);
    setRefreshing(false);
  }, [user?.uid, loadTasks]);

  const confirmDelete = useCallback(
    (task: Task) => {
      Alert.alert(
        'Delete Task',
        `Delete "${task.title}"?\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => removeTask(task) },
        ],
      );
    },
    [removeTask],
  );

  const openAddTask = useCallback(() => {
    navigation.navigate('AddTaskTab');
  }, [navigation]);

  // ── Derived state ────────────────────────────────────────────────────────

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  const completionPct = useMemo(() => {
    if (taskCounts.all === 0) return 0;
    return Math.round((taskCounts.completed / taskCounts.all) * 100);
  }, [taskCounts]);

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderTask = useCallback(
    ({ item }: { item: Task }) => (
      <TaskCard
        task={item}
        onToggle={toggleTaskComplete}
        onDelete={confirmDelete}
        isOperating={operatingId === item.id}
      />
    ),
    [toggleTaskComplete, confirmDelete, operatingId],
  );

  const keyExtractor = useCallback((t: Task) => t.id, []);

  const ListHeader = useCallback(
    () => (
      <>
        {/* ── Gradient header ────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientHeader, { paddingTop: insets.top + SPACING.md }]}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
              <Text style={styles.subGreeting}>
                {taskCounts.all === 0
                  ? 'No tasks yet — tap + to get started'
                  : taskCounts.pending === 0
                  ? '🎉 All tasks finished — great work!'
                  : `${taskCounts.pending} task${
                      taskCounts.pending !== 1 ? 's' : ''
                    } left to do`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => setShowSort(true)}
              activeOpacity={0.75}
              accessibilityLabel="Sort tasks"
              accessibilityRole="button"
            >
              <Icon name="sort-variant" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Stats pills */}
          {taskCounts.all > 0 && (
            <View style={styles.statsRow}>
              <StatPill count={taskCounts.all}       label="Total"   color={COLORS.white} />
              <StatPill count={taskCounts.pending}   label="Pending" color="#FFD166"      />
              <StatPill count={taskCounts.completed} label="Done"    color="#06D6A0"      />
              {taskCounts.overdue > 0 && (
                <StatPill count={taskCounts.overdue} label="Overdue" color="#FF6B6B" />
              )}
            </View>
          )}

          {/* Progress bar */}
          {taskCounts.all > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
            </View>
          )}
        </LinearGradient>

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon
              name="magnify"
              size={18}
              color={search.length > 0 ? COLORS.primary : COLORS.textSecondary}
              style={{ marginRight: SPACING.sm }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks…"
              placeholderTextColor={COLORS.textDisabled}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search tasks"
            />
            {search.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close-circle" size={16} color={COLORS.textDisabled} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <TaskFilterBar
          activeFilter={activeFilter}
          counts={taskCounts}
          onSelect={changeFilter}
        />

        {/* Section label */}
        {displayedTasks.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>
              {activeFilter === FilterBy.All
                ? 'All Tasks'
                : activeFilter === FilterBy.Pending
                ? 'Pending Tasks'
                : activeFilter === FilterBy.Completed
                ? 'Completed Tasks'
                : activeFilter === FilterBy.HighPri
                ? 'High Priority'
                : activeFilter === FilterBy.DueToday
                ? 'Due Today'
                : 'Overdue Tasks'}
            </Text>
            <Text style={styles.sectionCount}>
              {displayedTasks.length} item{displayedTasks.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firstName, taskCounts, completionPct, search, activeFilter, displayedTasks.length, insets.top],
  );

  const ListEmpty = useCallback(
    () =>
      isLoading ? null : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Icon
              name={
                activeFilter === FilterBy.All
                  ? 'clipboard-list-outline'
                  : activeFilter === FilterBy.Overdue
                  ? 'clock-alert-outline'
                  : activeFilter === FilterBy.DueToday
                  ? 'calendar-today'
                  : 'check-circle-outline'
              }
              size={52}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {activeFilter === FilterBy.All
              ? 'No tasks yet'
              : activeFilter === FilterBy.Pending
              ? 'No pending tasks'
              : activeFilter === FilterBy.Completed
              ? 'Nothing completed yet'
              : activeFilter === FilterBy.HighPri
              ? 'No high-priority tasks'              : activeFilter === FilterBy.DueToday
              ? 'Nothing due today — enjoy!'              : 'No overdue tasks — nice!'}
          </Text>
          <Text style={styles.emptyHint}>
            {activeFilter === FilterBy.All
              ? 'Tap the + button below to create your first task'
              : 'Try selecting a different filter above'}
          </Text>
          {activeFilter === FilterBy.All && (
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={openAddTask}
              activeOpacity={0.8}
            >
              <Icon name="plus" size={18} color={COLORS.white} />
              <Text style={styles.emptyAddBtnText}>Add First Task</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    [isLoading, activeFilter, openAddTask],
  );

  // ── Skeleton state ───────────────────────────────────────────────────────

  if (isLoading && displayedTasks.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={[styles.gradientHeader, { paddingTop: insets.top + SPACING.md }]}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
              <Text style={styles.subGreeting}>Loading your tasks…</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={{ marginTop: SPACING.base }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} opacity={shimmer} />
          ))}
        </View>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedTasks}
        keyExtractor={keyExtractor}
        renderItem={renderTask}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.surface}
          />
        }
      />

      {/* ── Floating Action Button ─────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.fabWrapper,
          { bottom: insets.bottom + SPACING.xl },
          { transform: [{ scale: Animated.multiply(fabScale, fabPulse) }] },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddTask}
          activeOpacity={0.85}
          accessibilityLabel="Add new task"
          accessibilityRole="button"
        >
          <Icon name="plus" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Sort bottom sheet ──────────────────────────────────────────── */}
      <Modal
        visible={showSort}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSort(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSort(false)}
        />
        <View style={[styles.sortSheet, { paddingBottom: insets.bottom + SPACING.base }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>Sort Tasks</Text>
            <TouchableOpacity
              onPress={() => setShowSort(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          {SORT_OPTIONS.map((opt, idx) => {
            const isActive = activeSortBy === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortRow,
                  idx === SORT_OPTIONS.length - 1 && styles.sortRowLast,
                ]}
                onPress={() => { changeSort(opt.value); setShowSort(false); }}
                activeOpacity={0.7}
              >
                <View style={[styles.sortIconCircle, isActive && styles.sortIconCircleActive]}>
                  <Icon
                    name={opt.icon}
                    size={18}
                    color={isActive ? COLORS.white : COLORS.textSecondary}
                  />
                </View>
                <View style={styles.sortTextBlock}>
                  <Text style={[styles.sortRowLabel, isActive && styles.sortRowLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.sortRowDesc}>{opt.desc}</Text>
                </View>
                {isActive && <Icon name="check-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── List ──
  listContent: { flexGrow: 1, paddingBottom: 100 },

  // ── Gradient header ──
  gradientHeader: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  greetingBlock: { flex: 1, paddingRight: SPACING.sm },
  greeting: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    lineHeight: 32,
  },
  subGreeting: {
    fontSize: FONTS.sm,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
    lineHeight: 18,
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%' as any,
    backgroundColor: '#06D6A0',
    borderRadius: 2,
  },

  // ── Search ──
  searchContainer: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 46,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },

  // ── Section divider ──
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  sectionLabel: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: { fontSize: FONTS.xs, color: COLORS.textDisabled },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    gap: SPACING.sm,
  },
  emptyAddBtnText: {
    color: COLORS.white,
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
  },

  // ── FAB ──
  fabWrapper: {
    position: 'absolute',
    right: SPACING.xl,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },

  // ── Sort modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sortSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sheetTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  sortRowLast: { borderBottomWidth: 0 },
  sortIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortIconCircleActive: { backgroundColor: COLORS.primary },
  sortTextBlock: { flex: 1 },
  sortRowLabel: {
    fontSize: FONTS.base,
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
  },
  sortRowLabelActive: { color: COLORS.primary, fontWeight: FONTS.semiBold },
  sortRowDesc: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 1 },
});

export default TaskListScreen;

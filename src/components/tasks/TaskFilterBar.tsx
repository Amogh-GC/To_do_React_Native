/**
 * components/tasks/TaskFilterBar.tsx
 *
 * Horizontal scrollable pill bar for switching the active task filter.
 * Each pill shows the filter label + a badge count (from selectTaskCounts).
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FilterBy } from '../../constants/enums';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskCounts {
  all:           number;
  pending:       number;
  completed:     number;
  highPriority:  number;
  overdue:       number;
  dueToday:      number;
}

interface FilterBarProps {
  activeFilter: FilterBy;
  counts:       TaskCounts;
  onSelect:     (filter: FilterBy) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const FILTERS: { filter: FilterBy; label: string; countKey: keyof TaskCounts }[] = [
  { filter: FilterBy.All,       label: 'All',        countKey: 'all'          },
  { filter: FilterBy.Pending,   label: 'Pending',    countKey: 'pending'      },
  { filter: FilterBy.Completed, label: 'Completed',  countKey: 'completed'    },
  { filter: FilterBy.HighPri,   label: 'High Pri',   countKey: 'highPriority' },
  { filter: FilterBy.DueToday,  label: 'Due Today',  countKey: 'dueToday'     },
  { filter: FilterBy.Overdue,   label: 'Overdue',    countKey: 'overdue'      },
];

// ─── Component ────────────────────────────────────────────────────────────────

const TaskFilterBar: React.FC<FilterBarProps> = ({ activeFilter, counts, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map(({ filter, label, countKey }) => {
        const isActive = activeFilter === filter;
        const count    = counts[countKey];
        return (
          <TouchableOpacity
            key={filter}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(filter)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
              {label}
            </Text>
            {count > 0 && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    flexDirection: 'row',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  pillLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary,
  },
  pillLabelActive: {
    color: COLORS.white,
    fontWeight: FONTS.semiBold,
  },

  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: COLORS.white + '33',
  },

  badgeText: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
  },
  badgeTextActive: {
    color: COLORS.white,
  },
});

export default TaskFilterBar;

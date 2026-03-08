/**
 * components/tasks/PrioritySelector.tsx
 *
 * Three-option priority picker used in AddTask and EditTask forms.
 * Renders three tappable pills (Low / Medium / High), highlights the selected one.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Priority } from '../../constants/enums';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrioritySelectorProps {
  value:    Priority;
  onChange: (priority: Priority) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const OPTIONS: { value: Priority; label: string; icon: string; color: string }[] = [
  { value: Priority.Low,    label: 'Low',    icon: 'arrow-down-circle-outline',   color: COLORS.priorityLow    },
  { value: Priority.Medium, label: 'Medium', icon: 'minus-circle-outline',        color: COLORS.priorityMedium },
  { value: Priority.High,   label: 'High',   icon: 'arrow-up-circle-outline',     color: COLORS.priorityHigh   },
];

// ─── Component ────────────────────────────────────────────────────────────────

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ value, onChange }) => {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              { borderColor: opt.color },
              isSelected && { backgroundColor: opt.color },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Icon
              name={opt.icon}
              size={16}
              color={isSelected ? COLORS.white : opt.color}
            />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
  },

  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  labelSelected: {
    color: COLORS.white,
  },
});

export default PrioritySelector;

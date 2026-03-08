/**
 * screens/tasks/EditTaskScreen.tsx
 *
 * Pre-populated task form. Loads the task from the Redux store by taskId,
 * pre-fills all fields, and dispatches updateTaskAsync on save.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useController, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';

import { EditTaskScreenProps } from '../../navigation/types';
import { selectTaskById } from '../../store/selectors/taskSelectors';
import useTasks from '../../hooks/useTasks';
import PrioritySelector from '../../components/tasks/PrioritySelector';
import AppButton from '../../components/common/AppButton';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Priority } from '../../constants/enums';
import { taskSchema, TaskFormValues } from '../../utils/validators';
import { Task } from '../../types/task.types';

// ─── Component ────────────────────────────────────────────────────────────────

const EditTaskScreen: React.FC<EditTaskScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { taskId } = route.params;

  const task = useSelector(selectTaskById(taskId)) as Task | undefined;
  const { editTask, isLoading } = useTasks();

  // Local state for fields not in Yup schema
  const [priority, setPriority]   = useState<Priority>(task?.priority ?? Priority.Medium);
  const [dateTime, setDateTime]   = useState<Date | null>(task?.dateTime ? new Date(task.dateTime) : null);
  const [deadline, setDeadline]   = useState<Date | null>(task?.deadline ? new Date(task.deadline) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState<'dateTime' | 'deadline'>('dateTime');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: yupResolver(taskSchema),
    defaultValues: {
      title:       task?.title       ?? '',
      description: task?.description ?? '',
      tagsRaw:     task?.tags.join(', ') ?? '',
    },
  });

  // Sync form if task changes (e.g. real-time update)
  useEffect(() => {
    if (task) {
      reset({
        title:       task.title,
        description: task.description,
        tagsRaw:     task.tags.join(', '),
      });
      setPriority(task.priority);
      setDateTime(task.dateTime  ? new Date(task.dateTime)  : null);
      setDeadline(task.deadline  ? new Date(task.deadline)  : null);
    }
  }, [task?.id]);

  if (!task) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Task not found</Text>
      </View>
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: TaskFormValues) => {
    const tags = (values.tagsRaw ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const ok = await editTask({
      id:          taskId,
      title:       values.title,
      description: values.description ?? '',
      priority,
      dateTime:    dateTime  ? dateTime.toISOString()  : null,
      deadline:    deadline  ? deadline.toISOString()  : null,
      tags,
    });

    if (ok) {
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    }
  };

  // ── Date picker helpers ───────────────────────────────────────────────────

  const openPicker = (field: 'dateTime' | 'deadline') => {
    setDateField(field);
    setShowDatePicker(true);
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;
    if (dateField === 'dateTime') setDateTime(selected);
    else setDeadline(selected);
  };

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not set';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
          <EditableField name="title" control={control} placeholder="What needs to be done?" error={errors.title?.message} />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <EditableField
            name="description"
            control={control}
            placeholder="Add details…"
            multiline
            inputStyle={styles.multilineInput}
          />
        </View>

        {/* Priority */}
        <View style={styles.field}>
          <Text style={styles.label}>Priority</Text>
          <PrioritySelector value={priority} onChange={setPriority} />
        </View>

        {/* Scheduled date-time */}
        <View style={styles.field}>
          <Text style={styles.label}>Scheduled Date & Time</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('dateTime')} activeOpacity={0.7}>
              <Icon name="calendar-clock" size={16} color={COLORS.primary} />
              <Text style={styles.dateBtnText}>{fmt(dateTime)}</Text>
            </TouchableOpacity>
            {dateTime && (
              <TouchableOpacity onPress={() => setDateTime(null)} style={styles.dateClear}>
                <Icon name="close-circle" size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Deadline */}
        <View style={styles.field}>
          <Text style={styles.label}>Deadline</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('deadline')} activeOpacity={0.7}>
              <Icon name="clock-alert-outline" size={16} color={COLORS.primary} />
              <Text style={styles.dateBtnText}>{fmt(deadline)}</Text>
            </TouchableOpacity>
            {deadline && (
              <TouchableOpacity onPress={() => setDeadline(null)} style={styles.dateClear}>
                <Icon name="close-circle" size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Tags <Text style={styles.hint}>(comma separated)</Text></Text>
          <EditableField name="tagsRaw" control={control} placeholder="work, urgent, personal…" />
        </View>

        <AppButton
          title="Save Changes"
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          style={{ marginTop: SPACING.md }}
        />
      </ScrollView>

      {/* Date picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dateField === 'dateTime' ? (dateTime ?? new Date()) : (deadline ?? new Date())}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  );
};

// ─── Controlled text field (extracted to keep JSX clean) ──────────────────────

const EditableField = ({
  name, control, placeholder, multiline = false, error, inputStyle,
}: {
  name: keyof TaskFormValues;
  control: any;
  placeholder?: string;
  multiline?: boolean;
  error?: string;
  inputStyle?: object;
}) => {
  const { field } = useController({ name, control });
  return (
    <>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline, error && fieldStyles.inputError, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDisabled}
        value={field.value as string}
        onChangeText={field.onChange}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {!!error && <Text style={fieldStyles.error}>{error}</Text>}
    </>
  );
};

const fieldStyles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    minHeight: 48,
  },
  multiline: { minHeight: 96, paddingTop: SPACING.sm },
  inputError: { borderColor: COLORS.danger },
  error: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: 4 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: FONTS.base, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerBtn: { padding: SPACING.xs, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },

  scroll: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: SPACING.base, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  field: { gap: SPACING.sm },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  required: { color: COLORS.danger },
  hint: { fontWeight: FONTS.regular, color: COLORS.textSecondary },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  dateBtnText: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary },
  dateClear: { padding: SPACING.xs },
});

export default EditTaskScreen;

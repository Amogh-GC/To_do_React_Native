/**
 * screens/tasks/AddTaskScreen.tsx
 *
 * Form to create a new task.
 * Opened via the centre tab-bar "+" button (modal presentation).
 *
 * Fields:
 *  - Title (required, max 120 chars — validated by taskSchema)
 *  - Description (optional, max 500 chars)
 *  - Priority selector (Low / Medium / High pill)
 *  - Scheduled date-time picker
 *  - Deadline date picker
 *  - Tags (comma-separated → rendered as dismissible chips)
 *
 * Validation:
 *  react-hook-form + Yup (taskSchema). Date fields are held in component state
 *  and verified manually (deadline must be in the future if set).
 *
 * On save:
 *  Calls useTasks().addTask() which dispatches an optimistic Redux action
 *  and syncs to Firestore via taskService.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useController, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import useAuth from '../../hooks/useAuth';
import useTasks from '../../hooks/useTasks';
import PrioritySelector from '../../components/tasks/PrioritySelector';
import AppButton from '../../components/common/AppButton';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Priority } from '../../constants/enums';
import { taskSchema, TaskFormValues } from '../../utils/validators';
import type { MainTabParamList } from '../../navigation/types';

type TabNav = BottomTabNavigationProp<MainTabParamList>;

// ─── Date formatting helper ───────────────────────────────────────────────────

const fmtDate = (d: Date | null, includeTime = true) => {
  if (!d) return 'Tap to set';
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return d.toLocaleDateString('en-US', opts);
};

// ─── Tag chip ─────────────────────────────────────────────────────────────────

const TagChip: React.FC<{ label: string; onRemove: () => void }> = ({
  label,
  onRemove,
}) => (
  <View style={chipStyles.chip}>
    <Text style={chipStyles.label} numberOfLines={1}>
      {label}
    </Text>
    <TouchableOpacity
      onPress={onRemove}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    >
      <Icon name="close" size={12} color={COLORS.primary} />
    </TouchableOpacity>
  </View>
);

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 140,
  },
  label: {
    fontSize: FONTS.xs,
    fontWeight: FONTS.semiBold,
    color: COLORS.primary,
    flexShrink: 1,
  },
});

// ─── Section card wrapper ─────────────────────────────────────────────────────

const Section: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
  required?: boolean;
}> = ({ icon, title, children, required }) => (
  <View style={sectionStyles.card}>
    <View style={sectionStyles.header}>
      <View style={sectionStyles.iconCircle}>
        <Icon name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={sectionStyles.title}>
        {title}
        {required && <Text style={sectionStyles.req}> *</Text>}
      </Text>
    </View>
    {children}
  </View>
);

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.base,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  req: { color: COLORS.danger },
});

// ─── Main component ───────────────────────────────────────────────────────────

const AddTaskScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<TabNav>();
  const { user }   = useAuth();
  const { addTask, isLoading } = useTasks();
  const scrollRef = useRef<ScrollView>(null);

  // ── State ──────────────────────────────────────────────────────────────────

  const [priority,  setPriority]  = useState<Priority>(Priority.Medium);
  const [dateTime,  setDateTime]  = useState<Date | null>(null);
  const [deadline,  setDeadline]  = useState<Date | null>(null);
  const [deadlineError, setDeadlineError] = useState('');

  // iOS date picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField,   setPickerField]   = useState<'dateTime' | 'deadline'>('dateTime');
  const [pickerTempVal, setPickerTempVal] = useState(new Date());

  // Android picker (renders inline when visible)
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [androidPickerField,   setAndroidPickerField]   = useState<'dateTime' | 'deadline'>('dateTime');

  // Tags: stored as an array; user types into tagsRaw then we parse chips
  const [tags, setTags] = useState<string[]>([]);

  // ── Form ───────────────────────────────────────────────────────────────────

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TaskFormValues>({
    resolver: yupResolver(taskSchema),
    defaultValues: { title: '', description: '', tagsRaw: '' },
  });

  const titleValue = useWatch({ control, name: 'title' }) as string ?? '';
  const descValue  = useWatch({ control, name: 'description' }) as string ?? '';

  // ── Confirm discard ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isDirty || tags.length > 0 || dateTime || deadline) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Leave without saving?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.navigate('TasksTab'),
          },
        ],
      );
    } else {
      navigation.navigate('TasksTab');
    }
  }, [isDirty, tags, dateTime, deadline, navigation]);

  // ── Tag management ─────────────────────────────────────────────────────────

  const handleTagsRawBlur = (raw: string) => {
    const parsed = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    setTags((prev) => {
      const merged = [...prev];
      parsed.forEach((t) => {
        if (!merged.includes(t)) merged.push(t);
      });
      return merged;
    });
  };

  const removeTag = (idx: number) =>
    setTags((prev) => prev.filter((_, i) => i !== idx));

  // ── Date picker helpers ────────────────────────────────────────────────────

  const openPicker = (field: 'dateTime' | 'deadline') => {
    const current = field === 'dateTime' ? dateTime : deadline;
    if (Platform.OS === 'ios') {
      setPickerField(field);
      setPickerTempVal(current ?? new Date());
      setPickerVisible(true);
    } else {
      setAndroidPickerField(field);
      setAndroidPickerVisible(true);
    }
  };

  const confirmIOSPicker = () => {
    setPickerVisible(false);
    if (pickerField === 'dateTime') {
      setDateTime(pickerTempVal);
    } else {
      setDeadline(pickerTempVal);
      setDeadlineError('');
    }
  };

  const onAndroidChange = (_: unknown, selected?: Date) => {
    setAndroidPickerVisible(false);
    if (!selected) return;
    if (androidPickerField === 'dateTime') {
      setDateTime(selected);
    } else {
      setDeadline(selected);
      setDeadlineError('');
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: TaskFormValues) => {
    if (!user?.uid) return;

    // Manually validate deadline (must be in the future)
    if (deadline && deadline <= new Date()) {
      setDeadlineError('Deadline must be in the future');
      return;
    }
    setDeadlineError('');

    // Merge tagsRaw field value with the chips array
    const rawExtra = (values.tagsRaw ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const allTags = [...new Set([...tags, ...rawExtra])];

    const ok = await addTask(user.uid, {
      title:       values.title.trim(),
      description: (values.description ?? '').trim(),
      priority,
      dateTime:    dateTime ? dateTime.toISOString() : null,
      deadline:    deadline  ? deadline.toISOString()  : null,
      tags:        allTags,
    });

    if (ok) {
      reset();
      setPriority(Priority.Medium);
      setDateTime(null);
      setDeadline(null);
      setTags([]);
      navigation.navigate('TasksTab');
    } else {
      Alert.alert('Error', 'Could not create task. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Gradient header ────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Close"
        >
          <Icon name="close" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Task</Text>
          <Text style={styles.headerSub}>Fill in the details below</Text>
        </View>

        {/* Spacer to balance the close button */}
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Section icon="format-title" title="Title" required>
            <TitleField
              control={control}
              error={errors.title?.message}
              maxLength={120}
              currentLength={titleValue.length}
            />
          </Section>

          {/* Description */}
          <Section icon="text" title="Description">
            <DescriptionField
              control={control}
              maxLength={500}
              currentLength={descValue.length}
            />
          </Section>

          {/* Priority */}
          <Section icon="flag-outline" title="Priority">
            <PrioritySelector value={priority} onChange={setPriority} />
          </Section>

          {/* Scheduled date-time */}
          <Section icon="calendar-clock" title="Scheduled Date & Time">
            <DatePickerRow
              value={dateTime}
              iconName="calendar-clock"
              placeholder="No scheduled time"
              onPress={() => openPicker('dateTime')}
              onClear={() => setDateTime(null)}
            />
          </Section>

          {/* Deadline */}
          <Section icon="clock-alert-outline" title="Deadline">
            <DatePickerRow
              value={deadline}
              iconName="alarm"
              placeholder="No deadline set"
              onPress={() => openPicker('deadline')}
              onClear={() => { setDeadline(null); setDeadlineError(''); }}
              error={deadlineError}
            />
          </Section>

          {/* Tags */}
          <Section icon="tag-outline" title="Tags">
            {/* Existing chips */}
            {tags.length > 0 && (
              <View style={styles.chipsRow}>
                {tags.map((tag, idx) => (
                  <TagChip
                    key={`${tag}-${idx}`}
                    label={tag}
                    onRemove={() => removeTag(idx)}
                  />
                ))}
              </View>
            )}
            <TagsField
              control={control}
              onBlur={handleTagsRawBlur}
            />
            <Text style={styles.tagsHint}>
              Type tags separated by commas, then tap away to add them
            </Text>
          </Section>

          {/* Submit */}
          <AppButton
            title="Create Task"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── iOS date picker modal ───────────────────────────────────────────── */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>
              {pickerField === 'dateTime' ? 'Scheduled Time' : 'Deadline'}
            </Text>
            <TouchableOpacity onPress={confirmIOSPicker}>
              <Text style={styles.pickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerTempVal}
            mode={pickerField === 'deadline' ? 'date' : 'datetime'}
            display="spinner"
            onChange={(_, d) => d && setPickerTempVal(d)}
            minimumDate={new Date()}
            textColor={COLORS.textPrimary}
          />
        </View>
      </Modal>

      {/* ── Android date picker ─────────────────────────────────────────────── */}
      {androidPickerVisible && (
        <DateTimePicker
          value={
            androidPickerField === 'dateTime'
              ? (dateTime ?? new Date())
              : (deadline ?? new Date())
          }
          mode={androidPickerField === 'deadline' ? 'date' : 'datetime'}
          display="default"
          onChange={onAndroidChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

// ─── Controlled field sub-components ─────────────────────────────────────────

/** Title input with character counter */
const TitleField: React.FC<{
  control: any;
  error?: string;
  maxLength: number;
  currentLength: number;
}> = ({ control, error, maxLength, currentLength }) => {
  const { field } = useController({ name: 'title', control });
  const near = currentLength >= maxLength * 0.85;
  return (
    <View>
      <TextInput
        style={[fieldStyles.input, !!error && fieldStyles.inputError]}
        placeholder="What needs to be done?"
        placeholderTextColor={COLORS.textDisabled}
        value={field.value as string}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        maxLength={maxLength}
        returnKeyType="next"
        autoCapitalize="sentences"
        accessibilityLabel="Task title"
      />
      <View style={fieldStyles.counterRow}>
        {!!error ? (
          <Text style={fieldStyles.errorText}>{error}</Text>
        ) : (
          <View />
        )}
        <Text style={[fieldStyles.counter, near && fieldStyles.counterNear]}>
          {currentLength}/{maxLength}
        </Text>
      </View>
    </View>
  );
};

/** Description textarea with character counter */
const DescriptionField: React.FC<{
  control: any;
  maxLength: number;
  currentLength: number;
}> = ({ control, maxLength, currentLength }) => {
  const { field } = useController({ name: 'description', control });
  const near = currentLength >= maxLength * 0.85;
  return (
    <View>
      <TextInput
        style={[fieldStyles.input, fieldStyles.multiline]}
        placeholder="Add notes or details…"
        placeholderTextColor={COLORS.textDisabled}
        value={field.value as string}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={maxLength}
        accessibilityLabel="Task description"
      />
      <View style={fieldStyles.counterRow}>
        <View />
        <Text style={[fieldStyles.counter, near && fieldStyles.counterNear]}>
          {currentLength}/{maxLength}
        </Text>
      </View>
    </View>
  );
};

/** Tags raw text field — triggers onBlur parse */
const TagsField: React.FC<{
  control: any;
  onBlur: (val: string) => void;
}> = ({ control, onBlur }) => {
  const { field } = useController({ name: 'tagsRaw', control });
  return (
    <TextInput
      style={fieldStyles.input}
      placeholder="work, urgent, personal…"
      placeholderTextColor={COLORS.textDisabled}
      value={field.value as string}
      onChangeText={field.onChange}
      onBlur={() => {
        field.onBlur();
        onBlur(field.value as string);
        field.onChange('');           // clear the raw input after chips are created
      }}
      returnKeyType="done"
      autoCapitalize="none"
      accessibilityLabel="Task tags"
    />
  );
};

/** Date row with icon button + optional clear */
const DatePickerRow: React.FC<{
  value: Date | null;
  iconName: string;
  placeholder: string;
  onPress: () => void;
  onClear: () => void;
  error?: string;
}> = ({ value, iconName, placeholder, onPress, onClear, error }) => (
  <View>
    <View style={fieldStyles.dateRow}>
      <TouchableOpacity
        style={[fieldStyles.dateBtn, !!value && fieldStyles.dateBtnActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon
          name={iconName}
          size={17}
          color={value ? COLORS.primary : COLORS.textSecondary}
        />
        <Text
          style={[fieldStyles.dateBtnText, !!value && fieldStyles.dateBtnTextActive]}
          numberOfLines={1}
        >
          {value ? fmtDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
      {!!value && (
        <TouchableOpacity onPress={onClear} style={fieldStyles.dateClear}>
          <Icon name="close-circle" size={18} color={COLORS.textDisabled} />
        </TouchableOpacity>
      )}
    </View>
    {!!error && <Text style={fieldStyles.errorText}>{error}</Text>}
  </View>
);

// ─── Field styles ─────────────────────────────────────────────────────────────

const fieldStyles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs + 2,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    minHeight: 48,
  },
  inputError: { borderColor: COLORS.danger },
  multiline:  { minHeight: 96, paddingTop: SPACING.sm },

  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 16,
  },
  counter:     { fontSize: FONTS.xs, color: COLORS.textDisabled },
  counterNear: { color: COLORS.warning },
  errorText:   { fontSize: FONTS.xs, color: COLORS.danger },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  dateBtnActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dateBtnText:       { flex: 1, fontSize: FONTS.base, color: COLORS.textSecondary },
  dateBtnTextActive: { color: COLORS.primary, fontWeight: FONTS.medium },
  dateClear:         { padding: SPACING.xs },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.lg,
  },
  headerBtn: { width: 36, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
  headerSub: {
    fontSize: FONTS.xs,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },

  // ── Form ──
  scroll:      { flex: 1 },
  formContent: { padding: SPACING.base, gap: SPACING.md, paddingBottom: SPACING.xxxl },

  // ── Tags ──
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagsHint: {
    fontSize: FONTS.xs,
    color: COLORS.textDisabled,
    lineHeight: 16,
  },

  // ── Submit ──
  submitBtn: { marginTop: SPACING.sm },

  // ── iOS picker sheet ──
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.sm,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.xs,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  pickerTitle:  { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  pickerCancel: { fontSize: FONTS.base, color: COLORS.textSecondary },
  pickerDone:   { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.primary },
});

export default AddTaskScreen;

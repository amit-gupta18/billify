import { useEffect, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lineItemSchema } from '@/lib/validation';
import type { LineItem } from '@/types/invoice';
import { z } from 'zod';
import { MoneyInput } from '@/components/MoneyInput';
import { colors, radii, spacing, typography } from '@/theme/ui';

const formSchema = lineItemSchema;
type FormValues = z.infer<typeof formSchema>;

type Props = {
  visible: boolean;
  initial?: Partial<LineItem>;
  defaultUnit: string;
  defaultGstRate: number;
  onClose: () => void;
  onSave: (values: Omit<LineItem, 'id'>) => void;
};

export function ItemEditorModal({
  visible,
  initial,
  defaultUnit,
  defaultGstRate,
  onClose,
  onSave,
}: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      hsnSac: '',
      quantity: 1,
      unit: defaultUnit,
      rate: 0,
      gstRatePercent: defaultGstRate,
    },
  });

  useEffect(() => {
    if (!visible) return;
    reset({
      description: initial?.description ?? '',
      hsnSac: initial?.hsnSac ?? '',
      quantity: initial?.quantity ?? 1,
      unit: initial?.unit ?? defaultUnit,
      rate: initial?.rate ?? 0,
      gstRatePercent: initial?.gstRatePercent ?? defaultGstRate,
    });
  }, [visible, initial, defaultUnit, defaultGstRate, reset]);

  const submit = handleSubmit((values) => {
    onSave(values);
    onClose();
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{initial?.description ? 'Edit item' : 'Add item'}</Text>
          <Pressable onPress={() => void submit()}>
            <Text style={styles.save}>Save</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="Description" error={errors.description?.message}>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Goods or services"
                  multiline
                />
              )}
            />
          </Field>
          <Field label="HSN / SAC" error={errors.hsnSac?.message}>
            <Controller
              control={control}
              name="hsnSac"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  placeholder="4, 6 or 8 digits"
                />
              )}
            />
          </Field>
          <View style={styles.row2}>
            <View style={styles.flex}>
              <Field label="Qty" error={errors.quantity?.message}>
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      value={String(value)}
                      onChangeText={(t) => {
                        const n = parseFloat(t);
                        onChange(Number.isFinite(n) ? n : 0);
                      }}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </Field>
            </View>
            <View style={styles.flex}>
              <Field label="Unit" error={errors.unit?.message}>
                <Controller
                  control={control}
                  name="unit"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} />
                  )}
                />
              </Field>
            </View>
          </View>
          <Field label="Rate (₹)" error={errors.rate?.message}>
            <Controller
              control={control}
              name="rate"
              render={({ field: { onChange, value } }) => (
                <MoneyInput valuePaise={value} onChangePaise={onChange} error={errors.rate?.message} />
              )}
            />
          </Field>
          <Field label="GST %" error={errors.gstRatePercent?.message}>
            <Controller
              control={control}
              name="gstRatePercent"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={String(value)}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    onChange(Number.isFinite(n) ? n : 0);
                  }}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                />
              )}
            />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: typography.subtitle,
  cancel: { color: colors.textMuted, fontSize: 16 },
  save: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  form: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
  field: { gap: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
  },
  row2: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, fontSize: 12, marginTop: 2 },
});

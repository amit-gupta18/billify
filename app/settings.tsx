import { ScrollView, View, Text, TextInput, StyleSheet, Pressable, Alert, type TextInputProps } from 'react-native';
import { useForm, useWatch, Controller, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { StatePicker } from '@/components/StatePicker';
import { invoiceNoSchema, sellerGstinSchema, sellerStateSchema } from '@/lib/validation';
import { formatSerial } from '@/lib/serial';
import { editableAddressParts, joinAddress, singleLineName } from '@/lib/address';
import { colors, radii, spacing, typography } from '@/theme/ui';

const wholeNumber = (min: number, max?: number) => {
  const base = z.number({ error: 'Enter a number' }).int('Enter a whole number').min(min, `Must be at least ${min}`);
  return max === undefined ? base : base.max(max, `Must be at most ${max}`);
};

const sellerFormSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Company name is required').max(120),
    tradeName: z.string().max(120).optional(),
    phone: z.string().max(20).optional(),
    gstin: sellerGstinSchema,
    addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(120),
    addressLine2: z.string().max(120).optional(),
    city: z.string().trim().min(1, 'City is required').max(60),
    pincode: z
      .string()
      .refine((v) => v.trim() === '' || /^\d{6}$/.test(v.trim()), 'PIN code must be 6 digits')
      .optional(),
    stateCode: sellerStateSchema,
    declaration: z.string().min(1, 'Declaration is required').max(1000),
    accountHolderName: z.string().max(120).optional(),
    bankName: z.string().max(120).optional(),
    accountNumber: z.string().max(40).optional(),
    branchAndIfsc: z.string().max(120).optional(),
    serialPrefix: z
      .string()
      .max(12, 'Prefix is too long')
      .regex(/^[A-Za-z0-9\-/]*$/, 'Use letters, numbers, - or /'),
    nextSerial: wholeNumber(1),
    serialPadding: wholeNumber(1, 8),
    defaultUnit: z.string().min(1, 'Unit is required').max(8),
    defaultGstRatePercent: z.number({ error: 'Enter a number' }).min(0).max(28),
    defaultPaymentTerms: z.string().min(1, 'Payment terms are required').max(80),
  })
  .refine((v) => invoiceNoSchema.safeParse(formatSerial(v)).success, {
    path: ['serialPrefix'],
    message: 'Invoice number would be longer than 16 characters',
  });

type FormValues = z.infer<typeof sellerFormSchema>;

const FIELD_LABELS: Partial<Record<keyof FormValues, string>> = {
  businessName: 'Company name',
  gstin: 'GSTIN',
  addressLine1: 'Address line 1',
  city: 'City',
  pincode: 'PIN code',
  stateCode: 'State',
  serialPrefix: 'Invoice prefix',
  nextSerial: 'Next invoice number',
  serialPadding: 'Digits',
};

function formValuesFromStore(
  seller: ReturnType<typeof useAppStore.getState>['seller'],
  settings: ReturnType<typeof useAppStore.getState>['settings'],
): FormValues {
  return {
    businessName: singleLineName(seller.businessName),
    tradeName: seller.tradeName ?? '',
    phone: seller.phone ?? '',
    gstin: seller.gstin,
    ...editableAddressParts(seller),
    stateCode: seller.stateCode,
    declaration: seller.declaration,
    accountHolderName: seller.bank?.accountHolderName ?? '',
    bankName: seller.bank?.bankName ?? '',
    accountNumber: seller.bank?.accountNumber ?? '',
    branchAndIfsc: seller.bank?.branchAndIfsc ?? '',
    serialPrefix: settings.serialPrefix,
    nextSerial: settings.nextSerial,
    serialPadding: settings.serialPadding,
    defaultUnit: settings.defaultUnit,
    defaultGstRatePercent: settings.defaultGstRatePercent,
    defaultPaymentTerms: settings.defaultPaymentTerms,
  };
}

export default function SettingsScreen() {
  const seller = useAppStore((s) => s.seller);
  const settings = useAppStore((s) => s.settings);
  const updateSeller = useAppStore((s) => s.updateSeller);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const insets = useSafeAreaInsets();

  const defaultValues = useMemo(
    () => formValuesFromStore(seller, settings),
    [seller, settings],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(sellerFormSchema) as import('react-hook-form').Resolver<FormValues>,
    defaultValues,
  });

  useFocusEffect(
    useCallback(() => {
      reset(formValuesFromStore(seller, settings));
    }, [seller, settings, reset]),
  );

  const [serialPrefix, nextSerial, serialPadding] = useWatch({
    control,
    name: ['serialPrefix', 'nextSerial', 'serialPadding'],
  });
  const nextInvoiceNo =
    Number.isInteger(nextSerial) && Number.isInteger(serialPadding) && nextSerial >= 1 && serialPadding >= 1
      ? formatSerial({ serialPrefix: serialPrefix ?? '', nextSerial, serialPadding: Math.min(serialPadding, 8) })
      : '—';

  const onSubmit = handleSubmit(
    (data) => {
      const addressParts = {
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2?.trim() ?? '',
        city: data.city.trim(),
        pincode: data.pincode?.trim() ?? '',
        stateCode: data.stateCode,
      };
      updateSeller({
        businessName: singleLineName(data.businessName),
        tradeName: data.tradeName?.trim(),
        ...addressParts,
        address: joinAddress(addressParts),
        gstin: data.gstin.trim().toUpperCase(),
        phone: data.phone?.trim(),
        declaration: data.declaration.trim(),
        bank: {
          accountHolderName: data.accountHolderName?.trim() ?? '',
          bankName: data.bankName?.trim() ?? '',
          accountNumber: data.accountNumber?.trim() ?? '',
          branchAndIfsc: data.branchAndIfsc?.trim() ?? '',
        },
      });
      updateSettings({
        serialPrefix: data.serialPrefix.trim(),
        nextSerial: data.nextSerial,
        serialPadding: data.serialPadding,
        defaultUnit: data.defaultUnit.trim(),
        defaultGstRatePercent: data.defaultGstRatePercent,
        defaultPaymentTerms: data.defaultPaymentTerms.trim(),
      });
      Alert.alert('Settings saved', `Next new invoice will be ${formatSerial(data)}.`);
    },
    (fieldErrors: FieldErrors<FormValues>) => {
      const messages = (Object.keys(fieldErrors) as (keyof FormValues)[])
        .map((key) => {
          const msg = fieldErrors[key]?.message;
          return msg ? `${FIELD_LABELS[key] ?? key}: ${msg}` : null;
        })
        .filter(Boolean);
      Alert.alert('Please fix these fields', messages.slice(0, 8).join('\n'));
    },
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xl + insets.bottom }]}
      keyboardShouldPersistTaps="always"
    >
      <Section title="Company">
        <TextField control={control} errors={errors} name="businessName" label="Company name" placeholder="Registered business name" />
        <TextField control={control} errors={errors} name="tradeName" label="Trade name (optional)" />
        <TextField control={control} errors={errors} name="phone" label="Phone" keyboardType="phone-pad" placeholder="+91 98765 43210" />
        <TextField
          control={control}
          errors={errors}
          name="gstin"
          label="GST number (GSTIN)"
          autoCapitalize="characters"
          maxLength={15}
          transform={(t) => t.toUpperCase()}
          placeholder="15-character GSTIN"
        />
      </Section>

      <Section title="Billing address">
        <Text style={styles.hint}>Printed under your company name in the “Billing from” box.</Text>
        <TextField control={control} errors={errors} name="addressLine1" label="Address line 1" placeholder="Shop / building, street" />
        <TextField control={control} errors={errors} name="addressLine2" label="Address line 2 (optional)" placeholder="Area, landmark" />
        <View style={styles.row2}>
          <View style={styles.flex}>
            <TextField control={control} errors={errors} name="city" label="City" />
          </View>
          <View style={styles.flex}>
            <TextField control={control} errors={errors} name="pincode" label="PIN code" keyboardType="number-pad" maxLength={6} />
          </View>
        </View>
        <Controller
          control={control}
          name="stateCode"
          render={({ field: { onChange, value } }) => (
            <StatePicker value={value} onChange={onChange} error={errors.stateCode?.message} />
          )}
        />
      </Section>

      <Section title="Invoice numbering">
        <TextField
          control={control}
          errors={errors}
          name="serialPrefix"
          label="Prefix"
          autoCapitalize="characters"
          transform={(t) => t.toUpperCase()}
          placeholder="e.g. ME26"
        />
        <View style={styles.row2}>
          <View style={styles.flex}>
            <NumberField control={control} errors={errors} name="nextSerial" label="Next number" />
          </View>
          <View style={styles.flex}>
            <NumberField control={control} errors={errors} name="serialPadding" label="Digits" />
          </View>
        </View>
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Next new invoice</Text>
          <Text style={styles.previewValue}>{nextInvoiceNo}</Text>
        </View>
      </Section>

      <Section title="Bank account details">
        <Text style={styles.hint}>Printed in the “Bank Details” box above the invoice footer.</Text>
        <TextField control={control} errors={errors} name="accountHolderName" label="Account holder name" />
        <TextField control={control} errors={errors} name="bankName" label="Bank name" />
        <TextField control={control} errors={errors} name="accountNumber" label="Account number" keyboardType="number-pad" />
        <TextField control={control} errors={errors} name="branchAndIfsc" label="Branch & IFSC" autoCapitalize="characters" />
      </Section>

      <Section title="Invoice defaults">
        <TextField control={control} errors={errors} name="defaultUnit" label="Default unit" />
        <NumberField control={control} errors={errors} name="defaultGstRatePercent" label="Default GST %" decimal />
        <TextField control={control} errors={errors} name="defaultPaymentTerms" label="Default payment terms" />
        <TextField control={control} errors={errors} name="declaration" label="Declaration" multiline />
      </Section>

      <Pressable
        style={[styles.saveBtn, !isDirty && styles.saveBtnMuted]}
        onPress={() => {
          void onSubmit();
        }}
      >
        <Text style={styles.saveText}>Save changes</Text>
      </Pressable>
    </ScrollView>
  );
}

type StringKey = {
  [K in keyof FormValues]-?: FormValues[K] extends string | undefined ? K : never;
}[keyof FormValues];

type NumberKey = {
  [K in keyof FormValues]-?: FormValues[K] extends number ? K : never;
}[keyof FormValues];

function TextField({
  control,
  errors,
  name,
  label,
  transform,
  multiline,
  ...inputProps
}: {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  name: StringKey;
  label: string;
  transform?: (text: string) => string;
} & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'maxLength' | 'placeholder' | 'multiline'>) {
  return (
    <Field label={label} error={errors[name]?.message}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, multiline && styles.multiline, errors[name] && styles.inputError]}
            value={value ?? ''}
            onChangeText={(t) => onChange(transform ? transform(t) : t)}
            onBlur={onBlur}
            multiline={multiline}
            placeholderTextColor={colors.textMuted}
            {...inputProps}
          />
        )}
      />
    </Field>
  );
}

/** Numeric input that can be cleared while typing; an empty box is stored as NaN and fails validation. */
function NumberField({
  control,
  errors,
  name,
  label,
  decimal,
}: {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  name: NumberKey;
  label: string;
  decimal?: boolean;
}) {
  return (
    <Field label={label} error={errors[name]?.message}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.inputError]}
            value={Number.isNaN(value) ? '' : String(value)}
            onChangeText={(t) => {
              const cleaned = t.replace(decimal ? /[^\d.]/g : /\D/g, '');
              onChange(cleaned === '' ? NaN : decimal ? parseFloat(cleaned) : parseInt(cleaned, 10));
            }}
            onBlur={onBlur}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          />
        )}
      />
    </Field>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
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
  container: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.subtitle, marginBottom: 4 },
  hint: { ...typography.caption, marginTop: -4, marginBottom: 4 },
  field: { marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inputError: { borderColor: colors.danger },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  previewLabel: { ...typography.caption, color: colors.primary },
  previewValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnMuted: { opacity: 0.85 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/store/useAppStore';
import { StatePicker } from '@/components/StatePicker';
import { sellerGstinSchema, sellerStateSchema } from '@/lib/validation';
import { colors, radii, spacing, typography } from '@/theme/ui';

const sellerFormSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(120),
  tradeName: z.string().max(120).optional(),
  address: z.string().min(1, 'Address is required').max(500),
  gstin: sellerGstinSchema,
  phone: z.string().max(20).optional(),
  stateCode: sellerStateSchema,
  declaration: z.string().min(1).max(1000),
  accountHolderName: z.string().max(120).optional(),
  bankName: z.string().max(120).optional(),
  accountNumber: z.string().max(40).optional(),
  branchAndIfsc: z.string().max(120).optional(),
  serialPrefix: z.string().min(1).max(12),
  nextSerial: z.number().int().min(1),
  serialPadding: z.number().int().min(1).max(8),
  defaultUnit: z.string().min(1).max(8),
  defaultGstRatePercent: z.number().min(0).max(28),
  defaultPaymentTerms: z.string().min(1).max(80),
});

type FormValues = z.infer<typeof sellerFormSchema>;

export default function SettingsScreen() {
  const seller = useAppStore((s) => s.seller);
  const settings = useAppStore((s) => s.settings);
  const updateSeller = useAppStore((s) => s.updateSeller);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(sellerFormSchema) as import('react-hook-form').Resolver<FormValues>,
    values: {
      businessName: seller.businessName,
      tradeName: seller.tradeName ?? '',
      address: seller.address,
      gstin: seller.gstin,
      phone: seller.phone ?? '',
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
    },
  });

  const onSubmit = handleSubmit((data) => {
    updateSeller({
      businessName: data.businessName.trim(),
      tradeName: data.tradeName?.trim(),
      address: data.address.trim(),
      gstin: data.gstin.trim().toUpperCase(),
      phone: data.phone?.trim(),
      stateCode: data.stateCode,
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
  });

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Section title="Seller profile">
        <Field label="Business name" error={errors.businessName?.message}>
          <Controller
            control={control}
            name="businessName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} />
            )}
          />
        </Field>
        <Field label="Trade name (optional)" error={errors.tradeName?.message}>
          <Controller
            control={control}
            name="tradeName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} />
            )}
          />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.multiline]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
              />
            )}
          />
        </Field>
        <Field label="GSTIN" error={errors.gstin?.message}>
          <Controller
            control={control}
            name="gstin"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={(t) => onChange(t.toUpperCase())}
                onBlur={onBlur}
                autoCapitalize="characters"
                maxLength={15}
              />
            )}
          />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" />
            )}
          />
        </Field>
        <Controller
          control={control}
          name="stateCode"
          render={({ field: { onChange, value } }) => (
            <StatePicker value={value} onChange={onChange} error={errors.stateCode?.message} />
          )}
        />
        <Field label="Declaration" error={errors.declaration?.message}>
          <Controller
            control={control}
            name="declaration"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.multiline]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
              />
            )}
          />
        </Field>
      </Section>

      <Section title="Bank details">
        {(['accountHolderName', 'bankName', 'accountNumber', 'branchAndIfsc'] as const).map((key) => (
          <Field
            key={key}
            label={key === 'branchAndIfsc' ? 'Branch & IFSC' : key.replace(/([A-Z])/g, ' $1')}
            error={errors[key]?.message}
          >
            <Controller
              control={control}
              name={key}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} />
              )}
            />
          </Field>
        ))}
      </Section>

      <Section title="Invoice defaults">
        <Field label="Serial prefix" error={errors.serialPrefix?.message}>
          <Controller
            control={control}
            name="serialPrefix"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
            )}
          />
        </Field>
        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field label="Next serial" error={errors.nextSerial?.message}>
              <Controller
                control={control}
                name="nextSerial"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={String(value)}
                    onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                  />
                )}
              />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label="Padding" error={errors.serialPadding?.message}>
              <Controller
                control={control}
                name="serialPadding"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={String(value)}
                    onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                  />
                )}
              />
            </Field>
          </View>
        </View>
        <Field label="Default unit" error={errors.defaultUnit?.message}>
          <Controller
            control={control}
            name="defaultUnit"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} />
            )}
          />
        </Field>
        <Field label="Default GST %" error={errors.defaultGstRatePercent?.message}>
          <Controller
            control={control}
            name="defaultGstRatePercent"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={String(value)}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                onBlur={onBlur}
                keyboardType="decimal-pad"
              />
            )}
          />
        </Field>
        <Field label="Default payment terms" error={errors.defaultPaymentTerms?.message}>
          <Controller
            control={control}
            name="defaultPaymentTerms"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} />
            )}
          />
        </Field>
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
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnMuted: { opacity: 0.85 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

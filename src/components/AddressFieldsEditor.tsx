import type { ReactNode } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { StatePicker } from '@/components/StatePicker';
import { editableAddressParts, joinAddress } from '@/lib/address';
import type { AddressFields } from '@/types/invoice';
import { colors, spacing, typography } from '@/theme/ui';

type Party = AddressFields & { address: string; stateCode: string };

type Props = {
  value: Party;
  readOnly: boolean;
  /** Receives every structured part plus the re-joined `address`, so legacy one-line data is migrated on first edit. */
  onChange: (patch: Required<AddressFields> & { address: string; stateCode: string }) => void;
};

/** Address line 1 / line 2 / city / PIN / state inputs for an invoice party. */
export function AddressFieldsEditor({ value, readOnly, onChange }: Props) {
  const parts = editableAddressParts(value);

  const update = (patch: Partial<AddressFields> & { stateCode?: string }) => {
    const next = { ...parts, stateCode: value.stateCode, ...patch };
    onChange({ ...next, address: joinAddress(next) });
  };

  return (
    <>
      <Field label="Address line 1">
        <TextInput
          style={styles.input}
          editable={!readOnly}
          value={parts.addressLine1}
          onChangeText={(addressLine1) => update({ addressLine1 })}
          placeholder="Shop / building, street"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Address line 2 (optional)">
        <TextInput
          style={styles.input}
          editable={!readOnly}
          value={parts.addressLine2}
          onChangeText={(addressLine2) => update({ addressLine2 })}
          placeholder="Area, landmark"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <View style={styles.row2}>
        <View style={styles.flex}>
          <Field label="City">
            <TextInput
              style={styles.input}
              editable={!readOnly}
              value={parts.city}
              onChangeText={(city) => update({ city })}
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="PIN code">
            <TextInput
              style={styles.input}
              editable={!readOnly}
              value={parts.pincode}
              onChangeText={(pincode) => update({ pincode: pincode.replace(/\D/g, '') })}
              keyboardType="number-pad"
              maxLength={6}
            />
          </Field>
        </View>
      </View>
      <View style={styles.field} pointerEvents={readOnly ? 'none' : 'auto'}>
        <StatePicker value={value.stateCode} onChange={(stateCode) => update({ stateCode })} />
      </View>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row2: { flexDirection: 'row', gap: spacing.md },
  field: { marginBottom: spacing.sm + 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
});

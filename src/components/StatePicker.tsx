import { useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { GST_STATES } from '@/lib/states';
import { colors, radii, spacing, typography } from '@/theme/ui';

type Props = {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  error?: string;
};

export function StatePicker({ value, onChange, label = 'State', error }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = GST_STATES.find((s) => s.code === value);
  const filtered = GST_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.code.includes(query),
  );

  return (
    <>
      <Text style={typography.label}>{label}</Text>
      <Pressable style={[styles.trigger, error ? styles.triggerError : null]} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected ? `${selected.code} — ${selected.name}` : 'Select state'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={typography.subtitle}>Select state</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search…"
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={colors.textMuted}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.option, item.code === value && styles.optionSelected]}
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <Text style={styles.optionCode}>{item.code}</Text>
                <Text style={styles.optionName}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  triggerError: { borderColor: colors.danger },
  value: { fontSize: 16, color: colors.text },
  placeholder: { fontSize: 16, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  done: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  search: {
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
  },
  option: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.primaryMuted },
  optionCode: { width: 28, fontWeight: '700', color: colors.text },
  optionName: { flex: 1, color: colors.text },
});

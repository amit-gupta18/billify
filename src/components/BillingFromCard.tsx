import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { addressLines, singleLineName } from '@/lib/address';
import { colors, radii, spacing, typography } from '@/theme/ui';

/** Seller block as it prints in the invoice "Billing from" box, with a shortcut to edit it in Settings. */
export function BillingFromCard() {
  const seller = useAppStore((s) => s.seller);
  const name = singleLineName(seller.businessName);
  const lines = addressLines(seller);
  const missing = !name || lines.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Billing from</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityLabel="Edit billing from in Settings">
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>
      {name ? <Text style={styles.name}>{name}</Text> : null}
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      {seller.phone?.trim() ? <Text style={styles.line}>Phone : {seller.phone.trim()}</Text> : null}
      {seller.gstin?.trim() ? <Text style={styles.line}>GSTIN/UIN : {seller.gstin.trim()}</Text> : null}
      {missing ? (
        <Text style={styles.warn}>
          {name ? 'Add your billing address' : 'Add your company name and address'} — tap Edit.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: typography.label,
  edit: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  name: { ...typography.subtitle, textTransform: 'uppercase' },
  line: { fontSize: 14, color: colors.text },
  warn: { fontSize: 13, color: colors.danger, marginTop: 4 },
});

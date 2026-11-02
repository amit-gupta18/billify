import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Totals } from '@/lib/gst';
import { formatMoney } from '@/lib/gst';
import { colors, spacing, typography, radii } from '@/theme/ui';

type Props = {
  totals: Totals;
  onPreview?: () => void;
  previewDisabled?: boolean;
};

export function TotalsFooter({ totals, onPreview, previewDisabled }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
      <View style={styles.rows}>
        <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
        {totals.supplyType === 'inter' ? (
          <Row label="IGST" value={formatMoney(totals.igst)} />
        ) : (
          <>
            <Row label="CGST" value={formatMoney(totals.cgst)} />
            <Row label="SGST" value={formatMoney(totals.sgst)} />
          </>
        )}
        <View style={styles.divider} />
        <Row label="Grand total" value={`₹ ${formatMoney(totals.grandTotal)}`} bold />
      </View>
      {onPreview ? (
        <Pressable
          style={[styles.preview, previewDisabled && styles.previewDisabled]}
          onPress={onPreview}
          disabled={previewDisabled}
        >
          <Text style={styles.previewText}>Preview</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rows: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: typography.caption,
  value: { ...typography.body, fontSize: 15 },
  bold: { ...typography.subtitle, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  preview: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.md,
  },
  previewDisabled: { opacity: 0.5 },
  previewText: { color: '#fff', fontWeight: '700' },
});

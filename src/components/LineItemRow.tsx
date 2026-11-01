import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { LineItem } from '@/types/invoice';
import { formatMoney } from '@/lib/gst';
import { colors, spacing, typography } from '@/theme/ui';

type Props = {
  item: LineItem;
  lineAmount: number;
  onPress: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
};

export function LineItemRow({ item, lineAmount, onPress, onDelete, readOnly }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={readOnly && !onDelete}
      android_ripple={{ color: colors.primaryMuted }}
    >
      <View style={styles.body}>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description || 'Untitled item'}
        </Text>
        <Text style={styles.detail}>
          {item.quantity} {item.unit} × ₹ {formatMoney(item.rate)} · {item.gstRatePercent}% GST
        </Text>
        <Text style={styles.hsn}>HSN/SAC {item.hsnSac || '—'}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>₹ {formatMoney(lineAmount)}</Text>
        {!readOnly && onDelete ? (
          <Pressable hitSlop={8} onPress={onDelete} style={styles.remove}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  body: { flex: 1, gap: 2 },
  desc: { ...typography.body, fontWeight: '600' },
  detail: typography.caption,
  hsn: { ...typography.caption, fontSize: 12 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { ...typography.subtitle, fontSize: 15 },
  remove: { marginTop: 4 },
  removeText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Invoice } from '@/types/invoice';
import { formatMoney, computeTotals } from '@/lib/gst';
import { useAppStore } from '@/store/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/ui';

type Props = {
  invoice: Invoice;
  onDuplicate: () => void;
  onDelete: () => void;
  onLongPress: () => void;
};

export function InvoiceRow({ invoice, onDuplicate, onDelete, onLongPress }: Props) {
  const seller = useAppStore((s) => s.seller);
  const totals = computeTotals(invoice, seller);

  const renderRightActions = () => (
    <View style={styles.actions}>
      <Pressable style={[styles.actionBtn, styles.duplicateBtn]} onPress={onDuplicate}>
        <Text style={styles.actionTextLight}>Copy</Text>
      </Pressable>
      <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
        <Text style={styles.actionTextLight}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Link href={`/invoice/${invoice.id}`} asChild>
        <Pressable
          style={styles.row}
          onLongPress={onLongPress}
          delayLongPress={400}
          android_ripple={{ color: colors.primaryMuted }}
        >
          <View style={styles.main}>
            <View style={styles.topLine}>
              <Text style={styles.invoiceNo}>{invoice.invoiceNo}</Text>
              <StatusBadge status={invoice.status} />
            </View>
            <Text style={styles.buyer} numberOfLines={1}>
              {invoice.buyer.name.trim() || 'No buyer yet'}
            </Text>
            <Text style={styles.meta}>
              {invoice.date} · ₹ {formatMoney(totals.grandTotal)}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>
    </Swipeable>
  );
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const isFinal = status === 'final';
  return (
    <View style={[styles.badge, isFinal ? styles.badgeFinal : styles.badgeDraft]}>
      <Text style={[styles.badgeText, isFinal ? styles.badgeTextFinal : styles.badgeTextDraft]}>
        {isFinal ? 'Final' : 'Draft'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  invoiceNo: { ...typography.subtitle, fontSize: 16 },
  buyer: typography.body,
  meta: typography.caption,
  chevron: { fontSize: 22, color: colors.textMuted, paddingLeft: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  badgeDraft: { backgroundColor: '#FEF3C7' },
  badgeFinal: { backgroundColor: '#D1FAE5' },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  badgeTextDraft: { color: colors.draft },
  badgeTextFinal: { color: colors.final },
  actions: { flexDirection: 'row', height: '100%' },
  actionBtn: { justifyContent: 'center', paddingHorizontal: spacing.md, minWidth: 76 },
  duplicateBtn: { backgroundColor: colors.primary },
  deleteBtn: { backgroundColor: colors.danger },
  actionTextLight: { color: '#fff', fontWeight: '600' },
});

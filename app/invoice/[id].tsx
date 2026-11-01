import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import {
  useAppStore,
  useInvoice,
  useTotals,
  isInvoiceNoDuplicate,
} from '@/store/useAppStore';
import { LineItemRow } from '@/components/LineItemRow';
import { ItemEditorModal } from '@/components/ItemEditorModal';
import { TotalsFooter } from '@/components/TotalsFooter';
import type { LineItem } from '@/types/invoice';
import { colors, spacing, typography } from '@/theme/ui';

export default function InvoiceEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = useInvoice(id);
  const totals = useTotals(id);
  const settings = useAppStore((s) => s.settings);
  const updateInvoice = useAppStore((s) => s.updateInvoice);
  const addItem = useAppStore((s) => s.addItem);
  const updateItem = useAppStore((s) => s.updateItem);
  const removeItem = useAppStore((s) => s.removeItem);

  const [metaOpen, setMetaOpen] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState<LineItem | undefined>();
  const [serialError, setSerialError] = useState<string | null>(null);

  const readOnly = invoice?.status === 'final';

  const patchImmediate = useCallback(
    (p: Parameters<typeof updateInvoice>[1]) => {
      if (!id || readOnly) return;
      updateInvoice(id, p);
    },
    [id, readOnly, updateInvoice],
  );

  const patch = useDebouncedCallback(patchImmediate, 450);

  const onSerialChange = (invoiceNo: string) => {
    if (!id) return;
    if (isInvoiceNoDuplicate(invoiceNo, id)) {
      setSerialError('Invoice number already used');
      return;
    }
    setSerialError(null);
    patchImmediate({ invoiceNo });
  };

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text>Invoice not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {readOnly && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Final invoice — duplicate from the list to edit.</Text>
          </View>
        )}

        <Text style={styles.section}>Invoice info</Text>
        <Field label="Invoice No.">
          <TextInput
            style={styles.input}
            editable={!readOnly}
            value={invoice.invoiceNo}
            onChangeText={onSerialChange}
          />
          {serialError ? <Text style={styles.error}>{serialError}</Text> : null}
        </Field>
        <Field label="Dated">
          <TextInput
            style={styles.input}
            editable={!readOnly}
            value={invoice.date}
            onChangeText={(date) => patch({ date })}
            placeholder="YYYY-MM-DD"
          />
        </Field>
        <Field label="Mode / Terms of Payment">
          <TextInput
            style={styles.input}
            editable={!readOnly}
            value={invoice.meta.paymentTerms ?? ''}
            onChangeText={(paymentTerms) => patch({ meta: { ...invoice.meta, paymentTerms } })}
          />
        </Field>

        <Text style={styles.section}>Buyer</Text>
        <Field label="Name">
          <TextInput
            style={styles.input}
            editable={!readOnly}
            value={invoice.buyer.name}
            onChangeText={(name) => patch({ buyer: { ...invoice.buyer, name } })}
          />
        </Field>
        <Field label="Address">
          <TextInput
            style={[styles.input, styles.multiline]}
            editable={!readOnly}
            multiline
            value={invoice.buyer.address}
            onChangeText={(address) => patch({ buyer: { ...invoice.buyer, address } })}
          />
        </Field>
        <Field label="GSTIN (optional)">
          <TextInput
            style={styles.input}
            editable={!readOnly}
            autoCapitalize="characters"
            value={invoice.buyer.gstin ?? ''}
            onChangeText={(gstin) =>
              patch({ buyer: { ...invoice.buyer, gstin: gstin.toUpperCase() } })
            }
          />
        </Field>
        <Field label="State code">
          <TextInput
            style={styles.input}
            editable={!readOnly}
            value={invoice.buyer.stateCode}
            onChangeText={(stateCode) => patch({ buyer: { ...invoice.buyer, stateCode } })}
            placeholder="01–38"
          />
        </Field>

        <Pressable onPress={() => setMetaOpen((o) => !o)}>
          <Text style={styles.section}>Order & dispatch {metaOpen ? '▾' : '▸'}</Text>
        </Pressable>
        {metaOpen ? (
          <View>
            <MetaField label="Delivery Note" value={invoice.meta.deliveryNote} readOnly={readOnly} onChange={(deliveryNote) => patch({ meta: { ...invoice.meta, deliveryNote } })} />
            <MetaField label="Reference No. & Date" value={invoice.meta.referenceNoAndDate} readOnly={readOnly} onChange={(referenceNoAndDate) => patch({ meta: { ...invoice.meta, referenceNoAndDate } })} />
            <MetaField label="Other References" value={invoice.meta.otherReferences} readOnly={readOnly} onChange={(otherReferences) => patch({ meta: { ...invoice.meta, otherReferences } })} />
            <MetaField label="Buyer's Order No." value={invoice.meta.buyersOrderNo} readOnly={readOnly} onChange={(buyersOrderNo) => patch({ meta: { ...invoice.meta, buyersOrderNo } })} />
            <MetaField label="Buyer's Order Date" value={invoice.meta.buyersOrderDate} readOnly={readOnly} onChange={(buyersOrderDate) => patch({ meta: { ...invoice.meta, buyersOrderDate } })} />
            <MetaField label="Dispatch Doc No." value={invoice.meta.dispatchDocNo} readOnly={readOnly} onChange={(dispatchDocNo) => patch({ meta: { ...invoice.meta, dispatchDocNo } })} />
            <MetaField label="Delivery Note Date" value={invoice.meta.deliveryNoteDate} readOnly={readOnly} onChange={(deliveryNoteDate) => patch({ meta: { ...invoice.meta, deliveryNoteDate } })} />
            <MetaField label="Dispatched Through" value={invoice.meta.dispatchedThrough} readOnly={readOnly} onChange={(dispatchedThrough) => patch({ meta: { ...invoice.meta, dispatchedThrough } })} />
            <MetaField label="Destination" value={invoice.meta.destination} readOnly={readOnly} onChange={(destination) => patch({ meta: { ...invoice.meta, destination } })} />
            <MetaField label="Terms of Delivery" value={invoice.meta.termsOfDelivery} readOnly={readOnly} onChange={(termsOfDelivery) => patch({ meta: { ...invoice.meta, termsOfDelivery } })} />
          </View>
        ) : null}

        <View style={styles.itemsHeader}>
          <Text style={styles.section}>Items</Text>
          {!readOnly ? (
            <Pressable
              onPress={() => {
                setEditItem(undefined);
                setItemModal(true);
              }}
            >
              <Text style={styles.link}>+ Add item</Text>
            </Pressable>
          ) : null}
        </View>
        {invoice.items.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            lineAmount={totals?.lineAmounts[item.id] ?? 0}
            readOnly={readOnly}
            onPress={() => {
              if (readOnly) return;
              setEditItem(item);
              setItemModal(true);
            }}
            onDelete={
              readOnly
                ? undefined
                : () => {
                    Alert.alert('Remove item?', item.description, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeItem(id!, item.id),
                      },
                    ]);
                  }
            }
          />
        ))}
      </ScrollView>

      {totals ? (
        <TotalsFooter
          totals={totals}
          onPreview={() => router.push(`/invoice/${id}/preview`)}
        />
      ) : null}

      <ItemEditorModal
        visible={itemModal}
        initial={editItem}
        defaultUnit={settings.defaultUnit}
        defaultGstRate={settings.defaultGstRatePercent}
        onClose={() => setItemModal(false)}
        onSave={(item) => {
          if (editItem) updateItem(id!, editItem.id, item);
          else addItem(id!, item);
        }}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function MetaField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value?: string;
  readOnly: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        style={styles.input}
        editable={!readOnly}
        value={value ?? ''}
        onChangeText={onChange}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { ...typography.subtitle, marginTop: spacing.md, marginBottom: spacing.sm },
  field: { marginBottom: spacing.sm + 4 },
  label: typography.label,
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
  banner: { backgroundColor: '#FEF3C7', padding: spacing.sm + 4, borderRadius: 10 },
  bannerText: { fontSize: 13, color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});

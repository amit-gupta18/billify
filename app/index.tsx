import { useMemo, useState, useEffect } from 'react';
import { View, FlatList, TextInput, Pressable, Text, StyleSheet, Alert } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useAppStore, useInvoiceList } from '@/store/useAppStore';
import { InvoiceRow } from '@/components/InvoiceRow';
import { EmptyState } from '@/components/EmptyState';
import { SellerSetupModal, shouldShowSellerSetup } from '@/components/SellerSetupModal';
import { colors, spacing, radii } from '@/theme/ui';

export default function InvoiceListScreen() {
  const [query, setQuery] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const seller = useAppStore((s) => s.seller);
  const createDraft = useAppStore((s) => s.createDraft);
  const duplicate = useAppStore((s) => s.duplicate);
  const deleteInvoice = useAppStore((s) => s.deleteInvoice);
  const list = useInvoiceList();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push('/settings')} style={{ marginRight: spacing.sm }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Settings</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (seller.businessName.trim()) return;
      const show = await shouldShowSellerSetup();
      if (!cancelled && show) setSetupOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [seller.businessName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (inv) =>
        inv.invoiceNo.toLowerCase().includes(q) || inv.buyer.name.toLowerCase().includes(q),
    );
  }, [list, query]);

  const onNew = () => {
    const id = createDraft();
    router.push(`/invoice/${id}`);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search serial or buyer"
        value={query}
        onChangeText={setQuery}
        placeholderTextColor={colors.textMuted}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.flex : styles.listPad}
        ListEmptyComponent={
          <EmptyState
            title={list.length === 0 ? 'No invoices yet' : 'No matches'}
            message={
              list.length === 0
                ? 'Create your first draft invoice. Everything works offline.'
                : 'Try a different search term.'
            }
            actionLabel={list.length === 0 ? 'New invoice' : undefined}
            onAction={list.length === 0 ? onNew : undefined}
          />
        }
        renderItem={({ item }) => (
          <InvoiceRow
            invoice={item}
            onDuplicate={() => {
              const newId = duplicate(item.id);
              if (newId) router.push(`/invoice/${newId}`);
            }}
            onDelete={() => {
              Alert.alert('Delete invoice?', item.invoiceNo, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteInvoice(item.id),
                },
              ]);
            }}
            onLongPress={() => {
              Alert.alert(item.invoiceNo, undefined, [
                {
                  text: 'Duplicate',
                  onPress: () => {
                    const newId = duplicate(item.id);
                    if (newId) router.push(`/invoice/${newId}`);
                  },
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteInvoice(item.id),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />
        )}
      />
      <Pressable style={styles.fab} onPress={onNew} accessibilityLabel="Create invoice">
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <SellerSetupModal visible={setupOpen} onDismiss={() => setSetupOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listPad: { paddingBottom: 96 },
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});

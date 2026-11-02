import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvoiceHtmlPreview } from '@/components/InvoiceHtmlPreview';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore, useInvoice, useTotals } from '@/store/useAppStore';
import { renderInvoiceHtml } from '@/pdf/renderInvoiceHtml';
import { exportInvoicePdf } from '@/pdf/exportPdf';
import {
  buildExportFormValues,
  exportFormSchema,
  type ExportFormValues,
  validateExportForm,
} from '@/lib/exportFormSchema';
import { isInvoiceNoTaken } from '@/lib/serial';
import { validateBuyerGstinState } from '@/lib/validation';
import { colors, radii, spacing, typography } from '@/theme/ui';

export default function InvoicePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = useInvoice(id);
  const totals = useTotals(id);
  const seller = useAppStore((s) => s.seller);
  const settings = useAppStore((s) => s.settings);
  const invoices = useAppStore((s) => s.invoices);
  const finalise = useAppStore((s) => s.finalise);
  const [exporting, setExporting] = useState(false);
  const insets = useSafeAreaInsets();

  const defaultValues = useMemo(
    () => (invoice ? buildExportFormValues(invoice, seller) : undefined),
    [invoice, seller],
  );

  const { handleSubmit, setError } = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    values: defaultValues,
  });

  const html = useMemo(() => {
    if (!invoice || !totals) return '';
    return renderInvoiceHtml(invoice, seller, settings, totals, 'ORIGINAL FOR RECIPIENT', {
      screenPreview: true,
    });
  }, [invoice, seller, settings, totals]);

  const printHtml = useMemo(() => {
    if (!invoice || !totals) return '';
    return renderInvoiceHtml(invoice, seller, settings, totals);
  }, [invoice, seller, settings, totals]);

  const runExtraChecks = (): string[] => {
    if (!invoice) return ['Invoice not found'];
    const messages: string[] = [];
    if (isInvoiceNoTaken(invoice.invoiceNo, invoices, invoice.id)) {
      messages.push('Invoice number already used');
    }
    if (!validateBuyerGstinState(invoice.buyer.gstin, invoice.buyer.stateCode)) {
      messages.push('Buyer GSTIN does not match the selected state');
    }
    return messages;
  };

  const showErrors = (messages: string[]) => {
    Alert.alert('Cannot continue', messages.slice(0, 6).join('\n'), [
      { text: 'Edit invoice', onPress: () => router.back() },
      { text: 'OK', style: 'cancel' },
    ]);
  };

  const onExport = handleSubmit(
    async () => {
      if (!invoice || !html) return;
      const extra = runExtraChecks();
      if (extra.length) {
        showErrors(extra);
        return;
      }
      setExporting(true);
      try {
        await exportInvoicePdf(printHtml, invoice.invoiceNo);
      } catch (e) {
        Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not create PDF');
      } finally {
        setExporting(false);
      }
    },
    (fieldErrors) => {
      const messages = Object.values(fieldErrors)
        .map((e) => e?.message)
        .filter(Boolean) as string[];
      const fallback = validateExportForm(invoice!, seller, invoices);
      if (!fallback.ok) {
        showErrors([...messages, ...fallback.messages]);
        return;
      }
      showErrors(messages.length ? messages : ['Please fix validation errors before exporting.']);
      for (const [key, err] of Object.entries(fieldErrors)) {
        if (err?.message) {
          setError(key as keyof ExportFormValues, { message: err.message });
        }
      }
    },
  );

  const onFinalise = handleSubmit(
    () => {
      if (!id) return;
      const extra = runExtraChecks();
      if (extra.length) {
        showErrors(extra);
        return;
      }
      const result = finalise(id);
      if (!result.ok) {
        const msgs = result.errors?.map((e) => e.message) ?? ['Validation failed'];
        showErrors(msgs);
        return;
      }
      Alert.alert('Invoice finalised', 'This invoice is now locked for editing.');
    },
    (fieldErrors) => {
      const messages = Object.values(fieldErrors)
        .map((e) => e?.message)
        .filter(Boolean) as string[];
      showErrors(messages.length ? messages : ['Please complete all required fields.']);
    },
  );

  if (!invoice || !totals || !html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isFinal = invoice.status === 'final';

  return (
    <View style={styles.flex}>
      <InvoiceHtmlPreview html={html} />
      <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => {
            void onExport();
          }}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.btnSecondaryText}>Export PDF</Text>
          )}
        </Pressable>
        {!isFinal ? (
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => {
              void onFinalise();
            }}
          >
            <Text style={styles.btnPrimaryText}>Mark final</Text>
          </Pressable>
        ) : (
          <View style={[styles.btn, styles.finalBadge]}>
            <Text style={styles.finalText}>Final</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1, backgroundColor: colors.bg },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSecondary: { backgroundColor: colors.primaryMuted },
  btnSecondaryText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  finalBadge: { backgroundColor: '#D1FAE5' },
  finalText: { ...typography.subtitle, color: colors.success, fontSize: 16 },
});

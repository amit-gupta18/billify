import { z } from 'zod';
import {
  buyerSchema,
  invoiceDateSchema,
  invoiceNoSchema,
  lineItemSchema,
  sellerGstinSchema,
  sellerStateSchema,
  validateBuyerGstinState,
} from './validation';
import type { Invoice, SellerProfile } from '../types/invoice';
import { isInvoiceNoTaken } from './serial';

export const exportFormSchema = z.object({
  invoiceNo: invoiceNoSchema,
  date: invoiceDateSchema,
  buyer: buyerSchema,
  items: z.array(lineItemSchema).min(1, 'Add at least one item'),
  sellerGstin: sellerGstinSchema,
  sellerStateCode: sellerStateSchema,
});

export type ExportFormValues = z.infer<typeof exportFormSchema>;

export function buildExportFormValues(invoice: Invoice, seller: SellerProfile): ExportFormValues {
  return {
    invoiceNo: invoice.invoiceNo,
    date: invoice.date,
    buyer: invoice.buyer,
    items: invoice.items,
    sellerGstin: seller.gstin,
    sellerStateCode: seller.stateCode,
  };
}

export function validateExportForm(
  invoice: Invoice,
  seller: SellerProfile,
  invoices: Record<string, Invoice>,
): { ok: true } | { ok: false; messages: string[] } {
  const parsed = exportFormSchema.safeParse(buildExportFormValues(invoice, seller));
  const messages: string[] = [];
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      messages.push(issue.message);
    }
  }
  if (isInvoiceNoTaken(invoice.invoiceNo, invoices, invoice.id)) {
    messages.push('Invoice number already used');
  }
  if (!validateBuyerGstinState(invoice.buyer.gstin, invoice.buyer.stateCode)) {
    messages.push('Buyer GSTIN does not match the selected state');
  }
  if (messages.length) return { ok: false, messages: [...new Set(messages)] };
  return { ok: true };
}

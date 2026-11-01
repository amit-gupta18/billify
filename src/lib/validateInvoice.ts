import type { Invoice, LineItem, SellerProfile } from '../types/invoice';
import {
  buyerSchema,
  invoiceDateSchema,
  invoiceNoSchema,
  lineItemSchema,
  sellerAddressSchema,
  sellerBusinessNameSchema,
  sellerGstinSchema,
  sellerStateSchema,
  validateBuyerGstinState,
} from './validation';
import { isInvoiceNoTaken } from './serial';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateForExport(
  invoice: Invoice,
  seller: SellerProfile,
  invoices: Record<string, Invoice>
): ValidationError[] {
  const errors: ValidationError[] = [];

  const noResult = invoiceNoSchema.safeParse(invoice.invoiceNo);
  if (!noResult.success) {
    errors.push({ field: 'invoiceNo', message: noResult.error.issues[0]?.message ?? 'Invalid' });
  } else if (isInvoiceNoTaken(invoice.invoiceNo, invoices, invoice.id)) {
    errors.push({ field: 'invoiceNo', message: 'Invoice number already used' });
  }

  const dateResult = invoiceDateSchema.safeParse(invoice.date);
  if (!dateResult.success) {
    errors.push({ field: 'date', message: 'Enter a valid date' });
  }

  const nameResult = sellerBusinessNameSchema.safeParse(seller.businessName);
  if (!nameResult.success) {
    errors.push({ field: 'seller.businessName', message: 'Business name is required' });
  }

  const addressResult = sellerAddressSchema.safeParse(seller.address);
  if (!addressResult.success) {
    errors.push({ field: 'seller.address', message: 'Address is required' });
  }

  const gstResult = sellerGstinSchema.safeParse(seller.gstin);
  if (!gstResult.success) {
    errors.push({ field: 'seller.gstin', message: 'Enter a valid 15-character GSTIN' });
  }

  const sellerState = sellerStateSchema.safeParse(seller.stateCode);
  if (!sellerState.success) {
    errors.push({ field: 'seller.stateCode', message: 'Select a state' });
  } else if (seller.gstin && seller.gstin.slice(0, 2) !== seller.stateCode) {
    errors.push({ field: 'seller.gstin', message: 'GSTIN does not match the selected state' });
  }

  const buyerResult = buyerSchema.safeParse(invoice.buyer);
  if (!buyerResult.success) {
    for (const issue of buyerResult.error.issues) {
      errors.push({ field: `buyer.${issue.path.join('.')}`, message: issue.message });
    }
  } else if (!validateBuyerGstinState(invoice.buyer.gstin, invoice.buyer.stateCode)) {
    errors.push({ field: 'buyer.gstin', message: 'GSTIN does not match the selected state' });
  }

  if (invoice.items.length < 1) {
    errors.push({ field: 'items', message: 'Add at least one item' });
  }

  for (const item of invoice.items) {
    const itemResult = lineItemSchema.safeParse(item);
    if (!itemResult.success) {
      for (const issue of itemResult.error.issues) {
        errors.push({
          field: `item.${item.id}.${issue.path.join('.')}`,
          message: issue.message,
        });
      }
    }
  }

  return errors;
}

export function sellerStateGstinMismatch(seller: SellerProfile): boolean {
  if (!seller.gstin || seller.gstin.length < 2 || !seller.stateCode) return false;
  return seller.gstin.slice(0, 2) !== seller.stateCode;
}

export function validateLineItem(item: Omit<LineItem, 'id'> | LineItem): ValidationError[] {
  const result = lineItemSchema.safeParse(item);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

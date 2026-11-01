import { z } from 'zod';
import { isValidStateCode } from './states';

/** 15-character GSTIN (format only; checksum not verified). */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;

const optionalGstin = z
  .string()
  .refine((v) => v === '' || GSTIN_REGEX.test(v), 'Enter a valid 15-character GSTIN');

export const invoiceNoSchema = z
  .string()
  .min(1, 'Invoice number is required')
  .max(16, 'Invoice number too long')
  .regex(/^[A-Za-z0-9\-/]+$/, 'Invalid invoice number characters');

export const invoiceDateSchema = z
  .string()
  .min(1, 'Enter a valid date')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Enter a valid date');

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  hsnSac: z
    .string()
    .regex(/^\d{4}$|^\d{6}$|^\d{8}$/, 'HSN/SAC must be 4, 6 or 8 digits'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required').max(8),
  rate: z.number().int().min(0, 'Enter a valid rate'),
  gstRatePercent: z
    .number()
    .refine(
      (r) => (GST_RATE_OPTIONS as readonly number[]).includes(r),
      'Select a valid GST rate'
    ),
});

/** Line item input (no id) — same rules as {@link lineItemSchema}. */
export const lineItemInputSchema = lineItemSchema;

export const buyerSchema = z.object({
  name: z.string().min(1, 'Buyer name is required').max(100),
  address: z.string().min(1, 'Buyer address is required').max(500),
  gstin: optionalGstin.optional(),
  stateCode: z.string().refine(isValidStateCode, 'Select a state'),
});

export function validateBuyerGstinState(gstin: string | undefined, stateCode: string): boolean {
  if (!gstin) return true;
  return gstin.slice(0, 2) === stateCode;
}

export const sellerBusinessNameSchema = z
  .string()
  .min(1, 'Business name is required')
  .max(200);

export const sellerAddressSchema = z.string().min(1, 'Address is required').max(500);

export const sellerGstinSchema = z
  .string()
  .min(1, 'Enter a valid 15-character GSTIN')
  .regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN');

export const sellerStateSchema = z.string().refine(isValidStateCode, 'Select a state');

export const bankDetailsSchema = z.object({
  accountHolderName: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(30).optional(),
  branchAndIfsc: z.string().max(120).optional(),
});

export const sellerProfileSchema = z.object({
  businessName: sellerBusinessNameSchema,
  tradeName: z.string().max(200).optional(),
  address: sellerAddressSchema,
  gstin: sellerGstinSchema,
  phone: z.string().max(20).optional(),
  stateCode: sellerStateSchema,
  bank: bankDetailsSchema.optional(),
  declaration: z.string().max(1000),
});

export const invoiceMetaSchema = z.object({
  deliveryNote: z.string().max(200).optional(),
  paymentTerms: z.string().max(100).optional(),
  referenceNoAndDate: z.string().max(200).optional(),
  otherReferences: z.string().max(200).optional(),
  buyersOrderNo: z.string().max(100).optional(),
  buyersOrderDate: z.string().max(100).optional(),
  dispatchDocNo: z.string().max(100).optional(),
  deliveryNoteDate: z.string().max(100).optional(),
  dispatchedThrough: z.string().max(100).optional(),
  destination: z.string().max(200).optional(),
  termsOfDelivery: z.string().max(200).optional(),
});

export const settingsSchema = z.object({
  serialPrefix: z.string().min(1).max(10),
  nextSerial: z.number().int().min(1),
  serialPadding: z.number().int().min(1).max(8),
  defaultUnit: z.string().min(1).max(8),
  defaultGstRatePercent: z
    .number()
    .refine(
      (r) => (GST_RATE_OPTIONS as readonly number[]).includes(r),
      'Select a valid default GST rate'
    ),
  defaultPaymentTerms: z.string().min(1).max(100),
});

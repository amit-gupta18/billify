export type Money = number;

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  branchAndIfsc: string;
}

export interface SellerProfile {
  businessName: string;
  tradeName?: string;
  address: string;
  gstin: string;
  phone?: string;
  stateCode: string;
  bank?: BankDetails;
  declaration: string;
}

export interface Buyer {
  name: string;
  address: string;
  gstin?: string;
  stateCode: string;
}

export interface InvoiceMeta {
  deliveryNote?: string;
  paymentTerms?: string;
  referenceNoAndDate?: string;
  otherReferences?: string;
  buyersOrderNo?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
}

export interface LineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: Money;
  gstRatePercent: number;
}

export type InvoiceStatus = 'draft' | 'final';

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  buyer: Buyer;
  meta: InvoiceMeta;
  items: LineItem[];
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  serialPrefix: string;
  nextSerial: number;
  serialPadding: number;
  defaultUnit: string;
  defaultGstRatePercent: number;
  defaultPaymentTerms: string;
}

export const DEFAULT_DECLARATION =
  'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';

export function emptySeller(): SellerProfile {
  return {
    businessName: '',
    tradeName: '',
    address: '',
    gstin: '',
    phone: '',
    stateCode: '',
    declaration: DEFAULT_DECLARATION,
  };
}

export function defaultSettings(): Settings {
  return {
    serialPrefix: 'ME26',
    nextSerial: 1,
    serialPadding: 4,
    defaultUnit: 'NOS',
    defaultGstRatePercent: 18,
    defaultPaymentTerms: 'CASH',
  };
}

/** Aggregated GST totals (amounts in paise). */
export interface InvoiceTotals {
  subtotalPaise: Money;
  cgstPaise: Money;
  sgstPaise: Money;
  igstPaise: Money;
  grandTotalPaise: Money;
}

/** Line input for GST total computation (amounts in paise). */
export interface LineItemInput {
  quantity: number;
  ratePaise: Money;
  gstRatePercent: number;
  hsnSac?: string;
  discountPaise?: Money;
}

export interface ComputeTotalsInput {
  sellerStateCode: string;
  buyerStateCode: string;
  lineItems: LineItemInput[];
}

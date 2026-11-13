import type { Invoice, Money, SellerProfile } from '../types/invoice';
import { amountInWords as amountInWordsFn } from './amountInWords';
import { calculateGST, type GSTOutput } from './gst-engine';

export type SupplyType = 'intra' | 'inter';
export type DocumentType = GSTOutput['documentType'];
export type TransactionType = GSTOutput['transactionType'];

export interface HsnRow {
  hsnSac: string;
  ratePercent: number;
  taxable: Money;
  igst: Money;
  cgst: Money;
  sgst: Money;
  totalTax: Money;
}

export interface LineTax {
  igst: Money;
  cgst: Money;
  sgst: Money;
  lineTotal: Money;
}

export interface Totals {
  /** From the Rakhat engine: BILL_OF_SUPPLY when seller has no GSTIN or every item is 0%. */
  documentType: DocumentType;
  /** From the Rakhat engine: INTRA_STATE when buyer state is unknown or matches seller. */
  transactionType: TransactionType;
  /** Taxable value per line (qty × rate − discount), keyed by item id. */
  lineAmounts: Record<string, Money>;
  /** Per-line tax split from the engine, keyed by item id. */
  lineTaxes: Record<string, LineTax>;
  totalQty: number;
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  supplyType: SupplyType;
  hsnSummary: HsnRow[];
  igst: Money;
  cgst: Money;
  sgst: Money;
  totalTax: Money;
  grandTotal: Money;
}

export function roundHalfUp(value: number): number {
  return Math.round(value);
}

export function formatMoney(m: Money): string {
  const rupees = m / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatQty(qty: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
  }).format(qty);
}

export function parseMoney(input: string): Money | null {
  const trimmed = input.trim().replace(/[₹,\s]/g, '');
  if (!trimmed || !/^-?\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith('-');
  const normalized = trimmed.replace(/^-/, '');
  const [whole, frac = ''] = normalized.split('.');
  const paise = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
  return negative ? -paise : paise;
}

export { amountInWordsFn as amountInWords };

export function formatGstRate(rate: number): string {
  if (Number.isInteger(rate)) return `${rate}%`;
  return `${rate}%`;
}

/** Engine returns rupees rounded to 2 dp; Billify stores paise integers. */
function rupeesToPaise(rupees: number): Money {
  return Math.round(rupees * 100);
}

/**
 * GST rate that actually applies to a line. On a Bill of Supply the engine
 * charges no tax, so the effective rate shown on the document is 0%.
 */
export function effectiveGstRate(totals: Pick<Totals, 'documentType'>, ratePercent: number): number {
  return totals.documentType === 'BILL_OF_SUPPLY' ? 0 : ratePercent;
}

/**
 * Adapter over the Rakhat GST engine (./gst-engine.ts). All tax rules —
 * document type, intra/inter-state, CGST/SGST/IGST split and rounding —
 * come from the engine; this only maps Billify's paise-based invoice in and out.
 */
export function computeTotals(inv: Invoice, seller: SellerProfile): Totals {
  const result = calculateGST({
    sellerGSTIN: seller.gstin?.trim() ? seller.gstin.trim() : null,
    sellerStateCode: seller.stateCode,
    buyerStateCode: inv.buyer.stateCode?.trim() ? inv.buyer.stateCode : null,
    items: inv.items.map((item) => ({
      name: item.description,
      quantity: item.quantity,
      unitPrice: item.rate / 100,
      discount: 0,
      gstRate: item.gstRatePercent,
    })),
  });

  const lineAmounts: Record<string, Money> = {};
  const lineTaxes: Record<string, LineTax> = {};
  let totalQty = 0;

  const groups = new Map<string, HsnRow>();
  inv.items.forEach((item, idx) => {
    const line = result.lines[idx];
    const taxable = rupeesToPaise(line.taxableValue);
    const tax: LineTax = {
      igst: rupeesToPaise(line.igstAmount),
      cgst: rupeesToPaise(line.cgstAmount),
      sgst: rupeesToPaise(line.sgstAmount),
      lineTotal: rupeesToPaise(line.lineTotal),
    };
    lineAmounts[item.id] = taxable;
    lineTaxes[item.id] = tax;
    totalQty += item.quantity;

    // HSN rows sum the engine's per-line amounts (same as Rakhat's GSTR-1 HSN aggregation).
    const ratePercent = result.documentType === 'BILL_OF_SUPPLY' ? 0 : item.gstRatePercent;
    const key = `${item.hsnSac}|${ratePercent}`;
    const row = groups.get(key) ?? {
      hsnSac: item.hsnSac,
      ratePercent,
      taxable: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      totalTax: 0,
    };
    row.taxable += taxable;
    row.igst += tax.igst;
    row.cgst += tax.cgst;
    row.sgst += tax.sgst;
    row.totalTax += tax.igst + tax.cgst + tax.sgst;
    groups.set(key, row);
  });

  const hsnSummary = [...groups.values()].sort(
    (a, b) => a.hsnSac.localeCompare(b.hsnSac) || a.ratePercent - b.ratePercent,
  );

  const { summary } = result;
  const igst = rupeesToPaise(summary.igstTotal);
  const cgst = rupeesToPaise(summary.cgstTotal);
  const sgst = rupeesToPaise(summary.sgstTotal);

  return {
    documentType: result.documentType,
    transactionType: result.transactionType,
    lineAmounts,
    lineTaxes,
    totalQty,
    subtotal: rupeesToPaise(summary.subtotal),
    discountTotal: rupeesToPaise(summary.discountTotal),
    taxableAmount: rupeesToPaise(summary.taxableAmount),
    supplyType: result.transactionType === 'INTER_STATE' ? 'inter' : 'intra',
    hsnSummary,
    igst,
    cgst,
    sgst,
    totalTax: igst + cgst + sgst,
    grandTotal: rupeesToPaise(summary.grandTotal),
  };
}

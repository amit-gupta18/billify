import type { Invoice, Money, SellerProfile } from '../types/invoice';
import { amountInWords as amountInWordsFn } from './amountInWords';

export type SupplyType = 'intra' | 'inter';

export interface HsnRow {
  hsnSac: string;
  ratePercent: number;
  taxable: Money;
  igst: Money;
  cgst: Money;
  sgst: Money;
  totalTax: Money;
}

export interface Totals {
  lineAmounts: Record<string, Money>;
  totalQty: number;
  subtotal: Money;
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

export function lineTaxAmounts(
  lineAmount: Money,
  gstRatePercent: number,
  supplyType: SupplyType,
): { igst: Money; cgst: Money; sgst: Money } {
  if (supplyType === 'inter') {
    const igst = roundHalfUp((lineAmount * gstRatePercent) / 100);
    return { igst, cgst: 0, sgst: 0 };
  }
  const cgst = roundHalfUp((lineAmount * gstRatePercent) / 200);
  const sgst = cgst;
  return { igst: 0, cgst, sgst };
}

export function computeTotals(inv: Invoice, seller: SellerProfile): Totals {
  const lineAmounts: Record<string, Money> = {};
  let totalQty = 0;
  let subtotal = 0;

  for (const item of inv.items) {
    const amt = roundHalfUp(item.quantity * item.rate);
    lineAmounts[item.id] = amt;
    totalQty += item.quantity;
    subtotal += amt;
  }

  const supplyType: SupplyType =
    seller.stateCode && inv.buyer.stateCode && seller.stateCode === inv.buyer.stateCode
      ? 'intra'
      : 'inter';

  const groups = new Map<string, { hsnSac: string; ratePercent: number; taxable: Money }>();
  for (const item of inv.items) {
    const key = `${item.hsnSac}|${item.gstRatePercent}`;
    const existing = groups.get(key);
    const lineAmt = lineAmounts[item.id];
    if (existing) {
      existing.taxable += lineAmt;
    } else {
      groups.set(key, {
        hsnSac: item.hsnSac,
        ratePercent: item.gstRatePercent,
        taxable: lineAmt,
      });
    }
  }

  const hsnSummary: HsnRow[] = [...groups.values()]
    .sort((a, b) => a.hsnSac.localeCompare(b.hsnSac) || a.ratePercent - b.ratePercent)
    .map((g) => {
      const tax = lineTaxAmounts(g.taxable, g.ratePercent, supplyType);
      return {
        ...g,
        ...tax,
        totalTax: tax.igst + tax.cgst + tax.sgst,
      };
    });

  let igst = 0;
  let cgst = 0;
  let sgst = 0;
  for (const row of hsnSummary) {
    igst += row.igst;
    cgst += row.cgst;
    sgst += row.sgst;
  }
  const totalTax = igst + cgst + sgst;
  const grandTotal = subtotal + totalTax;

  return {
    lineAmounts,
    totalQty,
    subtotal,
    supplyType,
    hsnSummary,
    igst,
    cgst,
    sgst,
    totalTax,
    grandTotal,
  };
}

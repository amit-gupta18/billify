import { calculateGST, type GSTInput } from '../src/lib/gst-engine';
import { computeTotals } from '../src/lib/gst';
import type { Invoice, LineItem, SellerProfile } from '../src/types/invoice';

/**
 * Pins the Rakhat GST engine rules (rakhat-backend/src/lib/gst-engine.ts).
 * If any of these fail, Billify has drifted from Rakhat — fix the copy, not the test.
 */

const GSTIN_09 = '09ABCDE1234F1Z5';

function input(partial: Partial<GSTInput>): GSTInput {
  return {
    sellerGSTIN: GSTIN_09,
    sellerStateCode: '09',
    buyerStateCode: '09',
    items: [{ name: 'A', quantity: 1, unitPrice: 100, discount: 0, gstRate: 18 }],
    ...partial,
  };
}

describe('calculateGST (Rakhat engine) — document type', () => {
  it('registered seller with taxable items → TAX_INVOICE', () => {
    expect(calculateGST(input({})).documentType).toBe('TAX_INVOICE');
  });

  it('seller without GSTIN → BILL_OF_SUPPLY, no tax charged', () => {
    const r = calculateGST(input({ sellerGSTIN: null }));
    expect(r.documentType).toBe('BILL_OF_SUPPLY');
    expect(r.summary.cgstTotal + r.summary.sgstTotal + r.summary.igstTotal).toBe(0);
    expect(r.summary.grandTotal).toBe(100);
  });

  it('seller with empty-string GSTIN → BILL_OF_SUPPLY', () => {
    expect(calculateGST(input({ sellerGSTIN: '' })).documentType).toBe('BILL_OF_SUPPLY');
  });

  it('every item at 0% → BILL_OF_SUPPLY', () => {
    const r = calculateGST(
      input({
        items: [
          { name: 'A', quantity: 1, unitPrice: 100, discount: 0, gstRate: 0 },
          { name: 'B', quantity: 2, unitPrice: 50, discount: 0, gstRate: 0 },
        ],
      }),
    );
    expect(r.documentType).toBe('BILL_OF_SUPPLY');
  });

  it('mix of 0% and taxed items → TAX_INVOICE, 0% line has no tax', () => {
    const r = calculateGST(
      input({
        items: [
          { name: 'A', quantity: 1, unitPrice: 100, discount: 0, gstRate: 0 },
          { name: 'B', quantity: 1, unitPrice: 100, discount: 0, gstRate: 5 },
        ],
      }),
    );
    expect(r.documentType).toBe('TAX_INVOICE');
    expect(r.lines[0]).toMatchObject({ cgstAmount: 0, sgstAmount: 0, igstAmount: 0 });
    expect(r.lines[1]).toMatchObject({ cgstAmount: 2.5, sgstAmount: 2.5, igstAmount: 0 });
  });
});

describe('calculateGST (Rakhat engine) — place of supply', () => {
  it('same state → INTRA_STATE, rate split equally into CGST + SGST', () => {
    const r = calculateGST(input({ buyerStateCode: '09' }));
    expect(r.transactionType).toBe('INTRA_STATE');
    expect(r.lines[0]).toMatchObject({ cgstAmount: 9, sgstAmount: 9, igstAmount: 0, lineTotal: 118 });
  });

  it('different state → INTER_STATE, full rate as IGST', () => {
    const r = calculateGST(input({ buyerStateCode: '29' }));
    expect(r.transactionType).toBe('INTER_STATE');
    expect(r.lines[0]).toMatchObject({ cgstAmount: 0, sgstAmount: 0, igstAmount: 18, lineTotal: 118 });
  });

  it('buyer state unknown (null) → INTRA_STATE', () => {
    const r = calculateGST(input({ buyerStateCode: null }));
    expect(r.transactionType).toBe('INTRA_STATE');
    expect(r.summary.cgstTotal).toBe(9);
    expect(r.summary.igstTotal).toBe(0);
  });
});

describe('calculateGST (Rakhat engine) — amounts and rounding', () => {
  it('taxable value = qty × price − discount', () => {
    const r = calculateGST(
      input({ items: [{ name: 'A', quantity: 3, unitPrice: 200, discount: 50, gstRate: 12 }] }),
    );
    expect(r.lines[0].taxableValue).toBe(550);
    expect(r.summary).toMatchObject({ subtotal: 600, discountTotal: 50, taxableAmount: 550 });
    expect(r.summary.cgstTotal).toBe(33);
    expect(r.summary.grandTotal).toBe(616);
  });

  it('rounds half-up to 2 decimals per line', () => {
    // 0.25 × 9% = 0.0225 → CGST/SGST 0.02 each; 0.05 × 9% = 0.0045 → 0.00
    const r = calculateGST(
      input({ items: [{ name: 'A', quantity: 1, unitPrice: 0.25, discount: 0, gstRate: 18 }] }),
    );
    expect(r.lines[0].cgstAmount).toBe(0.02);
    const r2 = calculateGST(
      input({ items: [{ name: 'A', quantity: 1, unitPrice: 0.5, discount: 0, gstRate: 5 }] }),
    );
    // 0.5 × 2.5% = 0.0125 → 0.01
    expect(r2.lines[0].cgstAmount).toBe(0.01);
  });

  it('summary totals are rounded from unrounded line sums (not sum of rounded lines)', () => {
    // Each line: 0.10 × 2.5% = 0.0025 CGST → rounds to 0.00 per line,
    // but three lines sum to 0.0075 → 0.01 in the summary.
    const item = { name: 'A', quantity: 1, unitPrice: 0.1, discount: 0, gstRate: 5 };
    const r = calculateGST(input({ items: [item, item, item] }));
    expect(r.lines.map((l) => l.cgstAmount)).toEqual([0, 0, 0]);
    expect(r.summary.cgstTotal).toBe(0.01);
    expect(r.summary.sgstTotal).toBe(0.01);
  });

  it('handles fractional quantities exactly (no float drift)', () => {
    const r = calculateGST(
      input({
        buyerStateCode: '27',
        items: [{ name: 'A', quantity: 0.1, unitPrice: 0.3, discount: 0, gstRate: 28 }],
      }),
    );
    expect(r.lines[0].taxableValue).toBe(0.03);
    expect(r.lines[0].igstAmount).toBe(0.01);
  });
});

describe('computeTotals (Billify adapter over Rakhat engine)', () => {
  const seller: SellerProfile = {
    businessName: 'S',
    address: '',
    gstin: GSTIN_09,
    stateCode: '09',
    declaration: '',
  };

  function item(partial: Partial<LineItem>): LineItem {
    return {
      id: 'i1',
      description: 'Goods',
      hsnSac: '4802',
      quantity: 1,
      unit: 'NOS',
      rate: 10000,
      gstRatePercent: 18,
      ...partial,
    };
  }

  function invoice(stateCode: string, items: LineItem[]): Invoice {
    return {
      id: 'x',
      invoiceNo: 'T',
      date: '2026-01-01',
      buyer: { name: 'B', address: '', stateCode },
      meta: {},
      items,
      status: 'draft',
      createdAt: '',
      updatedAt: '',
    };
  }

  it('maps paise in and out and exposes per-line taxes', () => {
    const t = computeTotals(invoice('29', [item({})]), seller);
    expect(t.documentType).toBe('TAX_INVOICE');
    expect(t.transactionType).toBe('INTER_STATE');
    expect(t.supplyType).toBe('inter');
    expect(t.lineAmounts.i1).toBe(10000);
    expect(t.lineTaxes.i1).toEqual({ igst: 1800, cgst: 0, sgst: 0, lineTotal: 11800 });
    expect(t.grandTotal).toBe(11800);
  });

  it('empty buyer state is treated as unknown → intra-state', () => {
    const t = computeTotals(invoice('', [item({})]), seller);
    expect(t.supplyType).toBe('intra');
    expect(t.cgst).toBe(900);
    expect(t.sgst).toBe(900);
  });

  it('seller without GSTIN → bill of supply with zero tax', () => {
    const t = computeTotals(invoice('09', [item({})]), { ...seller, gstin: '' });
    expect(t.documentType).toBe('BILL_OF_SUPPLY');
    expect(t.totalTax).toBe(0);
    expect(t.grandTotal).toBe(10000);
    expect(t.hsnSummary[0].ratePercent).toBe(0);
  });

  it('HSN summary sums engine line amounts per HSN + rate', () => {
    const t = computeTotals(
      invoice('09', [
        item({ id: 'a', hsnSac: '4802', rate: 10000, gstRatePercent: 12 }),
        item({ id: 'b', hsnSac: '4802', rate: 5000, gstRatePercent: 12 }),
        item({ id: 'c', hsnSac: '4820', rate: 10000, gstRatePercent: 18 }),
      ]),
      seller,
    );
    expect(t.hsnSummary).toEqual([
      { hsnSac: '4802', ratePercent: 12, taxable: 15000, igst: 0, cgst: 900, sgst: 900, totalTax: 1800 },
      { hsnSac: '4820', ratePercent: 18, taxable: 10000, igst: 0, cgst: 900, sgst: 900, totalTax: 1800 },
    ]);
    expect(t.totalTax).toBe(3600);
    expect(t.grandTotal).toBe(28600);
  });
});

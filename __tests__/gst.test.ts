import type { Invoice, SellerProfile } from '../src/types/invoice';
import { computeTotals } from '../src/lib/gst';
import { amountInWords } from '../src/lib/amountInWords';

function makeInvoice(partial: Partial<Invoice> & Pick<Invoice, 'buyer' | 'items'>): Invoice {
  return {
    id: '1',
    invoiceNo: 'TEST',
    date: '2026-01-01',
    meta: {},
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const seller09: SellerProfile = {
  businessName: 'Test',
  address: '',
  gstin: '09ABCDE1234F1Z5',
  stateCode: '09',
  declaration: '',
};

describe('computeTotals', () => {
  it('template invoice inter-state', () => {
    const inv = makeInvoice({
      buyer: { name: 'B', address: 'A', stateCode: '29' },
      items: [
        {
          id: 'i1',
          description: 'Goods',
          hsnSac: '4802',
          quantity: 1,
          unit: 'PKT',
          rate: 29900,
          gstRatePercent: 12,
        },
      ],
    });
    const t = computeTotals(inv, seller09);
    expect(t.subtotal).toBe(29900);
    expect(t.igst).toBe(3588);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
    expect(t.grandTotal).toBe(33488);
  });

  it('same items local buyer intra-state', () => {
    const inv = makeInvoice({
      buyer: { name: 'B', address: 'A', stateCode: '09' },
      items: [
        {
          id: 'i1',
          description: 'Goods',
          hsnSac: '4802',
          quantity: 1,
          unit: 'PKT',
          rate: 29900,
          gstRatePercent: 12,
        },
      ],
    });
    const t = computeTotals(inv, seller09);
    expect(t.subtotal).toBe(29900);
    expect(t.cgst).toBe(1794);
    expect(t.sgst).toBe(1794);
    expect(t.igst).toBe(0);
    expect(t.grandTotal).toBe(33488);
  });

  it('mixed rates inter-state', () => {
    const inv = makeInvoice({
      buyer: { name: 'B', address: 'A', stateCode: '29' },
      items: [
        {
          id: 'i1',
          description: 'A',
          hsnSac: '4820',
          quantity: 2,
          unit: 'NOS',
          rate: 50000,
          gstRatePercent: 18,
        },
        {
          id: 'i2',
          description: 'B',
          hsnSac: '4802',
          quantity: 3,
          unit: 'NOS',
          rate: 12550,
          gstRatePercent: 12,
        },
      ],
    });
    const t = computeTotals(inv, seller09);
    expect(t.subtotal).toBe(137650);
    expect(t.igst).toBe(22518);
    expect(t.grandTotal).toBe(160168);
  });
});

describe('amountInWords', () => {
  it('template grand total', () => {
    expect(amountInWords(33488)).toBe(
      'Indian Rupees Three Hundred Thirty Four and Eighty Eight Paise Only'
    );
  });

  it('whole rupees only', () => {
    expect(amountInWords(30000)).toBe('Indian Rupees Three Hundred Only');
  });
});

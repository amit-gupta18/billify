import { renderInvoiceHtml } from '../src/pdf/renderInvoiceHtml';
import { computeTotals } from '../src/lib/gst';
import { defaultSettings, emptySeller } from '../src/types/invoice';
import type { Invoice } from '../src/types/invoice';

const invoice: Invoice = {
  id: 'x',
  invoiceNo: 'ME260067',
  date: '2026-01-15',
  buyer: { name: 'Buyer Co', address: 'Addr', stateCode: '29', gstin: '29ABCDE1234F1Z5' },
  meta: { paymentTerms: 'CASH' },
  items: [
    {
      id: 'i1',
      description: 'Paper',
      hsnSac: '4802',
      quantity: 1,
      unit: 'PKT',
      rate: 29900,
      gstRatePercent: 12,
    },
  ],
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const seller = {
  ...emptySeller(),
  businessName: 'Mahavir',
  stateCode: '09',
  gstin: '09ABCDE1234F1Z5',
  address: 'Seller addr',
};

describe('renderInvoiceHtml', () => {
  it('includes key template strings', () => {
    const totals = computeTotals(invoice, seller);
    const html = renderInvoiceHtml(invoice, seller, defaultSettings(), totals);
    expect(html).toMatchSnapshot();
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('ME260067');
    expect(html).toContain('334.88');
    expect(html).toContain('Indian Rupees Three Hundred Thirty Four and Eighty Eight Paise Only');
    expect(html).toContain('IGST');
  });

  it('omits rows whose value is empty instead of printing an empty label', () => {
    const sparse: Invoice = { ...invoice, buyer: { ...invoice.buyer, gstin: '' }, meta: {} };
    const bare = { ...seller, phone: '', bank: undefined };
    const html = renderInvoiceHtml(sparse, bare, defaultSettings(), computeTotals(sparse, bare));
    expect(html).not.toContain('Phone :');
    expect(html).not.toContain('State Code');
    expect(html).not.toContain('Bank Details');
    expect(html).not.toContain('Delivery Note');
    expect(html).not.toContain("Buyer's Order No.");
    expect(html.match(/GSTIN\/UIN :/g)).toHaveLength(1); // seller only; buyer GSTIN is empty
    expect(html).toContain('Invoice No.');
  });
});

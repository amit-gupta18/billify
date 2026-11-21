import type { Buyer, Invoice, SellerProfile, Settings, ShipTo } from '../types/invoice';
import type { Totals } from '../lib/gst';
import {
  formatMoney,
  formatGstRate,
  formatQty,
  effectiveGstRate,
} from '../lib/gst';
import { amountInWords } from '../lib/amountInWords';
import { textToHtml, escapeHtml } from '../lib/escapeHtml';
import { stateName } from '../lib/states';
import { addressLines, singleLineName, type AddressLineOptions } from '../lib/address';

export type CopyLabel =
  | 'ORIGINAL FOR RECIPIENT'
  | 'DUPLICATE FOR TRANSPORTER'
  | 'TRIPLICATE FOR SUPPLIER';

const MIN_ITEM_ROWS = 12;

function gridCell(label: string, value: string): string {
  return `<td class="grid-cell"><div class="label">${escapeHtml(label)}</div><div class="value">${textToHtml(value)}</div></td>`;
}

function gridCellSpan2(label: string, value: string): string {
  return `<td colspan="2" class="grid-cell"><div class="label">${escapeHtml(label)}</div><div class="value">${textToHtml(value)}</div></td>`;
}

function formatDate(iso?: string): string {
  return iso ?? '';
}

/** `<div>Label : value</div>`, or nothing at all when the value is empty. */
function labelledLine(label: string, value: string | undefined, className?: string): string {
  const v = value?.trim();
  if (!v) return '';
  return `<div${className ? ` class="${className}"` : ''}>${escapeHtml(label)} : ${escapeHtml(v)}</div>`;
}

/** Two-column grid of only the filled cells; an odd last cell spans both columns. */
function gridTable(cells: [label: string, value: string | undefined][], style?: string): string {
  const filled = cells.filter(([, v]) => v?.trim()) as [string, string][];
  if (filled.length === 0) return '';
  const rows: string[] = [];
  for (let i = 0; i < filled.length; i += 2) {
    const [a, b] = [filled[i], filled[i + 1]];
    rows.push(
      b
        ? `<tr>${gridCell(a[0], a[1].trim())}${gridCell(b[0], b[1].trim())}</tr>`
        : `<tr>${gridCellSpan2(a[0], a[1].trim())}</tr>`,
    );
  }
  return `<table class="grid"${style ? ` style="${style}"` : ''}>${rows.join('')}</table>`;
}

/** Name (with M/S) and address lines — each omitted when empty. */
function partyHeader(party: Buyer | ShipTo, options?: AddressLineOptions): string {
  const name = singleLineName(party.name ?? '');
  const lines = addressLines(party, options);
  return [
    name ? `<div class="seller-name">M/S ${escapeHtml(name)}</div>` : '',
    lines.length ? `<div>${lines.map(escapeHtml).join('<br>')}</div>` : '',
  ].join('');
}

function itemTableHead(supplyType: Totals['supplyType']): string {
  if (supplyType === 'inter') {
    return `<tr>
          <th>Sl No.</th>
          <th>Description of Goods</th>
          <th>HSN/SAC</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Rate</th>
          <th>Amount</th>
          <th>GST Rate</th>
          <th>IGST Amount</th>
        </tr>`;
  }
  return `<tr>
          <th>Sl No.</th>
          <th>Description of Goods</th>
          <th>HSN/SAC</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Rate</th>
          <th>Amount</th>
          <th>CGST Rate</th>
          <th>CGST Amt</th>
          <th>SGST Rate</th>
          <th>SGST Amt</th>
        </tr>`;
}

function emptyItemRow(supplyType: Totals['supplyType']): string {
  const cols = supplyType === 'inter' ? 9 : 11;
  return `<tr>${Array.from({ length: cols })
    .map(() => '<td>&nbsp;</td>')
    .join('')}</tr>`;
}

export type RenderInvoiceOptions = {
  /** Fit A4 width on phone/web preview; omit for PDF print HTML. */
  screenPreview?: boolean;
};

export function renderInvoiceHtml(
  invoice: Invoice,
  seller: SellerProfile,
  settings: Settings,
  totals: Totals,
  copyLabel: CopyLabel = 'ORIGINAL FOR RECIPIENT',
  options?: RenderInvoiceOptions,
): string {
  const paymentTerms =
    invoice.meta.paymentTerms?.trim() || settings.defaultPaymentTerms || '';

  const itemRows = invoice.items
    .map((item, idx) => {
      const amt = totals.lineAmounts[item.id] ?? 0;
      const tax = totals.lineTaxes[item.id] ?? { igst: 0, cgst: 0, sgst: 0, lineTotal: amt };
      const rate = effectiveGstRate(totals, item.gstRatePercent);
      const taxCells =
        totals.supplyType === 'inter'
          ? `<td class="c">${formatGstRate(rate)}</td><td class="r">${formatMoney(tax.igst)}</td>`
          : `<td class="c">${formatGstRate(rate / 2)}</td><td class="r">${formatMoney(tax.cgst)}</td><td class="c">${formatGstRate(rate / 2)}</td><td class="r">${formatMoney(tax.sgst)}</td>`;

      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${textToHtml(item.description)}</td>
        <td class="c">${escapeHtml(item.hsnSac)}</td>
        <td class="r">${formatQty(item.quantity)}</td>
        <td class="c">${escapeHtml(item.unit)}</td>
        <td class="r">${formatMoney(item.rate)}</td>
        <td class="r">${formatMoney(amt)}</td>
        ${taxCells}
      </tr>`;
    })
    .join('');

  const padCount = Math.max(0, MIN_ITEM_ROWS - invoice.items.length);
  const padRows = Array.from({ length: padCount })
    .map(() => emptyItemRow(totals.supplyType))
    .join('');

  const taxRows =
    totals.supplyType === 'inter'
      ? `<tr><td class="label-col">IGST</td><td class="r">${formatMoney(totals.igst)}</td></tr>`
      : `<tr><td class="label-col">CGST</td><td class="r">${formatMoney(totals.cgst)}</td></tr>
         <tr><td class="label-col">SGST</td><td class="r">${formatMoney(totals.sgst)}</td></tr>`;

  const hsnHeader =
    totals.supplyType === 'inter'
      ? `<th>HSN/SAC</th><th>Taxable Value</th><th colspan="2">IGST (Rate · Amount)</th><th>Total Tax Amount</th>`
      : `<th>HSN/SAC</th><th>Taxable Value</th><th colspan="2">CGST (Rate · Amount)</th><th colspan="2">SGST (Rate · Amount)</th><th>Total Tax Amount</th>`;

  const hsnRows = totals.hsnSummary
    .map((row) => {
      if (totals.supplyType === 'inter') {
        return `<tr>
          <td class="c">${escapeHtml(row.hsnSac)}</td>
          <td class="r">${formatMoney(row.taxable)}</td>
          <td class="c">${formatGstRate(row.ratePercent)}</td>
          <td class="r">${formatMoney(row.igst)}</td>
          <td class="r">${formatMoney(row.totalTax)}</td>
        </tr>`;
      }
      return `<tr>
          <td class="c">${escapeHtml(row.hsnSac)}</td>
          <td class="r">${formatMoney(row.taxable)}</td>
          <td class="c">${formatGstRate(row.ratePercent / 2)}</td>
          <td class="r">${formatMoney(row.cgst)}</td>
          <td class="c">${formatGstRate(row.ratePercent / 2)}</td>
          <td class="r">${formatMoney(row.sgst)}</td>
          <td class="r">${formatMoney(row.totalTax)}</td>
        </tr>`;
    })
    .join('');

  const hsnTotalRow =
    totals.supplyType === 'inter'
      ? `<tr class="bold"><td>Total</td><td class="r">${formatMoney(totals.subtotal)}</td><td></td><td class="r">${formatMoney(totals.igst)}</td><td class="r">${formatMoney(totals.totalTax)}</td></tr>`
      : `<tr class="bold"><td>Total</td><td class="r">${formatMoney(totals.subtotal)}</td><td></td><td class="r">${formatMoney(totals.cgst)}</td><td></td><td class="r">${formatMoney(totals.sgst)}</td><td class="r">${formatMoney(totals.totalTax)}</td></tr>`;

  const bank = seller.bank;
  const sellerName = singleLineName(seller.businessName || '');
  const sellerAddress = addressLines(seller);
  const shipTo = invoice.shipTo ?? invoice.buyer;
  const bankLines = [
    labelledLine("A/c Holder's Name", bank?.accountHolderName),
    labelledLine('Bank Name', bank?.bankName),
    labelledLine('A/c No.', bank?.accountNumber),
    labelledLine('Branch & IFSC', bank?.branchAndIfsc),
  ].join('');
  const screenPreview = options?.screenPreview === true;
  const previewHead = screenPreview
    ? `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5"/>
<style>
@media screen {
  html { background: #f1f5f9; }
  body { margin: 0; padding: 0; overflow-x: hidden; }
  .page-scaler { width: 100%; max-width: 210mm; margin: 0 auto; }
  .outer { width: 100%; max-width: 210mm; margin: 0 auto; }
}
</style>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
${previewHead}
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; margin: 0; color: #000; }
.outer { border: 1px solid #000; }
.band { border-bottom: 1px solid #000; }
.band:last-child { border-bottom: none; }
.title-bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; }
.title-bar h1 { margin: 0; font-size: 14pt; flex: 1; text-align: center; }
.copy { font-size: 7pt; text-align: right; max-width: 120px; }
.row2 { display: flex; }
.col { flex: 1; padding: 6px 8px; border-right: 1px solid #000; }
.col:last-child { border-right: none; }
.seller-name { font-weight: bold; text-transform: uppercase; }
.seller-block { line-height: 1.4; }
.seller-title { font-size: 11pt; margin-bottom: 2px; }
.seller-address { margin: 2px 0 4px; }
.seller-contact { font-size: 8.5pt; }
.label { color: #666; font-size: 7pt; }
.value { font-weight: bold; font-size: 8pt; }
.grid { width: 100%; border-collapse: collapse; }
.grid td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; width: 50%; }
.grid-cell .label { margin-bottom: 2px; }
.section-label { color: #666; font-size: 7pt; margin-bottom: 4px; }
.items { width: 100%; border-collapse: collapse; }
.items th, .items td { border: 1px solid #000; padding: 3px 4px; font-size: 8pt; }
.items th { background: #eee; color: #444; font-weight: normal; }
.items thead { display: table-header-group; }
.items tr { page-break-inside: avoid; }
.c { text-align: center; }
.r { text-align: right; }
.totals-wrap { display: flex; border-top: 1px solid #000; }
.totals-left { flex: 1; padding: 6px 8px; border-right: 1px solid #000; font-weight: bold; }
.totals-right { width: 220px; }
.totals-right table { width: 100%; border-collapse: collapse; }
.totals-right td { border-bottom: 1px solid #000; padding: 4px 6px; }
.totals-right .label-col { text-align: left; }
.grand { display: flex; font-weight: bold; border-top: 1px solid #000; }
.grand .g-label { flex: 1; padding: 6px 8px; border-right: 1px solid #000; }
.grand .g-value { width: 220px; padding: 6px 8px; text-align: right; }
.words { padding: 6px 8px; border-top: 1px solid #000; }
.hsn-table { width: 100%; border-collapse: collapse; }
.hsn-table th, .hsn-table td { border: 1px solid #000; padding: 3px 4px; font-size: 8pt; }
.hsn-table th { background: #eee; }
.hsn-table thead { display: table-header-group; }
.bold { font-weight: bold; }
.bank-row { display: flex; border-top: 1px solid #000; }
.bank-left { flex: 1; padding: 6px 8px; border-right: 1px solid #000; }
.bank-right { width: 220px; padding: 6px 8px; text-align: right; position: relative; min-height: 80px; }
.signatory { position: absolute; bottom: 6px; right: 8px; font-size: 8pt; }
.declaration { padding: 6px 8px; border-top: 1px solid #000; }
.footer { text-align: center; font-weight: bold; font-size: 8pt; padding: 6px; border-top: 1px solid #000; }
.after-items { page-break-inside: avoid; }
</style>
</head>
<body>
${screenPreview ? '<div class="page-scaler">' : ''}
<div class="outer">
  <div class="band title-bar">
    <div style="width:120px"></div>
    <h1>${totals.documentType === 'BILL_OF_SUPPLY' ? 'BILL OF SUPPLY' : 'TAX INVOICE'}</h1>
    <div class="copy">${escapeHtml(copyLabel)}</div>
  </div>

  <div class="band row2">
    <div class="col seller-block">
      <div class="section-label">BILLING FROM</div>
      ${sellerName ? `<div class="seller-name seller-title">M/S ${escapeHtml(sellerName)}</div>` : ''}
      ${seller.tradeName?.trim() ? `<div>${escapeHtml(singleLineName(seller.tradeName))}</div>` : ''}
      ${sellerAddress.length ? `<div class="seller-address">${sellerAddress.map(escapeHtml).join('<br>')}</div>` : ''}
      ${labelledLine('Phone', seller.phone, 'seller-contact')}
      ${labelledLine('GSTIN/UIN', seller.gstin, 'seller-contact')}
    </div>
    <div class="col">
      ${gridTable([
        ['Invoice No.', invoice.invoiceNo],
        ['Dated', invoice.date],
        ['Delivery Note', invoice.meta.deliveryNote],
        ['Mode / Terms of Payment', paymentTerms],
        ['Reference No. & Date', invoice.meta.referenceNoAndDate],
        ['Other References', invoice.meta.otherReferences],
      ])}
    </div>
  </div>

  <div class="band row2">
    <div class="col">
      <div class="section-label">BUYER (BILL TO)</div>
      ${partyHeader(invoice.buyer, { withState: false })}
      ${labelledLine('GSTIN/UIN', invoice.buyer.gstin)}
      ${labelledLine('State Name', invoice.buyer.stateCode ? `${invoice.buyer.stateCode}, ${stateName(invoice.buyer.stateCode)}` : '')}
    </div>
    <div class="col">
      <div class="section-label">CONSIGNEE (SHIP TO)</div>
      ${partyHeader(shipTo)}
      ${gridTable(
        [
          ["Buyer's Order No.", invoice.meta.buyersOrderNo],
          ['Dated', formatDate(invoice.meta.buyersOrderDate)],
          ['Dispatch Doc No.', invoice.meta.dispatchDocNo],
          ['Delivery Note Date', formatDate(invoice.meta.deliveryNoteDate)],
          ['Dispatched Through', invoice.meta.dispatchedThrough],
          ['Destination', invoice.meta.destination],
          ['Terms of Delivery', invoice.meta.termsOfDelivery],
        ],
        'margin-top:6px',
      )}
    </div>
  </div>

  <div class="band">
    <table class="items">
      <thead>
        ${itemTableHead(totals.supplyType)}
      </thead>
      <tbody>
        ${itemRows}
        ${padRows}
      </tbody>
    </table>
  </div>

  <div class="after-items">
    <div class="totals-wrap">
      <div class="totals-left">Total Qty: ${formatQty(totals.totalQty)}</div>
      <div class="totals-right">
        <table>
          <tr><td class="label-col">Subtotal</td><td class="r">${formatMoney(totals.subtotal)}</td></tr>
          ${taxRows}
        </table>
      </div>
    </div>
    <div class="grand">
      <div class="g-label">Grand Total</div>
      <div class="g-value">INR ${formatMoney(totals.grandTotal)}</div>
    </div>
    <div class="words"><strong>Amount in words :</strong> ${escapeHtml(amountInWords(totals.grandTotal))}</div>
    <div class="band">
      <div class="section-label" style="padding:4px 8px 0">Tax Summary (HSN/SAC)</div>
      <table class="hsn-table">
        <thead><tr>${hsnHeader}</tr></thead>
        <tbody>
          ${hsnRows}
          ${hsnTotalRow}
        </tbody>
      </table>
    </div>
    <div class="bank-row">
      <div class="bank-left">
        ${bankLines ? `<strong>Bank Details</strong>${bankLines}` : ''}
      </div>
      <div class="bank-right">
        ${sellerName ? `<div style="font-size:8pt">for</div>
        <div class="seller-name">${escapeHtml(sellerName)}</div>` : ''}
        <div class="signatory">Authorised Signatory</div>
      </div>
    </div>
    ${seller.declaration?.trim() ? `<div class="declaration">
      <strong>Declaration</strong>
      <div>${textToHtml(seller.declaration.trim())}</div>
    </div>` : ''}
    <div class="footer">This is a Computer Generated Invoice</div>
  </div>
</div>
${screenPreview ? '</div>' : ''}
</body>
</html>`;
}

import type { Invoice, SellerProfile, Settings } from '../types/invoice';
import type { Totals } from '../lib/gst';
import {
  formatMoney,
  formatGstRate,
  formatQty,
  lineTaxAmounts,
} from '../lib/gst';
import { amountInWords } from '../lib/amountInWords';
import { textToHtml, escapeHtml } from '../lib/escapeHtml';
import { stateName } from '../lib/states';

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

export function renderInvoiceHtml(
  invoice: Invoice,
  seller: SellerProfile,
  settings: Settings,
  totals: Totals,
  copyLabel: CopyLabel = 'ORIGINAL FOR RECIPIENT',
): string {
  const paymentTerms =
    invoice.meta.paymentTerms?.trim() || settings.defaultPaymentTerms || '';

  const itemRows = invoice.items
    .map((item, idx) => {
      const amt = totals.lineAmounts[item.id] ?? 0;
      const tax = lineTaxAmounts(amt, item.gstRatePercent, totals.supplyType);
      const taxCells =
        totals.supplyType === 'inter'
          ? `<td class="c">${formatGstRate(item.gstRatePercent)}</td><td class="r">${formatMoney(tax.igst)}</td>`
          : `<td class="c">${formatGstRate(item.gstRatePercent / 2)}</td><td class="r">${formatMoney(tax.cgst)}</td><td class="c">${formatGstRate(item.gstRatePercent / 2)}</td><td class="r">${formatMoney(tax.sgst)}</td>`;

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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
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
<div class="outer">
  <div class="band title-bar">
    <div style="width:120px"></div>
    <h1>TAX INVOICE</h1>
    <div class="copy">${escapeHtml(copyLabel)}</div>
  </div>

  <div class="band row2">
    <div class="col">
      <div class="seller-name">M/S ${textToHtml(seller.businessName || '')}</div>
      ${seller.tradeName ? `<div>${textToHtml(seller.tradeName)}</div>` : ''}
      <div>${textToHtml(seller.address || '')}</div>
      <div>GSTIN/UIN : ${escapeHtml(seller.gstin || '')}</div>
      <div>Phone : ${escapeHtml(seller.phone || '')}</div>
      <div>State Name : ${escapeHtml(seller.stateCode ? `${seller.stateCode}, ${stateName(seller.stateCode)}` : '')}</div>
    </div>
    <div class="col">
      <table class="grid">
        <tr>
          ${gridCell('Invoice No.', invoice.invoiceNo)}
          ${gridCell('Dated', invoice.date)}
        </tr>
        <tr>
          ${gridCell('Delivery Note', invoice.meta.deliveryNote ?? '')}
          ${gridCell('Mode / Terms of Payment', paymentTerms)}
        </tr>
        <tr>
          ${gridCell('Reference No. & Date', invoice.meta.referenceNoAndDate ?? '')}
          ${gridCell('Other References', invoice.meta.otherReferences ?? '')}
        </tr>
      </table>
    </div>
  </div>

  <div class="band row2">
    <div class="col">
      <div class="section-label">BUYER (BILL TO)</div>
      <div class="seller-name">M/S ${textToHtml(invoice.buyer.name || '')}</div>
      <div>${textToHtml(invoice.buyer.address || '')}</div>
      <div>GSTIN/UIN : ${escapeHtml(invoice.buyer.gstin ?? '')}</div>
      <div>State Name : ${escapeHtml(invoice.buyer.stateCode ? `${invoice.buyer.stateCode}, ${stateName(invoice.buyer.stateCode)}` : '')}</div>
    </div>
    <div class="col">
      <div class="section-label">CONSIGNEE (SHIP TO)</div>
      <div class="seller-name">M/S ${textToHtml(invoice.buyer.name || '')}</div>
      <div>${textToHtml(invoice.buyer.address || '')}</div>
      <table class="grid" style="margin-top:6px">
        <tr>
          ${gridCell("Buyer's Order No.", invoice.meta.buyersOrderNo ?? '')}
          ${gridCell('Dated', formatDate(invoice.meta.buyersOrderDate))}
        </tr>
        <tr>
          ${gridCell('Dispatch Doc No.', invoice.meta.dispatchDocNo ?? '')}
          ${gridCell('Delivery Note Date', formatDate(invoice.meta.deliveryNoteDate))}
        </tr>
        <tr>
          ${gridCell('Dispatched Through', invoice.meta.dispatchedThrough ?? '')}
          ${gridCell('Destination', invoice.meta.destination ?? '')}
        </tr>
        <tr>
          ${gridCellSpan2('Terms of Delivery', invoice.meta.termsOfDelivery ?? '')}
        </tr>
      </table>
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
        <strong>Bank Details</strong>
        <div>A/c Holder's Name : ${escapeHtml(bank?.accountHolderName ?? '')}</div>
        <div>Bank Name : ${escapeHtml(bank?.bankName ?? '')}</div>
        <div>A/c No. : ${escapeHtml(bank?.accountNumber ?? '')}</div>
        <div>Branch & IFSC : ${escapeHtml(bank?.branchAndIfsc ?? '')}</div>
      </div>
      <div class="bank-right">
        <div style="font-size:8pt">for</div>
        <div class="seller-name">${textToHtml(seller.businessName || '')}</div>
        <div class="signatory">Authorised Signatory</div>
      </div>
    </div>
    <div class="declaration">
      <strong>Declaration</strong>
      <div>${textToHtml(seller.declaration || '')}</div>
    </div>
    <div class="footer">This is a Computer Generated Invoice</div>
  </div>
</div>
</body>
</html>`;
}

import type { Invoice, Settings } from '../types/invoice';

export function formatSerial(
  settings: Pick<Settings, 'serialPrefix' | 'nextSerial' | 'serialPadding'>,
): string {
  const { serialPrefix, nextSerial, serialPadding } = settings;
  const safePadding = Math.max(1, serialPadding);
  const numeric = String(Math.max(0, Math.floor(nextSerial))).padStart(
    safePadding,
    '0',
  );
  const trimmedPrefix = serialPrefix.trim();
  return trimmedPrefix.length > 0 ? `${trimmedPrefix}-${numeric}` : numeric;
}

/** Safe PDF file name from invoice number (e.g. `ME26-0067.pdf`). */
export function sanitizePdfFileName(invoiceNo: string): string {
  const trimmed = invoiceNo.trim();
  const base =
    trimmed.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') ||
    'invoice';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export function isSerialUnique(
  serialNumber: string,
  existingSerials: readonly string[],
): boolean {
  const normalized = serialNumber.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  return !existingSerials.some(
    (existing) => existing.trim().toLowerCase() === normalized,
  );
}

export function isInvoiceNoTaken(
  invoiceNo: string,
  invoices: Record<string, Invoice>,
  excludeId?: string,
): boolean {
  const existing = Object.values(invoices)
    .filter((inv) => inv.id !== excludeId)
    .map((inv) => inv.invoiceNo);
  return !isSerialUnique(invoiceNo, existing);
}

import type { SellerProfile } from '../types/invoice';
import { stateName } from './states';

/** Longest line we keep when re-flowing a legacy one-line address at commas. */
const MAX_LEGACY_LINE = 40;

type AddressParts = Partial<
  Pick<SellerProfile, 'addressLine1' | 'addressLine2' | 'city' | 'pincode' | 'stateCode'>
>;

function hasStructuredAddress(seller: AddressParts): boolean {
  return [seller.addressLine1, seller.addressLine2, seller.city, seller.pincode].some(
    (v) => !!v?.trim(),
  );
}

/** "Mumbai, Maharashtra - 400069" (any missing part is dropped). */
function cityStatePinLine(seller: AddressParts): string {
  const state = seller.stateCode ? stateName(seller.stateCode) : '';
  const place = [seller.city?.trim(), state].filter(Boolean).join(', ');
  const pin = seller.pincode?.trim() ?? '';
  if (place && pin) return `${place} - ${pin}`;
  return place || pin;
}

/** Splits an over-long line at commas, packing parts greedily into lines of at most MAX_LEGACY_LINE. */
function reflowAtCommas(line: string): string[] {
  if (line.length <= MAX_LEGACY_LINE) return [line];
  const parts = line
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const part of parts) {
    const candidate = current ? `${current}, ${part}` : part;
    if (current && candidate.length > MAX_LEGACY_LINE) {
      lines.push(`${current},`);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Address formatted as separate lines for the invoice "billing from" block. */
export function sellerAddressLines(seller: AddressParts & Pick<SellerProfile, 'address'>): string[] {
  if (hasStructuredAddress(seller)) {
    return [seller.addressLine1?.trim(), seller.addressLine2?.trim(), cityStatePinLine(seller)].filter(
      (l): l is string => !!l,
    );
  }
  return (seller.address ?? '')
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap(reflowAtCommas);
}

/** Single-string address stored in `SellerProfile.address`, built from the structured parts. */
export function joinSellerAddress(seller: AddressParts): string {
  return [seller.addressLine1?.trim(), seller.addressLine2?.trim(), cityStatePinLine(seller)]
    .filter(Boolean)
    .join(', ');
}

/** First line only — guards against an address pasted into the business-name field. */
export function singleLineName(name: string): string {
  return (name.split(/\r\n|\r|\n/)[0] ?? '').trim();
}

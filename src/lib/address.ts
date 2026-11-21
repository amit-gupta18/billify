import type { AddressFields } from '../types/invoice';
import { stateName } from './states';

/** Longest line we keep when re-flowing a legacy one-line address at commas. */
const MAX_LEGACY_LINE = 40;

type AddressParts = AddressFields & { stateCode?: string };

export type AddressLineOptions = {
  /** Put the state name on the last line (default true). Off where a separate "State Name" row is printed. */
  withState?: boolean;
};

export function hasStructuredAddress(parts: AddressFields): boolean {
  return [parts.addressLine1, parts.addressLine2, parts.city, parts.pincode].some((v) => !!v?.trim());
}

/** "Mumbai, Maharashtra - 400069" (any missing part is dropped). */
function cityStatePinLine(parts: AddressParts, withState: boolean): string {
  const state = withState && parts.stateCode ? stateName(parts.stateCode) : '';
  const place = [parts.city?.trim(), state].filter(Boolean).join(', ');
  const pin = parts.pincode?.trim() ?? '';
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

/** Address as separate printable lines (structured parts, or a legacy `address` string re-flowed). */
export function addressLines(
  party: AddressParts & { address?: string },
  { withState = true }: AddressLineOptions = {},
): string[] {
  if (hasStructuredAddress(party)) {
    return [party.addressLine1?.trim(), party.addressLine2?.trim(), cityStatePinLine(party, withState)].filter(
      (l): l is string => !!l,
    );
  }
  return (party.address ?? '')
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap(reflowAtCommas);
}

/** Single-string address stored in the owner's `address`, built from the structured parts. */
export function joinAddress(parts: AddressParts): string {
  return [parts.addressLine1?.trim(), parts.addressLine2?.trim(), cityStatePinLine(parts, true)]
    .filter(Boolean)
    .join(', ');
}

/**
 * Structured parts to show in an editor. A legacy one-line address is split so the user can tidy it:
 * first line into line 1, the rest into line 2.
 */
export function editableAddressParts(party: AddressFields & { address?: string }): Required<AddressFields> {
  if (hasStructuredAddress(party)) {
    return {
      addressLine1: party.addressLine1 ?? '',
      addressLine2: party.addressLine2 ?? '',
      city: party.city ?? '',
      pincode: party.pincode ?? '',
    };
  }
  const legacy = addressLines({ address: party.address });
  return {
    addressLine1: (legacy[0] ?? '').replace(/,$/, ''),
    addressLine2: legacy.slice(1).join(' ').replace(/,$/, ''),
    city: '',
    pincode: '',
  };
}

/** First line only — guards against an address pasted into a name field. */
export function singleLineName(name: string): string {
  return (name.split(/\r\n|\r|\n/)[0] ?? '').trim();
}

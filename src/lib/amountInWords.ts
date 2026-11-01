const ONES = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const;

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
] as const;

function twoDigitWords(n: number): string {
  if (n < 20) {
    return ONES[n] ?? '';
  }
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS[tens]! : `${TENS[tens]!} ${ONES[ones]}`;
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred === 0) {
    return rest === 0 ? '' : twoDigitWords(rest);
  }
  const head = `${ONES[hundred]} Hundred`;
  if (rest === 0) {
    return head;
  }
  return `${head} ${twoDigitWords(rest)}`;
}

/** Converts an integer 0–999 to words (Indian English style, no "and"). */
function segmentWords(n: number): string {
  if (n === 0) {
    return '';
  }
  return threeDigitWords(n);
}

/**
 * Indian numbering: crore, lakh, thousand, then hundreds.
 * Used for rupee portion of invoice totals.
 */
export function integerToIndianWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('amount must be a non-negative finite number');
  }
  const n = Math.floor(amount);
  if (n === 0) {
    return 'Zero';
  }

  const parts: string[] = [];
  let remaining = n;

  const crore = Math.floor(remaining / 10_000_000);
  remaining %= 10_000_000;
  if (crore > 0) {
    parts.push(`${integerToIndianWords(crore)} Crore`);
  }

  const lakh = Math.floor(remaining / 100_000);
  remaining %= 100_000;
  if (lakh > 0) {
    parts.push(`${segmentWords(lakh)} Lakh`.trim());
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    parts.push(`${segmentWords(thousand)} Thousand`.trim());
  }

  if (remaining > 0) {
    parts.push(threeDigitWords(remaining));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Format paise as "Indian Rupees X and Y Paise Only".
 * Zero paise uses "Indian Rupees X Only".
 */
export function amountInWords(paise: number): string {
  if (!Number.isFinite(paise) || paise < 0) {
    throw new RangeError('paise must be a non-negative finite number');
  }
  const totalPaise = Math.round(paise);
  const rupees = Math.floor(totalPaise / 100);
  const paisePart = totalPaise % 100;

  const rupeeWords = integerToIndianWords(rupees);
  if (paisePart === 0) {
    return `Indian Rupees ${rupeeWords} Only`;
  }
  const paiseWords = twoDigitWords(paisePart);
  return `Indian Rupees ${rupeeWords} and ${paiseWords} Paise Only`;
}

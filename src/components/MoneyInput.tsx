import { useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { parseMoney } from '@/lib/gst';
import type { Money } from '@/types/invoice';
import { colors, radii, spacing } from '@/theme/ui';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  valuePaise: Money;
  onChangePaise: (v: Money) => void;
  error?: string;
};

/** Display rupees with 2 decimals when not editing (blur). */
function paiseToField(paise: Money): string {
  if (!paise) return '';
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${rupees}.${frac}`;
}

/** Allow only partial money typing (max 2 decimal places). */
function sanitizeTyping(raw: string): string | null {
  const t = raw.replace(/[₹,\s]/g, '');
  if (t === '' || t === '-' || t === '.') return t;
  if (/^-?\d*\.?\d{0,2}$/.test(t)) return t;
  return null;
}

export function MoneyInput({ valuePaise, onChangePaise, error, style, ...rest }: Props) {
  const [text, setText] = useState(() => paiseToField(valuePaise));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(paiseToField(valuePaise));
    }
  }, [valuePaise]);

  return (
    <TextInput
      {...rest}
      style={[styles.input, error ? styles.inputError : null, style]}
      value={text}
      onFocus={(e) => {
        focusedRef.current = true;
        rest.onFocus?.(e);
      }}
      onChangeText={(raw) => {
        const next = sanitizeTyping(raw);
        if (next === null) return;
        setText(next);
        if (next === '' || next === '-' || next === '.') {
          onChangePaise(0);
          return;
        }
        const parsed = parseMoney(next);
        if (parsed !== null) onChangePaise(parsed);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const parsed = parseMoney(text);
        if (parsed !== null) {
          onChangePaise(parsed);
          setText(paiseToField(parsed));
        } else {
          setText(paiseToField(valuePaise));
        }
        rest.onBlur?.(e);
      }}
      keyboardType="decimal-pad"
      placeholder="0.00"
      placeholderTextColor={colors.textMuted}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
});

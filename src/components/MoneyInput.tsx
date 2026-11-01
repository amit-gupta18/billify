import { useEffect, useState } from 'react';
import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { formatMoney, parseMoney } from '@/lib/gst';
import type { Money } from '@/types/invoice';
import { colors, radii, spacing } from '@/theme/ui';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  valuePaise: Money;
  onChangePaise: (v: Money) => void;
  error?: string;
};

function paiseToField(paise: Money): string {
  if (!paise) return '';
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${rupees}.${frac}`;
}

export function MoneyInput({ valuePaise, onChangePaise, error, style, ...rest }: Props) {
  const [text, setText] = useState(() => paiseToField(valuePaise));

  useEffect(() => {
    setText(paiseToField(valuePaise));
  }, [valuePaise]);

  return (
    <TextInput
      {...rest}
      style={[styles.input, error ? styles.inputError : null, style]}
      value={text}
      onChangeText={(raw) => {
        setText(raw);
        const parsed = parseMoney(raw);
        if (parsed !== null) onChangePaise(parsed);
        else if (!raw.trim()) onChangePaise(0);
      }}
      onBlur={() => {
        const parsed = parseMoney(text);
        if (parsed !== null) {
          setText(paiseToField(parsed));
          onChangePaise(parsed);
        }
      }}
      keyboardType="decimal-pad"
      placeholder="0.00"
      placeholderTextColor={colors.textMuted}
      accessibilityLabel={rest.accessibilityLabel ?? `Amount ${formatMoney(valuePaise)}`}
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

import { Platform } from 'react-native';

export const colors = {
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#2563EB',
  primaryMuted: '#DBEAFE',
  danger: '#DC2626',
  dangerMuted: '#FEE2E2',
  success: '#059669',
  draft: '#D97706',
  final: '#059669',
  shadow: Platform.select({ ios: '#00000022', android: '#00000033', default: '#00000022' }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  subtitle: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, marginBottom: 6 },
};

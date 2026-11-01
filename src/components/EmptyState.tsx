import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme/ui';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.btn} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  title: { ...typography.subtitle, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.caption, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.pill,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

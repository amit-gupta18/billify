import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '@/store/useAppStore';
import { StatePicker } from '@/components/StatePicker';
import { colors, radii, spacing, typography } from '@/theme/ui';

const SKIP_KEY = 'invoice-app/seller-setup-skipped';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function SellerSetupModal({ visible, onDismiss }: Props) {
  const seller = useAppStore((s) => s.seller);
  const updateSeller = useAppStore((s) => s.updateSeller);
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('');

  const handleSave = () => {
    updateSeller({
      businessName: businessName.trim() || seller.businessName,
      gstin: gstin.trim() || seller.gstin,
      stateCode: stateCode || seller.stateCode,
    });
    onDismiss();
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(SKIP_KEY, '1');
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleSkip}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.sub}>
              Add your business details for GST invoices. You can change these anytime in Settings.
            </Text>
            <Text style={typography.label}>Business name</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Your registered business name"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={typography.label}>GSTIN</Text>
            <TextInput
              style={styles.input}
              value={gstin}
              onChangeText={(t) => setGstin(t.toUpperCase())}
              placeholder="15-character GSTIN"
              autoCapitalize="characters"
              maxLength={15}
            />
            <StatePicker value={stateCode} onChange={setStateCode} />
            <Pressable style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export async function shouldShowSellerSetup(): Promise<boolean> {
  const skipped = await AsyncStorage.getItem(SKIP_KEY);
  return skipped !== '1';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.title, marginBottom: 4 },
  sub: { ...typography.caption, lineHeight: 20, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  skipText: { color: colors.textMuted, fontSize: 15 },
});

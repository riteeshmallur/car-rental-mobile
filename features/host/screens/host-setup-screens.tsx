import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, BadgeCheck, Building2, CreditCard, FileCheck2, IdCard, Landmark, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';
import {
  hostsApi,
  type SetupHostPayoutPayload,
  type SubmitHostIdentityVerificationPayload,
} from '@/services/hosts/hosts-api';
import { normalizeApiError } from '@/utils/errors';
import { radioAccessibilityProps } from '@/utils/radio-accessibility';
import { colors, radii, shadows } from '@/utils/theme';

const queryKeys = {
  dashboard: ['host', 'dashboard'],
  setup: ['host', 'setup-status'],
  status: ['hosts', 'me', 'status'],
} as const;

function invalidateHostSetup(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.setup });
  void queryClient.invalidateQueries({ queryKey: queryKeys.status });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function HostIdentityVerificationScreen() {
  const goBack = useSafeBack({ fallback: '/(host)/dashboard' });
  const queryClient = useQueryClient();
  const setupQuery = useQuery({ queryKey: queryKeys.setup, queryFn: hostsApi.setupStatus });
  const [documentType, setDocumentType] = useState<SubmitHostIdentityVerificationPayload['documentType']>('driving_licence');
  const [documentNumber, setDocumentNumber] = useState('');
  const mutation = useMutation({
    mutationFn: hostsApi.submitIdentityVerification,
    onSuccess: () => {
      invalidateHostSetup(queryClient);
      router.replace('/(host)/dashboard');
    },
  });
  const canSubmit = documentNumber.trim().replace(/[^a-zA-Z0-9-]/g, '').length >= 4;
  const currentStatus = getTaskStatus(setupQuery.data?.tasks, 'identity_verification');

  return (
    <SetupShell
      eyebrow="Host setup"
      icon={<IdCard color={colors.brand} size={24} />}
      onBack={goBack}
      subtitle="Submit a document for review. Your host profile stays pending until it is approved."
      title="Verify identity"
    >
      <StatusCard
        label="Verification status"
        status={currentStatus}
        detail={setupQuery.data?.identityDocumentLast4 ? `Document ending ${setupQuery.data.identityDocumentLast4}` : undefined}
      />
      <Text style={styles.label}>Document type</Text>
      <View accessibilityRole="radiogroup" style={styles.optionGrid}>
        {([
          ['driving_licence', 'Driving licence'],
          ['national_id', 'National ID'],
          ['passport', 'Passport'],
        ] as const).map(([value, label]) => (
          <Choice
            key={value}
            label={label}
            onPress={() => setDocumentType(value)}
            selected={documentType === value}
          />
        ))}
      </View>
      <Field
        accessibilityLabel="Document number"
        autoCapitalize="characters"
        label="Document number"
        onChangeText={setDocumentNumber}
        placeholder="Enter document number"
        value={documentNumber}
      />
      <SecurityNote text="Your full document reference is used only for this submission. HopIn retains only a masked ending in your setup status." />
      {mutation.error ? <FormError message={normalizeApiError(mutation.error).message} /> : null}
      <PrimaryButton
        disabled={!canSubmit || mutation.isPending}
        label={mutation.isPending ? 'Submitting' : 'Submit for review'}
        onPress={() => mutation.mutate({ documentType, documentNumber: documentNumber.trim() })}
      />
    </SetupShell>
  );
}

export function HostPayoutSetupScreen() {
  const goBack = useSafeBack({ fallback: '/(host)/dashboard' });
  const queryClient = useQueryClient();
  const setupQuery = useQuery({ queryKey: queryKeys.setup, queryFn: hostsApi.setupStatus });
  const [method, setMethod] = useState<SetupHostPayoutPayload['method']>('upi');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const mutation = useMutation({
    mutationFn: hostsApi.setupPayoutAccount,
    onSuccess: () => {
      invalidateHostSetup(queryClient);
      router.replace('/(host)/dashboard');
    },
  });
  const isUpi = method === 'upi';
  const upiValid = /^[A-Za-z0-9._-]{2,128}@[A-Za-z]{2,64}$/.test(upiId.trim());
  const bankValid = /^\d{6,24}$/.test(accountNumber) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase());
  const canSubmit = accountHolderName.trim().length >= 2 && (isUpi ? upiValid : bankValid);
  const currentStatus = getTaskStatus(setupQuery.data?.tasks, 'payout_setup');

  return (
    <SetupShell
      eyebrow="Host setup"
      icon={<Landmark color={colors.brand} size={24} />}
      onBack={goBack}
      subtitle="Choose where future earnings can be paid after your details are approved."
      title="Set up payouts"
    >
      <StatusCard
        label="Payout status"
        status={currentStatus}
        detail={setupQuery.data?.payoutAccountLast4 ? `Account ending ${setupQuery.data.payoutAccountLast4}` : undefined}
      />
      <Text style={styles.label}>Payout method</Text>
      <View accessibilityRole="radiogroup" style={styles.optionGrid}>
        <Choice icon={<CreditCard color={colors.brand} size={18} />} label="UPI" onPress={() => setMethod('upi')} selected={isUpi} />
        <Choice icon={<Building2 color={colors.brand} size={18} />} label="Bank account" onPress={() => setMethod('bank_account')} selected={!isUpi} />
      </View>
      <Field
        accessibilityLabel="Account holder name"
        autoCapitalize="words"
        label="Account holder name"
        onChangeText={setAccountHolderName}
        placeholder="Name on the payout account"
        value={accountHolderName}
      />
      {isUpi ? (
        <Field
          accessibilityLabel="UPI ID"
          autoCapitalize="none"
          keyboardType="email-address"
          label="UPI ID"
          onChangeText={setUpiId}
          placeholder="name@bank"
          value={upiId}
        />
      ) : (
        <>
          <Field
            accessibilityLabel="Bank account number"
            keyboardType="number-pad"
            label="Bank account number"
            onChangeText={setAccountNumber}
            placeholder="Enter account number"
            secureTextEntry
            value={accountNumber}
          />
          <Field
            accessibilityLabel="IFSC code"
            autoCapitalize="characters"
            label="IFSC code"
            onChangeText={setIfscCode}
            placeholder="HDFC0001234"
            value={ifscCode}
          />
        </>
      )}
      <SecurityNote text="Payout references are submitted for review. Full account or UPI details are not shown again in HopIn." />
      {mutation.error ? <FormError message={normalizeApiError(mutation.error).message} /> : null}
      <PrimaryButton
        disabled={!canSubmit || mutation.isPending}
        label={mutation.isPending ? 'Saving' : 'Submit payout details'}
        onPress={() => mutation.mutate(
          isUpi
            ? { method, accountHolderName: accountHolderName.trim(), upiId: upiId.trim() }
            : { method, accountHolderName: accountHolderName.trim(), accountNumber, ifscCode: ifscCode.trim().toUpperCase() },
        )}
      />
    </SetupShell>
  );
}

function SetupShell({ children, eyebrow, icon, onBack, subtitle, title }: {
  children: React.ReactNode;
  eyebrow: string;
  icon: React.ReactNode;
  onBack: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.heroIcon}>{icon}</View>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choice({ icon, label, onPress, selected }: { icon?: React.ReactNode; label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      {...radioAccessibilityProps(selected)}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}
    >
      {icon}
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#7489AA" style={styles.input} {...props} />
    </View>
  );
}

function StatusCard({ detail, label, status }: { detail?: string; label: string; status: string | undefined }) {
  const copy = status === 'completed' ? 'Verified' : status === 'under_review' ? 'Under review' : status === 'action_required' ? 'Action required' : 'Not submitted';
  return (
    <View style={[styles.statusCard, status === 'completed' && styles.statusComplete]}>
      <View style={styles.statusIcon}><BadgeCheck color={status === 'completed' ? colors.success : colors.brand} size={20} /></View>
      <View style={styles.statusCopy}>
        <Text style={styles.statusLabel}>{label}</Text>
        <Text style={styles.statusValue}>{copy}{detail ? ` • ${detail}` : ''}</Text>
      </View>
    </View>
  );
}

function SecurityNote({ text }: { text: string }) {
  return (
    <View style={styles.securityNote}>
      <ShieldCheck color={colors.brandPressed} size={18} />
      <Text style={styles.securityText}>{text}</Text>
    </View>
  );
}

function FormError({ message }: { message: string }) {
  return <Text accessibilityRole="alert" style={styles.error}>{message}</Text>;
}

function PrimaryButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, disabled && styles.buttonDisabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function getTaskStatus(
  tasks: Array<{ key: string; status: string }> | undefined,
  key: string,
) {
  return tasks?.find((task) => task.key === key)?.status;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 },
  backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 36 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.brandSoft, borderRadius: radii.lg, height: 54, justifyContent: 'center', width: 54 },
  subtitle: { color: colors.text, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  statusCard: { alignItems: 'center', backgroundColor: colors.brandSoft, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 13 },
  statusComplete: { backgroundColor: colors.successSoft, borderColor: '#B7E5C7' },
  statusIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, height: 38, justifyContent: 'center', width: 38 },
  statusCopy: { flex: 1 },
  statusLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  statusValue: { color: colors.text, fontSize: 12, fontWeight: '500', lineHeight: 17, marginTop: 2 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 7, minHeight: 44, paddingHorizontal: 12 },
  choiceSelected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  choiceText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: colors.brandPressed },
  field: { gap: 7 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  securityNote: { alignItems: 'flex-start', backgroundColor: colors.brandSoft, borderRadius: radii.md, flexDirection: 'row', gap: 9, padding: 12 },
  securityText: { color: colors.text, flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },
  error: { backgroundColor: colors.errorSoft, borderRadius: radii.md, color: colors.error, fontSize: 13, fontWeight: '600', lineHeight: 18, padding: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: radii.md, justifyContent: 'center', minHeight: 50, marginTop: 4, ...shadows.card },
  primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  buttonDisabled: { backgroundColor: '#AFCDF4' },
  pressed: { opacity: 0.82 },
});

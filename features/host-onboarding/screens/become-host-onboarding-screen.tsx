import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  BadgeIndianRupee,
  CalendarCheck,
  CarFront,
  Check,
  ClipboardCheck,
  FileCheck2,
  HandCoins,
  UserRound,
} from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useCallback, useState } from 'react';
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

import {
  hostOnboardingSchema,
  type HostOnboardingFormValues,
} from '@/features/host-onboarding/schemas/host-onboarding-schema';
import { hostsApi } from '@/services/hosts/hosts-api';
import { usersApi } from '@/services/users/users-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { useAuthStore } from '@/store/auth-store';
import { normalizeApiError } from '@/utils/errors';

type StepKey = 'personalInfo' | 'identity' | 'payout' | 'terms' | 'hostProfile';

const steps: Array<{ key: StepKey; label: string }> = [
  { key: 'personalInfo', label: 'Personal' },
  { key: 'identity', label: 'Verify' },
  { key: 'payout', label: 'Payout' },
  { key: 'terms', label: 'Terms' },
  { key: 'hostProfile', label: 'Profile' },
];

const introItems = [
  {
    icon: <CarFront color="#111827" size={22} />,
    title: 'List your car',
    body: 'Add photos, pricing, pickup location, and rental rules.',
  },
  {
    icon: <CalendarCheck color="#111827" size={22} />,
    title: 'Set your availability',
    body: 'Choose when your car is bookable and block unavailable dates.',
  },
  {
    icon: <ClipboardCheck color="#111827" size={22} />,
    title: 'Receive bookings',
    body: 'Customers book available windows after your listing is published.',
  },
  {
    icon: <HandCoins color="#111827" size={22} />,
    title: 'Earn money',
    body: 'Payout details are captured before you start hosting.',
  },
];

function getDefaultValues(): HostOnboardingFormValues {
  const user = useAuthStore.getState().user;
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return {
    personalInfo: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
    },
    identity: {
      documentType: 'pan',
      documentLast4: '',
      verificationConsent: false,
    },
    payout: {
      payoutMethod: 'upi',
      accountHolderName: displayName,
      bankName: null,
      accountLast4: null,
      upiId: null,
    },
    terms: {
      accepted: false,
    },
    hostProfile: {
      displayName: displayName || 'HopIn Host',
      bio: '',
    },
  };
}

export function BecomeHostOnboardingScreen() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [introVisible, setIntroVisible] = useState(true);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const handleInternalBack = useCallback(() => {
    if (isComplete || introVisible) {
      return false;
    }

    if (activeStepIndex > 0) {
      setActiveStepIndex((current) => Math.max(0, current - 1));
    } else {
      setIntroVisible(true);
    }

    return true;
  }, [activeStepIndex, introVisible, isComplete]);
  const goBack = useSafeBack({
    fallback: isComplete ? '/(host)/dashboard' : '/(customer)/profile',
    onBeforeBack: handleInternalBack,
    preferFallback: isComplete,
  });
  useWebBackGuard({ active: !introVisible && !isComplete, onBack: goBack });

  const {
    control,
    formState: { errors },
    handleSubmit,
    setError,
    trigger,
    watch,
  } = useForm<HostOnboardingFormValues>({
    defaultValues: getDefaultValues(),
    mode: 'onChange',
    resolver: zodResolver(hostOnboardingSchema),
  });

  const payoutMethod = watch('payout.payoutMethod');

  const completeMutation = useMutation({
    mutationFn: async (values: HostOnboardingFormValues) => {
      await hostsApi.completeOnboarding(values);
      return usersApi.me();
    },
    onError: (error) => {
      setError('root', { message: normalizeApiError(error).message });
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      setIsComplete(true);
    },
  });

  const activeStep = steps[activeStepIndex];
  const progress = ((activeStepIndex + 1) / steps.length) * 100;

  const goNext = async () => {
    const isStepValid = await trigger(activeStep.key);

    if (!isStepValid) {
      return;
    }

    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex((current) => current + 1);
      return;
    }

    handleSubmit((values) => completeMutation.mutate(values))();
  };

  if (introVisible) {
    return (
      <OnboardingShell
        footer={
          <Pressable
            accessibilityRole="button"
            onPress={() => setIntroVisible(false)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Start onboarding</Text>
          </Pressable>
        }
        onBack={goBack}
        title="Become a Host"
      >
        <View style={styles.introHeader}>
          <View style={styles.heroIcon}>
            <BadgeIndianRupee color="#0F172A" size={38} />
          </View>
          <Text style={styles.introTitle}>Turn your car into an earning asset</Text>
          <Text style={styles.introBody}>
            Complete host setup once. Your existing HopIn account will keep working
            for customer trips and gain host capability.
          </Text>
        </View>

        <View style={styles.introList}>
          {introItems.map((item) => (
            <View key={item.title} style={styles.introItem}>
              <View style={styles.introIcon}>{item.icon}</View>
              <View style={styles.introCopy}>
                <Text style={styles.introItemTitle}>{item.title}</Text>
                <Text style={styles.introItemBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </OnboardingShell>
    );
  }

  if (isComplete) {
    return (
      <OnboardingShell onBack={goBack} title="Host enabled">
        <View style={styles.completeState}>
          <View style={styles.successIcon}>
            <Check color="#047857" size={42} />
          </View>
          <Text style={styles.completeTitle}>You can now host on HopIn</Text>
          <Text style={styles.completeBody}>
            Host capability is enabled on your existing account. Switch to host mode
            whenever you want to manage listings.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(host)/dashboard')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Switch to Host</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(host)/vehicles/new')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Start adding a vehicle</Text>
          </Pressable>
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      footer={
        <View style={styles.footerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={completeMutation.isPending}
            onPress={goNext}
            style={[
              styles.primaryButton,
              completeMutation.isPending && styles.disabledButton,
            ]}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {activeStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Text>
            )}
          </Pressable>
        </View>
      }
      onBack={goBack}
      title="Host onboarding"
    >
      <ProgressHeader activeIndex={activeStepIndex} progress={progress} />

      {activeStep.key === 'personalInfo' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<UserRound color="#111827" size={20} />}
            subtitle="This profile stays shared between customer and host mode."
            title="Personal information"
          />
          <Field
            control={control}
            error={errors.personalInfo?.firstName?.message}
            label="First name"
            name="personalInfo.firstName"
            placeholder="First name"
          />
          <Field
            control={control}
            error={errors.personalInfo?.lastName?.message}
            label="Last name"
            name="personalInfo.lastName"
            placeholder="Last name"
          />
          <Field
            autoCapitalize="none"
            control={control}
            error={errors.personalInfo?.email?.message}
            inputMode="email"
            keyboardType="email-address"
            label="Email"
            name="personalInfo.email"
            placeholder="name@example.com"
          />
          <Field
            control={control}
            error={errors.personalInfo?.phoneNumber?.message}
            inputMode="tel"
            keyboardType="phone-pad"
            label="Mobile number"
            name="personalInfo.phoneNumber"
            placeholder="+91..."
          />
        </View>
      ) : null}

      {activeStep.key === 'identity' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<FileCheck2 color="#111827" size={20} />}
            subtitle="We collect a lightweight verification record before hosting."
            title="Identity and verification"
          />
          <Text style={styles.fieldLabel}>Document type</Text>
          <SegmentedField
            control={control}
            name="identity.documentType"
            options={[
              ['pan', 'PAN'],
              ['aadhaar', 'Aadhaar'],
              ['driving_license', 'Driving license'],
              ['passport', 'Passport'],
            ]}
          />
          <Field
            control={control}
            error={errors.identity?.documentLast4?.message}
            inputMode="numeric"
            keyboardType="number-pad"
            label="Document last 4 digits"
            maxLength={4}
            name="identity.documentLast4"
            placeholder="1234"
          />
          <CheckboxField
            control={control}
            error={errors.identity?.verificationConsent?.message}
            label="I consent to identity verification for hosting."
            name="identity.verificationConsent"
          />
        </View>
      ) : null}

      {activeStep.key === 'payout' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<HandCoins color="#111827" size={20} />}
            subtitle="Payout details are stored with your host onboarding record."
            title="Payout information"
          />
          <Text style={styles.fieldLabel}>Payout method</Text>
          <SegmentedField
            control={control}
            name="payout.payoutMethod"
            options={[
              ['upi', 'UPI'],
              ['bank_account', 'Bank account'],
            ]}
          />
          <Field
            control={control}
            error={errors.payout?.accountHolderName?.message}
            label="Account holder name"
            name="payout.accountHolderName"
            placeholder="Full name"
          />
          {payoutMethod === 'upi' ? (
            <Field
              autoCapitalize="none"
              control={control}
              error={errors.payout?.upiId?.message}
              label="UPI ID"
              name="payout.upiId"
              placeholder="name@bank"
            />
          ) : (
            <>
              <Field
                control={control}
                error={errors.payout?.bankName?.message}
                label="Bank name"
                name="payout.bankName"
                placeholder="Bank name"
              />
              <Field
                control={control}
                error={errors.payout?.accountLast4?.message}
                inputMode="numeric"
                keyboardType="number-pad"
                label="Account last 4 digits"
                maxLength={4}
                name="payout.accountLast4"
                placeholder="1234"
              />
            </>
          )}
        </View>
      ) : null}

      {activeStep.key === 'terms' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<ClipboardCheck color="#111827" size={20} />}
            subtitle="Host access requires accepting marketplace responsibilities."
            title="Host terms acceptance"
          />
          <View style={styles.termsBox}>
            <Text style={styles.termsText}>
              Keep vehicle details accurate, honor confirmed bookings, maintain
              availability, follow handoff rules, and accept HopIn host policies.
            </Text>
          </View>
          <CheckboxField
            control={control}
            error={errors.terms?.accepted?.message}
            label="I accept the HopIn host terms."
            name="terms.accepted"
          />
        </View>
      ) : null}

      {activeStep.key === 'hostProfile' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<UserRound color="#111827" size={20} />}
            subtitle="Customers see this host profile on vehicle listings."
            title="Host profile creation"
          />
          <Field
            control={control}
            error={errors.hostProfile?.displayName?.message}
            label="Host display name"
            name="hostProfile.displayName"
            placeholder="Your host name"
          />
          <Field
            control={control}
            error={errors.hostProfile?.bio?.message}
            label="Host bio"
            multiline
            name="hostProfile.bio"
            placeholder="Tell customers what kind of experience you provide."
          />
          {errors.root?.message ? (
            <Text style={styles.errorText}>{errors.root.message}</Text>
          ) : null}
        </View>
      ) : null}
    </OnboardingShell>
  );
}

function OnboardingShell({
  children,
  footer,
  onBack,
  title,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack: () => void;
  title: string;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack}
            style={styles.iconButton}
          >
            <ArrowLeft color="#111827" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressHeader({
  activeIndex,
  progress,
}: {
  activeIndex: number;
  progress: number;
}) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressTop}>
        <Text style={styles.progressTitle}>
          Step {activeIndex + 1} of {steps.length}
        </Text>
        <Text style={styles.progressTitle}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.stepLabels}>
        {steps.map((step, index) => (
          <Text
            key={step.key}
            numberOfLines={1}
            style={[
              styles.stepLabel,
              index === activeIndex && styles.activeStepLabel,
            ]}
          >
            {step.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function StepTitle({
  icon,
  subtitle,
  title,
}: {
  icon: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.stepTitleRow}>
      <View style={styles.stepIcon}>{icon}</View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Field({
  autoCapitalize,
  control,
  error,
  inputMode,
  keyboardType,
  label,
  maxLength,
  multiline,
  name,
  placeholder,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  control: ReturnType<typeof useForm<HostOnboardingFormValues>>['control'];
  error?: string;
  inputMode?: 'text' | 'email' | 'numeric' | 'tel';
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  label: string;
  maxLength?: number;
  multiline?: boolean;
  name: Parameters<typeof Controller<HostOnboardingFormValues>>[0]['name'];
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            autoCapitalize={autoCapitalize}
            inputMode={inputMode}
            keyboardType={keyboardType}
            maxLength={maxLength}
            multiline={multiline}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              multiline && styles.multilineInput,
              error && styles.inputError,
            ]}
            value={value ? String(value) : ''}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function SegmentedField({
  control,
  name,
  options,
}: {
  control: ReturnType<typeof useForm<HostOnboardingFormValues>>['control'];
  name: Parameters<typeof Controller<HostOnboardingFormValues>>[0]['name'];
  options: Array<[string, string]>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.segmented}>
          {options.map(([optionValue, label]) => {
            const isSelected = value === optionValue;

            return (
              <Pressable
                accessibilityRole="button"
                key={optionValue}
                onPress={() => onChange(optionValue)}
                style={[
                  styles.segment,
                  isSelected && styles.selectedSegment,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isSelected && styles.selectedSegmentText,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    />
  );
}

function CheckboxField({
  control,
  error,
  label,
  name,
}: {
  control: ReturnType<typeof useForm<HostOnboardingFormValues>>['control'];
  error?: string;
  label: string;
  name: Parameters<typeof Controller<HostOnboardingFormValues>>[0]['name'];
}) {
  return (
    <View style={styles.field}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(value) }}
            onPress={() => onChange(!value)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, value && styles.checkedBox]}>
              {value ? <Check color="#FFFFFF" size={14} /> : null}
            </View>
            <Text style={styles.checkboxText}>{label}</Text>
          </Pressable>
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 24,
  },
  contentScroll: {
    flex: 1,
    minHeight: 0,
  },
  introHeader: {
    gap: 12,
  },
  heroIcon: {
    height: 82,
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
  },
  introTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  introBody: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
  introList: {
    gap: 10,
  },
  introItem: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  introIcon: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F7FAFF',
  },
  introCopy: {
    flex: 1,
    gap: 4,
  },
  introItemTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  introItemBody: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  progressCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
  },
  stepLabels: {
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
  },
  stepLabel: {
    flex: 1,
    minWidth: 0,
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  activeStepLabel: {
    color: '#111827',
  },
  form: {
    gap: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  stepTitleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  stepIcon: {
    height: 38,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F7FAFF',
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  stepSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  multilineInput: {
    minHeight: 112,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  selectedSegment: {
    borderColor: '#0B4FE8',
    backgroundColor: '#0B4FE8',
  },
  segmentText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedSegmentText: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F7FAFF',
    padding: 12,
  },
  checkbox: {
    height: 22,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  checkedBox: {
    borderColor: '#0B4FE8',
    backgroundColor: '#0B4FE8',
  },
  checkboxText: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  termsBox: {
    borderRadius: 8,
    backgroundColor: '#F7FAFF',
    padding: 12,
  },
  termsText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 14,
  },
  secondaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  completeState: {
    minHeight: 520,
    justifyContent: 'center',
    gap: 16,
  },
  successIcon: {
    height: 82,
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  completeTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  completeBody: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
});

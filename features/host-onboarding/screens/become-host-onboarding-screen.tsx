import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Check, ClipboardCheck, UserRound } from 'lucide-react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  HOST_TERMS_VERSION,
  hostOnboardingSchema,
  type HostOnboardingFormValues,
} from '@/features/host-onboarding/schemas/host-onboarding-schema';
import { hostStatusQueryKey, useHostStatus } from '@/features/host/hooks/use-host-status';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { hostsApi } from '@/services/hosts/hosts-api';
import { usersApi } from '@/services/users/users-api';
import { useAuthStore } from '@/store/auth-store';
import { type SafeUser } from '@/types/auth';
import { normalizeApiError } from '@/utils/errors';

type StepKey = 'hostProfile' | 'terms';

const steps: Array<{ key: StepKey; label: string }> = [
  { key: 'hostProfile', label: 'Host profile' },
  { key: 'terms', label: 'Host terms' },
];

type PartialHostOnboardingValues = Partial<HostOnboardingFormValues>;

function defaultValues(user: SafeUser | null | undefined): HostOnboardingFormValues {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  return {
    hostProfile: {
      displayName: name || 'HopIn Host',
      bio: '',
    },
    terms: {
      accepted: false,
      policyVersion: HOST_TERMS_VERSION,
    },
  };
}

function draftValues(
  values: Record<string, unknown> | undefined,
  user: SafeUser | null | undefined,
): HostOnboardingFormValues {
  const defaults = defaultValues(user);
  const draft = (values ?? {}) as PartialHostOnboardingValues;

  return {
    hostProfile: { ...defaults.hostProfile, ...draft.hostProfile },
    terms: {
      ...defaults.terms,
      ...draft.terms,
      policyVersion: HOST_TERMS_VERSION,
    },
  };
}

export function BecomeHostOnboardingScreen() {
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const hostStatusQuery = useHostStatus();
  const accountQuery = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
    initialData: storedUser ?? undefined,
  });
  const account = accountQuery.data ?? storedUser;
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasHydratedDraft = useRef(false);

  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    reset,
    setError,
    trigger,
  } = useForm<HostOnboardingFormValues>({
    defaultValues: defaultValues(storedUser),
    mode: 'onChange',
    resolver: zodResolver(hostOnboardingSchema),
  });
  const watchedValues = useWatch({ control });
  const activeStep = steps[activeStepIndex];
  const isProfileCreated =
    hostStatusQuery.data?.status === 'profile_created' ||
    hostStatusQuery.data?.status === 'active';

  const draftMutation = useMutation({
    mutationFn: hostsApi.saveOnboardingDraft,
    onSuccess: (status) => queryClient.setQueryData(hostStatusQueryKey, status),
  });

  const saveDraft = useCallback(
    (
      stepIndex: number,
      values: Record<string, unknown> = getValues() as Record<string, unknown>,
    ) => {
      draftMutation.mutate({
        activeStepIndex: Math.min(stepIndex, steps.length - 1),
        values,
      });
    },
    [draftMutation, getValues],
  );

  useEffect(() => {
    if (
      hasHydratedDraft.current ||
      hostStatusQuery.isLoading ||
      (!account && accountQuery.isLoading)
    ) {
      return;
    }

    const draft = hostStatusQuery.data?.draft;
    reset(draftValues(draft?.values, account));

    if (hostStatusQuery.data?.status === 'in_progress' && draft) {
      setActiveStepIndex(Math.min(draft.activeStepIndex, steps.length - 1));
    }

    hasHydratedDraft.current = true;
  }, [account, accountQuery.isLoading, hostStatusQuery.data, hostStatusQuery.isLoading, reset]);

  const completeMutation = useMutation({
    mutationFn: async (values: HostOnboardingFormValues) => {
      await hostsApi.completeOnboarding(values);
      return usersApi.me();
    },
    onError: (error) => {
      setIsTransitioning(false);
      setError('root', { message: normalizeApiError(error).message });
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      void queryClient.invalidateQueries({ queryKey: hostStatusQueryKey });
      setIsComplete(true);
    },
  });

  useEffect(() => {
    if (!hasHydratedDraft.current || isComplete || completeMutation.isPending) {
      return;
    }

    const timer = setTimeout(() => {
      saveDraft(activeStepIndex, watchedValues as Record<string, unknown>);
    }, 650);

    return () => clearTimeout(timer);
  }, [activeStepIndex, completeMutation.isPending, isComplete, saveDraft, watchedValues]);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    const timer = setTimeout(() => router.replace('/(host)/dashboard'), 1300);

    return () => clearTimeout(timer);
  }, [isComplete]);

  useEffect(() => {
    if (isProfileCreated) {
      router.replace('/(host)/dashboard');
    }
  }, [isProfileCreated]);

  const handleInternalBack = useCallback(() => {
    if (isComplete) {
      return false;
    }

    if (activeStepIndex > 0) {
      const previousStep = activeStepIndex - 1;
      setActiveStepIndex(previousStep);
      saveDraft(previousStep);
      return true;
    }

    saveDraft(0);
    return false;
  }, [activeStepIndex, isComplete, saveDraft]);
  const goBack = useSafeBack({
    fallback: isComplete ? '/(host)/dashboard' : '/(customer)/profile',
    onBeforeBack: handleInternalBack,
    preferFallback: isComplete,
  });
  useWebBackGuard({ active: !isComplete && !isProfileCreated, onBack: goBack });

  const goNext = async () => {
    if (isTransitioning || completeMutation.isPending) {
      return;
    }

    setIsTransitioning(true);
    const isStepValid = await trigger(activeStep.key);

    if (!isStepValid) {
      setIsTransitioning(false);
      return;
    }

    if (activeStepIndex < steps.length - 1) {
      const nextStepIndex = activeStepIndex + 1;
      setActiveStepIndex(nextStepIndex);
      saveDraft(nextStepIndex);
      setIsTransitioning(false);
      return;
    }

    handleSubmit((values) => completeMutation.mutate(values))();
  };

  const isLoading =
    !hasHydratedDraft.current ||
    hostStatusQuery.isLoading ||
    (!account && accountQuery.isLoading);
  const hasLoadError = hostStatusQuery.isError || (!account && accountQuery.isError);

  if (isProfileCreated) {
    return <RedirectingState title="Opening host dashboard" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (hasLoadError) {
    return (
      <OnboardingShell onBack={goBack} title="Become a Host">
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>We could not load your host setup</Text>
          <Text style={styles.stateBody}>Check your connection and try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void hostStatusQuery.refetch();
              void accountQuery.refetch();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </OnboardingShell>
    );
  }

  if (isComplete) {
    return (
      <OnboardingShell onBack={goBack} title="Host profile created">
        <View style={styles.completeState}>
          <View style={styles.successIcon}>
            <Check color="#047857" size={34} />
          </View>
          <Text style={styles.completeTitle}>Your host profile is ready</Text>
          <Text style={styles.completeBody}>
            Your host status is Setup Pending. You can start vehicle listing drafts
            while verification and payout setup are completed later.
          </Text>
          <ActivityIndicator color="#0B6FE8" />
          <Text style={styles.redirectingText}>Opening your host dashboard…</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(host)/dashboard')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Open dashboard now</Text>
          </Pressable>
        </View>
      </OnboardingShell>
    );
  }

  const accountName = [account?.firstName, account?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const accountDetails = [account?.email, account?.phoneNumber].filter(Boolean).join(' · ');

  return (
    <OnboardingShell
      footer={
        <View style={styles.footerActions}>
          {activeStepIndex > 0 ? (
            <Pressable accessibilityRole="button" onPress={goBack} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isTransitioning || completeMutation.isPending }}
            disabled={isTransitioning || completeMutation.isPending}
            onPress={goNext}
            style={[
              styles.primaryButton,
              activeStepIndex === 0 && styles.fullWidthButton,
              (isTransitioning || completeMutation.isPending) && styles.disabledButton,
            ]}
          >
            {isTransitioning || completeMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {activeStepIndex === 0 ? 'Continue' : 'Create Host Profile'}
              </Text>
            )}
          </Pressable>
        </View>
      }
      onBack={goBack}
      title="Become a Host"
    >
      <ProgressHeader activeIndex={activeStepIndex} />

      {activeStep.key === 'hostProfile' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<UserRound color="#102550" size={20} />}
            subtitle="Your customer account details stay shared. Choose how customers will see you as a host."
            title="Create Host Profile"
          />
          <View style={styles.accountCard}>
            <Text style={styles.accountLabel}>USING YOUR HOPIN ACCOUNT</Text>
            <Text style={styles.accountName}>{accountName || 'Your HopIn account'}</Text>
            <Text style={styles.accountDetails}>
              {accountDetails || 'Your verified account details will be used.'}
            </Text>
          </View>
          <Field
            autoCapitalize="words"
            control={control}
            error={errors.hostProfile?.displayName?.message}
            label="Host display name"
            name="hostProfile.displayName"
            placeholder="Your host name"
          />
          <Field
            control={control}
            error={errors.hostProfile?.bio?.message}
            label="Host bio · Optional"
            maxLength={500}
            multiline
            name="hostProfile.bio"
            placeholder="Tell customers a little about your hosting style."
          />
        </View>
      ) : null}

      {activeStep.key === 'terms' ? (
        <View style={styles.form}>
          <StepTitle
            icon={<ClipboardCheck color="#102550" size={20} />}
            subtitle="Review the essentials before your host profile is created."
            title="Accept Host Terms"
          />
          <View style={styles.termsBox}>
            <Text style={styles.termsHeading}>As a HopIn host, you agree to:</Text>
            <Text style={styles.termsText}>Keep listing details and availability accurate.</Text>
            <Text style={styles.termsText}>Honor confirmed bookings and handoff commitments.</Text>
            <Text style={styles.termsText}>Follow safety, pricing, and platform policies.</Text>
          </View>
          <View style={styles.policyLinks}>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/(customer)/policy?type=host-terms')}
            >
              <Text style={styles.policyLinkText}>Read Host Terms</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/(customer)/policy?type=privacy')}
            >
              <Text style={styles.policyLinkText}>Privacy Policy</Text>
            </Pressable>
          </View>
          <CheckboxField
            control={control}
            error={errors.terms?.accepted?.message}
            label="I agree to the HopIn Host Terms."
            name="terms.accepted"
          />
          {errors.root?.message ? <Text style={styles.errorText}>{errors.root.message}</Text> : null}
        </View>
      ) : null}

      {draftMutation.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => saveDraft(activeStepIndex)}
          style={styles.saveError}
        >
          <Text style={styles.saveErrorText}>Progress was not saved. Tap to retry.</Text>
        </Pressable>
      ) : draftMutation.isPending ? (
        <Text accessibilityLiveRegion="polite" style={styles.savingText}>Saving progress…</Text>
      ) : null}
    </OnboardingShell>
  );
}

function LoadingState() {
  return (
    <OnboardingShell onBack={() => router.replace('/(customer)/profile')} title="Become a Host">
      <View style={styles.stateCard}>
        <ActivityIndicator color="#0B6FE8" />
        <Text style={styles.stateBody}>Loading your host setup…</Text>
      </View>
    </OnboardingShell>
  );
}

function RedirectingState({ title }: { title: string }) {
  return (
    <OnboardingShell onBack={() => router.replace('/(host)/dashboard')} title="Host profile ready">
      <View style={styles.stateCard}>
        <ActivityIndicator color="#0B6FE8" />
        <Text style={styles.stateBody}>{title}…</Text>
      </View>
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
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.keyboardView}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
            <ArrowLeft color="#102550" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressHeader({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressTitle}>Step {activeIndex + 1} of {steps.length}</Text>
      <View style={styles.stepRow}>
        {steps.map((step, index) => (
          <View key={step.key} style={styles.stepItem}>
            <View style={[styles.stepDot, index <= activeIndex && styles.activeStepDot]}>
              {index < activeIndex ? <Check color="#FFFFFF" size={13} /> : <Text style={[styles.stepNumber, index <= activeIndex && styles.activeStepNumber]}>{index + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, index === activeIndex && styles.activeStepLabel]}>{step.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepTitle({ icon, subtitle, title }: { icon: React.ReactNode; subtitle: string; title: string }) {
  return <View style={styles.stepTitleRow}><View style={styles.stepIcon}>{icon}</View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepSubtitle}>{subtitle}</Text></View></View>;
}

function Field({
  autoCapitalize,
  control,
  error,
  label,
  maxLength,
  multiline,
  name,
  placeholder,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  control: ReturnType<typeof useForm<HostOnboardingFormValues>>['control'];
  error?: string;
  label: string;
  maxLength?: number;
  multiline?: boolean;
  name: Parameters<typeof Controller<HostOnboardingFormValues>>[0]['name'];
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller control={control} name={name} render={({ field: { onBlur, onChange, value } }) => (
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          multiline={multiline}
          onBlur={onBlur}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#536B91"
          style={[styles.input, multiline && styles.multilineInput, error && styles.inputError]}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value ? String(value) : ''}
        />
      )} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
    </View>
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
      <Controller control={control} name={name} render={({ field: { onChange, value } }) => (
        <Pressable accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(value) }} onPress={() => onChange(!value)} style={styles.checkboxRow}>
          <View style={[styles.checkbox, value && styles.checkedBox]}>{value ? <Check color="#FFFFFF" size={14} /> : null}</View>
          <Text style={styles.checkboxText}>{label}</Text>
        </Pressable>
      )} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F3F9FF', flex: 1 },
  keyboardView: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 72, paddingHorizontal: 16 },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerTitle: { color: '#102550', fontSize: 24, fontWeight: '900' },
  content: { gap: 16, padding: 16, paddingBottom: 24 },
  contentScroll: { flex: 1, minHeight: 0 },
  footer: { backgroundColor: '#FFFFFF', borderTopColor: '#D6E8FF', borderTopWidth: 1, padding: 16 },
  footerActions: { flexDirection: 'row', gap: 10 },
  primaryButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 50, paddingHorizontal: 16 },
  fullWidthButton: { flex: 1 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 50, paddingHorizontal: 18 },
  secondaryButtonText: { color: '#102550', fontSize: 15, fontWeight: '800' },
  disabledButton: { backgroundColor: '#536B91', opacity: 0.65 },
  progressCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 14, padding: 14 },
  progressTitle: { color: '#536B91', fontSize: 13, fontWeight: '800' },
  stepRow: { flexDirection: 'row', gap: 16 },
  stepItem: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
  stepDot: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  activeStepDot: { backgroundColor: '#0B6FE8', borderColor: '#0B6FE8' },
  stepNumber: { color: '#536B91', fontSize: 12, fontWeight: '900' },
  activeStepNumber: { color: '#FFFFFF' },
  stepLabel: { color: '#536B91', flex: 1, fontSize: 12, fontWeight: '700' },
  activeStepLabel: { color: '#102550', fontWeight: '900' },
  form: { gap: 16 },
  stepTitleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  stepIcon: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  stepCopy: { flex: 1, gap: 4 },
  stepTitle: { color: '#102550', fontSize: 21, fontWeight: '900' },
  stepSubtitle: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  accountCard: { backgroundColor: '#EAF4FF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, gap: 5, padding: 14 },
  accountLabel: { color: '#536B91', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  accountName: { color: '#102550', fontSize: 16, fontWeight: '900' },
  accountDetails: { color: '#536B91', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  field: { gap: 7 },
  fieldLabel: { color: '#102550', fontSize: 14, fontWeight: '800' },
  input: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, color: '#102550', fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  multilineInput: { minHeight: 104, paddingTop: 13 },
  inputError: { borderColor: '#DC2626' },
  termsBox: { backgroundColor: '#EAF4FF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  termsHeading: { color: '#102550', fontSize: 15, fontWeight: '900' },
  termsText: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  policyLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  policyLinkText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900', textDecorationLine: 'underline' },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 48 },
  checkbox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkedBox: { backgroundColor: '#0B6FE8', borderColor: '#0B6FE8' },
  checkboxText: { color: '#102550', flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  savingText: { color: '#536B91', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  saveError: { alignItems: 'center', backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 10, borderWidth: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  saveErrorText: { color: '#B91C1C', fontSize: 13, fontWeight: '800' },
  completeState: { alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 60 },
  successIcon: { alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  completeTitle: { color: '#102550', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  completeBody: { color: '#536B91', fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
  redirectingText: { color: '#536B91', fontSize: 13, fontWeight: '700' },
  stateCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 12, marginTop: 24, padding: 22 },
  stateTitle: { color: '#102550', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  stateBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  retryButton: { alignItems: 'center', borderColor: '#0B6FE8', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  retryButtonText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' },
});

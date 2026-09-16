import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Banknote,
  CalendarClock,
  CarFront,
  ChevronRight,
  CreditCard,
  FileText,
  Headphones,
  LogOut,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import {
  profileSchema,
  type ProfileFormValues,
} from '@/features/profile/schemas/profile-schema';
import { usersApi } from '@/services/users/users-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { useAuthStore } from '@/store/auth-store';
import { type SafeUser, UserRole } from '@/types/auth';
import { normalizeApiError } from '@/utils/errors';
import { colors, radii, shadows } from '@/utils/theme';

type ProfileScreenProps = {
  mode: 'customer' | 'host';
};

type SectionItem = {
  label: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

function getDisplayName(user: SafeUser | null | undefined) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return fullName || 'HopIn user';
}

function getInitials(user: SafeUser | null | undefined) {
  const name = getDisplayName(user);
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toFormValues(user: SafeUser | null | undefined): ProfileFormValues {
  return {
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    email: user?.email ?? null,
    phoneNumber: user?.phoneNumber ?? '',
    profileImageUrl: user?.profileImageUrl ?? null,
  };
}

export function ProfileScreen({ mode }: ProfileScreenProps) {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({
    initialData: authUser ?? undefined,
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
  });

  const profile = profileQuery.data;

  const {
    control,
    formState: { errors, isDirty, isValid },
    handleSubmit,
    reset,
    setError,
  } = useForm<ProfileFormValues>({
    defaultValues: toFormValues(profile),
    mode: 'onChange',
    resolver: zodResolver(profileSchema),
  });
  const closeEditorBeforeBack = useCallback(() => {
    if (!isEditing) {
      return false;
    }

    setIsEditing(false);
    return true;
  }, [isEditing]);
  const goBack = useSafeBack({
    fallback: '/(customer)/home',
    onBeforeBack: closeEditorBeforeBack,
  });
  useWebBackGuard({ active: isEditing, onBack: goBack });

  useEffect(() => {
    if (profile) {
      setUser(profile);
      reset(toFormValues(profile));
    }
  }, [profile, reset, setUser]);

  const updateMutation = useMutation({
    mutationFn: usersApi.updateMe,
    onError: (error) => {
      setError('root', { message: normalizeApiError(error).message });
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      reset(toFormValues(updatedUser));
      setIsEditing(false);
    },
  });

  const sections = useMemo<SectionItem[]>(
    () => [
      ...(mode === 'host'
        ? [
            {
              label: 'My Cars',
              description: 'Manage your vehicle listings',
              icon: <CarFront color="#111827" size={20} />,
              onPress: () => router.push('/(host)/cars'),
            },
            {
              label: 'Bookings',
              description: 'Review customer reservations',
              icon: <CalendarClock color="#111827" size={20} />,
              onPress: () => router.push('/(host)/bookings'),
            },
            {
              label: 'Earnings',
              description: 'Track your host payouts',
              icon: <Banknote color="#111827" size={20} />,
              onPress: () => router.push('/(host)/earnings'),
            },
          ]
        : []),
      {
        label: 'Personal information',
        description: 'View and update your details',
        icon: <UserRound color="#111827" size={20} />,
        onPress: () => setIsEditing(true),
      },
      {
        label: 'Payment methods',
        description: 'Manage your cards and wallets',
        icon: <CreditCard color="#111827" size={20} />,
        onPress: () => showPending('Payment methods are not connected yet.'),
      },
      {
        label: 'Documents',
        description: 'Manage your documents',
        icon: <FileText color="#111827" size={20} />,
        onPress: () => showPending('Document upload will be added in a later phase.'),
      },
      {
        label: 'Notifications',
        description: 'Manage your alerts and updates',
        icon: <Bell color="#111827" size={20} />,
        onPress: () => showPending('Notification preferences are not connected yet.'),
      },
      {
        label: 'Help & Support',
        description: 'Get help or contact us',
        icon: <Headphones color="#111827" size={20} />,
        onPress: () => showPending('Support workflows are not connected yet.'),
      },
      {
        label: 'Privacy & Security',
        description: 'Manage your data and security',
        icon: <ShieldCheck color="#111827" size={20} />,
        onPress: () => showPending('Privacy settings are not connected yet.'),
      },
      {
        label: 'Logout',
        description: '',
        icon: <LogOut color="#B91C1C" size={20} />,
        destructive: true,
        onPress: () => {
          void logout().then(() => {
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace('/(auth)/login');
          });
        },
      },
    ],
    [logout, mode, profile?.capabilities.canHost, profile?.hostEnabled, profile?.role],
  );

  const submitProfile = handleSubmit((values) => {
    updateMutation.mutate(values);
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerLead}>
              {mode === 'host' ? (
                <Pressable
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                  onPress={goBack}
                  style={styles.iconButton}
                >
                  <ArrowLeft color="#111827" size={20} />
                </Pressable>
              ) : null}
              <View>
                <Text style={styles.title}>Profile</Text>
                <Text style={styles.subtitle}>Manage your account and preferences</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsEditing((current) => !current)}
              style={styles.iconButton}
            >
              <Settings color={colors.ink} size={22} />
            </Pressable>
          </View>

          {profileQuery.isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#111827" />
              <Text style={styles.mutedText}>Loading profile</Text>
            </View>
          ) : profileQuery.isError ? (
            <StateMessage
              actionLabel="Try again"
              body={normalizeApiError(profileQuery.error).message}
              onAction={() => void profileQuery.refetch()}
              title="Profile could not load"
            />
          ) : profile ? (
            <>
              <ProfileSummary onPress={() => setIsEditing(true)} user={profile} />

              {mode === 'customer' || mode === 'host' ? (
                <HostBanner
                  hasHostCapability={hasHostCapability(profile)}
                  mode={mode}
                  onPress={() =>
                    mode === 'host'
                      ? router.replace('/(customer)/home')
                      : hasHostCapability(profile)
                      ? router.push('/(host)/profile')
                      : router.push('/(customer)/become-host')
                  }
                />
              ) : null}

              {isEditing ? (
                <View style={styles.form}>
                  <ProfileInput
                    control={control}
                    error={errors.firstName?.message}
                    label="First name"
                    name="firstName"
                    placeholder="First name"
                  />
                  <ProfileInput
                    control={control}
                    error={errors.lastName?.message}
                    label="Last name"
                    name="lastName"
                    placeholder="Last name"
                  />
                  <ProfileInput
                    autoCapitalize="none"
                    control={control}
                    error={errors.email?.message}
                    inputMode="email"
                    keyboardType="email-address"
                    label="Email"
                    name="email"
                    placeholder="Email address"
                  />
                  <ProfileInput
                    control={control}
                    error={errors.phoneNumber?.message}
                    inputMode="tel"
                    keyboardType="phone-pad"
                    label="Mobile number"
                    name="phoneNumber"
                    placeholder="+91..."
                  />
                  <ProfileInput
                    autoCapitalize="none"
                    control={control}
                    error={errors.profileImageUrl?.message}
                    inputMode="url"
                    keyboardType="url"
                    label="Profile image URL"
                    name="profileImageUrl"
                    placeholder="https://..."
                  />

                  {errors.root?.message ? (
                    <Text style={styles.errorText}>{errors.root.message}</Text>
                  ) : null}

                  <View style={styles.formActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        reset(toFormValues(profile));
                        setIsEditing(false);
                      }}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!isDirty || !isValid || updateMutation.isPending}
                      onPress={submitProfile}
                      style={[
                        styles.primaryButton,
                        (!isDirty || !isValid || updateMutation.isPending) &&
                          styles.disabledButton,
                      ]}
                    >
                      {updateMutation.isPending ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Save profile</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {mode === 'host' ? <SectionHeading title="Host workspace" /> : null}
              {mode === 'host' ? (
                <View style={styles.section}>
                  {sections.slice(0, 3).map((item) => (
                    <SectionRow key={item.label} item={item} />
                  ))}
                </View>
              ) : null}

              <SectionHeading title="Account" />
              <View style={styles.section}>
                {sections.slice(mode === 'host' ? 3 : 0, mode === 'host' ? 6 : 3).map((item) => (
                  <SectionRow key={item.label} item={item} />
                ))}
              </View>

              <SectionHeading title="Preferences" />
              <View style={styles.section}>
                <SectionRow item={sections[mode === 'host' ? 6 : 3]} />
              </View>

              <SectionHeading title="Support & Security" />
              <View style={styles.section}>
                {sections.slice(mode === 'host' ? 7 : 4, mode === 'host' ? 9 : 6).map((item) => (
                  <SectionRow key={item.label} item={item} />
                ))}
              </View>

              <View style={styles.logoutSection}>
                <SectionRow item={sections[mode === 'host' ? 9 : 6]} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {mode === 'customer' ? <BottomNavigation /> : null}
    </SafeAreaView>
  );
}

function hasHostCapability(profile: SafeUser | undefined) {
  return Boolean(
    profile?.capabilities.canHost ||
      profile?.hostEnabled ||
      profile?.role === UserRole.Host,
  );
}

function ProfileSummary({ onPress, user }: { onPress: () => void; user: SafeUser }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
    >
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{getInitials(user)}</Text>
        </View>
      )}
      <View style={styles.summaryCopy}>
        <Text style={styles.name}>{getDisplayName(user)}</Text>
        <InfoLine
          icon={<Phone color="#6B7280" size={16} />}
          text={user.phoneNumber ?? 'Mobile number not added'}
          trailing={user.phoneVerified ? <ShieldCheck color={colors.success} size={21} /> : undefined}
        />
        <View style={styles.emailRow}>
          <Mail color={colors.text} size={18} />
          <Text style={[styles.emailAction, user.email && styles.emailValue]}>
            {user.email ?? 'Add email address'}
          </Text>
          <ArrowRight color={user.email ? colors.muted : colors.brand} size={19} />
        </View>
      </View>
      <ChevronRight color={colors.text} size={22} />
    </Pressable>
  );
}

function InfoLine({ icon, text, trailing }: { icon: React.ReactNode; text: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.infoLine}>
      {icon}
      <Text numberOfLines={1} style={styles.infoText}>
        {text}
      </Text>
      {trailing}
    </View>
  );
}

function HostBanner({ hasHostCapability, mode, onPress }: { hasHostCapability: boolean; mode: ProfileScreenProps['mode']; onPress: () => void }) {
  const title = mode === 'host' ? 'Switch to Customer' : hasHostCapability ? 'Switch to Host' : 'Become a Host';
  const body = mode === 'host'
    ? 'Return to your customer trips'
    : hasHostCapability
      ? 'Manage your cars and bookings'
      : 'List your car and start earning';
  const cta = mode === 'host' ? 'Open customer mode' : hasHostCapability ? 'Open host mode' : 'Get started';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.hostBanner, pressed && styles.pressed]}
    >
      <View style={styles.hostIcon}>
        <CarFront color={colors.ink} size={27} />
      </View>
      <View style={styles.hostCopy}>
        <Text style={styles.hostTitle}>{title}</Text>
        <Text style={styles.hostBody}>{body}</Text>
        <View style={styles.hostCta}>
          <Text style={styles.hostCtaText}>{cta}</Text>
          <ArrowRight color={colors.surface} size={18} />
        </View>
      </View>
      <View style={styles.hostAccent} />
    </Pressable>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <Text style={styles.sectionHeading}>{title}</Text>;
}

function ProfileInput({
  autoCapitalize,
  control,
  error,
  inputMode,
  keyboardType,
  label,
  name,
  placeholder,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  control: ReturnType<typeof useForm<ProfileFormValues>>['control'];
  error?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url';
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  label: string;
  name: keyof ProfileFormValues;
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
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={[styles.input, error && styles.inputError]}
            value={value ?? ''}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function SectionRow({ item }: { item: SectionItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [styles.sectionRow, pressed && styles.pressed]}
    >
      <View style={styles.sectionIcon}>{item.icon}</View>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionLabel, item.destructive && styles.destructiveText]}>{item.label}</Text>
        {item.description ? <Text style={styles.sectionDescription}>{item.description}</Text> : null}
      </View>
      <ChevronRight color={item.destructive ? '#B91C1C' : '#9CA3AF'} size={18} />
    </Pressable>
  );
}

function StateMessage({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function showPending(message: string) {
  Alert.alert('Coming soon', message);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  summary: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 14,
    ...shadows.card,
  },
  hostBanner: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft,
    padding: 16,
  },
  hostIcon: {
    height: 58,
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  hostCopy: {
    flex: 1,
    gap: 3,
  },
  hostTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  hostBody: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  hostCta: {
    minHeight: 38,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.brand,
    marginTop: 9,
    paddingHorizontal: 14,
  },
  hostCtaText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  hostAccent: {
    position: 'absolute',
    right: -90,
    bottom: -32,
    height: 125,
    width: 125,
    borderRadius: 63,
    backgroundColor: 'rgba(183,210,255,0.56)',
  },
  avatar: {
    height: 82,
    width: 82,
    borderRadius: 41,
    backgroundColor: colors.brandSoft,
  },
  avatarFallback: {
    height: 82,
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: '#EAF2FF',
  },
  avatarText: {
    color: colors.brand,
    fontSize: 28,
    fontWeight: '900',
  },
  summaryCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 7,
  },
  name: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailAction: {
    flex: 1,
    color: colors.brand,
    fontSize: 14,
    fontWeight: '800',
  },
  emailValue: {
    color: colors.text,
  },
  form: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 14,
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
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 14,
  },
  secondaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  section: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sectionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionIcon: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.brandSoft,
  },
  sectionLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  logoutSection: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  destructiveText: {
    color: '#E03131',
  },
  loadingState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.76,
  },
  state: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
});

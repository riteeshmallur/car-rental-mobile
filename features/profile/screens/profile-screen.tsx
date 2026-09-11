import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Banknote,
  CalendarClock,
  CarFront,
  ChevronRight,
  CreditCard,
  FileText,
  Headphones,
  HelpCircle,
  LogOut,
  Mail,
  Pencil,
  Phone,
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

type ProfileScreenProps = {
  mode: 'customer' | 'host';
};

type SectionItem = {
  label: string;
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
              icon: <CarFront color="#111827" size={20} />,
              onPress: () => router.push('/(host)/cars'),
            },
            {
              label: 'Bookings',
              icon: <CalendarClock color="#111827" size={20} />,
              onPress: () => router.push('/(host)/bookings'),
            },
            {
              label: 'Earnings',
              icon: <Banknote color="#111827" size={20} />,
              onPress: () => router.push('/(host)/earnings'),
            },
          ]
        : []),
      {
        label: 'Account',
        icon: <UserRound color="#111827" size={20} />,
        onPress: () => setIsEditing(true),
      },
      {
        label: 'Payment methods',
        icon: <CreditCard color="#111827" size={20} />,
        onPress: () => showPending('Payment methods are not connected yet.'),
      },
      {
        label: 'Documents',
        icon: <FileText color="#111827" size={20} />,
        onPress: () => showPending('Document upload will be added in a later phase.'),
      },
      {
        label: 'Notifications',
        icon: <Bell color="#111827" size={20} />,
        onPress: () => showPending('Notification preferences are not connected yet.'),
      },
      {
        label: 'Help & Support',
        icon: <Headphones color="#111827" size={20} />,
        onPress: () => showPending('Support workflows are not connected yet.'),
      },
      {
        label: 'Privacy',
        icon: <ShieldCheck color="#111827" size={20} />,
        onPress: () => showPending('Privacy settings are not connected yet.'),
      },
      {
        label: getHostSwitchLabel(mode, profile),
        icon: <HelpCircle color="#111827" size={20} />,
        onPress: () =>
          mode === 'host'
            ? router.replace('/(customer)/home')
            : hasHostCapability(profile)
              ? router.push('/(host)/profile')
              : router.push('/(customer)/become-host'),
      },
      {
        label: 'Logout',
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
                <Text style={styles.eyebrow}>
                  {mode === 'host' ? 'Host profile' : 'Customer profile'}
                </Text>
                <Text style={styles.title}>Profile</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsEditing((current) => !current)}
              style={styles.iconButton}
            >
              <Pencil color="#111827" size={20} />
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
              <ProfileSummary user={profile} />

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

              <View style={styles.section}>
                {sections.map((item) => (
                  <SectionRow key={item.label} item={item} />
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {mode === 'customer' ? <BottomNavigation /> : null}
    </SafeAreaView>
  );
}

function getHostSwitchLabel(
  mode: ProfileScreenProps['mode'],
  profile: SafeUser | undefined,
) {
  if (mode === 'host') {
    return 'Switch to Customer';
  }

  if (hasHostCapability(profile)) {
    return 'Switch to Host';
  }

  return 'Become a Host / Switch to Host';
}

function hasHostCapability(profile: SafeUser | undefined) {
  return Boolean(
    profile?.capabilities.canHost ||
      profile?.hostEnabled ||
      profile?.role === UserRole.Host,
  );
}

function ProfileSummary({ user }: { user: SafeUser }) {
  return (
    <View style={styles.summary}>
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
        />
        <InfoLine
          icon={<Mail color="#6B7280" size={16} />}
          text={user.email ?? 'Email not added'}
        />
        <View style={styles.verificationRow}>
          <ShieldCheck
            color={user.phoneVerified ? '#047857' : '#B45309'}
            size={16}
          />
          <Text
            style={[
              styles.verificationText,
              user.phoneVerified && styles.verifiedText,
            ]}
          >
            {user.phoneVerified ? 'Mobile verified' : 'Mobile not verified'}
          </Text>
          <Text style={styles.dot}>.</Text>
          <Text
            style={[
              styles.verificationText,
              user.isEmailVerified && styles.verifiedText,
            ]}
          >
            {user.isEmailVerified ? 'Email verified' : 'Email not verified'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.infoLine}>
      {icon}
      <Text numberOfLines={1} style={styles.infoText}>
        {text}
      </Text>
    </View>
  );
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
      <Text
        style={[styles.sectionLabel, item.destructive && styles.destructiveText]}
      >
        {item.label}
      </Text>
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
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
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
  summary: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  avatar: {
    height: 82,
    width: 82,
    borderRadius: 41,
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    height: 82,
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: '#E0F2FE',
  },
  avatarText: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
  },
  summaryCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 7,
  },
  name: {
    color: '#111827',
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
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  verificationText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '900',
  },
  verifiedText: {
    color: '#047857',
  },
  dot: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '900',
  },
  form: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
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
    backgroundColor: '#111827',
    paddingHorizontal: 14,
  },
  secondaryButton: {
    minHeight: 48,
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
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  section: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  sectionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 14,
  },
  sectionIcon: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  sectionLabel: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  destructiveText: {
    color: '#B91C1C',
  },
  loadingState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mutedText: {
    color: '#6B7280',
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
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateBody: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
});

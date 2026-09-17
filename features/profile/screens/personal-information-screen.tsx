import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { profileSchema, type ProfileFormValues } from '@/features/profile/schemas/profile-schema';
import { usersApi } from '@/services/users/users-api';
import { useAuthStore } from '@/store/auth-store';
import { type SafeUser } from '@/types/auth';
import { normalizeApiError } from '@/utils/errors';
import { colors, radii, shadows } from '@/utils/theme';

type PersonalInformationScreenProps = {
  mode: 'customer' | 'host';
};

function toFormValues(user: SafeUser | null | undefined): ProfileFormValues {
  return {
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    email: user?.email ?? null,
    phoneNumber: user?.phoneNumber ?? '',
    profileImageUrl: user?.profileImageUrl ?? null,
  };
}

export function PersonalInformationScreen({ mode }: PersonalInformationScreenProps) {
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const fallback = mode === 'host' ? '/(host)/profile' : '/(customer)/profile';
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
  const goBack = useSafeBack({ fallback });

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
      goBack();
    },
  });

  const submitProfile = handleSubmit((values) => {
    updateMutation.mutate(values);
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={goBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <ArrowLeft color={colors.ink} size={22} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Personal information</Text>
              <Text style={styles.subtitle}>View and update your details</Text>
            </View>
          </View>

          {profileQuery.isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.stateText}>Loading your details</Text>
            </View>
          ) : profileQuery.isError ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>Details could not load</Text>
              <Text style={styles.stateText}>{normalizeApiError(profileQuery.error).message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void profileQuery.refetch()}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : profile ? (
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

              {errors.root?.message ? <Text style={styles.errorText}>{errors.root.message}</Text> : null}

              <View style={styles.formActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={updateMutation.isPending}
                  onPress={goBack}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                    updateMutation.isPending && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!isDirty || !isValid || updateMutation.isPending}
                  onPress={submitProfile}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    (!isDirty || !isValid || updateMutation.isPending) && styles.disabledButton,
                  ]}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save profile</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  form: {
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 16,
    ...shadows.card,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    minHeight: 50,
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
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
  },
  secondaryButton: {
    minHeight: 50,
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
    color: colors.surface,
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
  pressed: {
    opacity: 0.76,
  },
  state: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
});

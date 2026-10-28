import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { AuthSubmitButton } from '@/features/auth/components/auth-submit-button';
import { OtpInput } from '@/features/auth/components/otp-input';
import {
  verifyOtpSchema,
  type VerifyOtpFormValues,
} from '@/features/auth/schemas/auth-schemas';
import { authApi } from '@/features/auth/services/auth-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useAuthStore } from '@/store/auth-store';
import { normalizeApiError } from '@/utils/errors';

const resendDelaySeconds = 30;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function OtpVerificationScreen() {
  const params = useLocalSearchParams<{
    countryCode?: string;
    phoneNumber?: string;
  }>();
  const phoneNumber = useMemo(() => getParam(params.phoneNumber) || '', [params.phoneNumber]);
  const countryCode = useMemo(() => getParam(params.countryCode) || '+91', [params.countryCode]);
  const setSession = useAuthStore((state) => state.setSession);
  const [resendSeconds, setResendSeconds] = useState(resendDelaySeconds);
  const [screenError, setScreenError] = useState<string | null>(null);
  const goBack = useSafeBack({ fallback: '/(auth)/login' });

  const {
    control,
    formState: { errors, isValid },
    clearErrors,
    handleSubmit,
    setError,
  } = useForm<VerifyOtpFormValues>({
    defaultValues: {
      phoneNumber,
      otp: '',
    },
    mode: 'onChange',
    resolver: zodResolver(verifyOtpSchema),
  });

  useEffect(() => {
    if (!phoneNumber) {
      router.replace('/(auth)/login');
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [resendSeconds]);

  const verifyOtpMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onError: (error) => {
      const normalizedError = normalizeApiError(error);
      setError('otp', { type: 'server', message: normalizedError.message });
      setScreenError(normalizedError.message);
    },
    onSuccess: async (session) => {
      setScreenError(null);
      await setSession(session);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(customer)/home');
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: authApi.requestOtp,
    onError: (error) => {
      setScreenError(normalizeApiError(error).message);
    },
    onSuccess: () => {
      setScreenError(null);
      setResendSeconds(resendDelaySeconds);
    },
  });

  const onSubmit = handleSubmit((values) => {
    verifyOtpMutation.mutate({
      phoneNumber,
      otp: values.otp,
    });
  });

  return (
    <AuthShell
      footer={<Text style={styles.devHint}>Development OTP: 123456</Text>}
      subtitle={`Enter the verification code sent to ${countryCode} ${phoneNumber.replace(countryCode, '')}.`}
      title="Verify OTP"
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="otp"
          render={({ field: { onChange, value } }) => (
            <OtpInput
              disabled={verifyOtpMutation.isPending}
              error={errors.otp?.message}
              onChange={(nextValue) => {
                if (errors.otp?.type === 'server') {
                  clearErrors('otp');
                  setScreenError(null);
                  verifyOtpMutation.reset();
                }

                onChange(nextValue);
              }}
              value={value}
            />
          )}
        />

        {screenError ? (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorText}>
            {screenError}
          </Text>
        ) : null}

        <AuthSubmitButton
          disabled={!isValid}
          isLoading={verifyOtpMutation.isPending}
          onPress={onSubmit}
          title="Verify and continue"
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={
              resendSeconds > 0
                ? `Resend code available in ${resendSeconds} seconds`
                : 'Resend verification code'
            }
            accessibilityRole="button"
            accessibilityState={{
              busy: resendOtpMutation.isPending,
              disabled: resendSeconds > 0 || resendOtpMutation.isPending,
            }}
            disabled={resendSeconds > 0 || resendOtpMutation.isPending}
            onPress={() => resendOtpMutation.mutate({ phoneNumber })}
            style={({ pressed }) => [
              styles.secondaryButton,
              (resendSeconds > 0 || resendOtpMutation.isPending) &&
                styles.secondaryButtonDisabled,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : resendOtpMutation.isPending
                  ? 'Sending OTP'
                  : 'Resend OTP'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Change phone number"
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Change phone number</Text>
          </Pressable>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  secondaryButtonDisabled: {
    opacity: 0.46,
  },
  secondaryButtonPressed: {
    backgroundColor: '#EAF4FF',
  },
  secondaryButtonText: {
    color: '#0B6FE8',
    fontSize: 15,
    fontWeight: '800',
  },
  devHint: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

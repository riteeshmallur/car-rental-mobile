import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { AuthSubmitButton } from '@/features/auth/components/auth-submit-button';
import { CountryCodeSelector } from '@/features/auth/components/country-code-selector';
import {
  requestOtpSchema,
  type RequestOtpFormValues,
} from '@/features/auth/schemas/auth-schemas';
import { authApi } from '@/features/auth/services/auth-api';
import { normalizeApiError } from '@/utils/errors';

const defaultCountryCode = '+91';

function normalizePhoneNumber(countryCode: string, localNumber: string) {
  return `${countryCode}${localNumber.replace(/\D/g, '')}`;
}

export function PhoneLoginScreen() {
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);

  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setError,
  } = useForm<RequestOtpFormValues>({
    defaultValues: {
      phoneNumber: '',
    },
    mode: 'onChange',
    resolver: zodResolver(requestOtpSchema),
  });

  const requestOtpMutation = useMutation({
    mutationFn: authApi.requestOtp,
    onError: (error) => {
      const normalizedError = normalizeApiError(error);
      setError('phoneNumber', { message: normalizedError.message });
    },
    onSuccess: (_result, variables) => {
      router.push({
        pathname: '/(auth)/otp',
        params: {
          countryCode,
          phoneNumber: variables.phoneNumber,
        },
      });
    },
  });

  const onSubmit = handleSubmit((values) => {
    requestOtpMutation.mutate({
      phoneNumber: normalizePhoneNumber(countryCode, values.phoneNumber),
    });
  });

  return (
    <AuthShell
      footer={<Text style={styles.devHint}>Development OTP: 123456</Text>}
      subtitle="Enter your mobile number and we will send a 6 digit verification code."
      title="Log in with mobile"
    >
      <View style={styles.form}>
        <View style={styles.phoneRow}>
          <CountryCodeSelector
            isOpen={isCountrySelectorOpen}
            onChange={setCountryCode}
            onClose={() => setIsCountrySelectorOpen(false)}
            onOpen={() => setIsCountrySelectorOpen(true)}
            value={countryCode}
          />
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                autoComplete="tel"
                inputMode="numeric"
                keyboardType="phone-pad"
                maxLength={15}
                onBlur={onBlur}
                onChangeText={(nextValue) => onChange(nextValue.replace(/\D/g, ''))}
                placeholder="Mobile number"
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.phoneInput,
                  errors.phoneNumber && styles.inputError,
                ]}
                textContentType="telephoneNumber"
                value={value}
              />
            )}
          />
        </View>
        {errors.phoneNumber?.message ? (
          <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>
        ) : null}

        <AuthSubmitButton
          disabled={!isValid}
          isLoading={requestOtpMutation.isPending}
          onPress={onSubmit}
          title="Request OTP"
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  phoneInput: {
    minHeight: 54,
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  devHint: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

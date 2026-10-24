import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, shadows } from '@/utils/theme';

type AuthSubmitButtonProps = {
  title: string;
  isLoading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function AuthSubmitButton({
  disabled,
  isLoading,
  onPress,
  title,
}: AuthSubmitButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
      <Pressable
      accessibilityHint={isLoading ? 'Please wait for the request to finish.' : undefined}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(isLoading) }}
      disabled={isDisabled}
        onPress={onPress}
        testID="auth-submit-button"
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator accessibilityLabel={`${title} in progress`} color={colors.surface} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#0B6FE8',
    paddingHorizontal: 18,
    ...shadows.card,
  },
  buttonDisabled: {
    backgroundColor: '#0B6FE8',
    opacity: 0.52,
  },
  buttonPressed: {
    backgroundColor: colors.brandPressed,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '800',
  },
});

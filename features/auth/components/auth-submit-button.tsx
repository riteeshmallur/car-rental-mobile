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
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.surface} />
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
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    paddingHorizontal: 18,
    ...shadows.card,
  },
  buttonDisabled: {
    backgroundColor: '#98A2B3',
    opacity: 1,
  },
  buttonPressed: {
    backgroundColor: colors.brandPressed,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});

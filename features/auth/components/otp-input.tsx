import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
};

export function OtpInput({
  disabled,
  error,
  length = 6,
  onChange,
  value,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = Array.from({ length }, (_, index) => value[index] || '');

  const inputProps: TextInputProps = {
    autoComplete: 'sms-otp',
    editable: !disabled,
    inputMode: 'numeric',
    keyboardType: 'number-pad',
    maxLength: length,
    onChangeText: (nextValue) => onChange(nextValue.replace(/\D/g, '').slice(0, length)),
    textContentType: 'oneTimeCode',
    value,
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="One-time password"
        accessibilityRole="button"
        onPress={() => inputRef.current?.focus()}
        style={styles.digitRow}
      >
        {digits.map((digit, index) => {
          const isActive = value.length === index;

          return (
            <View
              key={`${index}-${digit}`}
              style={[
                styles.digitBox,
                isActive && styles.digitBoxActive,
                Boolean(error) && styles.digitBoxError,
              ]}
            >
              <Text style={styles.digitText}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput ref={inputRef} style={styles.hiddenInput} {...inputProps} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  digitBox: {
    height: 54,
    flex: 1,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  digitBoxActive: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  digitBoxError: {
    borderColor: '#DC2626',
  },
  digitText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  hiddenInput: {
    position: 'absolute',
    height: 1,
    width: 1,
    opacity: 0,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
});

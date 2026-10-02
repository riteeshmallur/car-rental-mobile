import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  testPaymentScenarios,
  type TestPaymentScenario,
} from '@/features/customer/payment/payment-flow';

type DevelopmentPaymentSelectorProps = {
  disabled: boolean;
  onChange: (scenario: TestPaymentScenario) => void;
  selectedScenario: TestPaymentScenario;
};

export function DevelopmentPaymentSelector({
  disabled,
  onChange,
  selectedScenario,
}: DevelopmentPaymentSelectorProps) {
  return (
    <View accessibilityLabel="Development payment outcome" style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Test payment outcome</Text>
      <Text style={styles.description}>Available only in development and test builds.</Text>
      <View style={styles.options}>
        {testPaymentScenarios.map((scenario) => {
          const selected = scenario.value === selectedScenario;
          return (
            <Pressable
              accessibilityLabel={scenario.label}
              accessibilityRole="radio"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={scenario.value}
              onPress={() => onChange(scenario.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled,
                pressed && !disabled && styles.pressed,
              ]}
              testID={`payment-scenario-${scenario.value.toLowerCase()}`}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{scenario.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  description: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  option: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  options: {
    gap: 8,
    marginTop: 4,
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0B4FE8',
  },
  optionText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '800',
  },
  optionTextSelected: {
    color: '#0B4FE8',
  },
  pressed: {
    opacity: 0.78,
  },
  radio: {
    alignItems: 'center',
    borderColor: '#94A3B8',
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  radioDot: {
    backgroundColor: '#0B4FE8',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  radioSelected: {
    borderColor: '#0B4FE8',
  },
  title: {
    color: '#78350F',
    fontSize: 15,
    fontWeight: '900',
  },
});

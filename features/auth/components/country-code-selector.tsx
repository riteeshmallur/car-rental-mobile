import { ChevronDown } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { countryCodes } from '@/features/auth/constants/country-codes';

type CountryCodeSelectorProps = {
  value: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (countryCode: string) => void;
};

export function CountryCodeSelector({
  isOpen,
  onChange,
  onClose,
  onOpen,
  value,
}: CountryCodeSelectorProps) {
  const selectedCountry = countryCodes.find((country) => country.dialCode === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>
          {selectedCountry?.isoCode} {value}
        </Text>
        <ChevronDown color="#374151" size={18} />
      </Pressable>

      <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
        <Pressable onPress={onClose} style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Country code</Text>
            {countryCodes.map((country) => (
              <Pressable
                accessibilityRole="button"
                key={country.isoCode}
                onPress={() => {
                  onChange(country.dialCode);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.option,
                  value === country.dialCode && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionText}>
                  {country.isoCode} {country.name}
                </Text>
                <Text style={styles.optionCode}>{country.dialCode}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  triggerText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.76,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.36)',
  },
  sheet: {
    gap: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 34,
  },
  sheetTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  optionCode: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '800',
  },
});

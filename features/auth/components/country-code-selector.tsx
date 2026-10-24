import { ChevronDown } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { countryCodes } from '@/features/auth/constants/country-codes';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { colors, radii } from '@/utils/theme';

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
  useWebBackGuard({ active: isOpen, onBack: onClose });

  return (
    <>
      <Pressable
        accessibilityHint="Opens the country calling code selector."
        accessibilityLabel={`Country code, ${selectedCountry?.name ?? value}, ${value}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onOpen}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>
          {selectedCountry?.isoCode} {value}
        </Text>
        <ChevronDown color={colors.text} size={18} />
      </Pressable>

      <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
        <Pressable accessible={false} onPress={onClose} style={styles.backdrop}>
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={styles.sheet}
          >
            <Text accessibilityRole="header" style={styles.sheetTitle}>Country code</Text>
            {countryCodes.map((country) => (
              <Pressable
                accessibilityLabel={`${country.name}, ${country.dialCode}`}
                accessibilityRole="button"
                accessibilityState={{ selected: value === country.dialCode }}
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  triggerText: {
    color: colors.ink,
    fontSize: 15,
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
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 34,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
  },
  optionSelected: {
    backgroundColor: colors.brandSoft,
  },
  optionText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  optionCode: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '800',
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

type AddVehicleFooterProps = {
  busy: boolean;
  busyLabel?: string;
  isSubmit: boolean;
  onPress: () => void;
};

export function AddVehicleFooter({ busy, busyLabel, isSubmit, onPress }: AddVehicleFooterProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={
          busy
            ? busyLabel ?? (isSubmit ? 'Submitting vehicle for approval' : 'Saving vehicle draft')
            : isSubmit
              ? 'Submit vehicle for approval'
              : 'Save and continue'
        }
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        testID="host-add-vehicle-continue"
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
      >
        {busy ? <ActivityIndicator accessibilityLabel="In progress" color="#FFFFFF" size="small" /> : null}
        <Text numberOfLines={1} style={styles.buttonText}>
          {busy
            ? busyLabel ?? (isSubmit ? 'Submitting...' : 'Saving...')
            : isSubmit
              ? 'Submit for approval'
              : 'Save and continue'}
        </Text>
        {!busy && (isSubmit ? <Check color="#FFFFFF" size={19} /> : <ChevronRight color="#FFFFFF" size={19} />)}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E3E9F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    backgroundColor: '#1769F5',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
});

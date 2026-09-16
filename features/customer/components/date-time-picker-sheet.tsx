import { X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  formatDate,
  formatTime,
  type RentalWindow,
} from '@/features/customer/utils/rental-window';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';

export type DateTimeField = 'pickupDate' | 'pickupTime' | 'returnDate' | 'returnTime';

type DateTimePickerSheetProps = {
  field: DateTimeField | null;
  rentalWindow: RentalWindow;
  onClose: () => void;
  onChangePickupAt: (value: Date) => void;
  onChangeReturnAt: (value: Date) => void;
};

const timeSlots = [
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 0],
  [10, 0],
  [11, 0],
  [12, 0],
  [13, 0],
  [14, 0],
  [15, 0],
  [16, 0],
  [17, 0],
  [18, 0],
  [19, 0],
  [20, 0],
] as const;

function getDateOptions() {
  return Array.from({ length: 21 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    date.setHours(0, 0, 0, 0);
    return date;
  });
}

function sameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function withDate(base: Date, date: Date) {
  const next = new Date(base);
  next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return next;
}

function withTime(base: Date, hour: number, minute: number) {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function isPast(value: Date) {
  return value.getTime() < Date.now();
}

export function DateTimePickerSheet({
  field,
  onChangePickupAt,
  onChangeReturnAt,
  onClose,
  rentalWindow,
}: DateTimePickerSheetProps) {
  const isOpen = field !== null;
  useWebBackGuard({ active: isOpen, onBack: onClose });
  const targetDate =
    field === 'returnDate' || field === 'returnTime'
      ? rentalWindow.returnAt
      : rentalWindow.pickupAt;
  const isReturnField = field === 'returnDate' || field === 'returnTime';
  const isDateField = field === 'pickupDate' || field === 'returnDate';

  const title = isDateField
    ? isReturnField
      ? 'Return date'
      : 'Pickup date'
    : isReturnField
      ? 'Return time'
      : 'Pickup time';

  const updateValue = (value: Date) => {
    if (isReturnField) {
      onChangeReturnAt(value);
    } else {
      onChangePickupAt(value);
    }
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isOpen}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityLabel="Close date and time picker"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X color="#111827" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.options}>
            {isDateField
              ? getDateOptions().map((date) => {
                  const nextValue = withDate(targetDate, date);
                  const disabled =
                    (!isReturnField && isPast(nextValue)) ||
                    (isReturnField &&
                      nextValue.getTime() <= rentalWindow.pickupAt.getTime());
                  const selected = sameDate(targetDate, date);

                  return (
                    <PickerOption
                      disabled={disabled}
                      key={date.toISOString()}
                      label={formatDate(date)}
                      selected={selected}
                      sublabel={date.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      onPress={() => updateValue(nextValue)}
                    />
                  );
                })
              : timeSlots.map(([hour, minute]) => {
                  const nextValue = withTime(targetDate, hour, minute);
                  const disabled =
                    (!isReturnField && isPast(nextValue)) ||
                    (isReturnField &&
                      nextValue.getTime() <= rentalWindow.pickupAt.getTime());
                  const selected =
                    targetDate.getHours() === hour &&
                    targetDate.getMinutes() === minute;

                  return (
                    <PickerOption
                      disabled={disabled}
                      key={`${hour}:${minute}`}
                      label={formatTime(nextValue)}
                      selected={selected}
                      sublabel={disabled ? 'Unavailable' : 'Available'}
                      onPress={() => updateValue(nextValue)}
                    />
                  );
                })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerOption({
  disabled,
  label,
  onPress,
  selected,
  sublabel,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected?: boolean;
  sublabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        disabled && styles.optionDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <Text style={[styles.optionLabel, disabled && styles.disabledText]}>
        {label}
      </Text>
      <Text style={[styles.optionSublabel, disabled && styles.disabledText]}>
        {sublabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.36)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  closeButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 58,
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionSelected: {
    borderColor: '#0B4FE8',
    backgroundColor: '#EAF2FF',
  },
  optionDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.48,
  },
  optionPressed: {
    opacity: 0.76,
  },
  optionLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  optionSublabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledText: {
    color: '#9CA3AF',
  },
});

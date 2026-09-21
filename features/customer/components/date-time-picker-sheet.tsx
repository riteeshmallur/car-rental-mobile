import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import {
  formatTime,
  getRentalWindowError,
  type RentalWindow,
} from '@/features/customer/utils/rental-window';
import { type LocationSearchResult } from '@/types/location';
import { colors, radii } from '@/utils/theme';

export type DateTimeField = 'pickupDate' | 'pickupTime' | 'returnDate' | 'returnTime';

type DateTimePickerSheetProps = {
  field: DateTimeField | null;
  location?: LocationSearchResult | null;
  rentalWindow: RentalWindow;
  onClose: () => void;
  onApplyRentalWindow: (value: RentalWindow) => void;
};

type SelectionStage = 'pickup' | 'return';

const timeChoiceHeight = 44;
const timeViewportHeight = 174;
const timeChoicePadding = (timeViewportHeight - timeChoiceHeight) / 2;

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

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const days: Array<Date | null> = Array.from({ length: leadingDays }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  return days;
}

function formatPickerDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function formatPickerTime(value: Date) {
  return formatTime(value).replace(':00', '').toUpperCase();
}

function getTimeChoices(value: Date) {
  return Array.from({ length: 24 }, (_, hour) => {
    const next = new Date(value);
    next.setHours(hour, 0, 0, 0);
    return next;
  });
}

function isBeforeToday(value: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return value.getTime() < today.getTime();
}

function isToday(value: Date) {
  return sameDate(value, new Date());
}

function canSelectPickupTime(value: Date) {
  return !isToday(value) || value.getTime() >= Date.now();
}

function canSelectReturnTime(value: Date, pickupAt: Date | null) {
  return !pickupAt || !sameDate(value, pickupAt) || value.getTime() > pickupAt.getTime();
}

function makePickupTimeValid(value: Date) {
  if (!isToday(value) || value.getTime() >= Date.now()) {
    return value;
  }

  const next = new Date(value);
  const now = new Date();
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next;
}

function makeReturnAfter(pickupAt: Date, currentReturnAt: Date) {
  if (currentReturnAt.getTime() > pickupAt.getTime()) {
    return currentReturnAt;
  }

  const next = new Date(pickupAt);
  next.setDate(next.getDate() + 1);
  next.setHours(18, 0, 0, 0);
  return next;
}

export function DateTimePickerSheet({
  field,
  location,
  onApplyRentalWindow,
  onClose,
  rentalWindow,
}: DateTimePickerSheetProps) {
  const isOpen = field !== null;
  const [stage, setStage] = useState<SelectionStage>('pickup');
  const [pickupAt, setPickupAt] = useState<Date | null>(null);
  const [returnAt, setReturnAt] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  useWebBackGuard({ active: isOpen, onBack: onClose });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialPickup = new Date(rentalWindow.pickupAt);
    const initialReturn = new Date(rentalWindow.returnAt);
    setPickupAt(initialPickup);
    setReturnAt(initialReturn);
    setStage(field === 'returnDate' || field === 'returnTime' ? 'return' : 'pickup');
    const focusDate = field === 'returnDate' || field === 'returnTime'
      ? initialReturn
      : initialPickup;
    setVisibleMonth(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));
  // Keep selections local until Continue so parent updates cannot reset a choice.
  }, [field, isOpen]);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const activeDate = stage === 'pickup' ? pickupAt : returnAt;
  const timePickup = pickupAt ?? rentalWindow.pickupAt;
  const timeReturn = returnAt ?? rentalWindow.returnAt;
  const draftWindow = pickupAt && returnAt ? { pickupAt, returnAt } : null;
  const validationError = draftWindow ? getRentalWindowError(draftWindow) : null;
  const canContinue = Boolean(pickupAt && returnAt && !validationError);

  const selectDate = (date: Date) => {
    if (stage === 'pickup') {
      if (isBeforeToday(date)) {
        return;
      }

      const nextPickup = makePickupTimeValid(
        withDate(pickupAt ?? rentalWindow.pickupAt, date),
      );
      setPickupAt(nextPickup);
      setReturnAt(
        makeReturnAfter(
          nextPickup,
          returnAt ?? rentalWindow.returnAt,
        ),
      );
      setStage('return');
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      return;
    }

    const nextReturn = withDate(returnAt ?? rentalWindow.returnAt, date);
    if (pickupAt && nextReturn.getTime() <= pickupAt.getTime()) {
      return;
    }

    setReturnAt(nextReturn);
  };

  const selectTime = (value: Date, target: SelectionStage) => {
    if (target === 'pickup') {
      if (value.getTime() < Date.now()) {
        return;
      }
      setPickupAt(value);
      setReturnAt(
        makeReturnAfter(value, returnAt ?? rentalWindow.returnAt),
      );
      return;
    }

    if (pickupAt && value.getTime() <= pickupAt.getTime()) {
      return;
    }
    setReturnAt(value);
  };

  const continueWithSelection = () => {
    if (!canContinue || !pickupAt || !returnAt) {
      return;
    }

    onApplyRentalWindow({
      pickupAt: new Date(pickupAt),
      returnAt: new Date(returnAt),
    });
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={isOpen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={styles.backButton}
            >
              <ArrowLeft color={colors.ink} size={30} />
            </Pressable>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>Where</Text>
            <Text numberOfLines={1} style={styles.locationValue}>
              {location?.name || location?.city || 'Select pickup location'}
            </Text>
          </View>

          <View style={styles.dateCard}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Select start &amp; end date</Text>
              <Pressable accessibilityRole="button" onPress={() => { setPickupAt(null); setReturnAt(null); setStage('pickup'); }}>
                <Text style={styles.clearText}>CLEAR</Text>
              </Pressable>
            </View>
            <Text style={styles.rangeText}>
              {pickupAt && returnAt
                ? `${formatPickerDateTime(pickupAt)} -> ${formatPickerDateTime(returnAt)}`
                : 'Select a start and end date'}
            </Text>

            <View style={styles.weekRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityLabel="Previous month"
                accessibilityRole="button"
                onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                style={styles.monthButton}
              >
                <ChevronLeft color={colors.text} size={20} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(visibleMonth)}
              </Text>
              <Pressable
                accessibilityLabel="Next month"
                accessibilityRole="button"
                onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                style={styles.monthButton}
              >
                <ChevronRight color={colors.text} size={20} />
              </Pressable>
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const isPickup = pickupAt ? sameDate(pickupAt, date) : false;
                const isReturn = returnAt ? sameDate(returnAt, date) : false;
                const isInRange = Boolean(pickupAt && returnAt && date > pickupAt && date < returnAt);
                const disabled = stage === 'pickup'
                  ? isBeforeToday(date)
                  : Boolean(pickupAt && withDate(returnAt ?? rentalWindow.returnAt, date).getTime() <= pickupAt.getTime());

                return (
                  <Pressable
                    accessibilityLabel={`${stage === 'pickup' ? 'Pickup' : 'Return'} ${date.getDate()}`}
                    accessibilityRole="button"
                    disabled={disabled}
                    key={date.toISOString()}
                    onPress={() => selectDate(date)}
                    style={[
                      styles.dayCell,
                      isInRange && styles.dayCellInRange,
                      isPickup && styles.dayCellPickupSelected,
                      isReturn && styles.dayCellReturnSelected,
                      disabled && styles.dayCellDisabled,
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      (isPickup || isReturn) && styles.dayTextSelected,
                      disabled && styles.dayTextDisabled,
                    ]}>
                      {String(date.getDate()).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.selectionHint}>
              <Text style={styles.selectionHintText}>
                {activeDate ? `Choose ${stage === 'pickup' ? 'pickup' : 'return'} date` : 'Choose pickup date'}
              </Text>
            </View>

            <View style={styles.stageSwitcher}>
              {(['pickup', 'return'] as const).map((selection) => (
                <Pressable
                  accessibilityRole="button"
                  key={selection}
                  onPress={() => setStage(selection)}
                  style={[
                    styles.stageButton,
                    stage === selection && styles.stageButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.stageButtonText,
                      stage === selection && styles.stageButtonTextSelected,
                    ]}
                  >
                    {selection === 'pickup' ? 'Pickup date' : 'Return date'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.timeRow}>
              <TimePickerColumn
                canSelect={canSelectPickupTime}
                label="Pickup time"
                value={timePickup}
                onChange={(value) => selectTime(value, 'pickup')}
              />
              <TimePickerColumn
                canSelect={(value) => canSelectReturnTime(value, pickupAt)}
                label="Dropoff time"
                value={timeReturn}
                onChange={(value) => selectTime(value, 'return')}
              />
            </View>

            {validationError ? <Text style={styles.validationError}>{validationError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={!canContinue}
              onPress={continueWithSelection}
              style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
            >
              <Text style={styles.continueText}>CONTINUE</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function TimePickerColumn({
  canSelect,
  label,
  onChange,
  value,
}: {
  canSelect: (value: Date) => boolean;
  label: string;
  onChange: (value: Date) => void;
  value: Date;
}) {
  const choices = getTimeChoices(value);
  const scrollRef = useRef<ScrollView>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToChoice = (hour: number, animated = false) => {
    scrollRef.current?.scrollTo({
      animated,
      y: Math.max(0, hour * timeChoiceHeight),
    });
  };

  useEffect(() => {
    scrollToChoice(value.getHours());
  }, [value]);

  useEffect(() => () => {
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
    }
  }, []);

  const selectScrolledChoice = (offset: number) => {
    const index = Math.max(
      0,
      Math.min(choices.length - 1, Math.round(offset / timeChoiceHeight)),
    );
    const choice = choices[index];

    if (!choice || !canSelect(choice)) {
      scrollToChoice(value.getHours(), true);
      return;
    }

    if (!sameTime(value, choice)) {
      onChange(choice);
    }
  };

  const queueScrolledChoice = (offset: number) => {
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
    }

    scrollEndTimer.current = setTimeout(() => {
      selectScrolledChoice(offset);
    }, 110);
  };

  return (
    <View style={styles.timeColumn}>
      <Text style={styles.timeTitle}>{label}</Text>
      <View style={styles.timeViewport}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.timeChoices}
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled
          onMomentumScrollEnd={(event) => {
            if (scrollEndTimer.current) {
              clearTimeout(scrollEndTimer.current);
            }
            selectScrolledChoice(event.nativeEvent.contentOffset.y);
          }}
          onScroll={(event) => {
            queueScrolledChoice(event.nativeEvent.contentOffset.y);
          }}
          onScrollEndDrag={(event) => {
            if (!event.nativeEvent.velocity?.y) {
              selectScrolledChoice(event.nativeEvent.contentOffset.y);
            }
          }}
          scrollEventThrottle={16}
          snapToAlignment="start"
          snapToInterval={timeChoiceHeight}
          showsVerticalScrollIndicator={false}
          style={styles.timeScroll}
        >
          {choices.map((choice) => (
            (() => {
              const selectable = canSelect(choice);

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={!selectable}
                  key={`${label}-${choice.toISOString()}`}
                  onPress={() => onChange(choice)}
                  style={[styles.timeChoice, !selectable && styles.timeChoiceDisabled]}
                >
                  <Text
                    style={[
                      styles.timeText,
                      !sameTime(value, choice) && selectable && styles.timeTextMuted,
                      !selectable && styles.timeTextDisabled,
                    ]}
                  >
                    {formatPickerTime(choice)}
                  </Text>
                </Pressable>
              );
            })()
          ))}
        </ScrollView>
        <View pointerEvents="none" style={[styles.timeGuide, styles.timeGuideTop]} />
        <View pointerEvents="none" style={[styles.timeGuide, styles.timeGuideBottom]} />
      </View>
    </View>
  );
}

function sameTime(left: Date, right: Date) {
  return left.getHours() === right.getHours();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: 14, paddingBottom: 28 },
  scroll: { flex: 1, minHeight: 0 },
  topBar: { height: 64, justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 18 },
  backButton: { height: 42, width: 42, alignItems: 'center', justifyContent: 'center' },
  locationRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
  },
  locationLabel: { color: colors.muted, fontSize: 21, fontWeight: '700' },
  locationValue: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  dateCard: {
    gap: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '900' },
  clearText: { color: colors.success, fontSize: 18, fontWeight: '900' },
  rangeText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  weekDay: { width: '14.28%', color: colors.muted, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  calendarHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { height: 34, width: 34, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  dayCell: { height: 42, width: '14.28%', alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  dayCellInRange: { backgroundColor: colors.brandSoft, borderRadius: 0 },
  dayCellPickupSelected: { backgroundColor: colors.brand },
  dayCellReturnSelected: { backgroundColor: colors.brand, borderRadius: 0 },
  dayCellDisabled: { opacity: 0.35 },
  dayText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  dayTextSelected: { color: colors.surface, fontWeight: '900' },
  dayTextDisabled: { color: colors.muted },
  selectionHint: { minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  selectionHintText: { color: colors.brand, fontSize: 13, fontWeight: '800' },
  stageSwitcher: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: 4,
  },
  stageButton: {
    minHeight: 38,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
  },
  stageButtonSelected: {
    backgroundColor: colors.brand,
  },
  stageButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  stageButtonTextSelected: {
    color: colors.surface,
  },
  timeRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  timeColumn: { flex: 1 },
  timeTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase' },
  timeViewport: { height: timeViewportHeight, marginTop: 6, position: 'relative' },
  timeScroll: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  timeChoices: { alignItems: 'center', paddingVertical: timeChoicePadding },
  timeChoice: { height: timeChoiceHeight, width: '100%', alignItems: 'center', justifyContent: 'center' },
  timeChoiceDisabled: { opacity: 0.5 },
  timeGuide: { position: 'absolute', left: 18, right: 18, height: 1, backgroundColor: colors.text },
  timeGuideTop: { top: timeChoicePadding },
  timeGuideBottom: { top: timeChoicePadding + timeChoiceHeight },
  timeText: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  timeTextMuted: { color: '#64748B' },
  timeTextDisabled: { color: '#CBD5E1' },
  validationError: { color: colors.error, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  continueButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.success, marginTop: 2 },
  continueButtonDisabled: { opacity: 0.45 },
  continueText: { color: colors.surface, fontSize: 17, fontWeight: '900', letterSpacing: 1 },
});

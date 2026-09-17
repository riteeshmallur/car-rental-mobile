import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react-native';

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

type AddVehicleHeaderProps = {
  disabled?: boolean;
  stepNumber: number;
  totalSteps: number;
  saveStatus: DraftSaveStatus;
  onBack: () => void;
  onRetry?: () => void;
};

export function AddVehicleHeader({
  disabled = false,
  onBack,
  onRetry,
  saveStatus,
  stepNumber,
  totalSteps,
}: AddVehicleHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onBack}
          style={[styles.iconButton, disabled && styles.iconButtonDisabled]}
        >
          <ArrowLeft color="#111827" size={22} />
        </Pressable>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Add vehicle</Text>
          <Text style={styles.subtitle}>Step {stepNumber} of {totalSteps}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View accessibilityLabel={`Step ${stepNumber} of ${totalSteps}`} style={styles.progressRow}>
        <View style={styles.progressLine} />
        {Array.from({ length: totalSteps }, (_, index) => {
          const currentStep = index + 1;
          const isCompleted = currentStep < stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <View
              key={currentStep}
              style={[
                styles.progressDot,
                isCompleted && styles.progressDotCompleted,
                isCurrent && styles.progressDotCurrent,
              ]}
            >
              {isCompleted ? <Check color="#FFFFFF" size={10} strokeWidth={3} /> : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.statusRow, saveStatus === 'failed' && styles.statusRowFailed]}>
        {saveStatus === 'saving' ? (
          <ActivityIndicator color="#0F766E" size="small" />
        ) : (
          <Check color={saveStatus === 'failed' ? '#B91C1C' : '#047857'} size={15} strokeWidth={3} />
        )}
        <Text style={[styles.statusText, saveStatus === 'failed' && styles.statusTextFailed]}>
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'failed'
              ? 'Save failed'
              : saveStatus === 'saved'
                ? 'Draft saved. You can leave and resume later.'
                : 'Draft not saved yet'}
        </Text>
        {saveStatus === 'failed' && onRetry ? (
          <Pressable
            accessibilityLabel="Retry save"
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <RotateCcw color="#B91C1C" size={14} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 16,
  },
  headerRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E7F0',
    backgroundColor: '#FFFFFF',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  titleGroup: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    color: '#101A35',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  subtitle: {
    marginTop: 1,
    color: '#6B7892',
    fontSize: 12,
    fontWeight: '800',
  },
  progressRow: {
    height: 24,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLine: {
    position: 'absolute',
    left: 5,
    right: 5,
    height: 2,
    backgroundColor: '#DDE5F0',
  },
  progressDot: {
    height: 14,
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#DDE5F0',
    backgroundColor: '#F7FAFF',
  },
  progressDotCurrent: {
    height: 16,
    width: 16,
    borderWidth: 0,
    backgroundColor: '#0F9D78',
  },
  progressDotCompleted: {
    borderWidth: 0,
    backgroundColor: '#0F9D78',
  },
  statusRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 11,
  },
  statusText: {
    flex: 1,
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  statusRowFailed: {
    backgroundColor: '#FEF2F2',
  },
  statusTextFailed: {
    color: '#B91C1C',
  },
  retryButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 5,
  },
  retryText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
});

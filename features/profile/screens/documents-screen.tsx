import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CarFront,
  ChevronRight,
  FileCheck2,
  IdCard,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHostStatus } from '@/features/host/hooks/use-host-status';
import { useSafeBack } from '@/hooks/use-safe-back';
import { hostsApi, type HostLifecycleStatus } from '@/services/hosts/hosts-api';
import { type HostVehicleListing } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';
import { colors, radii, shadows } from '@/utils/theme';

type DocumentsScreenProps = {
  mode: 'customer' | 'host';
};

type DocumentStatus = 'Action Required' | 'Pending' | 'Under Review' | 'Verified';

export function DocumentsScreen({ mode }: DocumentsScreenProps) {
  const fallback = mode === 'host' ? '/(host)/profile' : '/(customer)/profile';
  const goBack = useSafeBack({ fallback });
  const hostStatusQuery = useHostStatus();
  const hostStatus = hostStatusQuery.data;
  const canManageListings = hostStatus?.status === 'profile_created' || hostStatus?.status === 'active';
  const vehiclesQuery = useQuery({
    enabled: canManageListings,
    queryKey: ['host', 'vehicles'],
    queryFn: hostsApi.listVehicles,
  });
  const setupQuery = useQuery({
    enabled: canManageListings,
    queryKey: ['host', 'setup-status'],
    queryFn: hostsApi.setupStatus,
  });

  const openHostSetup = () => router.push('/(customer)/become-host');
  const openIdentityVerification = () => {
    if (canManageListings) {
      router.push('/(host)/identity-verification');
      return;
    }
    openHostSetup();
  };
  const openVehicleDocuments = () => {
    if ((vehiclesQuery.data?.length ?? 0) === 0) {
      router.push('/(host)/vehicles/new');
      return;
    }
    router.push('/(host)/cars');
  };

  const identityStatus = getIdentityStatus(
    hostStatus?.status,
    hostStatus?.verificationStatus,
    setupQuery.data?.tasks.find((task) => task.key === 'identity_verification')?.status,
  );
  const vehicleDocument = getVehicleDocumentState(hostStatus?.status, vehiclesQuery.data ?? []);
  const isLoading = hostStatusQuery.isLoading || (canManageListings && (vehiclesQuery.isLoading || setupQuery.isLoading));
  const error = hostStatusQuery.isError ? hostStatusQuery.error : vehiclesQuery.error ?? setupQuery.error;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>My Documents</Text>
            <Text style={styles.subtitle}>Manage verification and vehicle records</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.stateText}>Loading your document status</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text accessibilityRole="header" style={styles.stateTitle}>Documents could not load</Text>
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.stateText}>
              {normalizeApiError(error).message}
            </Text>
            <Pressable
              accessibilityLabel="Retry loading documents"
              accessibilityRole="button"
              onPress={() => void hostStatusQuery.refetch()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.notice}>
              Your document status is kept in sync with your existing host onboarding and vehicle listings.
            </Text>
            <DocumentRow
              actionLabel={identityStatus.actionLabel}
              icon={<IdCard color={colors.brand} size={22} />}
              onPress={identityStatus.actionLabel ? openIdentityVerification : undefined}
              status={identityStatus.status}
              subtitle={identityStatus.subtitle}
              title="Driving Licence"
            />
            <DocumentRow
              actionLabel={identityStatus.actionLabel}
              icon={<FileCheck2 color={colors.brand} size={22} />}
              onPress={identityStatus.actionLabel ? openIdentityVerification : undefined}
              status={identityStatus.status}
              subtitle={identityStatus.identitySubtitle}
              title="Identity Verification"
            />
            <DocumentRow
              actionLabel={vehicleDocument.actionLabel}
              icon={<CarFront color={colors.brand} size={22} />}
              onPress={
                vehicleDocument.actionLabel
                  ? vehicleDocument.actionLabel === 'Become a host'
                    ? openHostSetup
                    : openVehicleDocuments
                  : undefined
              }
              status={vehicleDocument.status}
              subtitle={vehicleDocument.subtitle}
              title="Vehicle Documents"
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function getIdentityStatus(
  status?: HostLifecycleStatus,
  verificationStatus?: string | null,
  setupStatus?: string,
) {
  if (verificationStatus === 'verified' || status === 'active') {
    return {
      status: 'Verified' as const,
      subtitle: 'Your host identity verification is complete.',
      identitySubtitle: 'Your identity verification is complete.',
    };
  }

  if (setupStatus === 'under_review') {
    return {
      status: 'Under Review' as const,
      subtitle: 'Your submitted verification is being reviewed.',
      identitySubtitle: 'Your submitted identity details are being reviewed.',
    };
  }

  if (setupStatus === 'action_required') {
    return {
      actionLabel: 'Update details',
      status: 'Action Required' as const,
      subtitle: 'Update your driving licence details for another review.',
      identitySubtitle: 'Update your identity details for another review.',
    };
  }

  if (status === 'profile_created' || verificationStatus === 'pending') {
    return {
      actionLabel: 'Verify identity',
      status: 'Action Required' as const,
      subtitle: 'Submit your driving licence for host verification.',
      identitySubtitle: 'Submit an identity document for host verification.',
    };
  }

  if (status === 'in_progress') {
    return {
      actionLabel: 'Continue setup',
      status: 'Pending' as const,
      subtitle: 'Finish host setup to provide your licence details.',
      identitySubtitle: 'Finish host setup to submit your identity details.',
    };
  }

  return {
    actionLabel: 'Get started',
    status: 'Action Required' as const,
    subtitle: 'Add a driving licence through host onboarding.',
    identitySubtitle: 'Complete host onboarding to submit verification.',
  };
}

function getVehicleDocumentState(
  status: HostLifecycleStatus | undefined,
  vehicles: HostVehicleListing[],
) {
  if (status === 'not_started' || status === 'in_progress' || !status) {
    return {
      actionLabel: 'Become a host',
      status: 'Action Required' as const,
      subtitle: 'Become a host to add vehicle document references.',
    };
  }

  if (vehicles.length === 0) {
    return {
      actionLabel: 'Add a vehicle',
      status: 'Pending' as const,
      subtitle: 'Add a vehicle to provide RC, insurance and PUC details.',
    };
  }

  const vehiclesWithCompleteReferences = vehicles.filter(hasCompleteVehicleReferences);

  if (vehiclesWithCompleteReferences.length !== vehicles.length) {
    return {
      actionLabel: 'Manage vehicles',
      status: 'Action Required' as const,
      subtitle: 'Add RC, insurance and PUC references to each vehicle listing.',
    };
  }

  const allListingsReviewed = vehicles.every(
    (vehicle) => vehicle.status === 'PUBLISHED' || vehicle.status === 'PAUSED',
  );

  return {
    actionLabel: 'Manage vehicles',
    status: allListingsReviewed ? ('Verified' as const) : ('Under Review' as const),
    subtitle: allListingsReviewed
      ? `${vehicles.length} ${vehicles.length === 1 ? 'listing has' : 'listings have'} approved document references.`
      : 'Your saved vehicle document references are being reviewed.',
  };
}

function hasCompleteVehicleReferences(vehicle: HostVehicleListing) {
  const documents = vehicle.listingDocuments;
  return Boolean(
    documents.registrationCertificateNumber
      && documents.insurancePolicyNumber
      && documents.pollutionCertificateNumber,
  );
}

function DocumentRow({
  actionLabel,
  icon,
  onPress,
  status,
  subtitle,
  title,
}: {
  actionLabel?: string;
  icon: React.ReactNode;
  onPress?: () => void;
  status: DocumentStatus;
  subtitle: string;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
        {actionLabel ? <Text style={styles.rowAction}>{actionLabel}</Text> : null}
      </View>
      {onPress ? <ChevronRight color={colors.muted} size={20} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={subtitle}
      accessibilityLabel={`${title}. ${status}. ${actionLabel ?? ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const style = status === 'Verified'
    ? styles.statusVerified
    : status === 'Under Review' || status === 'Pending'
      ? styles.statusPending
      : styles.statusRequired;

  return <Text style={[styles.statusBadge, style]}>{status}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  header: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '500', marginTop: 2 },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  content: { gap: 12, padding: 16, paddingTop: 8, paddingBottom: 32 },
  notice: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    padding: 14,
  },
  row: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 14,
    ...shadows.card,
  },
  rowIcon: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
  },
  rowCopy: { flex: 1, gap: 4, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  rowSubtitle: { color: colors.muted, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  rowAction: { color: colors.brand, fontSize: 13, fontWeight: '700', marginTop: 2 },
  statusBadge: { borderRadius: radii.pill, fontSize: 10, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  statusVerified: { backgroundColor: colors.successSoft, color: colors.success },
  statusPending: { backgroundColor: colors.brandSoft, color: colors.brandPressed },
  statusRequired: { backgroundColor: colors.errorSoft, color: colors.error },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 },
  stateTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  stateText: { color: colors.muted, fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' },
  retryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, paddingHorizontal: 18, marginTop: 6 },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.76 },
});

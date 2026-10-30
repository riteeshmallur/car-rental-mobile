import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  FileDown,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';
import { usersApi } from '@/services/users/users-api';
import { normalizeApiError } from '@/utils/errors';
import { colors, radii } from '@/utils/theme';

const exportKey = ['users', 'data-export', 'latest'] as const;
const deletionKey = ['users', 'deletion-request', 'latest'] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function label(value: string) {
  return value.replace(/_/g, ' ');
}

export function PrivacySecurityScreen() {
  const goBack = useSafeBack({ fallback: '/(customer)/profile' });
  const queryClient = useQueryClient();
  const exportQuery = useQuery({ queryKey: exportKey, queryFn: usersApi.latestDataExport });
  const deletionQuery = useQuery({ queryKey: deletionKey, queryFn: usersApi.latestDeletionRequest });
  const requestExport = useMutation({
    mutationFn: usersApi.requestDataExport,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: exportKey }),
  });
  const requestDeletion = useMutation({
    mutationFn: usersApi.requestDeletion,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: deletionKey }),
  });
  const isLoading = exportQuery.isLoading || deletionQuery.isLoading;
  const error = exportQuery.error ?? deletionQuery.error;
  const refresh = () => {
    void exportQuery.refetch();
    void deletionQuery.refetch();
  };
  const confirmDeletion = () => Alert.alert(
    'Request account deletion?',
    'This sends your account for deletion review. You will be notified when the request is processed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Request deletion', style: 'destructive', onPress: () => requestDeletion.mutate() },
    ],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <Header onBack={goBack} />
        {isLoading ? <LoadingState /> : error ? (
          <State
            action="Try again"
            body={normalizeApiError(error).message}
            onAction={refresh}
            title="Account controls could not load"
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.intro}>
              These controls apply to the same HopIn account used for customer and host mode.
            </Text>
            <Section icon={<FileDown color={colors.brand} size={21} />} title="Download your data">
              <Text style={styles.body}>
                Request a copy of your account profile, bookings, saved vehicles, notifications, and reviews.
              </Text>
              <ExportStatus exportData={exportQuery.data ?? null} />
              {requestExport.isError ? <InlineError message={normalizeApiError(requestExport.error).message} /> : null}
              <Pressable
                accessibilityRole="button"
                disabled={requestExport.isPending}
                onPress={() => requestExport.mutate()}
                style={[styles.primaryButton, requestExport.isPending && styles.disabled]}
              >
                {requestExport.isPending ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <>
                    <Download color={colors.surface} size={18} />
                    <Text style={styles.primaryText}>Request data export</Text>
                  </>
                )}
              </Pressable>
            </Section>
            <Section icon={<Trash2 color={colors.error} size={21} />} title="Delete account">
              <Text style={styles.body}>
                A deletion request is reviewed before your account is deactivated. This applies to both customer and host access.
              </Text>
              <DeletionStatus request={deletionQuery.data ?? null} />
              {requestDeletion.isError ? <InlineError message={normalizeApiError(requestDeletion.error).message} /> : null}
              {deletionQuery.data?.status === 'requested' ? null : (
                <Pressable
                  accessibilityRole="button"
                  disabled={requestDeletion.isPending}
                  onPress={confirmDeletion}
                  style={[styles.dangerButton, requestDeletion.isPending && styles.disabled]}
                >
                  {requestDeletion.isPending ? (
                    <ActivityIndicator color={colors.error} />
                  ) : (
                    <>
                      <Trash2 color={colors.error} size={18} />
                      <Text style={styles.dangerText}>Request account deletion</Text>
                    </>
                  )}
                </Pressable>
              )}
            </Section>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLead}>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
          <ArrowLeft color={colors.ink} size={21} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Privacy & security</Text>
        </View>
      </View>
    </View>
  );
}

function Section({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return <View style={styles.section}><View style={styles.sectionHeader}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>;
}

function ExportStatus({ exportData }: { exportData: Awaited<ReturnType<typeof usersApi.latestDataExport>> }) {
  if (!exportData) return null;
  return <View style={styles.status}><ShieldCheck color={colors.success} size={18} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>Export {label(exportData.status)}</Text><Text style={styles.statusText}>{exportData.status === 'ready' ? `Ready until ${formatDate(exportData.expiresAt)}` : `Requested ${formatDate(exportData.requestedAt)}`}</Text></View></View>;
}

function DeletionStatus({ request }: { request: Awaited<ReturnType<typeof usersApi.latestDeletionRequest>> }) {
  if (!request) return null;
  return <View style={styles.status}><ShieldCheck color={colors.brand} size={18} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>Deletion {label(request.status)}</Text><Text style={styles.statusText}>Requested {formatDate(request.requestedAt)}</Text></View></View>;
}

function InlineError({ message }: { message: string }) { return <Text style={styles.error}>{message}</Text>; }
function LoadingState() { return <View style={styles.state}><ActivityIndicator color={colors.brand} /><Text style={styles.body}>Loading account controls</Text></View>; }
function State({ action, body, onAction, title }: { action?: string; body: string; onAction?: () => void; title: string }) { return <View style={styles.state}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.body}>{body}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.primaryButton}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View>; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 16 },
  headerLead: { alignItems: 'center', flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 12, padding: 14 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  status: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 10, flexDirection: 'row', gap: 9, padding: 10 },
  statusCopy: { flex: 1 },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  statusText: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: radii.md, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  primaryText: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  dangerButton: { alignItems: 'center', backgroundColor: colors.errorSoft, borderColor: '#FECACA', borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  dangerText: { color: '#B91C1C', fontSize: 14, fontWeight: '900' },
  error: { color: '#B91C1C', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  disabled: { opacity: 0.55 },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 },
  stateTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', textAlign: 'center' },
});

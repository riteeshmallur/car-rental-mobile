import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CreditCard, RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';
import { usersApi, type PaymentMethod } from '@/services/users/users-api';
import { normalizeApiError } from '@/utils/errors';

const queryKey = ['users', 'payment-methods'] as const;

function cardName(method: PaymentMethod) { return `${method.brand || method.provider} ending in ${method.last4}`; }
function expires(method: PaymentMethod) { return method.expMonth && method.expYear ? `Expires ${String(method.expMonth).padStart(2, '0')}/${method.expYear}` : 'Expiry unavailable'; }

export function PaymentMethodsScreen() {
  const goBack = useSafeBack({ fallback: '/(customer)/profile' });
  const queryClient = useQueryClient();
  const methodsQuery = useQuery({ queryKey, queryFn: usersApi.paymentMethods });
  const defaultMutation = useMutation({
    mutationFn: usersApi.setDefaultPaymentMethod,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (error) => Alert.alert('Could not update payment method', normalizeApiError(error).message),
  });
  const isRefreshing = methodsQuery.isRefetching && !methodsQuery.isLoading;

  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.screen}><Header isLoading={methodsQuery.isFetching} onBack={goBack} onRefresh={() => void methodsQuery.refetch()} />{methodsQuery.isLoading ? <LoadingState /> : methodsQuery.isError ? <State title="Payment methods could not load" body={normalizeApiError(methodsQuery.error).message} action="Try again" onAction={() => void methodsQuery.refetch()} /> : <FlatList contentContainerStyle={styles.list} data={methodsQuery.data ?? []} keyExtractor={(item) => item.id} ListHeaderComponent={<Text style={styles.intro}>Saved methods are shared across customer bookings and host account settings.</Text>} ListEmptyComponent={<State title="No saved payment methods" body="A payment method will appear here once it is saved by a supported payment flow." />} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void methodsQuery.refetch()} />} renderItem={({ item }) => <PaymentMethodRow method={item} isUpdating={defaultMutation.isPending && defaultMutation.variables === item.id} onSetDefault={() => defaultMutation.mutate(item.id)} />} showsVerticalScrollIndicator={false} />}</View></SafeAreaView>;
}

function Header({ isLoading, onBack, onRefresh }: { isLoading: boolean; onBack: () => void; onRefresh: () => void }) { return <View style={styles.header}><View style={styles.headerLead}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.iconButton}><ArrowLeft color="#0F172A" size={21} /></Pressable><View><Text style={styles.eyebrow}>Account</Text><Text style={styles.title}>Payment methods</Text></View></View><Pressable accessibilityLabel="Refresh payment methods" accessibilityRole="button" disabled={isLoading} onPress={onRefresh} style={styles.iconButton}>{isLoading ? <ActivityIndicator color="#0B4FE8" size="small" /> : <RefreshCw color="#0F172A" size={20} />}</Pressable></View>; }

function PaymentMethodRow({ method, isUpdating, onSetDefault }: { method: PaymentMethod; isUpdating: boolean; onSetDefault: () => void }) { return <View style={styles.method}><View style={styles.methodIcon}><CreditCard color="#0B4FE8" size={22} /></View><View style={styles.methodCopy}><Text style={styles.methodTitle}>{cardName(method)}</Text><Text style={styles.methodBody}>{expires(method)}</Text>{method.isDefault ? <View style={styles.defaultBadge}><Check color="#15803D" size={12} /><Text style={styles.defaultText}>Default</Text></View> : null}</View>{method.isDefault ? null : <Pressable accessibilityRole="button" disabled={isUpdating} onPress={onSetDefault} style={[styles.defaultButton, isUpdating && styles.disabled]}>{isUpdating ? <ActivityIndicator color="#0B4FE8" size="small" /> : <Text style={styles.defaultButtonText}>Set default</Text>}</Pressable>}</View>; }
function LoadingState() { return <View style={styles.state}><ActivityIndicator color="#0B4FE8" /><Text style={styles.body}>Loading payment methods</Text></View>; }
function State({ action, body, onAction, title }: { action?: string; body: string; onAction?: () => void; title: string }) { return <View style={styles.state}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.body}>{body}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.retry}><Text style={styles.retryText}>{action}</Text></Pressable> : null}</View>; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F7FAFF', flex: 1 }, screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 16 }, headerLead: { alignItems: 'center', flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 }, iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, eyebrow: { color: '#64748B', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#0F172A', fontSize: 23, fontWeight: '900' }, list: { gap: 12, padding: 16, paddingBottom: 32 }, intro: { color: '#64748B', fontSize: 13, fontWeight: '600', lineHeight: 19 }, method: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 82, padding: 13 }, methodIcon: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 11, height: 44, justifyContent: 'center', width: 44 }, methodCopy: { flex: 1, gap: 3, minWidth: 0 }, methodTitle: { color: '#0F172A', fontSize: 15, fontWeight: '900' }, methodBody: { color: '#64748B', fontSize: 12, fontWeight: '600' }, defaultBadge: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 }, defaultText: { color: '#15803D', fontSize: 11, fontWeight: '900' }, defaultButton: { alignItems: 'center', borderColor: '#BFDBFE', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 38, paddingHorizontal: 10 }, defaultButtonText: { color: '#0B4FE8', fontSize: 12, fontWeight: '900' }, state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 }, stateTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', textAlign: 'center' }, body: { color: '#64748B', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' }, retry: { alignItems: 'center', backgroundColor: '#0B4FE8', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 120, paddingHorizontal: 16 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, disabled: { opacity: 0.55 },
});

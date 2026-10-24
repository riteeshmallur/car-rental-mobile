import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, CheckCheck, RefreshCw } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  rentersApi,
  type RenterNotification,
} from '@/services/renters/renters-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { normalizeApiError } from '@/utils/errors';

const pageSize = 20;
const queryKey = ['renter', 'notifications'] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function NotificationsScreen() {
  const goBack = useSafeBack({ fallback: '/(customer)/profile' });
  const queryClient = useQueryClient();
  const notificationsQuery = useInfiniteQuery({
    initialPageParam: 1,
    queryKey,
    queryFn: ({ pageParam }) => rentersApi.getNotifications(pageParam, pageSize),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });
  const notifications = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data],
  );
  const markReadMutation = useMutation({
    mutationFn: rentersApi.markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<typeof notificationsQuery.data>(queryKey);
      queryClient.setQueryData<typeof notificationsQuery.data>(queryKey, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
              })),
            }
          : current,
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      Alert.alert('Could not update notification', normalizeApiError(error).message);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const isRefreshing = notificationsQuery.isRefetching && !notificationsQuery.isFetchingNextPage;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <Header isLoading={notificationsQuery.isFetching} onBack={goBack} onRefresh={() => void notificationsQuery.refetch()} />
        {notificationsQuery.isLoading ? <LoadingState /> : notificationsQuery.isError ? <State title="Notifications could not load" body={normalizeApiError(notificationsQuery.error).message} action="Try again" onAction={() => void notificationsQuery.refetch()} /> : <FlatList
          contentContainerStyle={styles.list}
          data={notifications}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<State title="No notifications" body="Updates about your trips and account will appear here." />}
          ListFooterComponent={notificationsQuery.isFetchingNextPage ? <ActivityIndicator color="#0B6FE8" /> : null}
          onEndReached={() => {
            if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) void notificationsQuery.fetchNextPage();
          }}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void notificationsQuery.refetch()} />}
          renderItem={({ item }) => <NotificationRow item={item} isUpdating={markReadMutation.isPending && markReadMutation.variables === item.id} onRead={() => markReadMutation.mutate(item.id)} />}
          showsVerticalScrollIndicator={false}
        />}
      </View>
    </SafeAreaView>
  );
}

function Header({ isLoading, onBack, onRefresh }: { isLoading: boolean; onBack: () => void; onRefresh: () => void }) {
  return <View style={styles.header}><View style={styles.headerLead}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.iconButton}><ArrowLeft color="#102550" size={21} /></Pressable><View><Text style={styles.eyebrow}>Account</Text><Text accessibilityRole="header" style={styles.title}>Notifications</Text></View></View><Pressable accessibilityLabel={isLoading ? 'Refreshing notifications' : 'Refresh notifications'} accessibilityRole="button" accessibilityState={{ busy: isLoading, disabled: isLoading }} disabled={isLoading} onPress={onRefresh} style={styles.iconButton}>{isLoading ? <ActivityIndicator accessibilityLabel="Refreshing notifications" color="#0B6FE8" size="small" /> : <RefreshCw color="#102550" size={20} />}</Pressable></View>;
}

function NotificationRow({ item, isUpdating, onRead }: { item: RenterNotification; isUpdating: boolean; onRead: () => void }) {
  return <Pressable accessibilityHint={item.isRead ? undefined : 'Marks this notification as read.'} accessibilityLabel={`${item.isRead ? 'Read' : 'Unread'} notification: ${item.title}. ${item.body}. ${formatDate(item.createdAt)}`} accessibilityRole="button" accessibilityState={{ busy: isUpdating, disabled: item.isRead || isUpdating }} disabled={item.isRead || isUpdating} onPress={onRead} style={({ pressed }) => [styles.row, !item.isRead && styles.rowUnread, pressed && !item.isRead && styles.pressed]}><View accessible={false} style={[styles.icon, !item.isRead && styles.iconUnread]}>{isUpdating ? <ActivityIndicator accessibilityLabel="Marking notification as read" color="#0B6FE8" size="small" /> : item.isRead ? <CheckCheck color="#536B91" size={19} /> : <Bell color="#0B6FE8" size={19} />}</View><View accessible={false} style={styles.copy}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{formatDate(item.createdAt)}</Text></View>{!item.isRead ? <View accessible={false} style={styles.dot} /> : null}</Pressable>;
}

function LoadingState() { return <View style={styles.state}><ActivityIndicator color="#0B6FE8" /><Text style={styles.body}>Loading notifications</Text></View>; }
function State({ action, body, onAction, title }: { action?: string; body: string; onAction?: () => void; title: string }) { return <View style={styles.state}><Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text><Text accessibilityLiveRegion="polite" style={styles.body}>{body}</Text>{action && onAction ? <Pressable accessibilityLabel={action} accessibilityRole="button" onPress={onAction} style={styles.retry}><Text style={styles.retryText}>{action}</Text></Pressable> : null}</View>; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F3F9FF', flex: 1 }, screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 16 }, headerLead: { alignItems: 'center', flexDirection: 'row', gap: 12 }, iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, eyebrow: { color: '#536B91', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#102550', fontSize: 23, fontWeight: '900' }, list: { gap: 10, padding: 16, paddingBottom: 32 }, row: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 13 }, rowUnread: { borderColor: '#BFDBFE', backgroundColor: '#F3F9FF' }, icon: { alignItems: 'center', backgroundColor: '#F3F9FF', borderRadius: 11, height: 42, justifyContent: 'center', width: 42 }, iconUnread: { backgroundColor: '#EAF4FF' }, copy: { flex: 1, gap: 3, minWidth: 0 }, rowTitle: { color: '#102550', fontSize: 15, fontWeight: '900' }, body: { color: '#536B91', fontSize: 13, fontWeight: '600', lineHeight: 19 }, date: { color: '#536B91', fontSize: 11, fontWeight: '700', marginTop: 2 }, dot: { backgroundColor: '#0B6FE8', borderRadius: 4, height: 8, marginTop: 5, width: 8 }, state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 }, stateTitle: { color: '#102550', fontSize: 20, fontWeight: '900', textAlign: 'center' }, retry: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 120, paddingHorizontal: 16 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, pressed: { opacity: 0.75 },
});

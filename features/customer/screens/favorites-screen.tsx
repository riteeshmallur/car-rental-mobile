import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CarFront, Heart, MapPin, Star } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import {
  rentersApi,
  type RenterFavourite,
  type RenterFavouritesResponse,
} from '@/services/renters/renters-api';
import { colors, radii, shadows } from '@/utils/theme';

const pageSize = 20;
const favouritesQueryKey = ['renter', 'favourites', 'pages'] as const;

export function FavoritesScreen() {
  const queryClient = useQueryClient();
  const favouritesQuery = useInfiniteQuery({
    initialPageParam: 1,
    queryKey: favouritesQueryKey,
    queryFn: ({ pageParam }) => rentersApi.getFavourites(pageParam, pageSize),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });
  const favourites = useMemo(
    () => favouritesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [favouritesQuery.data],
  );
  const removeFavourite = useMutation({
    mutationFn: rentersApi.removeFavourite,
    onMutate: async (vehicleId) => {
      await queryClient.cancelQueries({ queryKey: favouritesQueryKey });
      const previous = queryClient.getQueryData<typeof favouritesQuery.data>(
        favouritesQueryKey,
      );

      queryClient.setQueryData<typeof favouritesQuery.data>(
        favouritesQueryKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((item) => item.vehicle.id !== vehicleId),
                  meta: {
                    ...page.meta,
                    total: Math.max(0, page.meta.total - 1),
                  },
                })),
              }
            : current,
      );

      return { previous };
    },
    onError: (_error, _vehicleId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(favouritesQueryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['renter', 'favourites'] });
    },
  });
  const isRefreshing =
    favouritesQuery.isRefetching && !favouritesQuery.isFetchingNextPage;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>Vehicles you have saved</Text>
          </View>
        </View>

        {favouritesQuery.isLoading ? (
          <FavoritesSkeleton />
        ) : favouritesQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body="We could not load your saved vehicles."
            onAction={() => void favouritesQuery.refetch()}
            title="Favorites unavailable"
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={favourites}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <StateMessage
                body="Tap the heart on any vehicle to save it here."
                title="No favorites yet"
              />
            }
            ListFooterComponent={
              favouritesQuery.isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={colors.brand} />
                </View>
              ) : null
            }
            onEndReached={() => {
              if (favouritesQuery.hasNextPage && !favouritesQuery.isFetchingNextPage) {
                void favouritesQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                onRefresh={() => void favouritesQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => (
              <FavoriteCard
                favourite={item}
                isRemoving={
                  removeFavourite.isPending &&
                  removeFavourite.variables === item.vehicle.id
                }
                onOpen={() =>
                  router.push({
                    pathname: '/(customer)/vehicles/[id]',
                    params: { id: item.vehicle.id, origin: 'favorites' },
                  })
                }
                onRemove={() => removeFavourite.mutate(item.vehicle.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            style={styles.listView}
          />
        )}
      </View>
      <BottomNavigation />
    </SafeAreaView>
  );
}

function FavoriteCard({
  favourite,
  isRemoving,
  onOpen,
  onRemove,
}: {
  favourite: RenterFavourite;
  isRemoving: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const imageUrl = getVehicleImageVariantUrl(favourite.vehicle.imageUrl, 'thumbnail');

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityHint="Opens vehicle details."
        accessibilityLabel={`${favourite.vehicle.make} ${favourite.vehicle.model}, ₹${Number(favourite.vehicle.pricePerDay).toLocaleString('en-IN')} per day${favourite.vehicle.averageRating > 0 ? `, rated ${favourite.vehicle.averageRating.toFixed(1)} from ${favourite.vehicle.reviewCount} reviews` : ', new listing'}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}
      >
        <View style={styles.imageFrame}>
          {imageUrl ? (
            <CachedVehicleImage style={styles.image} uri={imageUrl} />
          ) : (
            <CarFront color={colors.ink} size={36} />
          )}
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.carName}>
            {favourite.vehicle.make} {favourite.vehicle.model}
          </Text>
          <View style={styles.ratingRow}>
            <Star color="#F59E0B" fill="#F59E0B" size={14} />
            <Text style={styles.ratingText}>
              {favourite.vehicle.averageRating > 0
                ? `${favourite.vehicle.averageRating.toFixed(1)} (${favourite.vehicle.reviewCount})`
                : 'New'}
            </Text>
          </View>
          {favourite.vehicle.pickupLocation ? (
            <View style={styles.locationRow}>
              <MapPin color={colors.muted} size={14} />
              <Text numberOfLines={1} style={styles.locationText}>
                {favourite.vehicle.pickupLocation}
              </Text>
            </View>
          ) : null}
          <Text style={styles.price}>₹{Number(favourite.vehicle.pricePerDay).toLocaleString('en-IN')} / day</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${favourite.vehicle.make} ${favourite.vehicle.model} from favorites`}
        accessibilityRole="button"
        disabled={isRemoving}
        accessibilityState={{ busy: isRemoving, disabled: isRemoving }}
        onPress={onRemove}
        style={({ pressed }) => [styles.heartButton, pressed && styles.pressed]}
      >
        {isRemoving ? (
          <ActivityIndicator accessibilityLabel="Removing favorite" color={colors.brand} size="small" />
        ) : (
          <Heart color={colors.error} fill={colors.error} size={19} />
        )}
      </Pressable>
    </View>
  );
}

function FavoritesSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonCopy}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

function StateMessage({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.stateMessage}>
      <Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityLabel={actionLabel} accessibilityRole="button" onPress={onAction} style={styles.retryButton}>
          <Text style={styles.retryText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 14 },
  header: { marginBottom: 18 },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  listView: { flex: 1, minHeight: 0 },
  list: { gap: 12, paddingBottom: 28 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, overflow: 'hidden', position: 'relative', ...shadows.card },
  cardButton: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 132, padding: 12, paddingRight: 52 },
  imageFrame: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, height: 106, justifyContent: 'center', overflow: 'hidden', width: 126 },
  image: { height: '100%', width: '100%' },
  cardCopy: { flex: 1, gap: 8, minWidth: 0 },
  carName: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  ratingText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  locationText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: '700' },
  price: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  heartButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 19, borderWidth: 1, height: 38, justifyContent: 'center', position: 'absolute', right: 12, top: 12, width: 38 },
  footerLoader: { alignItems: 'center', paddingVertical: 16 },
  stateMessage: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', paddingHorizontal: 28 },
  stateTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stateBody: { color: colors.muted, fontSize: 14, fontWeight: '700', lineHeight: 21, textAlign: 'center' },
  retryButton: { backgroundColor: colors.brand, borderRadius: radii.md, marginTop: 8, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  skeletonList: { gap: 12 },
  skeletonCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 12 },
  skeletonImage: { backgroundColor: '#E5E7EB', borderRadius: radii.sm, height: 106, width: 126 },
  skeletonCopy: { flex: 1, gap: 12, justifyContent: 'center' },
  skeletonLineWide: { backgroundColor: '#E5E7EB', borderRadius: 5, height: 16, width: '82%' },
  skeletonLine: { backgroundColor: '#E5E7EB', borderRadius: 5, height: 13, width: '62%' },
  skeletonLineShort: { backgroundColor: '#E5E7EB', borderRadius: 5, height: 14, width: '48%' },
  pressed: { opacity: 0.76 },
});

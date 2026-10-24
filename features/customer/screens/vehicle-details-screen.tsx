import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Fuel,
  Heart,
  MapPin,
  RotateCcw,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { type ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatDailyPrice,
  formatMoney,
  getCarImageUrl,
  getVehicleImageVariantUrl,
} from '@/features/customer/utils/car-formatters';
import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import {
  readSearchRouteState,
  toSearchRouteParams,
} from '@/features/customer/utils/search-route-state';
import { vehiclesApi } from '@/services/vehicles/vehicles-api';
import { rentersApi } from '@/services/renters/renters-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useCustomerSearchStore } from '@/store/customer-search-store';
import { type VehicleDetail } from '@/types/car';
import { colors, radii, shadows } from '@/utils/theme';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function VehicleDetailsScreen() {
  const params = useLocalSearchParams();
  const vehicleId = getParam(params.id);
  const searchRouteState = readSearchRouteState(params);
  const locationId = searchRouteState.locationId;
  const origin = getParam(params.origin);
  const rentalWindow = useCustomerSearchStore((state) => state.rentalWindow);
  const pickupDateTime =
    searchRouteState.pickupDateTime ?? rentalWindow.pickupAt.toISOString();
  const returnDateTime =
    searchRouteState.returnDateTime ?? rentalWindow.returnAt.toISOString();
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const backFallback = useMemo<Href>(() => {
    if (
      origin === 'search-results' &&
      locationId &&
      pickupDateTime &&
      returnDateTime
    ) {
      return {
        pathname: '/(customer)/results',
        params: toSearchRouteParams({
          ...searchRouteState,
          pickupDateTime,
          returnDateTime,
        }),
      };
    }

    if (origin === 'host-cars') {
      return '/(host)/cars';
    }

    if (origin === 'favorites') {
      return '/(customer)/favorites';
    }

    return '/(customer)/home';
  }, [locationId, origin, pickupDateTime, returnDateTime, searchRouteState]);
  const goBack = useSafeBack({ fallback: backFallback });

  const detailsQuery = useQuery({
    enabled: Boolean(vehicleId),
    queryKey: ['vehicles', 'details', vehicleId, pickupDateTime, returnDateTime],
    queryFn: () =>
      vehiclesApi.findById(vehicleId ?? '', {
        startsAt: pickupDateTime,
        endsAt: returnDateTime,
      }),
  });

  const reviewsQuery = useQuery({
    enabled: Boolean(vehicleId),
    queryKey: ['vehicles', 'reviews', vehicleId],
    queryFn: () => vehiclesApi.findReviews(vehicleId ?? '', 1, 3),
  });

  const favouritesQuery = useQuery({
    queryKey: ['renter', 'favourites'],
    queryFn: () => rentersApi.getFavourites(1, 50),
  });
  const isFavorite =
    favoriteOverride ??
    favouritesQuery.data?.items.some((item) => item.vehicle.id === vehicleId) ??
    false;
  const favouriteMutation = useMutation({
    mutationFn: ({ isFavourite, targetVehicleId }: { isFavourite: boolean; targetVehicleId: string }) =>
      isFavourite
        ? rentersApi.removeFavourite(targetVehicleId)
        : rentersApi.addFavourite(targetVehicleId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['renter', 'favourites'] });
    },
  });

  useEffect(() => {
    setFavoriteOverride(null);
  }, [vehicleId]);

  const toggleFavorite = () => {
    if (!vehicleId || favouriteMutation.isPending) {
      return;
    }

    const previousValue = isFavorite;
    setFavoriteOverride(!previousValue);
    favouriteMutation.mutate(
      { isFavourite: previousValue, targetVehicleId: vehicleId },
      {
        onError: () => setFavoriteOverride(previousValue),
      },
    );
  };

  const shareVehicle = async () => {
    if (!detailsQuery.data) {
      return;
    }

    await Share.share({
      message: `Check out ${detailsQuery.data.make} ${detailsQuery.data.model} on HopIn`,
    });
  };

  const continueBooking = () => {
    if (!vehicleId) {
      return;
    }

    router.push({
      pathname: '/(customer)/booking/summary',
      params: {
        vehicleId,
        origin: origin ?? 'home',
        ...toSearchRouteParams({
          ...searchRouteState,
          pickupDateTime,
          returnDateTime,
        }),
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {!detailsQuery.data ? (
          <View style={styles.stateHeader}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={goBack}
              style={styles.heroButton}
            >
              <ArrowLeft color="#102550" size={21} />
            </Pressable>
          </View>
        ) : null}
        {!vehicleId ? (
          <StateMessage
            body="Go back to search and choose a vehicle."
            title="Vehicle id missing"
          />
        ) : detailsQuery.isLoading ? (
          <DetailsSkeleton />
        ) : detailsQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body="The backend could not load this vehicle."
            onAction={() => void detailsQuery.refetch()}
            title="Vehicle unavailable"
          />
        ) : detailsQuery.data ? (
          <>
            <VehicleDetailsHeader
              isFavorite={isFavorite}
              onBack={goBack}
              isFavoritePending={favouriteMutation.isPending}
              onFavoritePress={toggleFavorite}
              onSharePress={shareVehicle}
            />
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <VehicleHero vehicle={detailsQuery.data} />

              <VehicleSummary
                pickupDateTime={pickupDateTime}
                returnDateTime={returnDateTime}
                vehicle={detailsQuery.data}
              />

              <InfoSection title="Features">
                <FeatureList features={detailsQuery.data.features} />
              </InfoSection>

              <InfoSection title="Description">
                <Text style={styles.paragraph}>
                  {detailsQuery.data.description ||
                    'This vehicle has been verified by HopIn and is ready for your selected trip.'}
                </Text>
              </InfoSection>

              <InfoSection title="Pickup location">
                <View style={styles.locationBlock}>
                  <MapPin color="#102550" size={20} />
                  <View style={styles.locationCopy}>
                    <Text style={styles.locationTitle}>
                      {detailsQuery.data.pickupLocation.name ?? 'Pickup location'}
                    </Text>
                    <Text style={styles.mutedText}>
                      {[
                        detailsQuery.data.pickupLocation.address,
                        detailsQuery.data.pickupLocation.city,
                        detailsQuery.data.pickupLocation.state,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Address shared after booking'}
                    </Text>
                  </View>
                </View>
              </InfoSection>

              <InfoSection title="Host">
                <HostCard vehicle={detailsQuery.data} />
              </InfoSection>

              <InfoSection title="Availability">
                <AvailabilityBlock vehicle={detailsQuery.data} />
              </InfoSection>

              <InfoSection title="Rental rules">
                <RulesList vehicle={detailsQuery.data} />
              </InfoSection>

              <InfoSection title="Reviews">
                <View style={styles.reviews}>
                  {reviewsQuery.isLoading ? (
                    <View style={styles.reviewState}>
                      <ActivityIndicator color={colors.brand} />
                      <Text style={styles.mutedText}>Loading reviews</Text>
                    </View>
                  ) : reviewsQuery.isError ? (
                    <View style={styles.reviewState}>
                      <Text style={styles.mutedText}>Reviews could not load.</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void reviewsQuery.refetch()}
                        style={styles.reviewRetryButton}
                      >
                        <Text style={styles.reviewRetryText}>Try again</Text>
                      </Pressable>
                    </View>
                  ) : (reviewsQuery.data?.items ?? []).length > 0 ? (
                    reviewsQuery.data?.items.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewName}>{review.reviewerName}</Text>
                          <Text style={styles.reviewRating}>{review.rating.toFixed(1)}</Text>
                        </View>
                        {review.comment ? (
                          <Text style={styles.paragraph}>{review.comment}</Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.mutedText}>No reviews yet.</Text>
                  )}
                </View>
              </InfoSection>
            </ScrollView>

            <StickyBookingBar
              onContinue={continueBooking}
              vehicle={detailsQuery.data}
            />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function VehicleDetailsHeader({
  isFavorite,
  isFavoritePending,
  onBack,
  onFavoritePress,
  onSharePress,
}: {
  isFavorite: boolean;
  isFavoritePending: boolean;
  onBack: () => void;
  onFavoritePress: () => void;
  onSharePress: () => void;
}) {
  return (
    <View style={styles.detailsHeader}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
      >
        <ArrowLeft color={colors.ink} size={22} />
      </Pressable>
      <View style={styles.detailsHeaderCopy}>
        <Text style={styles.detailsHeaderTitle}>Car details</Text>
        <Text style={styles.detailsHeaderSubtitle}>Review and book your car</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
          accessibilityRole="button"
          disabled={isFavoritePending}
          onPress={onFavoritePress}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
        >
          {isFavoritePending ? (
            <ActivityIndicator color={colors.brand} size="small" />
          ) : (
            <Heart
              color={isFavorite ? colors.error : colors.ink}
              fill={isFavorite ? colors.error : 'transparent'}
              size={22}
            />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Share vehicle"
          accessibilityRole="button"
          onPress={onSharePress}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
        >
          <Share2 color={colors.ink} size={21} />
        </Pressable>
      </View>
    </View>
  );
}

function VehicleHero({
  vehicle,
}: {
  vehicle: VehicleDetail;
}) {
  const [galleryWidth, setGalleryWidth] = useState(0);
  const galleryRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const images = useMemo(() => {
    if (vehicle.images.length > 0) {
      return vehicle.images;
    }

    return [{ id: `${vehicle.id}-fallback`, url: '', isPrimary: true }];
  }, [vehicle]);

  return (
    <View
      style={styles.hero}
      onLayout={(event) => setGalleryWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={galleryRef}
        onContentSizeChange={() => galleryRef.current?.scrollTo({ x: activeIndex * galleryWidth, animated: false })}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(
          event: NativeSyntheticEvent<NativeScrollEvent>,
        ) => {
          setActiveIndex(
            Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / (galleryWidth || 1)))),
          );
        }}
      >
        {images.map((image) => {
          const imageUrl = image.detailUrl
            ? getVehicleImageVariantUrl(image.detailUrl, 'detail')
            : getVehicleImageVariantUrl(image.url, 'detail');

          return (
            <View
              key={image.id}
              style={[styles.galleryItem, { width: galleryWidth }]}
            >
              {imageUrl ? (
                <CachedVehicleImage
                  accessibilityLabel={`${vehicle.make} ${vehicle.model}`}
                  style={styles.heroImage}
                  uri={imageUrl}
                />
              ) : (
                <View style={styles.heroFallback}>
                  <CarFront color="#102550" size={56} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.galleryFooter}>
        <View style={styles.galleryDots}>
          {images.map((image, index) => (
            <View
              key={image.id}
              style={[styles.galleryDot, index === activeIndex && styles.galleryDotActive]}
            />
          ))}
        </View>
        <View style={styles.galleryCount}>
          <Text style={styles.galleryCountText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>
      </View>
    </View>
  );
}

function VehicleSummary({
  pickupDateTime,
  returnDateTime,
  vehicle,
}: {
  pickupDateTime: string;
  returnDateTime: string;
  vehicle: VehicleDetail;
}) {
  return (
    <View style={styles.summary}>
      <View style={styles.titleCopy}>
        <Text style={styles.vehicleTitle}>
          {vehicle.make} {vehicle.model}
        </Text>
        <View style={styles.ratingRow}>
          <Star color="#F59E0B" fill="#F59E0B" size={17} />
          <Text style={styles.ratingText}>
            {vehicle.rating > 0 ? vehicle.rating.toFixed(1) : 'New'}
          </Text>
          <Text style={styles.reviewCount}>
            ({vehicle.reviewCount} reviews)
          </Text>
        </View>
        <Text style={styles.mutedText}>
          {vehicle.manufacturingYear} • {vehicle.vehicleType}
        </Text>
      </View>

      <View style={styles.specGrid}>
        <Spec icon={RotateCcw} label="Transmission" value={vehicle.transmission} />
        <Spec icon={Fuel} label="Fuel" value={vehicle.fuelType} />
        <Spec icon={Users} label="Seats" value={`${vehicle.seats}`} />
      </View>

      <View style={styles.tripWindow}>
        <CalendarClock color="#102550" size={19} />
        <View style={styles.tripCopy}>
          <Text style={styles.tripTitle}>Selected rental window</Text>
          <Text style={styles.mutedText}>{formatDateTime(pickupDateTime)}</Text>
          <Text style={styles.mutedText}>{formatDateTime(returnDateTime)}</Text>
        </View>
      </View>
    </View>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.spec}>
      <Icon color="#102550" size={20} />
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function InfoSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FeatureList({ features }: { features: string[] }) {
  if (!features.length) {
    return <Text style={styles.mutedText}>No features listed yet.</Text>;
  }

  return (
    <View style={styles.featureWrap}>
      {features.map((feature) => (
        <View key={feature} style={styles.featureChip}>
          <CheckCircle2 color="#047857" size={15} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );
}

function HostCard({ vehicle }: { vehicle: VehicleDetail }) {
  return (
    <View style={styles.hostCard}>
      <View style={styles.hostAvatar}>
        {vehicle.host.profileImageUrl ? (
          <Image
            source={{ uri: getCarImageUrl(vehicle.host.profileImageUrl) ?? '' }}
            style={styles.hostImage}
          />
        ) : (
          <UserRound color="#102550" size={24} />
        )}
      </View>
      <View style={styles.hostCopy}>
        <Text style={styles.hostName}>{vehicle.host.name}</Text>
        <Text style={styles.mutedText}>
          Host rating {vehicle.host.rating > 0 ? vehicle.host.rating.toFixed(1) : 'New'}
        </Text>
      </View>
    </View>
  );
}

function AvailabilityBlock({ vehicle }: { vehicle: VehicleDetail }) {
  return (
    <View
      style={[
        styles.availability,
        !vehicle.availability.available && styles.availabilityBlocked,
      ]}
    >
      <ShieldCheck
        color={vehicle.availability.available ? '#047857' : '#B91C1C'}
        size={20}
      />
      <View style={styles.availabilityCopy}>
        <Text
          style={[
            styles.availabilityTitle,
            !vehicle.availability.available && styles.availabilityTitleBlocked,
          ]}
        >
          {vehicle.availability.available ? 'Available' : 'Unavailable'}
        </Text>
        <Text style={styles.mutedText}>
          {vehicle.availability.reason ??
            'This vehicle is available for the selected rental dates.'}
        </Text>
      </View>
    </View>
  );
}

function RulesList({ vehicle }: { vehicle: VehicleDetail }) {
  const rules = [
    `Minimum rental: ${vehicle.rentalRules.minimumRentalDays} day(s)`,
    vehicle.rentalRules.maximumRentalDays
      ? `Maximum rental: ${vehicle.rentalRules.maximumRentalDays} day(s)`
      : 'Maximum rental: Flexible',
    vehicle.rentalRules.mileageLimitPerDay
      ? `Mileage limit: ${vehicle.rentalRules.mileageLimitPerDay} km/day`
      : 'Mileage limit: Shared by host',
    `Security deposit: ${formatMoney(vehicle.rentalRules.securityDeposit)}`,
  ];

  return (
    <View style={styles.rules}>
      {rules.map((rule) => (
        <View key={rule} style={styles.ruleRow}>
          <View style={styles.ruleDot} />
          <Text style={styles.ruleText}>{rule}</Text>
        </View>
      ))}
    </View>
  );
}

function StickyBookingBar({
  onContinue,
  vehicle,
}: {
  onContinue: () => void;
  vehicle: VehicleDetail;
}) {
  return (
    <View style={styles.stickyBar}>
      <View style={styles.stickyCopy}>
        <Text style={styles.stickyDaily}>
          {formatDailyPrice(vehicle.dailyPrice)}/day
        </Text>
        <Text style={styles.stickyTotal}>
          {vehicle.estimatedTotalPrice === null
            ? 'Select dates for total'
            : `${formatMoney(vehicle.estimatedTotalPrice)} total`}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!vehicle.availability.available}
        onPress={onContinue}
        testID="vehicle-details-continue"
        style={({ pressed }) => [
          styles.continueButton,
          !vehicle.availability.available && styles.continueButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>
    </View>
  );
}

function DetailsSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonHero} />
      <View style={styles.skeletonLineWide} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonBlock} />
      <ActivityIndicator color="#102550" />
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
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.stateAction}
        >
          <Text style={styles.stateActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stateHeader: {
    minHeight: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  detailsHeader: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  detailsHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  detailsHeaderTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  detailsHeaderSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  scrollContent: {
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hero: {
    height: 286,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft,
    ...shadows.card,
  },
  galleryItem: {
    height: 286,
    backgroundColor: colors.brandSoft,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  galleryFooter: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  galleryDots: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  galleryDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: '#D6E8FF',
  },
  galleryDotActive: {
    width: 20,
    backgroundColor: colors.brand,
  },
  galleryCount: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(16, 24, 46, 0.7)',
    paddingHorizontal: 10,
  },
  galleryCountText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  heroButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  summary: {
    gap: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 16,
    ...shadows.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleCopy: {
    flex: 1,
    gap: 4,
  },
  vehicleTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reviewCount: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  mutedText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  ratingPill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: '#FFF7D6',
    paddingHorizontal: 9,
  },
  ratingText: {
    color: '#8A5A00',
    fontSize: 13,
    fontWeight: '900',
  },
  specGrid: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 10,
  },
  spec: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 0,
    minHeight: 82,
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  specValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  specLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tripWindow: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    padding: 14,
  },
  tripCopy: {
    flex: 1,
    gap: 2,
  },
  tripTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  section: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 16,
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  featureWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    maxWidth: '100%',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CDEFD9',
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
  },
  featureText: {
    flexShrink: 1,
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
  },
  paragraph: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  locationBlock: {
    flexDirection: 'row',
    gap: 10,
  },
  locationCopy: {
    flex: 1,
    gap: 3,
  },
  locationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostAvatar: {
    height: 54,
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 27,
    backgroundColor: colors.brandSoft,
  },
  hostImage: {
    height: '100%',
    width: '100%',
  },
  hostCopy: {
    flex: 1,
    gap: 3,
  },
  hostName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  availability: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
    padding: 14,
  },
  availabilityBlocked: {
    backgroundColor: colors.errorSoft,
  },
  availabilityCopy: {
    flex: 1,
    gap: 3,
  },
  availabilityTitle: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '900',
  },
  availabilityTitleBlocked: {
    color: colors.error,
  },
  rules: {
    gap: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  ruleText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  reviews: {
    gap: 12,
  },
  reviewState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  reviewRetryButton: {
    alignItems: 'center',
    borderColor: colors.brand,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  reviewRetryText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewItem: {
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewName: {
    flex: 1,
    color: '#102550',
    fontSize: 14,
    fontWeight: '900',
  },
  reviewRating: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
  },
  stickyBar: {
    flexShrink: 0,
    flexWrap: 'wrap',
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stickyDaily: {
    color: '#102550',
    fontSize: 17,
    fontWeight: '900',
  },
  stickyTotal: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '800',
  },
  continueButton: {
    flexGrow: 1,
    flexBasis: 138,
    paddingVertical: 12,
    minHeight: 48,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B6FE8',
    paddingHorizontal: 18,
  },
  continueButtonDisabled: {
    backgroundColor: '#536B91',
  },
  continueText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.8,
  },
  stickyCopy: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
  },
  skeleton: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  skeletonHero: {
    height: 270,
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
  },
  skeletonLineWide: {
    height: 24,
    width: '72%',
    borderRadius: 5,
    backgroundColor: '#D6E8FF',
  },
  skeletonLine: {
    height: 16,
    width: '48%',
    borderRadius: 5,
    backgroundColor: '#D6E8FF',
  },
  skeletonBlock: {
    height: 130,
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
  },
  stateMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: '#102550',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateBody: {
    color: '#536B91',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  stateAction: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B6FE8',
    paddingHorizontal: 18,
    marginTop: 6,
  },
  stateActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

import { type RenterTrip } from '@/types/car';

const pickupInformationStages = new Set<RenterTrip['stage']>([
  'upcoming',
  'confirmed',
  'active',
]);

/**
 * Pickup instructions and host contact information are operational details.
 * Do not expose them after the rental window has ended, even if an older
 * booking record still reports a pre-return stage.
 */
export function canViewTripPickupInformation(
  trip: Pick<RenterTrip, 'capabilities' | 'returnAt' | 'stage'>,
  now = Date.now(),
) {
  if (!trip.capabilities.viewPickupInformation || !pickupInformationStages.has(trip.stage)) {
    return false;
  }

  const returnAt = Date.parse(trip.returnAt);
  return !Number.isFinite(returnAt) || returnAt > now;
}

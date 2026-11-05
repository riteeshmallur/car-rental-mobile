import { type RenterTrip } from '@/types/car';

const pickupInformationStages = new Set<RenterTrip['stage']>([
  'upcoming',
  'confirmed',
  'active',
]);

/**
 * Pickup instructions and host contact information are operational details.
 * The backend determines whether the pickup window was missed. Do not infer
 * capability from device time, which could disagree with the server.
 */
export function canViewTripPickupInformation(
  trip: Pick<RenterTrip, 'capabilities' | 'stage' | 'statusPresentation'>,
) {
  return (
    trip.capabilities.viewPickupInformation &&
    pickupInformationStages.has(trip.stage) &&
    trip.statusPresentation.timing !== 'pickup_overdue'
  );
}

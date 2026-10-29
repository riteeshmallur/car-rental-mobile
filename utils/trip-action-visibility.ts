import { isRenterTripPast } from '@/utils/booking-presentation';
import { type RenterTrip, type RenterTripCapabilities } from '@/types/car';

export type TripActionVisibility = Pick<
  RenterTripCapabilities,
  | 'cancel'
  | 'reportIssue'
  | 'requestExtension'
  | 'review'
  | 'viewReceipt'
  | 'viewReturnInstructions'
>;

/**
 * Backend capabilities remain authoritative, but terminal rentals must never
 * offer actions that alter the booked rental window. This also protects users
 * when an older booking response carries stale capability flags.
 */
export function getTripActionVisibility(
  trip: RenterTrip,
  now = new Date(),
): TripActionVisibility {
  const isPast = isRenterTripPast(trip, now);
  const canChangeRental = !isPast;

  return {
    cancel: trip.capabilities.cancel && canChangeRental,
    reportIssue: trip.capabilities.reportIssue,
    requestExtension: trip.capabilities.requestExtension && canChangeRental,
    review: trip.capabilities.review,
    viewReceipt: trip.capabilities.viewReceipt,
    viewReturnInstructions: trip.capabilities.viewReturnInstructions && canChangeRental,
  };
}

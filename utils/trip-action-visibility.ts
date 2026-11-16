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
 * Backend capabilities remain authoritative. A recorded pickup verification is
 * additionally required before customers can report a vehicle issue, so the
 * action is not offered before handover.
 */
export function getTripActionVisibility(trip: RenterTrip): TripActionVisibility {
  return {
    cancel: trip.capabilities.cancel,
    reportIssue: trip.capabilities.reportIssue && trip.pickup.verifiedAt !== null,
    requestExtension: trip.capabilities.requestExtension,
    review: trip.capabilities.review,
    viewReceipt: trip.capabilities.viewReceipt,
    viewReturnInstructions: trip.capabilities.viewReturnInstructions,
  };
}

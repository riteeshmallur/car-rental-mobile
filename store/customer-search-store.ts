import { create } from 'zustand';

import {
  getDefaultRentalWindow,
  type RentalWindow,
} from '@/features/customer/utils/rental-window';
import { type LocationSearchResult } from '@/types/location';

type CustomerSearchState = {
  selectedLocation: LocationSearchResult | null;
  rentalWindow: RentalWindow;
  setSelectedLocation: (location: LocationSearchResult) => void;
  setPickupAt: (pickupAt: Date) => void;
  setReturnAt: (returnAt: Date) => void;
};

function ensureReturnAfterPickup(pickupAt: Date, returnAt: Date) {
  if (returnAt.getTime() > pickupAt.getTime()) {
    return returnAt;
  }

  const adjustedReturnAt = new Date(pickupAt);
  adjustedReturnAt.setHours(pickupAt.getHours() + 2);
  return adjustedReturnAt;
}

export const useCustomerSearchStore = create<CustomerSearchState>((set) => ({
  selectedLocation: null,
  rentalWindow: getDefaultRentalWindow(),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setPickupAt: (pickupAt) =>
    set((state) => ({
      rentalWindow: {
        pickupAt,
        returnAt: ensureReturnAfterPickup(pickupAt, state.rentalWindow.returnAt),
      },
    })),
  setReturnAt: (returnAt) =>
    set((state) => ({
      rentalWindow: {
        ...state.rentalWindow,
        returnAt: ensureReturnAfterPickup(state.rentalWindow.pickupAt, returnAt),
      },
    })),
}));

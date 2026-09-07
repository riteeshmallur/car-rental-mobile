export type RentalWindow = {
  pickupAt: Date;
  returnAt: Date;
};

export function getDefaultRentalWindow(): RentalWindow {
  const now = new Date();
  const pickupAt = new Date(now);
  pickupAt.setDate(now.getDate() + 1);
  pickupAt.setHours(10, 0, 0, 0);

  const returnAt = new Date(pickupAt);
  returnAt.setDate(pickupAt.getDate() + 2);
  returnAt.setHours(18, 0, 0, 0);

  return {
    pickupAt,
    returnAt,
  };
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(value);
}

export function formatTime(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

export function isPickupInPast(pickupAt: Date) {
  return pickupAt.getTime() < Date.now();
}

export function getRentalWindowError(window: RentalWindow) {
  if (isPickupInPast(window.pickupAt)) {
    return 'Pickup cannot be in the past.';
  }

  if (window.returnAt.getTime() <= window.pickupAt.getTime()) {
    return 'Return must be after pickup.';
  }

  return null;
}

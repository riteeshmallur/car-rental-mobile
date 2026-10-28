import { env } from '@/services/config/env';

const apiOrigin = env.apiUrl.replace(/\/api\/v1\/?$/, '');
const managedVehicleMediaPath = /\/uploads\/(cars|vehicles)\//i;

export function formatMoney(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `Rs ${value}`;
  }

  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export function formatDailyPrice(pricePerDay: number | string) {
  return formatMoney(pricePerDay);
}

export function getCarImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (/^(https?:|file:|blob:|data:)/i.test(imageUrl)) {
    return imageUrl;
  }

  return `${apiOrigin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

export function getVehicleImageVariantUrl(
  imageUrl: string | null | undefined,
  variant: 'thumbnail' | 'detail' | 'original',
) {
  if (!imageUrl) {
    return null;
  }

  // Image picker previews have not reached backend storage yet. Keep them
  // intact while a host is arranging photos in a draft.
  if (/^(file:|blob:|data:)/i.test(imageUrl)) {
    return imageUrl;
  }

  const localVariantUrl = imageUrl.replace(
    /-(thumbnail|detail|original)\.jpg(?=([?#].*)?$)/,
    `-${variant}.jpg`,
  );

  if (localVariantUrl !== imageUrl) {
    return getManagedVehicleImageUrl(localVariantUrl);
  }

  return getManagedVehicleImageUrl(imageUrl);
}

/**
 * Vehicle images must come from HopIn's backend/CDN upload path.  This also
 * protects clients with stale API data from requesting legacy third-party
 * assets that browsers may reject with ERR_BLOCKED_BY_ORB.
 */
function getManagedVehicleImageUrl(imageUrl: string) {
  const resolvedUrl = getCarImageUrl(imageUrl);

  if (!resolvedUrl) {
    return null;
  }

  try {
    return managedVehicleMediaPath.test(new URL(resolvedUrl).pathname)
      ? resolvedUrl
      : null;
  } catch {
    return null;
  }
}

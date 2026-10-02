import { env } from '@/services/config/env';

const apiOrigin = env.apiUrl.replace(/\/api\/v1\/?$/, '');

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

  const localVariantUrl = imageUrl.replace(
    /-(thumbnail|detail|original)\.jpg(?=([?#].*)?$)/,
    `-${variant}.jpg`,
  );

  if (localVariantUrl !== imageUrl) {
    return getCarImageUrl(localVariantUrl);
  }

  try {
    const url = new URL(getCarImageUrl(imageUrl) ?? imageUrl);
    if (url.hostname === 'images.unsplash.com') {
      const width = variant === 'thumbnail' ? '480' : variant === 'detail' ? '1440' : '2560';
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('w', width);
      url.searchParams.set('q', variant === 'thumbnail' ? '76' : '84');
      return url.toString();
    }
  } catch {
    // Relative paths and malformed legacy URLs retain their original value.
  }

  return getCarImageUrl(imageUrl);
}

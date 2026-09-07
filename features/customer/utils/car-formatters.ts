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

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${apiOrigin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

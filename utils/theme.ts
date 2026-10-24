export const colors = {
  brand: '#0B6FE8',
  brandPressed: '#075BC8',
  brandSoft: '#EAF4FF',
  brandBorder: '#D6E8FF',
  background: '#F3F9FF',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF4FF',
  ink: '#102550',
  text: '#536B91',
  muted: '#536B91',
  border: '#D6E8FF',
  coral: '#FF644F',
  success: '#179447',
  successSoft: '#E8F8EE',
  error: '#C62828',
  errorSoft: '#FEF2F2',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const shadows = {
  card: {
    boxShadow: '0 5px 14px rgba(16, 37, 80, 0.08)',
    elevation: 3,
  },
  floating: {
    boxShadow: '0 -4px 12px rgba(16, 37, 80, 0.07)',
    elevation: 8,
  },
} as const;

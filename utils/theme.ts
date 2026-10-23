export const colors = {
  brand: '#B8924B',
  brandPressed: '#947237',
  brandSoft: '#F5EEDF',
  brandBorder: '#DEC79E',
  background: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F0EB',
  ink: '#25282B',
  text: '#4D5153',
  muted: '#777572',
  border: '#E4E0D8',
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
    boxShadow: '0 5px 14px rgba(62, 51, 34, 0.07)',
    elevation: 3,
  },
  floating: {
    boxShadow: '0 -4px 12px rgba(62, 51, 34, 0.06)',
    elevation: 8,
  },
} as const;

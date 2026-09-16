export const colors = {
  brand: '#0B4FE8',
  brandPressed: '#073FC0',
  brandSoft: '#EAF2FF',
  brandBorder: '#B7D2FF',
  background: '#F7FAFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F7FB',
  ink: '#10182E',
  text: '#39445C',
  muted: '#747E91',
  border: '#E3E8F1',
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
    boxShadow: '0 5px 14px rgba(31, 75, 145, 0.08)',
    elevation: 3,
  },
  floating: {
    boxShadow: '0 -4px 12px rgba(11, 40, 100, 0.06)',
    elevation: 8,
  },
} as const;

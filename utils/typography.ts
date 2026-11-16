import type { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

type SupportedFontWeight = TextStyle['fontWeight'];

export function fontFamilyForWeight(weight?: SupportedFontWeight) {
  if (weight === 'bold') return fontFamilies.bold;
  if (weight === 'normal') return fontFamilies.regular;

  const numericWeight = Number(weight ?? 400);

  if (numericWeight >= 800) return fontFamilies.extrabold;
  if (numericWeight >= 700) return fontFamilies.bold;
  if (numericWeight >= 600) return fontFamilies.semibold;
  if (numericWeight >= 500) return fontFamilies.medium;

  return fontFamilies.regular;
}

export const typography = {
  hero: {
    color: '#102550',
    fontFamily: fontFamilies.extrabold,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 39,
  },
  pageTitle: {
    color: '#102550',
    fontFamily: fontFamilies.extrabold,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  sectionTitle: {
    color: '#102550',
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 27,
  },
  cardTitle: {
    color: '#102550',
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 21,
  },
  body: {
    color: '#102550',
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
  },
  supporting: {
    color: '#536B91',
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  label: {
    color: '#536B91',
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  button: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 17,
  },
  badge: {
    fontFamily: fontFamilies.extrabold,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
} as const satisfies Record<string, TextStyle>;

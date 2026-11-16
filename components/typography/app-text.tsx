import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyForWeight, typography } from '@/utils/typography';

export function AppText({ allowFontScaling = true, style, ...props }: TextProps) {
  const resolvedStyle = StyleSheet.flatten(style) as TextStyle | undefined;

  return (
    <NativeText
      {...props}
      allowFontScaling={allowFontScaling}
      style={[typography.body, style, { fontFamily: fontFamilyForWeight(resolvedStyle?.fontWeight) }]}
    />
  );
}

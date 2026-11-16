import { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { fontFamilyForWeight, typography } from '@/utils/typography';

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(
  ({ allowFontScaling = true, style, ...props }, ref) => {
    const resolvedStyle = StyleSheet.flatten(style) as TextStyle | undefined;

    return (
      <NativeTextInput
        {...props}
        ref={ref}
        allowFontScaling={allowFontScaling}
        style={[typography.body, style, { fontFamily: fontFamilyForWeight(resolvedStyle?.fontWeight) }]}
      />
    );
  },
);

AppTextInput.displayName = 'AppTextInput';

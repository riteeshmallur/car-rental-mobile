import { Image } from 'expo-image';
import { type ImageStyle, type StyleProp } from 'react-native';

const hopinLogo = require('@/assets/images/branding/hopin-logo.png');
const LOGO_ASPECT_RATIO = 2172 / 724;

type HopInLogoProps = {
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
  width?: number;
};

/** Shared supplied transparent HopIn wordmark for light-mode surfaces. */
export function HopInLogo({
  accessibilityLabel = 'HopIn',
  style,
  width = 138,
}: HopInLogoProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessible
      contentFit="contain"
      source={hopinLogo}
      style={[{ height: width / LOGO_ASPECT_RATIO, width }, style]}
    />
  );
}

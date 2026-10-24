import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, Text, type ViewStyle, View } from 'react-native';

const bengaluruHomeBackground = require('@/assets/images/hopin-bengaluru-home-background.png');

type HomeHeroProps = {
  header: ReactNode;
};

function gradientBackground(value: string): ViewStyle {
  if (Platform.OS === 'web') {
    return { backgroundImage: value } as ViewStyle;
  }

  return { experimental_backgroundImage: value };
}

export function HomeHero({ header }: HomeHeroProps) {
  return (
    <View style={styles.container}>
      <Image
        accessibilityLabel="Vidhana Soudha in Bengaluru at sunrise"
        contentFit="cover"
        contentPosition="right center"
        source={bengaluruHomeBackground}
        style={styles.backgroundImage}
        transition={180}
      />
      <View accessibilityElementsHidden style={styles.copyGradient} />
      <View accessibilityElementsHidden style={styles.bottomGradient} />
      <View style={styles.header}>{header}</View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>GOOD MORNING,</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Ready for your{`\n`}next drive?
        </Text>
        <Text style={styles.subtitle}>Extraordinary cars for everyday journeys.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    minHeight: 250,
    justifyContent: 'flex-end',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  copyGradient: {
    ...StyleSheet.absoluteFill,
    ...gradientBackground(
      'linear-gradient(to right, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.82) 32%, rgba(255, 255, 255, 0.38) 62%, rgba(255, 255, 255, 0.04) 100%)',
    ),
  },
  bottomGradient: {
    ...StyleSheet.absoluteFill,
    ...gradientBackground(
      'linear-gradient(to bottom, rgba(243, 249, 255, 0) 34%, rgba(243, 249, 255, 0.24) 48%, rgba(243, 249, 255, 0.76) 72%, rgba(243, 249, 255, 0.98) 100%)',
    ),
  },
  header: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    zIndex: 2,
  },
  copy: {
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 34,
    zIndex: 1,
  },
  eyebrow: {
    color: '#102550',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#102550',
    fontFamily: 'Georgia',
    fontSize: 35,
    fontWeight: '700',
    lineHeight: 39,
  },
  subtitle: {
    color: '#536B91',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
});

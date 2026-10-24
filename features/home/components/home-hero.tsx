import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const bengaluruHomeBackground = require('@/assets/images/hopin-bengaluru-home-background.png');

type HomeHeroProps = {
  header: ReactNode;
};

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
      <View accessibilityElementsHidden style={styles.tint} />
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
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(239, 248, 255, 0.46)',
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
    color: '#24437B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: '#0D275F',
    fontFamily: 'Georgia',
    fontSize: 35,
    fontWeight: '700',
    lineHeight: 39,
  },
  subtitle: {
    color: '#405978',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
});

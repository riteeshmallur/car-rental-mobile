import { Image as ExpoImage, type ImageContentFit } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type CachedVehicleImageProps = {
  accessibilityLabel?: string;
  contentFit?: ImageContentFit;
  style: StyleProp<ViewStyle>;
  uri: string;
};

export function CachedVehicleImage({
  accessibilityLabel,
  contentFit = 'cover',
  style,
  uri,
}: CachedVehicleImageProps) {
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [uri]);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      style={[styles.frame, style]}
    >
      {isLoading ? <View style={styles.placeholder} /> : null}
      <ExpoImage
        cachePolicy="memory-disk"
        accessible={false}
        contentFit={contentFit}
        onError={() => setLoading(false)}
        onLoadEnd={() => setLoading(false)}
        source={{ uri }}
        style={styles.image}
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#E8EEF7',
  },
});

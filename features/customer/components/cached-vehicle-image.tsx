import { Image as ExpoImage, type ImageContentFit } from 'expo-image';
import { CarFront } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type CachedVehicleImageProps = {
  accessibilityLabel?: string;
  contentFit?: ImageContentFit;
  onError?: () => void;
  style: StyleProp<ViewStyle>;
  uri?: string | null;
};

export function CachedVehicleImage({
  accessibilityLabel,
  contentFit = 'cover',
  onError,
  style,
  uri,
}: CachedVehicleImageProps) {
  const [isLoading, setLoading] = useState(Boolean(uri));
  const [hasError, setHasError] = useState(!uri);

  useEffect(() => {
    setLoading(Boolean(uri));
    setHasError(!uri);
  }, [uri]);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      style={[styles.frame, style]}
    >
      {hasError ? (
        <View
          accessibilityLabel="Vehicle image unavailable"
          accessibilityRole="image"
          style={styles.fallback}
          testID="vehicle-image-fallback"
        >
          <CarFront color="#536B91" size={28} />
        </View>
      ) : (
        <>
          {isLoading ? <View style={styles.placeholder} /> : null}
          <ExpoImage
            cachePolicy="memory-disk"
            accessible={false}
            contentFit={contentFit}
            onError={() => {
              setLoading(false);
              setHasError(true);
              onError?.();
            }}
            onLoadEnd={() => setLoading(false)}
            source={{ uri: uri ?? undefined }}
            style={styles.image}
            transition={120}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: '#E8F3FF',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
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

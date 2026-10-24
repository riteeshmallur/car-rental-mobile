import { useEffect, useState } from 'react';
import { type PropsWithChildren, type ReactNode } from 'react';
import {
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  type ImageStyle,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '@/utils/theme';

type AuthShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: ReactNode;
  variant?: 'default' | 'journey';
}>;

const journeyHero = require('@/assets/images/login-journey-hero-v2.jpg');
const journeyHeroAspectRatio = 1111 / 1416;
const journeyHeroImageStyle: ImageStyle = { resizeMode: 'cover' };
const journeyHeroImageCompactStyle: ImageStyle = {
  transform: [{ translateY: -46 }],
};

function getWebVisualViewportHeight() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.visualViewport?.height ?? window.innerHeight;
}

export function AuthShell({
  children,
  footer,
  subtitle,
  title,
  variant = 'default',
}: AuthShellProps) {
  const { height, width } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(
    getWebVisualViewportHeight,
  );
  const availableHeight = visualViewportHeight ?? height;
  const webKeyboardVisible =
    Platform.OS === 'web' && visualViewportHeight !== null && visualViewportHeight < height - 80;
  const keyboardActive = keyboardVisible || webKeyboardVisible;
  const isCompact = width < 380 || availableHeight < 700;
  const layoutCompact = isCompact || keyboardActive;
  const naturalHeroHeight = Math.round(width / journeyHeroAspectRatio);
  const heroHeight = isCompact
    ? Math.min(naturalHeroHeight, Math.max(260, Math.round(availableHeight * 0.49)))
    : Math.min(naturalHeroHeight, Math.round(availableHeight * 0.6));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const updateViewportHeight = () => setVisualViewportHeight(viewport.height);
    updateViewportHeight();
    viewport.addEventListener('resize', updateViewportHeight);
    viewport.addEventListener('scroll', updateViewportHeight);

    return () => {
      viewport.removeEventListener('resize', updateViewportHeight);
      viewport.removeEventListener('scroll', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (variant !== 'journey' || Platform.OS === 'web') {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [variant]);

  if (variant === 'journey') {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[
          styles.journeySafeArea,
          Platform.OS === 'web' && styles.journeyWebFixed,
          Platform.OS === 'web' && visualViewportHeight !== null
            ? { height: visualViewportHeight }
            : null,
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.journeyViewport}>
            <ImageBackground
              imageStyle={[
                journeyHeroImageStyle,
                isCompact ? journeyHeroImageCompactStyle : null,
              ]}
              source={journeyHero}
              style={[styles.journeyHero, { height: heroHeight }]}
            >
              <View style={styles.journeyScrim} />
              <View style={styles.journeyBrandRow}>
                <View style={[styles.journeyLogoMark, layoutCompact && styles.journeyLogoMarkCompact]}>
                  <Text style={[styles.journeyLogoText, layoutCompact && styles.journeyLogoTextCompact]}>
                    H
                  </Text>
                </View>
                <Text style={[styles.journeyBrand, layoutCompact && styles.journeyBrandCompact]}>HopIn</Text>
              </View>
              <View style={[styles.journeyCopy, layoutCompact && styles.journeyCopyCompact]}>
                <Text
                  style={[styles.journeyHeadline, layoutCompact && styles.journeyHeadlineCompact]}
                >
                  Your next{`\n`}journey starts{`\n`}here
                </Text>
                <Text
                  style={[styles.journeySubtitle, layoutCompact && styles.journeySubtitleCompact]}
                >
                  Log in to book, drive and explore{`\n`}amazing cars.
                </Text>
              </View>
            </ImageBackground>

            <View
              style={[
                styles.journeyPanel,
                layoutCompact && styles.journeyPanelCompact,
                keyboardActive && styles.journeyPanelKeyboard,
              ]}
            >
              <View
                style={[styles.journeyPanelCopy, layoutCompact && styles.journeyPanelCopyCompact]}
              >
                <Text
                  style={[styles.journeyPanelTitle, layoutCompact && styles.journeyPanelTitleCompact]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.journeyPanelSubtitle,
                    layoutCompact && styles.journeyPanelSubtitleCompact,
                  ]}
                >
                  {subtitle}
                </Text>
              </View>
              {children}
              {footer ? (
                <View
                  style={[styles.journeyFooter, layoutCompact && styles.journeyFooterCompact]}
                >
                  {footer}
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
        >
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>H</Text>
            </View>
            <Text style={styles.brand}>HopIn</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.brand,
  },
  logoText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '800',
  },
  brand: {
    color: colors.brand,
    fontSize: 27,
    fontWeight: '900',
  },
  content: {
    gap: 28,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingVertical: 36,
  },
  copy: {
    gap: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 38,
  },
  subtitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  journeySafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  journeyWebFixed: {
    width: '100%',
    overflow: 'hidden',
  },
  journeyViewport: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
  },
  journeyHero: {
    justifyContent: 'flex-start',
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: 26,
    paddingTop: 22,
  },
  journeyScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 250, 244, 0.18)',
  },
  journeyBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  journeyLogoMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#0B6FE8',
  },
  journeyLogoText: {
    color: colors.surface,
    fontSize: 27,
    fontWeight: '900',
  },
  journeyLogoMarkCompact: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  journeyLogoTextCompact: {
    fontSize: 24,
  },
  journeyBrand: {
    color: '#102550',
    fontSize: 30,
    fontWeight: '900',
  },
  journeyBrandCompact: {
    fontSize: 27,
  },
  journeyCopy: {
    gap: 12,
    maxWidth: 320,
    marginTop: 54,
  },
  journeyCopyCompact: {
    gap: 8,
    marginTop: 28,
  },
  journeyHeadline: {
    color: '#102550',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 43,
    textShadowColor: 'rgba(255, 255, 255, 0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  journeySubtitle: {
    color: '#102550',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  journeyHeadlineCompact: {
    fontSize: 32,
    lineHeight: 36,
  },
  journeySubtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  journeyPanel: {
    flex: 1,
    minHeight: 0,
    gap: 24,
    width: '100%',
    marginTop: -24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 18,
  },
  journeyPanelCompact: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  journeyPanelKeyboard: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flex: 0,
    marginTop: 0,
  },
  journeyPanelCopy: {
    gap: 8,
  },
  journeyPanelCopyCompact: {
    gap: 5,
  },
  journeyPanelTitle: {
    color: '#102550',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
  },
  journeyPanelSubtitle: {
    color: '#536B91',
    fontSize: 16,
    lineHeight: 24,
  },
  journeyPanelTitleCompact: {
    fontSize: 22,
    lineHeight: 27,
  },
  journeyPanelSubtitleCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  journeyFooter: {
    gap: 10,
    marginTop: 'auto',
    paddingTop: 2,
  },
  journeyFooterCompact: {
    display: 'none',
  },
});

import { type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '@/utils/theme';

type AuthShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: ReactNode;
}>;

export function AuthShell({ children, footer, subtitle, title }: AuthShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
});

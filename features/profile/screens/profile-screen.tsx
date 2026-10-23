import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Banknote,
  CalendarClock,
  CarFront,
  ChevronRight,
  CreditCard,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { HostBottomNavigation } from '@/features/host/components/host-bottom-navigation';
import { useHostStatus } from '@/features/host/hooks/use-host-status';
import {
  customerModeRoute,
  hostModeRoute,
} from '@/features/host/utils/host-mode';
import { getHostEntryCopy, type HostEntryAction } from '@/features/host/utils/host-entry';
import { type HostLifecycleStatus } from '@/services/hosts/hosts-api';
import { usersApi } from '@/services/users/users-api';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { useAuthStore } from '@/store/auth-store';
import { type SafeUser } from '@/types/auth';
import { normalizeApiError } from '@/utils/errors';
import { colors, radii, shadows } from '@/utils/theme';

type ProfileScreenProps = {
  mode: 'customer' | 'host';
};

type SectionItem = {
  label: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

function getDisplayName(user: SafeUser | null | undefined) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return fullName || 'HopIn member';
}

function getInitials(user: SafeUser | null | undefined) {
  const name = getDisplayName(user);
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileScreen({ mode }: ProfileScreenProps) {
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [isLogoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hostStatusQuery = useHostStatus();

  const profileQuery = useQuery({
    initialData: authUser ?? undefined,
    // The auth store is a fast initial render only. Revalidate the account
    // whenever this screen opens so profile changes made elsewhere are shown.
    initialDataUpdatedAt: 0,
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
    refetchOnMount: 'always',
  });

  const profile = profileQuery.data;

  const closeOverlayBeforeBack = useCallback(() => {
    if (isLogoutSheetOpen) {
      setLogoutSheetOpen(false);
      return true;
    }
    return false;
  }, [isLogoutSheetOpen]);
  useWebBackGuard({
    active: isLogoutSheetOpen,
    onBack: closeOverlayBeforeBack,
  });

  useEffect(() => {
    if (profile) {
      setUser(profile);
    }
  }, [profile, setUser]);

  const openPersonalInformation = useCallback(() => {
    if (mode === 'host') {
      router.push('/(host)/personal-information');
      return;
    }
    router.push('/(customer)/personal-information');
  }, [mode]);

  const openHostEntry = useCallback(
    (action: HostEntryAction) => {
      if (mode === 'host') {
        router.replace(customerModeRoute);
        return;
      }

      openHostRoute(action);
    },
    [mode],
  );

  const sections = useMemo<SectionItem[]>(
    () => [
      ...(mode === 'host'
        ? [
            {
              label: 'Dashboard',
              description: 'View listing, booking, and payout activity',
              icon: <LayoutDashboard color={colors.ink} size={20} />,
              onPress: () => router.push('/(host)/dashboard' as never),
            },
            {
              label: 'My Cars',
              description: 'Manage your vehicle listings',
              icon: <CarFront color={colors.ink} size={20} />,
              onPress: () => router.push('/(host)/cars'),
            },
            {
              label: 'Bookings',
              description: 'Review customer reservations',
              icon: <CalendarClock color={colors.ink} size={20} />,
              onPress: () => router.push('/(host)/bookings'),
            },
            {
              label: 'Earnings',
              description: 'Track your host payouts',
              icon: <Banknote color={colors.ink} size={20} />,
              onPress: () => router.push('/(host)/earnings'),
            },
            {
              label: 'Payouts',
              description: 'View processed and pending payouts',
              icon: <Banknote color={colors.ink} size={20} />,
              onPress: () => router.push('/(host)/payouts' as never),
            },
          ]
        : []),
      {
        label: 'Payment methods',
        description: 'Manage your cards and wallets',
        icon: <CreditCard color={colors.ink} size={20} />,
        onPress: () => router.push('/(customer)/payment-methods' as never),
      },
      {
        label: 'My Documents',
        description: 'Licence, verification and vehicle records',
        icon: <FileText color={colors.ink} size={20} />,
        onPress: () => router.push(mode === 'host' ? '/(host)/documents' : '/(customer)/documents'),
      },
      {
        label: 'Notifications',
        description: 'Manage your alerts and updates',
        icon: <Bell color={colors.ink} size={20} />,
        onPress: () => router.push('/(customer)/notifications' as never),
      },
      {
        label: 'Help & Support',
        description: 'Get help or contact us',
        icon: <Headphones color={colors.ink} size={20} />,
        onPress: () => router.push('/(customer)/help-support' as never),
      },
      {
        label: 'Privacy & Security',
        description: 'Manage your data and security',
        icon: <ShieldCheck color={colors.ink} size={20} />,
        onPress: () => router.push('/(customer)/privacy-security' as never),
      },
      {
        label: 'Logout',
        description: '',
        icon: <LogOut color={colors.error} size={20} />,
        destructive: true,
        onPress: () => setLogoutSheetOpen(true),
      },
    ],
    [mode],
  );

  const confirmLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setLogoutSheetOpen(false);

    try {
      await logout();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
              <View style={styles.headerLead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text accessibilityRole="header" style={styles.title}>Profile</Text>
                  <Text style={styles.subtitle}>Manage your account and preferences</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit personal information"
                onPress={openPersonalInformation}
                style={styles.iconButton}
              >
                <Settings color={colors.ink} size={22} />
              </Pressable>
            </View>

            {profileQuery.isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={colors.brand} />
                <Text style={styles.mutedText}>Loading profile</Text>
              </View>
            ) : profileQuery.isError ? (
              <StateMessage
                actionLabel="Try again"
                body={normalizeApiError(profileQuery.error).message}
                onAction={() => void profileQuery.refetch()}
                title="Profile could not load"
              />
            ) : profile ? (
              <>
                <ProfileSummary onPress={openPersonalInformation} user={profile} />

                {mode === 'customer' || mode === 'host' ? (
                  <HostBanner
                    hostStatus={hostStatusQuery.data?.status}
                    isLoading={hostStatusQuery.isLoading}
                    mode={mode}
                    onPress={openHostEntry}
                  />
                ) : null}

                {mode === 'host' ? <SectionHeading title="Host workspace" /> : null}
                {mode === 'host' ? (
                  <View style={styles.section}>
                    {sections.slice(0, 5).map((item) => (
                      <SectionRow key={item.label} item={item} />
                    ))}
                  </View>
                ) : null}

                <SectionHeading title="Account" />
                <View style={styles.section}>
                  {sections.slice(mode === 'host' ? 5 : 0, mode === 'host' ? 7 : 2).map((item) => (
                    <SectionRow key={item.label} item={item} />
                  ))}
                </View>

                <SectionHeading title="Preferences" />
                <View style={styles.section}>
                  <SectionRow item={sections[mode === 'host' ? 7 : 2]} />
                </View>

                <SectionHeading title="Support & Security" />
                <View style={styles.section}>
                  {sections.slice(mode === 'host' ? 8 : 3, mode === 'host' ? 10 : 5).map((item) => (
                    <SectionRow key={item.label} item={item} />
                  ))}
                </View>

                <View style={styles.logoutSection}>
                  <SectionRow item={sections[mode === 'host' ? 10 : 5]} />
                </View>
              </>
            ) : null}
        </ScrollView>
        {mode === 'customer' ? <BottomNavigation /> : <HostBottomNavigation />}
      </View>
      <LogoutConfirmationSheet
        isLoggingOut={isLoggingOut}
        isVisible={isLogoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={() => void confirmLogout()}
      />
    </SafeAreaView>
  );
}

function openHostRoute(action: HostEntryAction) {
  if (action === 'onboarding') {
    router.push('/(customer)/become-host');
    return;
  }

  if (action === 'add_vehicle') {
    router.push('/(host)/vehicles/new');
    return;
  }

  router.replace(hostModeRoute);
}

function ProfileSummary({ onPress, user }: { onPress: () => void; user: SafeUser }) {
  return (
    <View style={styles.summary}>
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{getInitials(user)}</Text>
        </View>
      )}
      <View style={styles.summaryCopy}>
        <Text style={styles.name}>{getDisplayName(user)}</Text>
        <InfoLine
          icon={<Phone color={colors.muted} size={16} />}
          text={user.phoneNumber ?? 'Mobile number not added'}
          trailing={user.phoneVerified ? <PhoneVerifiedBadge /> : undefined}
        />
        {user.email ? (
          <InfoLine icon={<Mail color={colors.muted} size={16} />} text={user.email} />
        ) : (
          <Pressable
            accessibilityHint="Opens personal information to add an email address."
            accessibilityLabel="Add email address"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onPress}
            style={({ pressed }) => [styles.addEmailAction, pressed && styles.pressed]}
          >
            <Mail color={colors.brand} size={16} />
            <Text style={styles.addEmailText}>Add Email Address</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        accessibilityHint="Opens personal information."
        accessibilityLabel="Edit profile"
        accessibilityRole="button"
        hitSlop={6}
        onPress={onPress}
        style={({ pressed }) => [styles.editProfileButton, pressed && styles.pressed]}
      >
        <Pencil color={colors.brand} size={16} />
        <Text style={styles.editProfileText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function PhoneVerifiedBadge() {
  return (
    <View accessibilityLabel="Phone verified" accessibilityRole="text" style={styles.verifiedBadge}>
      <ShieldCheck color={colors.success} size={13} />
      <Text style={styles.verifiedText}>Verified</Text>
    </View>
  );
}

function InfoLine({ icon, text, trailing }: { icon: React.ReactNode; text: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.infoLine}>
      {icon}
      <Text numberOfLines={1} style={styles.infoText}>
        {text}
      </Text>
      {trailing}
    </View>
  );
}

function HostBanner({
  hostStatus,
  isLoading,
  mode,
  onPress,
}: {
  hostStatus?: HostLifecycleStatus;
  isLoading: boolean;
  mode: ProfileScreenProps['mode'];
  onPress: (action: HostEntryAction) => void;
}) {
  const entry = hostStatus ? getHostEntryCopy('profile', hostStatus) : null;
  const title = mode === 'host'
    ? 'Switch to Customer'
    : entry?.title ?? 'Host setup';
  const body = mode === 'host'
    ? 'Return to your customer trips'
    : 'List your car, manage bookings and start earning.';
  const cta = mode === 'host'
    ? 'Open customer mode'
    : entry?.cta ?? 'Loading';

  const handlePress = () => {
    if (mode === 'host') {
      onPress('dashboard');
      return;
    }

    if (entry) {
      onPress(entry.action);
    }
  };

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading }}
      disabled={mode !== 'host' && !entry}
      onPress={handlePress}
      style={({ pressed }) => [styles.hostBanner, pressed && styles.pressed]}
    >
      <View style={styles.hostIcon}>
        <CarFront color={colors.ink} size={27} />
      </View>
      <View style={styles.hostCopy}>
        <Text style={styles.hostTitle}>{title}</Text>
        <Text style={styles.hostBody}>{body}</Text>
        <View style={styles.hostCta}>
          {isLoading && mode !== 'host' ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <>
              <Text style={styles.hostCtaText}>{cta}</Text>
              <ArrowRight color={colors.surface} size={18} />
            </>
          )}
        </View>
      </View>
      <View style={styles.hostAccent} />
    </Pressable>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <Text accessibilityRole="header" style={styles.sectionHeading}>{title}</Text>;
}

function SectionRow({ item }: { item: SectionItem }) {
  return (
    <Pressable
      accessibilityHint={item.description || undefined}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [styles.sectionRow, pressed && styles.pressed]}
    >
      <View style={styles.sectionIcon}>{item.icon}</View>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionLabel, item.destructive && styles.destructiveText]}>{item.label}</Text>
        {item.description ? <Text style={styles.sectionDescription}>{item.description}</Text> : null}
      </View>
      <ChevronRight color={item.destructive ? '#B91C1C' : '#9CA3AF'} size={18} />
    </Pressable>
  );
}

function LogoutConfirmationSheet({
  isLoggingOut,
  isVisible,
  onClose,
  onConfirm,
}: {
  isLoggingOut: boolean;
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View accessibilityViewIsModal style={styles.sheetOverlay}>
        <Pressable
          accessibilityLabel="Close logout confirmation"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.sheetBackdrop}
        />
        <View accessibilityRole="alert" style={styles.logoutSheet}>
          <View style={styles.sheetHandle} />
          <Text accessibilityRole="header" style={styles.sheetTitle}>Log out?</Text>
          <Text style={styles.sheetBody}>
            Are you sure you want to log out of your HopIn account?
          </Text>
          <View style={styles.sheetActions}>
            <Pressable
              accessibilityLabel="Cancel logout"
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoggingOut }}
              disabled={isLoggingOut}
              onPress={onClose}
              style={({ pressed }) => [
                styles.sheetNoButton,
                pressed && styles.pressed,
                isLoggingOut && styles.disabledButton,
              ]}
            >
              <Text style={styles.sheetNoText}>No</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Confirm logout"
              accessibilityRole="button"
              accessibilityState={{ busy: isLoggingOut, disabled: isLoggingOut }}
              disabled={isLoggingOut}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.sheetYesButton,
                pressed && styles.sheetYesPressed,
                isLoggingOut && styles.disabledButton,
              ]}
            >
              {isLoggingOut ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.sheetYesText}>Yes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StateMessage({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  screen: {
    flex: 1,
    position: 'relative',
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  contentScroll: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 16,
    ...shadows.card,
  },
  hostBanner: {
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft,
    padding: 14,
  },
  hostIcon: {
    height: 52,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  hostCopy: {
    flex: 1,
    gap: 3,
  },
  hostTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  hostBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  hostCta: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.brand,
    marginTop: 6,
    paddingHorizontal: 14,
  },
  hostCtaText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  hostAccent: {
    position: 'absolute',
    right: -90,
    bottom: -32,
    height: 125,
    width: 125,
    borderRadius: 63,
    backgroundColor: 'rgba(184, 146, 75, 0.16)',
  },
  avatar: {
    height: 82,
    width: 82,
    borderRadius: 41,
    backgroundColor: colors.brandSoft,
  },
  avatarFallback: {
    height: 82,
    width: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: colors.brandSoft,
  },
  avatarText: {
    color: colors.brand,
    fontSize: 26,
    fontWeight: '800',
  },
  summaryCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  name: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '800',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  addEmailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 24,
  },
  addEmailText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  verifiedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  editProfileButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 4,
  },
  editProfileText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  section: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sectionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionIcon: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.brandSoft,
  },
  sectionLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeading: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  logoutSection: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  destructiveText: {
    color: '#E03131',
  },
  loadingState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.76,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.54)',
  },
  logoutSheet: {
    minHeight: 250,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    ...shadows.floating,
  },
  sheetHandle: {
    alignSelf: 'center',
    height: 5,
    width: 46,
    marginBottom: 22,
    borderRadius: radii.pill,
    backgroundColor: '#CBD5E1',
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  sheetBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  sheetNoButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  sheetNoText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  sheetYesButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.error,
  },
  sheetYesPressed: {
    backgroundColor: '#A61B1B',
  },
  sheetYesText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  state: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
});

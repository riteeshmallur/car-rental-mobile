import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';

const terms = [
  ['Using HopIn', 'You must provide accurate account and booking information and follow the agreed pickup, return, and vehicle-use requirements.'],
  ['Bookings and payments', 'Prices, deposits, fees, cancellation eligibility, and payment status are supplied by the booking and payment services before you confirm a trip.'],
  ['Vehicle use', 'Use the booked vehicle only for lawful purposes and report issues promptly through the trip flow.'],
];
const privacy = [
  ['Information we use', 'HopIn stores the account details, bookings, saved vehicles, notifications, and reviews needed to provide the service.'],
  ['Account controls', 'You can request an export of your account data or request account deletion from Privacy & security.'],
  ['Sharing', 'Vehicle pickup details and booking information are shared only as required to operate a confirmed rental.'],
];

export function PolicyScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const isPrivacy = params.type === 'privacy';
  const title = isPrivacy ? 'Privacy policy' : 'Terms of service';
  const sections = isPrivacy ? privacy : terms;
  const goBack = useSafeBack({ fallback: '/(customer)/help-support' });
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.screen}><View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.iconButton}><ArrowLeft color="#0F172A" size={21} /></Pressable><Text style={styles.title}>{title}</Text></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Text style={styles.updated}>Last updated: 30 September 2026</Text>{sections.map(([heading, body]) => <View key={heading} style={styles.section}><Text style={styles.heading}>{heading}</Text><Text style={styles.body}>{body}</Text></View>)}<Pressable accessibilityRole="button" onPress={() => router.push('/(customer)/privacy-security')} style={styles.link}><Text style={styles.linkText}>Manage account privacy</Text></Pressable></ScrollView></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: '#F7FAFF', flex: 1 }, screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 }, iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, title: { color: '#0F172A', fontSize: 22, fontWeight: '900' }, content: { gap: 14, padding: 16, paddingBottom: 32 }, updated: { color: '#64748B', fontSize: 12, fontWeight: '700' }, section: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, gap: 7, padding: 14 }, heading: { color: '#0F172A', fontSize: 16, fontWeight: '900' }, body: { color: '#475569', fontSize: 14, fontWeight: '600', lineHeight: 21 }, link: { alignItems: 'center', borderColor: '#BFDBFE', borderRadius: 12, borderWidth: 1, minHeight: 46, justifyContent: 'center' }, linkText: { color: '#0B4FE8', fontSize: 14, fontWeight: '900' } });

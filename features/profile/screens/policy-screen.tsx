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
const hostTerms = [
  ['Hosting on HopIn', 'Keep your host profile, vehicle details, pricing, and availability accurate so customers can make informed booking decisions.'],
  ['Bookings and handoffs', 'Honor confirmed bookings, follow agreed handoff procedures, and communicate promptly when a vehicle or booking needs attention.'],
  ['Safety and compliance', 'Maintain required vehicle documents and cooperate with identity verification, payout setup, and applicable platform safety policies when requested.'],
];
const about = [
  ['About HopIn', 'HopIn helps customers find vehicles for everyday journeys and helps hosts manage their listings, bookings, and earnings in one account.'],
  ['App information', 'You are using the HopIn mobile app. Product updates, service information, and support are available from your profile.'],
];

export function PolicyScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const isPrivacy = params.type === 'privacy';
  const isHostTerms = params.type === 'host-terms';
  const isAbout = params.type === 'about';
  const title = isPrivacy ? 'Privacy policy' : isHostTerms ? 'Host Terms' : isAbout ? 'About HopIn' : 'Terms of service';
  const sections = isPrivacy ? privacy : isHostTerms ? hostTerms : isAbout ? about : terms;
  const goBack = useSafeBack({ fallback: '/(customer)/help-support' });
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.screen}><View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.iconButton}><ArrowLeft color="#102550" size={21} /></Pressable><Text style={styles.title}>{title}</Text></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{!isAbout ? <Text style={styles.updated}>Last updated: 30 September 2026</Text> : null}{sections.map(([heading, body]) => <View key={heading} style={styles.section}><Text style={styles.heading}>{heading}</Text><Text style={styles.body}>{body}</Text></View>)}{!isAbout ? <Pressable accessibilityRole="button" onPress={() => router.push('/(customer)/privacy-security')} style={styles.link}><Text style={styles.linkText}>Manage account privacy</Text></Pressable> : null}</ScrollView></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: '#F3F9FF', flex: 1 }, screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 }, iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, title: { color: '#102550', fontSize: 22, fontWeight: '900' }, content: { gap: 14, padding: 16, paddingBottom: 32 }, updated: { color: '#536B91', fontSize: 12, fontWeight: '700' }, section: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 7, padding: 14 }, heading: { color: '#102550', fontSize: 16, fontWeight: '900' }, body: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 21 }, link: { alignItems: 'center', borderColor: '#BFDBFE', borderRadius: 12, borderWidth: 1, minHeight: 46, justifyContent: 'center' }, linkText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' } });

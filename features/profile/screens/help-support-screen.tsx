import { ArrowLeft, ExternalLink, FileText, Mail, MessageCircleQuestion, Phone } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useSafeBack } from '@/hooks/use-safe-back';

async function openUrl(url: string) {
  const supported = await Linking.canOpenURL(url);
  if (supported) await Linking.openURL(url);
}

export function HelpSupportScreen() {
  const goBack = useSafeBack({ fallback: '/(customer)/profile' });
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.screen}><View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.iconButton}><ArrowLeft color="#0F172A" size={21} /></Pressable><View><Text style={styles.eyebrow}>Support</Text><Text style={styles.title}>Help & support</Text></View></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.hero}><MessageCircleQuestion color="#0B4FE8" size={29} /><Text style={styles.heroTitle}>How can we help?</Text><Text style={styles.heroBody}>For booking or account support, contact our team through your preferred channel.</Text></View><SupportRow icon={<Mail color="#0B4FE8" size={21} />} label="Email support" value="support@hopin.app" onPress={() => void openUrl('mailto:support@hopin.app')} /><SupportRow icon={<Phone color="#0B4FE8" size={21} />} label="Call support" value="+91 80000 00000" onPress={() => void openUrl('tel:+918000000000')} /><Text style={styles.sectionTitle}>Policies</Text><SupportRow icon={<FileText color="#0B4FE8" size={21} />} label="Terms of service" value="Read the rental terms" onPress={() => router.push({ pathname: '/(customer)/policy', params: { type: 'terms' } } as never)} /><SupportRow icon={<FileText color="#0B4FE8" size={21} />} label="Privacy policy" value="How HopIn handles your data" onPress={() => router.push({ pathname: '/(customer)/policy', params: { type: 'privacy' } } as never)} /></ScrollView></View></SafeAreaView>;
}

function SupportRow({ icon, label, onPress, value }: { icon: React.ReactNode; label: string; onPress: () => void; value: string }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}>{icon}</View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View><ExternalLink color="#64748B" size={18} /></Pressable>; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F7FAFF', flex: 1 }, screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 }, iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, eyebrow: { color: '#64748B', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#0F172A', fontSize: 23, fontWeight: '900' }, content: { gap: 12, padding: 16, paddingBottom: 32 }, hero: { alignItems: 'center', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderRadius: 16, borderWidth: 1, gap: 8, padding: 20 }, heroTitle: { color: '#0F172A', fontSize: 21, fontWeight: '900' }, heroBody: { color: '#475569', fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' }, sectionTitle: { color: '#0F172A', fontSize: 17, fontWeight: '900', marginTop: 6 }, row: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 76, padding: 13 }, rowIcon: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 10, height: 42, justifyContent: 'center', width: 42 }, rowCopy: { flex: 1, minWidth: 0 }, rowTitle: { color: '#0F172A', fontSize: 15, fontWeight: '900' }, rowValue: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 }, pressed: { opacity: 0.75 },
});

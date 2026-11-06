import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';

type PolicySection = {
  body: string;
  bullets?: string[];
  heading: string;
};

const terms: PolicySection[] = [
  {
    heading: '1. Welcome to HopIn',
    body: 'These Terms of Service explain the rules and conditions for using the HopIn platform, including browsing vehicles, making reservations, renting cars, and listing eligible vehicles. By registering, booking a vehicle, or using our services, you agree to these Terms and any additional policies applicable to your booking.',
  },
  {
    heading: '2. User eligibility',
    body: 'To rent a vehicle through HopIn, customers must:',
    bullets: [
      'Meet the minimum age requirement of [XX] years.',
      'Hold a valid driving licence appropriate for the selected vehicle.',
      'Provide accurate personal and contact information.',
      'Complete any required identity and licence verification.',
      'Comply with applicable traffic and motor vehicle regulations.',
      'HopIn may decline or restrict bookings when eligibility or verification requirements are not satisfied.',
    ],
  },
  {
    heading: '3. Account registration',
    body: 'Users are responsible for maintaining accurate account information and protecting their login credentials. You agree not to:',
    bullets: [
      'Provide false or misleading information.',
      'Create fraudulent accounts.',
      "Use another person's identity without authorization.",
      'Misuse the platform or interfere with its services.',
      'HopIn may suspend or restrict accounts for violations, subject to applicable laws and fair procedures.',
    ],
  },
  {
    heading: '4. Vehicle booking',
    body: 'Customers can browse available vehicles and submit booking requests based on location, rental dates, and availability. A booking is confirmed only when the required payment and confirmation conditions have been satisfied. Booking details include:',
    bullets: [
      'Vehicle make and model.',
      'Pickup and return date and time.',
      'Pickup location.',
      'Rental charges and applicable fees.',
      'Security deposit, if applicable.',
      'Mileage and fuel conditions.',
      "Vehicle availability and booking approval are subject to the applicable rental provider's confirmation and HopIn's booking rules.",
    ],
  },
  {
    heading: '5. Rental charges and payments',
    body: 'All applicable charges will be displayed before the customer confirms payment. Depending on the booking, charges may include:',
    bullets: [
      'Vehicle rental fees.',
      'Platform or service fees.',
      'Applicable taxes.',
      'Refundable security deposit.',
      'Additional mileage charges.',
      'Late return fees.',
      'Other disclosed and applicable charges.',
      'Payments must be completed through approved payment methods.',
      'Any additional charges must follow the terms disclosed to the customer and applicable law.',
    ],
  },
  {
    heading: '6. Security deposit',
    body: 'Some vehicle rentals may require a refundable security deposit. The deposit amount will be disclosed before payment. Where applicable, deductions may be made for:',
    bullets: [
      'Vehicle damage attributable to the renter.',
      'Missing fuel under the agreed fuel policy.',
      'Outstanding tolls or traffic penalties.',
      'Late returns or other applicable charges.',
      'Customers will receive details of any deductions and may raise a dispute.',
      'Deposit refund timeline: [To Be Updated].',
    ],
  },
  {
    heading: '7. Cancellation and refund policy',
    body: 'Customers may cancel bookings according to the applicable cancellation policy. Cancellation charges and refund eligibility may depend on:',
    bullets: [
      'The time remaining before pickup.',
      'Whether the booking has been confirmed.',
      'Whether the vehicle has already been handed over.',
      'The reason for cancellation.',
      'If a host or rental provider cancels a confirmed booking, the applicable customer refund or alternative-arrangement policy will apply.',
      'Full cancellation rules and refund timelines are available in the Cancellation & refunds policy.',
    ],
  },
  {
    heading: '8. Vehicle pickup and return',
    body: 'Customers must collect and return the vehicle according to the confirmed booking details. At pickup, customers may be required to:',
    bullets: [
      'Present a valid driving licence.',
      'Complete identity verification.',
      'Inspect the vehicle.',
      'Confirm the vehicle’s condition.',
      'Record pre-existing damage.',
      'Customers must return the vehicle at the agreed location and time unless an extension or alternative arrangement has been approved. Late returns may result in additional charges according to the disclosed rental terms.',
    ],
  },
  {
    heading: '9. Customer responsibilities',
    body: 'During the rental period, customers are responsible for using the vehicle safely and responsibly. Customers must:',
    bullets: [
      'Follow applicable traffic laws.',
      'Drive only with a valid driving licence.',
      'Use the vehicle for permitted purposes.',
      'Take reasonable care of the vehicle.',
      'Notify the rental provider or HopIn of accidents, breakdowns, or significant damage.',
      'Return the vehicle in the agreed condition, allowing for normal wear and tear.',
    ],
  },
  {
    heading: 'Prohibited use',
    body: 'The following activities are prohibited unless expressly authorized and lawful:',
    bullets: [
      'Driving under the influence of alcohol or drugs.',
      'Racing or reckless driving.',
      'Allowing unauthorized drivers to use the vehicle.',
      'Using the vehicle for unlawful activities.',
      'Subletting the vehicle.',
      'Taking the vehicle outside permitted locations.',
    ],
  },
  {
    heading: '10. Mileage, fuel and additional charges',
    body: 'Each vehicle may have its own mileage and fuel conditions. The booking details will specify:',
    bullets: [
      'Included kilometres.',
      'Additional cost per kilometre.',
      'Fuel requirements.',
      'Minimum and maximum rental duration, where applicable.',
      'Late-return conditions.',
      'Customers are responsible for applicable tolls, parking charges, and traffic violations incurred during their rental period unless otherwise stated.',
    ],
  },
  {
    heading: '11. Vehicle damage and accidents',
    body: 'Customers must promptly report accidents, theft, breakdowns, or damage. In the event of an accident:',
    bullets: [
      'Prioritize personal safety and seek emergency assistance when needed.',
      'Notify the appropriate authorities where required.',
      'Contact the rental provider or HopIn support.',
      'Share relevant information and supporting evidence.',
      'Cooperate with the applicable insurance and incident-review process.',
      'Financial responsibility for damage will depend on the circumstances, applicable insurance, rental agreement, and law. Customers will not automatically be responsible for pre-existing damage or charges unrelated to their rental.',
    ],
  },
  {
    heading: '12. Insurance coverage',
    body: 'Insurance coverage varies according to the vehicle, rental arrangement, policy terms, and applicable regulations. Before confirmation, customers should be informed of applicable insurance coverage, significant exclusions, and any deductible or excess amount. Insurance claims will be handled according to the applicable insurance policy. HopIn does not guarantee coverage beyond the terms of the relevant insurance arrangement.',
  },
  {
    heading: '13. Host responsibilities',
    body: 'Hosts and rental providers using HopIn must:',
    bullets: [
      'List only vehicles legally eligible for the rental service.',
      'Maintain valid vehicle documents, authorizations, and appropriate insurance.',
      'Provide accurate vehicle descriptions and photographs.',
      'Maintain vehicles in safe and roadworthy condition.',
      'Honor confirmed bookings unless cancellation is justified.',
      'Follow the agreed pickup and return procedures.',
      'Cooperate with customer support and incident investigations.',
      'Additional conditions are governed by the HopIn Host Agreement.',
    ],
  },
  {
    heading: '14. Payment disputes and refunds',
    body: 'If a customer believes a charge is incorrect, they may contact HopIn support. Refund eligibility depends on the transaction, cancellation conditions, payment records, and applicable law. Where a refund is approved, it will be processed through an appropriate payment method. Refund processing times will be communicated according to the actual payment provider and applicable refund policy.',
  },
  {
    heading: '15. Privacy and personal information',
    body: 'HopIn may collect personal information necessary to provide its services, including:',
    bullets: [
      'Name and contact information.',
      'Identity and driving licence information.',
      'Booking and transaction details.',
      'Vehicle listing information.',
      'Location information where necessary and permitted.',
      'Personal information will be handled in accordance with the HopIn Privacy Policy and applicable data-protection requirements.',
    ],
  },
  {
    heading: '16. Platform availability',
    body: 'HopIn aims to provide reliable access to its services. However, platform availability may be affected by technical issues, maintenance, payment failures, or circumstances beyond reasonable operational control. HopIn will handle service failures, cancellations, and affected bookings according to applicable laws and its published policies. Nothing in these Terms excludes consumer rights or legal responsibilities that cannot lawfully be excluded.',
  },
  {
    heading: '17. Complaints and dispute resolution',
    body: 'Customers and hosts can contact HopIn support regarding bookings, payments, refunds, vehicle damage, or service concerns.',
    bullets: [
      'Customer support: [Support Email].',
      'Grievance Officer: [Name and Contact Details].',
      'Registered business address: [Company Address].',
      'Complaints will be handled according to applicable consumer protection requirements. Unresolved disputes will be addressed through the remedies and procedures available under Indian law.',
    ],
  },
  {
    heading: '18. Changes to terms',
    body: 'HopIn may update these Terms to reflect changes in its services, policies, or applicable legal requirements. The latest Terms will be available through the app and website. Where required, users will be notified of material changes and asked to provide fresh acceptance. Changes will not improperly override rights or contractual conditions that already apply to confirmed bookings.',
  },
  {
    heading: '19. Contact us',
    body: 'If you have questions about these Terms, please contact HopIn Support.',
    bullets: [
      'Email: [Support Email].',
      'Website: [Official Website].',
      'Address: [Registered Business Address].',
    ],
  },
];
const cancellationRefunds = [
  ['When eligibility is calculated', 'Cancellation eligibility is calculated by the booking service when a cancellation is requested, using the paid payment status, the booking pickup time, and the server-calculated booking total.'],
  ['More than 24 hours before pickup', 'For a paid booking cancelled at least 24 hours before its pickup time, the eligible refund is 100% of the booking total.'],
  ['Less than 24 hours before pickup', 'For a paid booking cancelled less than 24 hours before pickup, the eligible refund is 50% of the booking total.'],
  ['At or after pickup', 'A cancellation at or after the pickup time is not eligible for a cancellation refund. An unpaid booking is also not eligible for a refund because no payment was collected.'],
  ['Deposit, deductions and processing', 'The refundable deposit is included in the booking total; it is not added again to the eligible refund. The booking shows any cancellation deduction and the payment provider records the refund as pending, succeeded, or failed.'],
  ['Exceptions and support', 'A refund can be delayed or unavailable if payment verification fails. For a trip issue or an unexpected refund outcome, contact HopIn Support from the booking details screen.'],
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
  const isCancellationRefunds = params.type === 'cancellation-refunds';
  const title = isPrivacy ? 'Privacy policy' : isHostTerms ? 'Host Terms' : isAbout ? 'About HopIn' : isCancellationRefunds ? 'Cancellation & refunds' : 'Terms of service';
  const sections: PolicySection[] = isPrivacy ? asPolicySections(privacy) : isHostTerms ? asPolicySections(hostTerms) : isAbout ? asPolicySections(about) : isCancellationRefunds ? asPolicySections(cancellationRefunds) : terms;
  const metadata = isAbout
    ? null
    : isPrivacy || isHostTerms || isCancellationRefunds
      ? ['Last updated: 30 October 2026']
      : ['Effective date: To Be Updated', 'Last updated: To Be Updated', 'Version: Draft 1.0'];
  const goBack = useSafeBack({ fallback: '/(customer)/help-support' });
  return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.screen}><View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.iconButton}><ArrowLeft color="#102550" size={21} /></Pressable><Text style={styles.title}>{title}</Text></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{metadata ? <View style={styles.metadata}>{metadata.map((item) => <Text key={item} style={styles.updated}>{item}</Text>)}</View> : null}{sections.map((section) => <View key={section.heading} style={styles.section}><Text style={styles.heading}>{section.heading}</Text><Text style={styles.body}>{section.body}</Text>{section.bullets ? <View style={styles.bulletList}>{section.bullets.map((bullet) => <View key={bullet} style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={[styles.body, styles.bulletText]}>{bullet}</Text></View>)}</View> : null}</View>)}{isCancellationRefunds ? <Pressable accessibilityRole="button" onPress={() => router.push('/(customer)/help-support')} style={styles.link}><Text style={styles.linkText}>Contact HopIn Support</Text></Pressable> : null}{!isAbout ? <Pressable accessibilityRole="button" onPress={() => router.push('/(customer)/privacy-security')} style={styles.link}><Text style={styles.linkText}>Manage account privacy</Text></Pressable> : null}</ScrollView></View></SafeAreaView>;
}

function asPolicySections(sections: string[][]): PolicySection[] {
  return sections.map(([heading, body]) => ({ heading, body }));
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: '#F3F9FF', flex: 1 }, screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 }, iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 }, title: { color: '#102550', fontSize: 22, fontWeight: '900' }, content: { gap: 14, padding: 16, paddingBottom: 32 }, metadata: { gap: 3 }, updated: { color: '#536B91', fontSize: 12, fontWeight: '700' }, section: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 7, padding: 14 }, heading: { color: '#102550', fontSize: 16, fontWeight: '900' }, body: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 21 }, bulletList: { gap: 5, marginTop: 2 }, bulletRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 7 }, bullet: { color: '#0B6FE8', fontSize: 14, fontWeight: '900', lineHeight: 21 }, bulletText: { flex: 1, minWidth: 0 }, link: { alignItems: 'center', borderColor: '#BFDBFE', borderRadius: 12, borderWidth: 1, minHeight: 46, justifyContent: 'center' }, linkText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' } });

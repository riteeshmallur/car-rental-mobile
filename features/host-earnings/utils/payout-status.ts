import { type HostPayoutStatus } from '@/types/car';

type PayoutStatusTone = 'neutral' | 'positive' | 'warning' | 'danger';

type PayoutStatusPresentation = {
  label: string;
  tone: PayoutStatusTone;
  isPaid: boolean;
};

const PRESENTATIONS: Record<string, PayoutStatusPresentation> = {
  pending: { label: 'Pending', tone: 'warning', isPaid: false },
  eligible: { label: 'Eligible for payout', tone: 'neutral', isPaid: false },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warning', isPaid: false },
  approved: { label: 'Approved for processing', tone: 'neutral', isPaid: false },
  processing: { label: 'Processing transfer', tone: 'warning', isPaid: false },
  paid: { label: 'Paid', tone: 'positive', isPaid: true },
  // `completed` is retained by the API for historical records.
  completed: { label: 'Paid', tone: 'positive', isPaid: true },
  failed: { label: 'Payout failed', tone: 'danger', isPaid: false },
  reconciliation_required: { label: 'Verification required', tone: 'warning', isPaid: false },
  on_hold: { label: 'On hold', tone: 'warning', isPaid: false },
  cancelled: { label: 'Cancelled', tone: 'neutral', isPaid: false },
};

export function getPayoutStatusPresentation(status: HostPayoutStatus | null | undefined) {
  const normalized = status?.trim().toLowerCase().replace(/-/g, '_') ?? '';
  return PRESENTATIONS[normalized] ?? {
    label: 'Status unavailable',
    tone: 'neutral' as const,
    isPaid: false,
  };
}

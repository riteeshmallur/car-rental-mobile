import { z } from 'zod';

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable();

export const hostOnboardingSchema = z
  .object({
    personalInfo: z.object({
      firstName: z.string().trim().min(1, 'First name is required').max(100),
      lastName: z.string().trim().min(1, 'Last name is required').max(100),
      email: z.string().trim().email('Enter a valid email').max(255),
      phoneNumber: z.string().trim().min(1, 'Mobile number is required').max(20),
    }),
    identity: z.object({
      documentType: z.enum(['aadhaar', 'pan', 'passport', 'driving_license']),
      documentLast4: z.string().trim().regex(/^\d{4}$/, 'Enter the last 4 digits'),
      verificationConsent: z
        .boolean()
        .refine((value) => value, 'Verification consent is required'),
    }),
    payout: z.object({
      payoutMethod: z.enum(['upi', 'bank_account']),
      accountHolderName: z.string().trim().min(1, 'Account holder name is required'),
      bankName: nullableText,
      accountLast4: nullableText.refine(
        (value) => !value || /^\d{4}$/.test(value),
        'Enter the last 4 digits',
      ),
      upiId: nullableText,
    }),
    terms: z.object({
      accepted: z
        .boolean()
        .refine((value) => value, 'Host terms must be accepted'),
    }),
    hostProfile: z.object({
      displayName: z.string().trim().min(2, 'Display name is required').max(120),
      bio: z.string().trim().min(10, 'Add a short host bio').max(500),
    }),
  })
  .superRefine((values, context) => {
    if (values.payout.payoutMethod === 'upi' && !values.payout.upiId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UPI ID is required',
        path: ['payout', 'upiId'],
      });
    }

    if (values.payout.payoutMethod === 'bank_account') {
      if (!values.payout.bankName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required',
          path: ['payout', 'bankName'],
        });
      }

      if (!values.payout.accountLast4) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account last 4 digits are required',
          path: ['payout', 'accountLast4'],
        });
      }
    }
  });

export type HostOnboardingFormValues = z.infer<typeof hostOnboardingSchema>;

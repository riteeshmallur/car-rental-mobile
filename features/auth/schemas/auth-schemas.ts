import { z } from 'zod';

export const requestOtpSchema = z.object({
  phoneNumber: z.string().trim().min(1, 'Phone number is required').max(24),
});

export const verifyOtpSchema = requestOtpSchema.extend({
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit OTP'),
});

export type RequestOtpFormValues = z.infer<typeof requestOtpSchema>;
export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

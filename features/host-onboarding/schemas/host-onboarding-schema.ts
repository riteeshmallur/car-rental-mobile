import { z } from 'zod';

export const HOST_TERMS_VERSION = '2026-10-24';

export const hostOnboardingSchema = z.object({
  terms: z.object({
    accepted: z.boolean().refine((value) => value, 'Host terms must be accepted'),
    policyVersion: z.string().trim().min(1),
  }),
  hostProfile: z.object({
    displayName: z.string().trim().min(2, 'Display name is required').max(120),
    bio: z.string().trim().max(500, 'Host bio must be 500 characters or less'),
  }),
});

export type HostOnboardingFormValues = z.infer<typeof hostOnboardingSchema>;

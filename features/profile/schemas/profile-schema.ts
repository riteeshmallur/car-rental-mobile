import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable();

export const profileSchema = z.object({
  firstName: optionalText,
  lastName: optionalText,
  email: z
    .string()
    .trim()
    .transform((value) => (value.length ? value.toLowerCase() : null))
    .nullable()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email',
    }),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .max(20, 'Mobile number is too long'),
  profileImageUrl: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : null))
    .nullable()
    .refine(
      (value) => !value || z.string().url().safeParse(value).success,
      'Enter a valid image URL',
    ),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

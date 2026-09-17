import { z } from 'zod';

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')
  .refine((value) => Number(value) > 0, {
    message: 'Price must be greater than ₹0',
  });

const optionalMoneyString = z
  .string()
  .trim()
  .refine((value) => !value || /^\d+(\.\d{1,2})?$/.test(value), {
    message: 'Enter a valid amount',
  })
  .refine((value) => !value || Number(value) >= 0, {
    message: 'Deposit cannot be negative',
  });

const optionalNumberString = z
  .string()
  .trim()
  .refine((value) => !value || /^\d+$/.test(value), {
    message: 'Enter a whole number',
  });

const optionalPositiveNumberString = optionalNumberString.refine(
  (value) => !value || Number(value) > 0,
  { message: 'Enter a value greater than 0' },
);

const hostVehicleFormSchemaBase = z.object({
  make: z.string().trim().min(2, 'Make is required'),
  model: z.string().trim().min(1, 'Model is required'),
  manufacturingYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter a 4-digit year')
    .refine((value) => Number(value) >= 1990 && Number(value) <= 2100, {
      message: 'Enter a valid year',
    }),
  registrationNumber: z.string().trim().min(5, 'Registration number is required'),
  vehicleType: z.enum(['car', 'suv', 'sedan', 'hatchback', 'ev']),
  transmission: z.enum(['manual', 'automatic']),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
  seats: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter seats')
    .refine((value) => Number(value) >= 1 && Number(value) <= 12, {
      message: 'Seats must be between 1 and 12',
    }),
  doors: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter doors')
    .refine((value) => Number(value) >= 1 && Number(value) <= 8, {
      message: 'Doors must be between 1 and 8',
    }),
  colour: z.string().trim().optional(),
  description: z.string().trim().min(20, 'Add a short vehicle description'),
  locationId: z.string().trim().min(1, 'Location ID is required'),
  address: z.string().trim().min(5, 'Pickup address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  country: z.string().trim().min(2, 'Country is required'),
  latitude: z
    .string()
    .trim()
    .refine((value) => !value || Number.isFinite(Number(value)), {
      message: 'Enter a valid latitude',
    }),
  longitude: z
    .string()
    .trim()
    .refine((value) => !value || Number.isFinite(Number(value)), {
      message: 'Enter a valid longitude',
    }),
  features: z.array(z.string().trim().min(1)).min(1, 'Add at least one feature'),
  imageUrls: z.array(z.string().trim().min(1)).min(1, 'Add at least one photo'),
  registrationCertificateNumber: z.string().trim().min(3, 'RC number is required'),
  insurancePolicyNumber: z.string().trim().min(3, 'Insurance policy is required'),
  pollutionCertificateNumber: z.string().trim().optional(),
  pricePerDay: moneyString,
  securityDeposit: optionalMoneyString,
  mileageLimitPerDay: optionalPositiveNumberString,
  minimumRentalDays: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter minimum days')
    .refine((value) => Number(value) >= 1, {
      message: 'Minimum rental must be at least 1 day',
    }),
  maximumRentalDays: optionalNumberString,
  availableFrom: z.string().trim().min(4, 'Availability start is required'),
  availableTo: z.string().trim().optional(),
  advanceNoticeHours: optionalNumberString,
  available: z.boolean(),
});

export const hostVehicleFormSchema = hostVehicleFormSchemaBase.superRefine(
  (values, context) => {
    if (
      values.maximumRentalDays &&
      Number(values.maximumRentalDays) < Number(values.minimumRentalDays)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum days cannot be less than minimum days',
        path: ['maximumRentalDays'],
      });
    }

    if (values.availableTo && values.availableFrom && values.availableTo < values.availableFrom) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Available until cannot be before available from',
        path: ['availableTo'],
      });
    }
  },
);

export type HostVehicleFormValues = z.infer<typeof hostVehicleFormSchema>;

export const hostVehicleDefaultValues: HostVehicleFormValues = {
  make: '',
  model: '',
  manufacturingYear: '',
  registrationNumber: '',
  vehicleType: 'car',
  transmission: 'manual',
  fuelType: 'petrol',
  seats: '5',
  doors: '4',
  colour: '',
  description: '',
  locationId: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  latitude: '',
  longitude: '',
  features: [],
  imageUrls: [],
  registrationCertificateNumber: '',
  insurancePolicyNumber: '',
  pollutionCertificateNumber: '',
  pricePerDay: '',
  securityDeposit: '',
  mileageLimitPerDay: '',
  minimumRentalDays: '1',
  maximumRentalDays: '',
  availableFrom: '',
  availableTo: '',
  advanceNoticeHours: '24',
  available: true,
};

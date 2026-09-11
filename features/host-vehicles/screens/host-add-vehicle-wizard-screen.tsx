import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, type FieldPath, useForm } from 'react-hook-form';

import {
  hostVehicleDefaultValues,
  hostVehicleFormSchema,
  type HostVehicleFormValues,
} from '@/features/host-vehicles/schemas/host-vehicle-form-schema';
import { hostsApi } from '@/services/hosts/hosts-api';
import { vehiclesApi } from '@/services/vehicles/vehicles-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import {
  type HostVehicleListing,
  type UpsertHostVehiclePayload,
} from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

type StepKey =
  | 'vehicleDetails'
  | 'vehicleLocation'
  | 'features'
  | 'photos'
  | 'documents'
  | 'pricing'
  | 'availability'
  | 'review';

type WizardStep = {
  key: StepKey;
  title: string;
  helper: string;
  fields: FieldPath<HostVehicleFormValues>[];
};

const steps: WizardStep[] = [
  {
    key: 'vehicleDetails',
    title: 'Vehicle details',
    helper: 'Core details customers use to compare your car.',
    fields: [
      'make',
      'model',
      'manufacturingYear',
      'registrationNumber',
      'vehicleType',
      'transmission',
      'fuelType',
      'seats',
      'doors',
      'description',
    ],
  },
  {
    key: 'vehicleLocation',
    title: 'Vehicle location',
    helper: 'Where renters will pick up and return the vehicle.',
    fields: ['locationId', 'address', 'city', 'state', 'country'],
  },
  {
    key: 'features',
    title: 'Features',
    helper: 'Add practical features that make the car easier to choose.',
    fields: ['features'],
  },
  {
    key: 'photos',
    title: 'Photos',
    helper: 'Use clear exterior and interior images.',
    fields: ['imageUrls'],
  },
  {
    key: 'documents',
    title: 'Documents',
    helper: 'Keep document references ready for verification.',
    fields: ['registrationCertificateNumber', 'insurancePolicyNumber'],
  },
  {
    key: 'pricing',
    title: 'Pricing',
    helper: 'Set the daily price and rental rules.',
    fields: ['pricePerDay', 'minimumRentalDays'],
  },
  {
    key: 'availability',
    title: 'Availability',
    helper: 'Control when the listing can receive bookings.',
    fields: ['availableFrom'],
  },
  {
    key: 'review',
    title: 'Review and submit',
    helper: 'Confirm the draft before sending it for approval.',
    fields: [],
  },
];

const vehicleTypes = [
  ['car', 'Car'],
  ['suv', 'SUV'],
  ['sedan', 'Sedan'],
  ['hatchback', 'Hatchback'],
  ['ev', 'EV'],
] as const;

const transmissions = [
  ['manual', 'Manual'],
  ['automatic', 'Automatic'],
] as const;

const fuelTypes = [
  ['petrol', 'Petrol'],
  ['diesel', 'Diesel'],
  ['electric', 'Electric'],
  ['hybrid', 'Hybrid'],
] as const;

export function HostAddVehicleWizardScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const requestedVehicleId = Array.isArray(params.vehicleId)
    ? params.vehicleId[0]
    : params.vehicleId;
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState('');
  const [resumeChecked, setResumeChecked] = useState(false);

  const form = useForm<HostVehicleFormValues>({
    defaultValues: hostVehicleDefaultValues,
    resolver: zodResolver(hostVehicleFormSchema),
    mode: 'onTouched',
  });

  const {
    control,
    formState: { errors },
    getValues,
    reset,
    setValue,
    trigger,
    watch,
  } = form;

  const hostVehiclesQuery = useQuery({
    queryKey: ['host', 'vehicles'],
    queryFn: hostsApi.listVehicles,
  });

  useEffect(() => {
    if (resumeChecked || !hostVehiclesQuery.data) {
      return;
    }

    const draft = requestedVehicleId
      ? hostVehiclesQuery.data.find((vehicle) => vehicle.id === requestedVehicleId)
      : hostVehiclesQuery.data.find((vehicle) =>
          ['DRAFT', 'CHANGES_REQUIRED'].includes(vehicle.status),
        );

    if (draft) {
      setDraftId(draft.id);
      reset(mapListingToFormValues(draft));
      setStepIndex(getStepIndex(draft.draftStep));
    }

    setResumeChecked(true);
  }, [hostVehiclesQuery.data, requestedVehicleId, reset, resumeChecked]);

  const saveMutation = useMutation({
    mutationFn: async (payload: UpsertHostVehiclePayload) => {
      if (draftId) {
        return vehiclesApi.updateDraft(draftId, payload);
      }

      return vehiclesApi.createDraft(payload);
    },
    onSuccess: (vehicle) => {
      setDraftId(vehicle.id);
      reset(mapListingToFormValues(vehicle));
      queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) {
        throw new Error('Save the draft before submitting.');
      }

      return vehiclesApi.submit(draftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
      router.replace('/(host)/profile');
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async (imageUris: string[]) => {
      if (!draftId) {
        throw new Error('Save vehicle details before uploading photos.');
      }

      let listing: HostVehicleListing | null = null;

      for (const imageUri of imageUris) {
        listing = await vehiclesApi.uploadImage(draftId, imageUri);
      }

      if (!listing) {
        throw new Error('No photos were selected for upload.');
      }

      return listing;
    },
  });

  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const features = watch('features');
  const imageUrls = watch('imageUrls');

  const serverError = useMemo(() => {
    const error =
      saveMutation.error ?? uploadPhotosMutation.error ?? submitMutation.error;
    return error ? normalizeApiError(error) : null;
  }, [saveMutation.error, submitMutation.error, uploadPhotosMutation.error]);

  const addFeature = () => {
    const nextFeature = featureInput.trim();

    if (!nextFeature || features.includes(nextFeature)) {
      setFeatureInput('');
      return;
    }

    setValue('features', [...features, nextFeature], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setFeatureInput('');
  };

  const removeFeature = (feature: string) => {
    setValue(
      'features',
      features.filter((item) => item !== feature),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo access required',
        'Allow photo access in device settings to add vehicle images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: 8,
    });

    if (result.canceled) {
      return;
    }

    const nextImages = result.assets.map((asset) => asset.uri);
    setValue('imageUrls', [...imageUrls, ...nextImages].slice(0, 8), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removePhoto = (uri: string) => {
    setValue(
      'imageUrls',
      imageUrls.filter((item) => item !== uri),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const saveAndContinue = async () => {
    const valid = step.fields.length ? await trigger(step.fields) : true;

    if (!valid) {
      return;
    }

    try {
      if (step.key === 'review') {
        const allValid = await trigger();

        if (!allValid) {
          setStepIndex(0);
          return;
        }

        await submitMutation.mutateAsync();
        return;
      }

      let values = getValues();

      if (step.key === 'photos') {
        const localImageUris = values.imageUrls.filter(
          (uri) => !/^https?:\/\//i.test(uri) && !uri.startsWith('/uploads/'),
        );

        if (localImageUris.length > 0) {
          const listing = await uploadPhotosMutation.mutateAsync(localImageUris);
          setValue('imageUrls', listing.imageUrls, {
            shouldDirty: true,
            shouldValidate: true,
          });
          values = { ...values, imageUrls: listing.imageUrls };
        }
      }

      const nextStep = steps[Math.min(stepIndex + 1, steps.length - 1)];
      const payload = buildStepPayload(step.key, values, nextStep.key);
      await saveMutation.mutateAsync(payload);
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    } catch {
      // Mutation state renders the backend or upload error without an unhandled promise.
    }
  };

  const handleInternalBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      return true;
    }

    return false;
  }, [stepIndex]);
  const goBack = useSafeBack({
    fallback: '/(host)/cars',
    onBeforeBack: handleInternalBack,
  });
  useWebBackGuard({ active: stepIndex > 0, onBack: goBack });

  const isBusy =
    saveMutation.isPending ||
    uploadPhotosMutation.isPending ||
    submitMutation.isPending ||
    (hostVehiclesQuery.isLoading && !resumeChecked);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}
          >
            <ArrowLeft color="#111827" size={22} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Add vehicle</Text>
            <Text style={styles.subtitle}>
              Step {stepIndex + 1} of {steps.length}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {draftId ? (
            <View style={styles.resumeBanner}>
              <Check color="#047857" size={18} />
              <Text style={styles.resumeText}>Draft saved. You can leave and resume later.</Text>
            </View>
          ) : null}

          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepHelper}>{step.helper}</Text>
          </View>

          {step.key === 'vehicleDetails' ? (
            <VehicleDetailsStep control={control} errors={errors} />
          ) : null}
          {step.key === 'vehicleLocation' ? (
            <VehicleLocationStep control={control} errors={errors} />
          ) : null}
          {step.key === 'features' ? (
            <FeaturesStep
              error={errors.features?.message}
              featureInput={featureInput}
              features={features}
              onAddFeature={addFeature}
              onChangeFeatureInput={setFeatureInput}
              onRemoveFeature={removeFeature}
            />
          ) : null}
          {step.key === 'photos' ? (
            <PhotosStep
              error={errors.imageUrls?.message}
              imageUrls={imageUrls}
              onPickPhotos={pickPhotos}
              onRemovePhoto={removePhoto}
            />
          ) : null}
          {step.key === 'documents' ? (
            <DocumentsStep control={control} errors={errors} />
          ) : null}
          {step.key === 'pricing' ? (
            <PricingStep control={control} errors={errors} />
          ) : null}
          {step.key === 'availability' ? (
            <AvailabilityStep control={control} errors={errors} />
          ) : null}
          {step.key === 'review' ? <ReviewStep values={getValues()} /> : null}

          {serverError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{serverError.message}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={saveAndContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              isBusy && styles.disabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {step.key === 'review'
                ? submitMutation.isPending
                  ? 'Submitting...'
                  : 'Submit for approval'
                : uploadPhotosMutation.isPending
                  ? 'Uploading photos...'
                : saveMutation.isPending
                  ? 'Saving...'
                  : 'Save and continue'}
            </Text>
            {step.key === 'review' ? (
              <Check color="#FFFFFF" size={18} />
            ) : (
              <ChevronRight color="#FFFFFF" size={18} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function VehicleDetailsStep({
  control,
  errors,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
}) {
  return (
    <View style={styles.form}>
      <TextField control={control} error={errors.make?.message} label="Make" name="make" />
      <TextField control={control} error={errors.model?.message} label="Model" name="model" />
      <View style={styles.row}>
        <TextField
          control={control}
          error={errors.manufacturingYear?.message}
          keyboardType="number-pad"
          label="Year"
          name="manufacturingYear"
        />
        <TextField
          control={control}
          error={errors.registrationNumber?.message}
          label="Registration"
          name="registrationNumber"
          autoCapitalize="characters"
        />
      </View>
      <SegmentField control={control} label="Type" name="vehicleType" options={vehicleTypes} />
      <SegmentField
        control={control}
        label="Transmission"
        name="transmission"
        options={transmissions}
      />
      <SegmentField control={control} label="Fuel" name="fuelType" options={fuelTypes} />
      <View style={styles.row}>
        <TextField
          control={control}
          error={errors.seats?.message}
          keyboardType="number-pad"
          label="Seats"
          name="seats"
        />
        <TextField
          control={control}
          error={errors.doors?.message}
          keyboardType="number-pad"
          label="Doors"
          name="doors"
        />
      </View>
      <TextField control={control} label="Colour" name="colour" />
      <TextField
        control={control}
        error={errors.description?.message}
        label="Description"
        multiline
        name="description"
      />
    </View>
  );
}

function VehicleLocationStep({
  control,
  errors,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
}) {
  return (
    <View style={styles.form}>
      <TextField
        control={control}
        error={errors.locationId?.message}
        label="Backend location ID"
        name="locationId"
      />
      <TextField
        control={control}
        error={errors.address?.message}
        label="Pickup address"
        multiline
        name="address"
      />
      <TextField control={control} error={errors.city?.message} label="City" name="city" />
      <TextField control={control} error={errors.state?.message} label="State" name="state" />
      <TextField control={control} error={errors.country?.message} label="Country" name="country" />
      <View style={styles.row}>
        <TextField
          control={control}
          error={errors.latitude?.message}
          keyboardType="decimal-pad"
          label="Latitude"
          name="latitude"
        />
        <TextField
          control={control}
          error={errors.longitude?.message}
          keyboardType="decimal-pad"
          label="Longitude"
          name="longitude"
        />
      </View>
    </View>
  );
}

function FeaturesStep({
  error,
  featureInput,
  features,
  onAddFeature,
  onChangeFeatureInput,
  onRemoveFeature,
}: {
  error?: string;
  featureInput: string;
  features: string[];
  onAddFeature: () => void;
  onChangeFeatureInput: (value: string) => void;
  onRemoveFeature: (feature: string) => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Add feature</Text>
        <View style={styles.inlineInputRow}>
          <TextInput
            onChangeText={onChangeFeatureInput}
            onSubmitEditing={onAddFeature}
            placeholder="Bluetooth, reverse camera"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            style={[styles.input, styles.inlineInput]}
            value={featureInput}
          />
          <Pressable
            accessibilityLabel="Add feature"
            accessibilityRole="button"
            onPress={onAddFeature}
            style={styles.smallIconButton}
          >
            <Plus color="#FFFFFF" size={18} />
          </Pressable>
        </View>
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
      <View style={styles.chipGrid}>
        {features.map((feature) => (
          <Pressable
            accessibilityRole="button"
            key={feature}
            onPress={() => onRemoveFeature(feature)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{feature}</Text>
            <Trash2 color="#6B7280" size={14} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PhotosStep({
  error,
  imageUrls,
  onPickPhotos,
  onRemovePhoto,
}: {
  error?: string;
  imageUrls: string[];
  onPickPhotos: () => void;
  onRemovePhoto: (uri: string) => void;
}) {
  return (
    <View style={styles.form}>
      <Pressable
        accessibilityRole="button"
        onPress={onPickPhotos}
        style={styles.photoPickerButton}
      >
        <Camera color="#111827" size={22} />
        <Text style={styles.photoPickerText}>Choose photos</Text>
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <View style={styles.photoGrid}>
        {imageUrls.map((uri) => (
          <View key={uri} style={styles.photoTile}>
            <Image source={{ uri }} style={styles.photo} />
            <Pressable
              accessibilityLabel="Remove photo"
              accessibilityRole="button"
              onPress={() => onRemovePhoto(uri)}
              style={styles.photoRemoveButton}
            >
              <Trash2 color="#FFFFFF" size={15} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function DocumentsStep({
  control,
  errors,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
}) {
  return (
    <View style={styles.form}>
      <View style={styles.notice}>
        <FileText color="#0F766E" size={18} />
        <Text style={styles.noticeText}>Document uploads can be connected later; references are saved with the draft now.</Text>
      </View>
      <TextField
        control={control}
        error={errors.registrationCertificateNumber?.message}
        label="RC number"
        name="registrationCertificateNumber"
      />
      <TextField
        control={control}
        error={errors.insurancePolicyNumber?.message}
        label="Insurance policy"
        name="insurancePolicyNumber"
      />
      <TextField
        control={control}
        label="Pollution certificate"
        name="pollutionCertificateNumber"
      />
    </View>
  );
}

function PricingStep({
  control,
  errors,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
}) {
  return (
    <View style={styles.form}>
      <TextField
        control={control}
        error={errors.pricePerDay?.message}
        keyboardType="decimal-pad"
        label="Price per day"
        name="pricePerDay"
      />
      <TextField
        control={control}
        error={errors.securityDeposit?.message}
        keyboardType="decimal-pad"
        label="Security deposit"
        name="securityDeposit"
      />
      <TextField
        control={control}
        error={errors.mileageLimitPerDay?.message}
        keyboardType="number-pad"
        label="Mileage limit per day"
        name="mileageLimitPerDay"
      />
      <View style={styles.row}>
        <TextField
          control={control}
          error={errors.minimumRentalDays?.message}
          keyboardType="number-pad"
          label="Min days"
          name="minimumRentalDays"
        />
        <TextField
          control={control}
          error={errors.maximumRentalDays?.message}
          keyboardType="number-pad"
          label="Max days"
          name="maximumRentalDays"
        />
      </View>
    </View>
  );
}

function AvailabilityStep({
  control,
  errors,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
}) {
  return (
    <View style={styles.form}>
      <TextField
        control={control}
        error={errors.availableFrom?.message}
        label="Available from"
        name="availableFrom"
        placeholder="2026-09-15"
      />
      <TextField
        control={control}
        label="Available until"
        name="availableTo"
        placeholder="Optional"
      />
      <TextField
        control={control}
        error={errors.advanceNoticeHours?.message}
        keyboardType="number-pad"
        label="Advance notice hours"
        name="advanceNoticeHours"
      />
      <Controller
        control={control}
        name="available"
        render={({ field: { onChange, value } }) => (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            onPress={() => onChange(!value)}
            style={styles.toggleRow}
          >
            <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
            </View>
            <Text style={styles.toggleText}>Accept booking requests after approval</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function ReviewStep({ values }: { values: HostVehicleFormValues }) {
  const rows = [
    ['Vehicle', `${values.make || '-'} ${values.model || ''}`.trim()],
    ['Registration', values.registrationNumber || '-'],
    ['Location', [values.address, values.city, values.state].filter(Boolean).join(', ') || '-'],
    ['Features', values.features.join(', ') || '-'],
    ['Photos', `${values.imageUrls.length} added`],
    ['Daily price', values.pricePerDay ? `₹${values.pricePerDay}` : '-'],
    ['Availability', values.availableFrom || '-'],
  ];

  return (
    <View style={styles.reviewList}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{label}</Text>
          <Text style={styles.reviewValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function TextField({
  control,
  error,
  label,
  name,
  ...inputProps
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
  label: string;
  name: FieldPath<HostVehicleFormValues>;
} & Omit<React.ComponentProps<typeof TextInput>, 'onChange' | 'value'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value } }) => (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            {...inputProps}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              inputProps.multiline && styles.textArea,
              error && styles.inputError,
            ]}
            value={typeof value === 'string' ? value : String(value ?? '')}
          />
          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        </View>
      )}
    />
  );
}

function SegmentField({
  control,
  label,
  name,
  options,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  label: string;
  name: FieldPath<HostVehicleFormValues>;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.segmentWrap}>
            {options.map(([optionValue, optionLabel]) => (
              <Pressable
                accessibilityRole="button"
                key={optionValue}
                onPress={() => onChange(optionValue)}
                style={[
                  styles.segmentButton,
                  value === optionValue && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    value === optionValue && styles.segmentTextActive,
                  ]}
                >
                  {optionLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    />
  );
}

function buildStepPayload(
  stepKey: StepKey,
  values: HostVehicleFormValues,
  nextStep: StepKey,
): UpsertHostVehiclePayload {
  const payload: UpsertHostVehiclePayload = {
    draftStep: nextStep,
  };

  if (stepKey === 'vehicleDetails') {
    return {
      ...payload,
      make: cleanString(values.make),
      model: cleanString(values.model),
      manufacturingYear: toNumber(values.manufacturingYear),
      registrationNumber: cleanString(values.registrationNumber),
      vehicleType: values.vehicleType,
      transmission: values.transmission,
      fuelType: values.fuelType,
      seats: toNumber(values.seats),
      doors: toNumber(values.doors),
      colour: cleanString(values.colour),
      description: cleanString(values.description),
    };
  }

  if (stepKey === 'vehicleLocation') {
    return {
      ...payload,
      locationId: cleanString(values.locationId),
      address: cleanString(values.address),
      city: cleanString(values.city),
      state: cleanString(values.state),
      country: cleanString(values.country),
      latitude: toNumber(values.latitude),
      longitude: toNumber(values.longitude),
    };
  }

  if (stepKey === 'features') {
    return {
      ...payload,
      features: values.features,
    };
  }

  if (stepKey === 'photos') {
    return {
      ...payload,
      imageUrls: values.imageUrls,
    };
  }

  if (stepKey === 'documents') {
    return {
      ...payload,
      listingDocuments: {
        registrationCertificateNumber: cleanString(values.registrationCertificateNumber),
        insurancePolicyNumber: cleanString(values.insurancePolicyNumber),
        pollutionCertificateNumber: cleanString(values.pollutionCertificateNumber),
      },
    };
  }

  if (stepKey === 'pricing') {
    return {
      ...payload,
      pricePerDay: toNumber(values.pricePerDay),
      securityDeposit: toNumber(values.securityDeposit),
      mileageLimitPerDay: toNumber(values.mileageLimitPerDay),
      minimumRentalDays: toNumber(values.minimumRentalDays),
      maximumRentalDays: toNumber(values.maximumRentalDays),
    };
  }

  if (stepKey === 'availability') {
    return {
      ...payload,
      available: values.available,
      availabilitySettings: {
        availableFrom: cleanString(values.availableFrom),
        availableTo: cleanString(values.availableTo),
        advanceNoticeHours: toNumber(values.advanceNoticeHours),
      },
    };
  }

  return payload;
}

function mapListingToFormValues(vehicle: HostVehicleListing): HostVehicleFormValues {
  const documents = vehicle.listingDocuments;
  const availability = vehicle.availabilitySettings;

  return {
    ...hostVehicleDefaultValues,
    make: vehicle.make ?? '',
    model: vehicle.model ?? '',
    manufacturingYear: toStringValue(vehicle.manufacturingYear),
    registrationNumber: vehicle.registrationNumber ?? '',
    vehicleType: isVehicleType(vehicle.vehicleType) ? vehicle.vehicleType : 'car',
    transmission: vehicle.transmission === 'automatic' ? 'automatic' : 'manual',
    fuelType: isFuelType(vehicle.fuelType) ? vehicle.fuelType : 'petrol',
    seats: toStringValue(vehicle.seats) || '5',
    doors: toStringValue(vehicle.doors) || '4',
    colour: vehicle.colour ?? '',
    description: vehicle.description ?? '',
    locationId: vehicle.locationId ?? '',
    address: vehicle.address ?? '',
    city: vehicle.city ?? '',
    state: vehicle.state ?? '',
    country: vehicle.country ?? 'India',
    latitude: vehicle.latitude ?? '',
    longitude: vehicle.longitude ?? '',
    features: vehicle.features,
    imageUrls: vehicle.imageUrls,
    registrationCertificateNumber: stringFromRecord(documents, 'registrationCertificateNumber'),
    insurancePolicyNumber: stringFromRecord(documents, 'insurancePolicyNumber'),
    pollutionCertificateNumber: stringFromRecord(documents, 'pollutionCertificateNumber'),
    pricePerDay: vehicle.pricePerDay ?? '',
    securityDeposit: vehicle.securityDeposit ?? '',
    mileageLimitPerDay: toStringValue(vehicle.mileageLimitPerDay),
    minimumRentalDays: toStringValue(vehicle.minimumRentalDays) || '1',
    maximumRentalDays: toStringValue(vehicle.maximumRentalDays),
    availableFrom: stringFromRecord(availability, 'availableFrom'),
    availableTo: stringFromRecord(availability, 'availableTo'),
    advanceNoticeHours: toStringValue(availability.advanceNoticeHours),
    available: vehicle.available,
  };
}

function getStepIndex(stepKey: string | null) {
  const index = steps.findIndex((step) => step.key === stepKey);
  return index >= 0 ? index : 0;
}

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return Number(value);
}

function toStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function stringFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : toStringValue(value);
}

function isVehicleType(value: unknown): value is HostVehicleFormValues['vehicleType'] {
  return ['car', 'suv', 'sedan', 'hatchback', 'ev'].includes(String(value));
}

function isFuelType(value: unknown): value is HostVehicleFormValues['fuelType'] {
  return ['petrol', 'diesel', 'electric', 'hybrid'].includes(String(value));
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#0F766E',
  },
  content: {
    gap: 18,
    padding: 16,
    paddingBottom: 28,
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
  },
  resumeText: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  stepHeader: {
    gap: 6,
  },
  stepTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  stepHelper: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    flex: 1,
    gap: 7,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  textArea: {
    minHeight: 112,
    paddingTop: 13,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  segmentButtonActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  segmentText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#0F766E',
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  smallIconButton: {
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  chipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  photoPickerButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  photoPickerText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    padding: 12,
  },
  noticeText: {
    flex: 1,
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  toggleRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  toggleTrack: {
    height: 28,
    width: 48,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    paddingHorizontal: 3,
  },
  toggleTrackActive: {
    backgroundColor: '#0F766E',
  },
  toggleThumb: {
    height: 22,
    width: 22,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  toggleText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  reviewList: {
    gap: 10,
  },
  reviewRow: {
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 13,
  },
  reviewLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reviewValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  errorBox: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  errorBoxText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.62,
  },
});

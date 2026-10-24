import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  Camera,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Palette,
  Plus,
  Search,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, type FieldPath, useForm, useWatch } from 'react-hook-form';

import {
  hostVehicleDefaultValues,
  hostVehicleFormSchema,
  type HostVehicleFormValues,
} from '@/features/host-vehicles/schemas/host-vehicle-form-schema';
import { hostsApi } from '@/services/hosts/hosts-api';
import { locationsApi } from '@/services/locations/locations-api';
import { vehiclesApi } from '@/services/vehicles/vehicles-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import {
  type HostVehicleListing,
  type UpsertHostVehiclePayload,
} from '@/types/car';
import { normalizeApiError } from '@/utils/errors';
import { AddVehicleFooter } from '@/features/host-vehicles/components/add-vehicle-footer';
import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import {
  AddVehicleHeader,
  type DraftSaveStatus,
} from '@/features/host-vehicles/components/add-vehicle-header';
import {
  VehicleSelectionSheet,
  type VehicleSelectionOption,
} from '@/features/host-vehicles/components/vehicle-selection-sheet';
import { type LocationSearchResult } from '@/types/location';

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
    helper: 'Tell us about your vehicle.',
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
    helper: 'Where will renters pick up and return the vehicle?',
    fields: ['locationId', 'address', 'city', 'state', 'country'],
  },
  {
    key: 'features',
    title: 'Features',
    helper: 'Add features that make your vehicle easier to choose.',
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
    helper: 'Keep your vehicle documents ready for verification.',
    fields: ['registrationCertificateNumber', 'insurancePolicyNumber'],
  },
  {
    key: 'pricing',
    title: 'Pricing',
    helper: 'Set the daily price and rental rules.',
    fields: [
      'pricePerDay',
      'securityDeposit',
      'mileageLimitPerDay',
      'minimumRentalDays',
      'maximumRentalDays',
    ],
  },
  {
    key: 'availability',
    title: 'Availability',
    helper: 'Control when the listing can receive bookings.',
    fields: ['availableFrom', 'availableTo', 'advanceNoticeHours'],
  },
  {
    key: 'review',
    title: 'Review and submit',
    helper: 'Confirm the details before sending for approval.',
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

const makeOptions: VehicleSelectionOption[] = [
  { label: 'Hyundai', value: 'Hyundai' },
  { label: 'Maruti Suzuki', value: 'Maruti Suzuki' },
  { label: 'Honda', value: 'Honda' },
  { label: 'Kia', value: 'Kia' },
  { label: 'Tata', value: 'Tata' },
  { label: 'Toyota', value: 'Toyota' },
  { label: 'Mahindra', value: 'Mahindra' },
];

const modelOptionsByMake: Record<string, VehicleSelectionOption[]> = {
  Honda: ['City', 'Amaze', 'Elevate', 'Civic'].map((model) => ({ label: model, value: model })),
  Hyundai: ['Creta', 'Venue', 'i20', 'Verna'].map((model) => ({ label: model, value: model })),
  Kia: ['Seltos', 'Sonet', 'Carens'].map((model) => ({ label: model, value: model })),
  Mahindra: ['XUV 700', 'Scorpio N', 'Thar', 'XUV 3XO'].map((model) => ({ label: model, value: model })),
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Ertiga'].map((model) => ({ label: model, value: model })),
  Tata: ['Nexon', 'Punch', 'Harrier', 'Safari'].map((model) => ({ label: model, value: model })),
  Toyota: ['Innova Hycross', 'Fortuner', 'Urban Cruiser'].map((model) => ({ label: model, value: model })),
};

const yearOptions: VehicleSelectionOption[] = Array.from({ length: 111 }, (_, index) => {
  const year = String(2026 - index);
  return { label: year, value: year };
});

const colourOptions: VehicleSelectionOption[] = [
  'White',
  'Black',
  'Silver',
  'Grey',
  'Red',
  'Blue',
  'Brown',
].map((colour) => ({ label: colour, value: colour }));

const popularFeatures = [
  'Reverse camera',
  'Sunroof',
  'Android Auto',
  'Apple CarPlay',
  'USB charging',
  'Leather seats',
  'Navigation',
  'Parking sensors',
  'Cruise control',
];

const maximumPhotoCount = 10;
const maximumPhotoSizeBytes = 10 * 1024 * 1024;
const minimumPhotoWidth = 480;
const minimumPhotoHeight = 360;
const maximumPhotoDimension = 2560;

export function HostAddVehicleWizardScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const requestedVehicleId = Array.isArray(params.vehicleId)
    ? params.vehicleId[0]
    : params.vehicleId;
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [selectionField, setSelectionField] = useState<
    'make' | 'model' | 'manufacturingYear' | 'colour' | null
  >(null);
  const actionInFlightRef = useRef(false);
  const photoPickerOpenRef = useRef(false);

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
    retry: 1,
    staleTime: 60_000,
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
      setSaveStatus('saved');
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
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (vehicle) => {
      setDraftId(vehicle.id);
      reset(mapListingToFormValues(vehicle));
      queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
      setSaveStatus('saved');
    },
    onError: () => {
      setSaveStatus('failed');
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
      setSubmissionComplete(true);
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async (imageUris: string[]) => {
      if (!draftId) {
        throw new Error('Save vehicle details before uploading photos.');
      }

      let listing: HostVehicleListing | null = null;

      setUploadProgress(0);
      for (const [index, imageUri] of imageUris.entries()) {
        listing = await vehiclesApi.uploadImage(draftId, imageUri, (progress) => {
          setUploadProgress((index + progress) / imageUris.length);
        });
      }

      if (!listing) {
        throw new Error('No photos were selected for upload.');
      }

      setUploadProgress(1);
      return listing;
    },
    onSettled: () => setUploadProgress(null),
  });

  const step = steps[stepIndex];
  const features = watch('features');
  const imageUrls = watch('imageUrls');
  const make = watch('make');
  const selectedValue = selectionField ? String(watch(selectionField) ?? '') : '';
  const baseSelectionOptions = selectionField
    ? selectionField === 'make'
      ? makeOptions
      : selectionField === 'model'
        ? modelOptionsByMake[make] ?? []
        : selectionField === 'manufacturingYear'
          ? yearOptions
          : colourOptions
    : [];
  const selectionOptions =
    selectionField && selectedValue && !baseSelectionOptions.some((option) => option.value === selectedValue)
      ? [{ label: selectedValue, value: selectedValue }, ...baseSelectionOptions]
      : baseSelectionOptions;

  const serverError = useMemo(() => {
    const error =
      saveMutation.error ?? uploadPhotosMutation.error ?? submitMutation.error;
    return error ? normalizeApiError(error) : null;
  }, [saveMutation.error, submitMutation.error, uploadPhotosMutation.error]);

  const addFeature = () => {
    const nextFeature = featureInput.trim();

    if (
      !nextFeature ||
      features.some((feature) => feature.toLocaleLowerCase() === nextFeature.toLocaleLowerCase())
    ) {
      setFeatureInput('');
      return;
    }

    setValue('features', [...features, nextFeature], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setFeatureInput('');
  };

  const togglePopularFeature = (feature: string) => {
    const existingFeature = features.find(
      (item) => item.toLocaleLowerCase() === feature.toLocaleLowerCase(),
    );

    if (existingFeature) {
      removeFeature(existingFeature);
      return;
    }

    setValue('features', [...features, feature], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeFeature = (feature: string) => {
    setValue(
      'features',
      features.filter((item) => item !== feature),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const pickPhotos = async () => {
    if (photoPickerOpenRef.current) {
      return;
    }

    photoPickerOpenRef.current = true;
    const remainingPhotoCount = maximumPhotoCount - imageUrls.length;

    if (remainingPhotoCount <= 0) {
      setPhotoError(`You can add up to ${maximumPhotoCount} photos.`);
      photoPickerOpenRef.current = false;
      return;
    }

    try {
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
        quality: 1,
        selectionLimit: remainingPhotoCount,
      });

      if (result.canceled) {
        return;
      }

      const invalidType = result.assets.some(
        (asset) => asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType),
      );
      const invalidSize = result.assets.some(
        (asset) => asset.fileSize && asset.fileSize > maximumPhotoSizeBytes,
      );
      const invalidDimensions = result.assets.some(
        (asset) =>
          !asset.width ||
          !asset.height ||
          asset.width < minimumPhotoWidth ||
          asset.height < minimumPhotoHeight,
      );

      if (invalidType || invalidSize || invalidDimensions) {
        setPhotoError(
          invalidType
            ? 'Choose JPG, PNG, or WebP images only.'
            : invalidDimensions
              ? `Each photo must be at least ${minimumPhotoWidth} x ${minimumPhotoHeight} pixels.`
              : 'Each photo must be 10 MB or smaller.',
        );
        return;
      }

      const nextImages = await Promise.all(
        result.assets.map(async (asset) => {
          const scale = Math.min(
            1,
            maximumPhotoDimension / Math.max(asset.width, asset.height),
          );
          const width = Math.round(asset.width * scale);
          const height = Math.round(asset.height * scale);
          const compressed = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width, height } }],
            { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
          );

          return compressed.uri;
        }),
      );
      setPhotoError(null);
      setValue('imageUrls', [...imageUrls, ...nextImages].slice(0, maximumPhotoCount), {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch {
      setPhotoError('Could not open your photo library. Please try again.');
    } finally {
      photoPickerOpenRef.current = false;
    }
  };

  const removePhoto = (uri: string) => {
    setPhotoError(null);
    setValue(
      'imageUrls',
      imageUrls.filter((item) => item !== uri),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const setCoverPhoto = (uri: string) => {
    setValue('imageUrls', [uri, ...imageUrls.filter((item) => item !== uri)], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const saveAndContinue = async () => {
    if (actionInFlightRef.current) {
      return;
    }

    actionInFlightRef.current = true;
    setValidationMessage(null);
    setSaveStatus('saving');

    try {
      const valid = step.fields.length ? await trigger(step.fields) : true;

      if (!valid) {
        setSaveStatus('idle');
        return;
      }

      if (step.key === 'review') {
        const allValid = await trigger();

        if (!allValid) {
          let invalidStepIndex = 0;

          for (const [index, candidate] of steps.entries()) {
            if (candidate.key !== 'review' && candidate.fields.length) {
              const stepIsValid = await trigger(candidate.fields);

              if (!stepIsValid) {
                invalidStepIndex = index;
                break;
              }
            }
          }

          setValidationMessage(`Complete ${steps[invalidStepIndex].title} before submitting.`);
          setSaveStatus('idle');
          setStepIndex(invalidStepIndex);
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
      setSaveStatus('failed');
    } finally {
      actionInFlightRef.current = false;
    }
  };

  const retrySave = () => {
    void saveAndContinue();
  };

  const handleInternalBack = useCallback(() => {
    if (actionInFlightRef.current) {
      return true;
    }

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

  const isRestoringDraft = hostVehiclesQuery.isLoading && !resumeChecked;
  const isBusy =
    saveMutation.isPending ||
    uploadPhotosMutation.isPending ||
    submitMutation.isPending;

  if (submissionComplete) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.submissionComplete}>
          <View style={styles.submissionIcon}>
            <Check color="#FFFFFF" size={34} strokeWidth={3} />
          </View>
          <Text style={styles.submissionTitle}>Vehicle submitted for review</Text>
          <Text style={styles.submissionBody}>
            We'll let you know once your listing is approved.
          </Text>
          <Pressable
            accessibilityLabel="View my cars"
            accessibilityRole="button"
            onPress={() => router.replace('/(host)/cars')}
            style={styles.submissionButton}
          >
            <Text style={styles.submissionButtonText}>View my cars</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <AddVehicleHeader
          disabled={isBusy || isRestoringDraft}
          onBack={goBack}
          onRetry={retrySave}
          saveStatus={saveStatus}
          stepNumber={stepIndex + 1}
          totalSteps={steps.length}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
        >
          {isRestoringDraft ? (
            <View style={styles.restoreDraftState}>
              <ActivityIndicator color="#0B6FE8" size="small" />
              <Text style={styles.restoreDraftText}>Restoring your saved draft...</Text>
            </View>
          ) : (
            <View pointerEvents={isBusy ? 'none' : 'auto'} style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepHelper}>{step.helper}</Text>
              </View>

              {step.key === 'vehicleDetails' ? (
                <VehicleDetailsStep
                  control={control}
                  errors={errors}
                  make={make}
                  onOpenSelection={setSelectionField}
                />
              ) : null}
              {step.key === 'vehicleLocation' ? (
                <VehicleLocationStep
                  control={control}
                  errors={errors}
                  setValue={setValue}
                />
              ) : null}
              {step.key === 'features' ? (
                <FeaturesStep
                  error={errors.features?.message}
                  featureInput={featureInput}
                  features={features}
                  onAddFeature={addFeature}
                  onChangeFeatureInput={setFeatureInput}
                  onRemoveFeature={removeFeature}
                  onTogglePopularFeature={togglePopularFeature}
                />
              ) : null}
              {step.key === 'photos' ? (
                <PhotosStep
                  error={photoError ?? errors.imageUrls?.message}
                  imageUrls={imageUrls}
                  isUploading={uploadPhotosMutation.isPending}
                  uploadProgress={uploadProgress}
                  onPickPhotos={pickPhotos}
                  onRemovePhoto={removePhoto}
                  onSetCoverPhoto={setCoverPhoto}
                />
              ) : null}
              {step.key === 'documents' ? (
                <DocumentsStep control={control} errors={errors} />
              ) : null}
              {step.key === 'pricing' ? (
                <PricingStep control={control} errors={errors} />
              ) : null}
              {step.key === 'availability' ? (
                <AvailabilityStep control={control} errors={errors} setValue={setValue} />
              ) : null}
              {step.key === 'review' ? (
                <ReviewStep
                  onEdit={(targetStep) => setStepIndex(targetStep)}
                  values={getValues()}
                />
              ) : null}

              {serverError || validationMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{serverError?.message ?? validationMessage}</Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        <AddVehicleFooter
          busy={isBusy || isRestoringDraft}
          busyLabel={isRestoringDraft ? 'Restoring draft...' : undefined}
          isSubmit={step.key === 'review'}
          onPress={saveAndContinue}
        />
      </KeyboardAvoidingView>
      {selectionField ? (
        <VehicleSelectionSheet
          onClose={() => setSelectionField(null)}
          onSelect={(value) => {
            if (selectionField === 'make') {
              setValue('make', value, { shouldDirty: true, shouldValidate: true });
              setValue('model', '', { shouldDirty: true, shouldValidate: true });
              return;
            }

            setValue(selectionField, value, { shouldDirty: true, shouldValidate: true });
          }}
          options={selectionOptions}
          title={
            selectionField === 'manufacturingYear'
              ? 'Select year'
              : selectionField === 'colour'
                ? 'Select colour'
                : `Select ${selectionField}`
          }
          value={selectedValue}
          visible
        />
      ) : null}
    </SafeAreaView>
  );
}

function VehicleDetailsStep({
  control,
  errors,
  make,
  onOpenSelection,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
  make: string;
  onOpenSelection: (field: 'make' | 'model' | 'manufacturingYear' | 'colour') => void;
}) {
  return (
    <View style={styles.form}>
      <SelectField
        control={control}
        error={errors.make?.message}
        icon={<CarFront color="#536B91" size={18} />}
        label="Make"
        name="make"
        onPress={() => onOpenSelection('make')}
        placeholder="Select make"
      />
      <SelectField
        control={control}
        disabled={!make}
        error={errors.model?.message}
        icon={<CarFront color="#536B91" size={18} />}
        label="Model"
        name="model"
        onPress={() => onOpenSelection('model')}
        placeholder={make ? 'Select model' : 'Select make first'}
      />
      <View style={styles.row}>
        <SelectField
          control={control}
          error={errors.manufacturingYear?.message}
          icon={<CalendarDays color="#536B91" size={18} />}
          label="Year"
          name="manufacturingYear"
          onPress={() => onOpenSelection('manufacturingYear')}
          placeholder="Select year"
        />
        <TextField
          control={control}
          error={errors.registrationNumber?.message}
          label="Registration number"
          name="registrationNumber"
          autoCapitalize="characters"
        />
      </View>
      <SegmentField control={control} label="Vehicle type" name="vehicleType" options={vehicleTypes} />
      <SegmentField
        control={control}
        label="Transmission"
        name="transmission"
        options={transmissions}
      />
      <SegmentField control={control} label="Fuel type" name="fuelType" options={fuelTypes} />
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
      <SelectField
        control={control}
        icon={<Palette color="#536B91" size={18} />}
        label="Colour"
        name="colour"
        onPress={() => onOpenSelection('colour')}
        placeholder="Select colour"
      />
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
  setValue,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
  setValue: ReturnType<typeof useForm<HostVehicleFormValues>>['setValue'];
}) {
  return (
    <View style={styles.form}>
      <LocationSearchField
        control={control}
        error={errors.address?.message ?? errors.locationId?.message}
        setValue={setValue}
      />
      <TextField
        control={control}
        editable={false}
        error={errors.city?.message}
        label="City"
        name="city"
      />
      <TextField
        control={control}
        editable={false}
        error={errors.state?.message}
        label="State"
        name="state"
      />
      <TextField
        control={control}
        editable={false}
        error={errors.country?.message}
        label="Country"
        name="country"
      />
      <View style={styles.locationHint}>
        <MapPin color="#0B6FE8" size={17} />
        <Text style={styles.locationHintText}>
          Location helps renters find the pickup point accurately.
        </Text>
      </View>
    </View>
  );
}

function LocationSearchField({
  control,
  error,
  setValue,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
  setValue: ReturnType<typeof useForm<HostVehicleFormValues>>['setValue'];
}) {
  const [focused, setFocused] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    },
    [],
  );

  const clearPendingBlur = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  return (
    <Controller
      control={control}
      name="address"
      render={({ field: { onBlur, onChange, value } }) => (
        <LocationSearchInput
          error={error}
          focused={focused}
          onBlur={() => {
            onBlur();
            // Let a tapped result receive its press event before hiding the list.
            clearPendingBlur();
            blurTimerRef.current = setTimeout(() => setFocused(false), 120);
          }}
          onChangeText={(nextAddress) => {
            onChange(nextAddress);
            setValue('locationId', '', { shouldDirty: true, shouldValidate: false });
          }}
          onFocus={() => {
            clearPendingBlur();
            setFocused(true);
          }}
          onSelect={(location) => {
            clearPendingBlur();
            onChange(location.name);
            setValue('locationId', location.id, { shouldDirty: true, shouldValidate: true });
            setValue('city', location.city, { shouldDirty: true, shouldValidate: true });
            setValue('state', location.state ?? '', { shouldDirty: true, shouldValidate: true });
            setValue('country', location.country, { shouldDirty: true, shouldValidate: true });
            setValue('latitude', String(location.latitude), { shouldDirty: true, shouldValidate: false });
            setValue('longitude', String(location.longitude), { shouldDirty: true, shouldValidate: false });
            setFocused(false);
          }}
          value={typeof value === 'string' ? value : ''}
        />
      )}
    />
  );
}

function LocationSearchInput({
  error,
  focused,
  onBlur,
  onChangeText,
  onFocus,
  onSelect,
  value,
}: {
  error?: string;
  focused: boolean;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onSelect: (location: LocationSearchResult) => void;
  value: string;
}) {
  const query = value.trim();
  const debouncedQuery = useDebouncedValue(query, 250);
  const isDebouncing = query !== debouncedQuery;
  const locationsQuery = useQuery({
    enabled: focused && debouncedQuery.length >= 2,
    queryKey: ['host-vehicle-locations', 'search', debouncedQuery],
    queryFn: () => locationsApi.search(debouncedQuery, 6),
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30_000,
  });
  const locations = locationsQuery.data ?? [];

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Pickup address</Text>
      <View style={[styles.locationSearchBox, error && styles.inputError]}>
        <MapPin color="#536B91" size={18} />
        <TextInput
          accessibilityHint="Search for a city or pickup area, then choose a result."
          accessibilityLabel="Pickup address"
          autoCapitalize="words"
          autoCorrect={false}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder="Search city or pickup area"
          placeholderTextColor="#536B91"
          style={styles.locationSearchInput}
          value={value}
        />
        <Search color="#536B91" size={18} />
      </View>
      {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
      {focused && query.length >= 2 ? (
        <View style={styles.locationResults}>
          {isDebouncing || locationsQuery.isLoading ? (
            <Text style={styles.locationResultStatus}>Searching supported locations...</Text>
          ) : locationsQuery.isError ? (
            <Text style={styles.locationResultStatus}>Could not load locations. Try again.</Text>
          ) : locations.length === 0 ? (
            <Text style={styles.locationResultStatus}>No supported locations found.</Text>
          ) : (
            locations.map((location) => (
              <Pressable
                accessibilityHint="Select this pickup address."
                accessibilityLabel={`${location.name}, ${[location.city, location.state, location.country].filter(Boolean).join(', ')}`}
                accessibilityRole="button"
                key={location.id}
                onPress={() => onSelect(location)}
                style={({ pressed }) => [
                  styles.locationResult,
                  pressed && styles.locationResultPressed,
                ]}
              >
                <MapPin color="#0B6FE8" size={17} />
                <View style={styles.locationResultCopy}>
                  <Text numberOfLines={1} style={styles.locationResultTitle}>
                    {location.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.locationResultMeta}>
                    {[location.city, location.state, location.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

function FeaturesStep({
  error,
  featureInput,
  features,
  onAddFeature,
  onChangeFeatureInput,
  onRemoveFeature,
  onTogglePopularFeature,
}: {
  error?: string;
  featureInput: string;
  features: string[];
  onAddFeature: () => void;
  onChangeFeatureInput: (value: string) => void;
  onRemoveFeature: (feature: string) => void;
  onTogglePopularFeature: (feature: string) => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.inputGroup}>
        <View style={styles.inlineInputRow}>
          <View style={styles.featureSearchInput}>
            <Search color="#536B91" size={18} />
            <TextInput
              accessibilityLabel="Search and add a feature"
              onChangeText={onChangeFeatureInput}
              onSubmitEditing={onAddFeature}
              placeholder="Search and add a feature"
              placeholderTextColor="#536B91"
              returnKeyType="done"
              style={styles.featureSearchTextInput}
              value={featureInput}
            />
          </View>
          <Pressable
            accessibilityLabel="Add feature"
            accessibilityRole="button"
            onPress={onAddFeature}
            style={styles.smallIconButton}
          >
            <Plus color="#FFFFFF" size={18} />
          </Pressable>
        </View>
        {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
      </View>
      <View style={styles.featureSection}>
        <Text style={styles.featureSectionTitle}>Added features</Text>
        {features.length ? (
          <View style={styles.chipGrid}>
            {features.map((feature) => (
              <Pressable
                accessibilityLabel={`Remove ${feature}`}
                accessibilityRole="button"
                key={feature}
                onPress={() => onRemoveFeature(feature)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{feature}</Text>
                <Trash2 color="#536B91" size={14} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.featureEmptyText}>Select features renters will value.</Text>
        )}
      </View>
      <View style={styles.featureSection}>
        <Text style={styles.featureSectionTitle}>Popular features</Text>
        <View style={styles.chipGrid}>
          {popularFeatures.map((feature) => {
            const isSelected = features.some(
              (item) => item.toLocaleLowerCase() === feature.toLocaleLowerCase(),
            );

            return (
              <Pressable
                accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${feature}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={feature}
                onPress={() => onTogglePopularFeature(feature)}
                style={[styles.popularChip, isSelected && styles.popularChipSelected]}
              >
                <Text style={[styles.popularChipText, isSelected && styles.popularChipTextSelected]}>
                  {feature}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function PhotosStep({
  error,
  imageUrls,
  isUploading,
  uploadProgress,
  onPickPhotos,
  onRemovePhoto,
  onSetCoverPhoto,
}: {
  error?: string;
  imageUrls: string[];
  isUploading: boolean;
  uploadProgress: number | null;
  onPickPhotos: () => void;
  onRemovePhoto: (uri: string) => void;
  onSetCoverPhoto: (uri: string) => void;
}) {
  return (
    <View style={styles.form}>
      {imageUrls.length === 0 ? (
        <Pressable
          accessibilityHint="Opens your photo library to choose up to 10 vehicle photos."
          accessibilityLabel="Choose vehicle photos"
          accessibilityRole="button"
          accessibilityState={{ busy: isUploading, disabled: isUploading }}
          disabled={isUploading}
          onPress={onPickPhotos}
          style={({ pressed }) => [
            styles.photoPickerButton,
            pressed && !isUploading && styles.photoPickerButtonPressed,
          ]}
        >
          <Camera color="#0B6FE8" size={30} />
          <Text style={styles.photoPickerText}>Choose photos</Text>
          <Text style={styles.photoPickerSubtext}>Add up to 10 photos</Text>
          <Text style={styles.photoPickerSubtext}>JPG, PNG, or WebP • Max 10 MB each</Text>
        </Pressable>
      ) : null}
      {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
      {isUploading ? (
        <View style={styles.photoUploadStatus}>
          <ActivityIndicator color="#0B6FE8" size="small" />
          <Text style={styles.photoUploadStatusText}>
            Uploading photos{uploadProgress === null ? '...' : ` ${Math.round(uploadProgress * 100)}%`}
          </Text>
        </View>
      ) : null}
      {imageUrls.length ? <Text style={styles.photoCount}>Photos ({imageUrls.length}/10)</Text> : null}
      {imageUrls.length ? (
        <View style={styles.photoGrid}>
          {imageUrls.map((uri) => {
            const imageUrl = getVehicleImageVariantUrl(uri, 'detail') ?? uri;

            return (
            <View key={uri} style={styles.photoTile}>
            <CachedVehicleImage
              accessibilityLabel="Vehicle photo"
              style={styles.photo}
              uri={imageUrl}
            />
            {imageUrls[0] === uri ? (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Set as cover photo"
                accessibilityRole="button"
                onPress={() => onSetCoverPhoto(uri)}
                style={styles.setCoverButton}
              >
                <Text style={styles.setCoverButtonText}>Set cover</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Remove photo"
              accessibilityRole="button"
              onPress={() => onRemovePhoto(uri)}
              style={styles.photoRemoveButton}
            >
              <Trash2 color="#FFFFFF" size={15} />
            </Pressable>
            </View>
            );
          })}
          {imageUrls.length < maximumPhotoCount ? (
            <Pressable
            accessibilityLabel="Add more photos"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={onPickPhotos}
            style={({ pressed }) => [
              styles.addMorePhotoTile,
              pressed && !isUploading && styles.addMorePhotoTilePressed,
            ]}
          >
            <Plus color="#0B6FE8" size={30} />
            <Text style={styles.addMorePhotoText}>Add more</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
      <View style={styles.documentNotice}>
        <FileText color="#0B6FE8" size={18} />
        <Text style={styles.documentNoticeText}>
          Document uploads can be connected later; references are saved with the draft now.
        </Text>
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
        label="Insurance policy number"
        name="insurancePolicyNumber"
      />
      <TextField
        control={control}
        label="Pollution certificate / PUC"
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
      <CurrencyField
        control={control}
        error={errors.pricePerDay?.message}
        label="Price per day"
        name="pricePerDay"
      />
      <CurrencyField
        control={control}
        error={errors.securityDeposit?.message}
        label="Security deposit"
        name="securityDeposit"
        placeholder="Optional"
      />
      <TextField
        control={control}
        error={errors.mileageLimitPerDay?.message}
        keyboardType="number-pad"
        label="Mileage limit per day"
        name="mileageLimitPerDay"
        placeholder="Optional"
        suffix="km"
      />
      <View style={styles.row}>
        <TextField
          control={control}
          error={errors.minimumRentalDays?.message}
          keyboardType="number-pad"
          label="Min days"
          name="minimumRentalDays"
          suffix="days"
        />
        <TextField
          control={control}
          error={errors.maximumRentalDays?.message}
          keyboardType="number-pad"
          label="Max days"
          name="maximumRentalDays"
          placeholder="Optional"
          suffix="days"
        />
      </View>
    </View>
  );
}

function AvailabilityStep({
  control,
  errors,
  setValue,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
  setValue: ReturnType<typeof useForm<HostVehicleFormValues>>['setValue'];
}) {
  const [pickerField, setPickerField] = useState<'availableFrom' | 'availableTo' | null>(null);
  const availableFrom = useWatch({ control, name: 'availableFrom' });
  const availableTo = useWatch({ control, name: 'availableTo' });
  const pickerValue = pickerField === 'availableTo' ? availableTo : availableFrom;

  const setDateValue = (date: Date) => {
    if (!pickerField) {
      return;
    }

    const nextValue = toDateInputValue(date);
    setValue(pickerField, nextValue, { shouldDirty: true, shouldValidate: true });

    if (
      pickerField === 'availableFrom' &&
      availableTo &&
      parseDateInput(availableTo).getTime() < date.getTime()
    ) {
      setValue('availableTo', '', { shouldDirty: true, shouldValidate: true });
    }

    setPickerField(null);
  };

  return (
    <View style={styles.form}>
      <DateField
        control={control}
        error={errors.availableFrom?.message}
        label="Available from"
        name="availableFrom"
        onPress={() => setPickerField('availableFrom')}
      />
      <DateField
        control={control}
        error={errors.availableTo?.message}
        label="Available until"
        name="availableTo"
        onPress={() => setPickerField('availableTo')}
        optional
      />
      <AdvanceNoticeField
        control={control}
        error={errors.advanceNoticeHours?.message}
      />
      <Controller
        control={control}
        name="available"
        render={({ field: { onChange, value } }) => (
          <Pressable
            accessibilityHint="Enables or disables manual approval for new booking requests."
            accessibilityLabel="Accept booking requests after approval"
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            onPress={() => onChange(!value)}
            style={styles.toggleRow}
          >
            <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
            </View>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleText}>Accept booking requests after approval</Text>
              <Text style={styles.toggleHelper}>
                Manually review and approve each booking request.
              </Text>
            </View>
          </Pressable>
        )}
      />
      {pickerField ? (
        <NativeDatePicker
          minimumDate={
            pickerField === 'availableTo' && availableFrom
              ? parseDateInput(availableFrom)
              : new Date()
          }
          onClose={() => setPickerField(null)}
          onSelect={setDateValue}
          value={pickerValue ? parseDateInput(pickerValue) : new Date()}
        />
      ) : null}
    </View>
  );
}

function DateField({
  control,
  error,
  label,
  name,
  onPress,
  optional = false,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
  label: string;
  name: 'availableFrom' | 'availableTo';
  onPress: () => void;
  optional?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const dateValue = typeof value === 'string' ? value : '';

        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{optional ? `${label} - Optional` : label}</Text>
            <View style={styles.dateFieldRow}>
              <Pressable
                accessibilityLabel={`${label}, ${dateValue ? formatListingDate(dateValue) : 'Select date'}`}
                accessibilityRole="button"
                onPress={onPress}
                style={[styles.dateField, error && styles.inputError]}
              >
                <CalendarDays color="#536B91" size={18} />
                <Text style={[styles.dateFieldText, !dateValue && styles.placeholderText]}>
                  {dateValue ? formatListingDate(dateValue) : 'Select date'}
                </Text>
                <ChevronRight color="#536B91" size={18} />
              </Pressable>
              {optional && dateValue ? (
                <Pressable
                  accessibilityLabel="Clear available until date"
                  accessibilityRole="button"
                  onPress={() => onChange('')}
                  style={styles.clearDateButton}
                >
                  <Text style={styles.clearDateText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
          </View>
        );
      }}
    />
  );
}

function AdvanceNoticeField({
  control,
  error,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
}) {
  const options = ['6', '12', '24', '48'];

  return (
    <Controller
      control={control}
      name="advanceNoticeHours"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Advance notice</Text>
          <View accessibilityLabel="Advance notice" accessibilityRole="radiogroup" style={styles.advanceNoticeOptions}>
            {options.map((option) => {
              const selected = value === option;

              return (
                <Pressable
                  accessibilityLabel={`${option} hours`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => onChange(option)}
                  style={[styles.advanceNoticeOption, selected && styles.advanceNoticeOptionSelected]}
                >
                  <Text style={[styles.advanceNoticeOptionText, selected && styles.advanceNoticeOptionTextSelected]}>
                    {option} hours
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
        </View>
      )}
    />
  );
}

function NativeDatePicker({
  minimumDate,
  onClose,
  onSelect,
  value,
}: {
  minimumDate?: Date;
  onClose: () => void;
  onSelect: (value: Date) => void;
  value: Date;
}) {
  const [selectedDate, setSelectedDate] = useState(value);
  useWebBackGuard({ active: true, onBack: onClose });

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        minimumDate={minimumDate}
        mode="date"
        onChange={(event, date) => {
          if (event.type === 'set' && date) {
            onSelect(date);
            return;
          }

          onClose();
        }}
        value={value}
      />
    );
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.datePickerOverlay}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView accessibilityLabel="Select date" accessibilityViewIsModal edges={['bottom']} style={styles.datePickerSheet}>
          <View style={styles.datePickerHandle} />
          <View style={styles.datePickerHeader}>
            <Text accessibilityRole="header" style={styles.datePickerTitle}>Select date</Text>
            <Pressable accessibilityLabel="Confirm selected date" accessibilityRole="button" onPress={() => onSelect(selectedDate)}>
              <Text style={styles.datePickerDone}>Done</Text>
            </Pressable>
          </View>
          {Platform.OS === 'web' ? (
            <WebDateCalendar
              minimumDate={minimumDate}
              onChange={setSelectedDate}
              value={selectedDate}
            />
          ) : (
            <DateTimePicker
              display="spinner"
              minimumDate={minimumDate}
              mode="date"
              onChange={(_event, date) => date && setSelectedDate(date)}
              value={selectedDate}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function WebDateCalendar({
  minimumDate,
  onChange,
  value,
}: {
  minimumDate?: Date;
  onChange: (value: Date) => void;
  value: Date;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(value));
  const minimumDay = minimumDate ? getStartOfDay(minimumDate) : undefined;

  useEffect(() => {
    setVisibleMonth(getMonthStart(value));
  }, [value]);

  const calendarDays = getCalendarDays(visibleMonth);
  const previousMonth = addMonths(visibleMonth, -1);
  const previousMonthIsBeforeMinimum =
    minimumDay !== undefined && getMonthEnd(previousMonth).getTime() < minimumDay.getTime();

  return (
    <View style={styles.webDateCalendar}>
      <View style={styles.webDateCalendarNavigation}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          accessibilityState={{ disabled: previousMonthIsBeforeMinimum }}
          disabled={previousMonthIsBeforeMinimum}
          onPress={() => setVisibleMonth(previousMonth)}
          style={({ pressed }) => [
            styles.webDateCalendarNavigationButton,
            previousMonthIsBeforeMinimum && styles.webDateCalendarNavigationButtonDisabled,
            pressed && !previousMonthIsBeforeMinimum && styles.webDateCalendarNavigationButtonPressed,
          ]}
        >
          <ChevronLeft color="#102550" size={20} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.webDateCalendarMonth}>
          {formatCalendarMonth(visibleMonth)}
        </Text>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
          style={({ pressed }) => [
            styles.webDateCalendarNavigationButton,
            pressed && styles.webDateCalendarNavigationButtonPressed,
          ]}
        >
          <ChevronRight color="#102550" size={20} />
        </Pressable>
      </View>
      <View style={styles.webDateCalendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
          <View key={weekday} style={styles.webDateCalendarCell}>
            <Text style={styles.webDateCalendarWeekday}>{weekday}</Text>
          </View>
        ))}
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.webDateCalendarCell} />;
          }

          const dateAtStartOfDay = getStartOfDay(date);
          const disabled = minimumDay !== undefined && dateAtStartOfDay.getTime() < minimumDay.getTime();
          const selected = isSameCalendarDay(dateAtStartOfDay, value);

          return (
            <View key={toDateInputValue(dateAtStartOfDay)} style={styles.webDateCalendarCell}>
              <Pressable
                accessibilityHint={disabled ? 'This date is unavailable' : 'Select this date'}
                accessibilityLabel={formatCalendarDate(dateAtStartOfDay)}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                onPress={() => onChange(dateAtStartOfDay)}
                style={({ pressed }) => [
                  styles.webDateCalendarDay,
                  selected && styles.webDateCalendarDaySelected,
                  disabled && styles.webDateCalendarDayDisabled,
                  pressed && !disabled && styles.webDateCalendarDayPressed,
                ]}
              >
                <Text
                  style={[
                    styles.webDateCalendarDayText,
                    selected && styles.webDateCalendarDayTextSelected,
                    disabled && styles.webDateCalendarDayTextDisabled,
                  ]}
                >
                  {dateAtStartOfDay.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ReviewStep({
  onEdit,
  values,
}: {
  onEdit: (stepIndex: number) => void;
  values: HostVehicleFormValues;
}) {
  const coverImageUrl = getVehicleImageVariantUrl(values.imageUrls[0], 'thumbnail');
  const rows = [
    {
      icon: <MapPin color="#0B6FE8" size={19} />,
      label: 'Location',
      stepIndex: 1,
      value: [values.address, values.city, values.state].filter(Boolean).join(', ') || 'Add pickup location',
    },
    {
      icon: <Plus color="#0B6FE8" size={19} />,
      label: 'Features',
      stepIndex: 2,
      value: values.features.length
        ? `${values.features[0]}${values.features.length > 1 ? ` + ${values.features.length - 1} more` : ''}`
        : 'Add features',
    },
    {
      icon: <Camera color="#0B6FE8" size={19} />,
      label: 'Photos',
      stepIndex: 3,
      value: `${values.imageUrls.length} ${values.imageUrls.length === 1 ? 'photo' : 'photos'} added`,
    },
    {
      icon: <FileText color="#0B6FE8" size={19} />,
      label: 'Documents',
      stepIndex: 4,
      value: getDocumentSummary(values),
    },
    {
      icon: <Text style={styles.reviewCurrencyIcon}>₹</Text>,
      label: 'Price',
      stepIndex: 5,
      value: values.pricePerDay ? `₹${formatIndianCurrency(values.pricePerDay)} / day` : 'Add daily price',
    },
    {
      icon: <CalendarDays color="#0B6FE8" size={19} />,
      label: 'Availability',
      stepIndex: 6,
      value: values.availableFrom ? `From ${formatListingDate(values.availableFrom)}` : 'Set availability',
    },
  ];

  return (
    <View style={styles.reviewList}>
      <View style={styles.reviewVehicleCard}>
        {coverImageUrl ? (
          <CachedVehicleImage
            accessibilityLabel="Vehicle cover photo"
            style={styles.reviewVehicleImage}
            uri={coverImageUrl}
          />
        ) : (
          <View style={styles.reviewVehicleImageFallback}>
            <CarFront color="#0B6FE8" size={28} />
          </View>
        )}
        <View style={styles.reviewVehicleCopy}>
          <Text numberOfLines={1} style={styles.reviewVehicleName}>
            {`${values.make || 'Vehicle'} ${values.model || ''}`.trim()}
          </Text>
          <Text numberOfLines={1} style={styles.reviewVehicleMeta}>
            {[values.manufacturingYear, values.registrationNumber].filter(Boolean).join(' • ') || 'Add vehicle details'}
          </Text>
          <Text numberOfLines={1} style={styles.reviewVehicleSpecs}>
            {[`${values.seats} seats`, values.fuelType, values.transmission].filter(Boolean).join(' • ')}
          </Text>
        </View>
      </View>
      {rows.map((row) => (
        <Pressable
          accessibilityRole="button"
          key={row.label}
          onPress={() => onEdit(row.stepIndex)}
          style={({ pressed }) => [styles.reviewRow, pressed && styles.reviewRowPressed]}
        >
          <View style={styles.reviewRowIcon}>{row.icon}</View>
          <View style={styles.reviewRowCopy}>
            <Text style={styles.reviewLabel}>{row.label}</Text>
            <Text numberOfLines={1} style={styles.reviewValue}>{row.value}</Text>
          </View>
          <ChevronRight color="#536B91" size={19} />
        </Pressable>
      ))}
    </View>
  );
}

function TextField({
  control,
  error,
  label,
  name,
  suffix,
  ...inputProps
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
  label: string;
  name: FieldPath<HostVehicleFormValues>;
  suffix?: string;
} & Omit<React.ComponentProps<typeof TextInput>, 'onChange' | 'value'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value } }) => (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{label}</Text>
          {suffix ? (
            <View
              style={[
                styles.input,
                styles.inputWithSuffix,
                inputProps.editable === false && styles.inputReadOnly,
                error && styles.inputError,
              ]}
            >
              <TextInput
                {...inputProps}
                accessibilityHint={inputProps.placeholder}
                accessibilityLabel={label}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholderTextColor="#536B91"
                style={styles.inputWithSuffixText}
                value={typeof value === 'string' ? value : String(value ?? '')}
              />
              <Text style={styles.inputSuffix}>{suffix}</Text>
            </View>
          ) : (
            <TextInput
              {...inputProps}
              accessibilityHint={inputProps.placeholder}
              accessibilityLabel={label}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholderTextColor="#536B91"
              style={[
                styles.input,
                inputProps.editable === false && styles.inputReadOnly,
                inputProps.multiline && styles.textArea,
                error && styles.inputError,
              ]}
              value={typeof value === 'string' ? value : String(value ?? '')}
            />
          )}
          {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
        </View>
      )}
    />
  );
}

function CurrencyField({
  control,
  error,
  label,
  name,
  placeholder,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
  label: string;
  name: 'pricePerDay' | 'securityDeposit';
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value } }) => {
        const rawValue = typeof value === 'string' ? value : String(value ?? '');
        const displayValue = focused ? rawValue : formatIndianCurrency(rawValue);

        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.input, styles.inputWithSuffix, error && styles.inputError]}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                accessibilityHint={placeholder}
                accessibilityLabel={label}
                keyboardType="decimal-pad"
                onBlur={() => {
                  onBlur();
                  setFocused(false);
                }}
                onChangeText={(nextValue) => onChange(nextValue.replace(/,/g, ''))}
                onFocus={() => setFocused(true)}
                placeholder={placeholder}
                placeholderTextColor="#536B91"
                style={styles.inputWithSuffixText}
                value={displayValue}
              />
            </View>
            {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
          </View>
        );
      }}
    />
  );
}

function SelectField({
  control,
  disabled = false,
  error,
  icon,
  label,
  name,
  onPress,
  placeholder,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  label: string;
  name: FieldPath<HostVehicleFormValues>;
  onPress: () => void;
  placeholder: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value } }) => {
        const displayValue = value === null || value === undefined ? '' : String(value);

        return (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <Pressable
              accessibilityLabel={`${label}, ${displayValue || placeholder}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={onPress}
              style={[styles.selectInput, disabled && styles.selectInputDisabled, error && styles.inputError]}
            >
              {icon ? <View style={styles.selectIcon}>{icon}</View> : null}
              <Text style={[styles.selectText, !displayValue && styles.placeholderText]}>
                {displayValue || placeholder}
              </Text>
              <ChevronRight color="#536B91" size={18} />
            </Pressable>
            {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : null}
          </View>
        );
      }}
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
          <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.segmentWrap}>
            {options.map(([optionValue, optionLabel]) => (
              <Pressable
                accessibilityLabel={optionLabel}
                accessibilityRole="radio"
                accessibilityState={{ selected: value === optionValue }}
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
    advanceNoticeHours: toStringValue(availability.advanceNoticeHours) || '24',
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

function formatIndianCurrency(value: string) {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) {
    return value;
  }

  return Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return new Date();
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getMonthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function getMonthEnd(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function addMonths(value: Date, months: number) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getCalendarDays(month: Date): Array<Date | null> {
  const daysInMonth = getMonthEnd(month).getDate();
  const cellsBeforeMonth = getMonthStart(month).getDay();
  const cellCount = Math.ceil((cellsBeforeMonth + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - cellsBeforeMonth + 1;
    return day > 0 && day <= daysInMonth
      ? new Date(month.getFullYear(), month.getMonth(), day)
      : null;
  });
}

function formatCalendarMonth(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatCalendarDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatListingDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseDateInput(value));
}

function getDocumentSummary(values: HostVehicleFormValues) {
  const documents = [
    values.registrationCertificateNumber && 'RC',
    values.insurancePolicyNumber && 'Insurance',
    values.pollutionCertificateNumber && 'PUC',
  ].filter(Boolean);

  return documents.length ? `${documents.join(', ')} added` : 'Add document references';
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
    backgroundColor: '#F3F9FF',
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  contentScroll: {
    flex: 1,
    minHeight: 0,
  },
  stepHeader: {
    gap: 6,
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    color: '#102550',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  stepHelper: {
    color: '#536B91',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  restoreDraftState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  restoreDraftText: {
    color: '#536B91',
    fontSize: 14,
    fontWeight: '800',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  label: {
    color: '#102550',
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  inputReadOnly: {
    backgroundColor: '#F3F9FF',
    color: '#536B91',
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  inputWithSuffixText: {
    flex: 1,
    minWidth: 0,
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 14,
  },
  inputSuffix: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '800',
  },
  currencyPrefix: {
    color: '#102550',
    fontSize: 18,
    fontWeight: '900',
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
    flexWrap: 'wrap',
    gap: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  segmentButtonActive: {
    borderColor: '#0F9D78',
    backgroundColor: '#E1F7F0',
  },
  segmentText: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#08765B',
  },
  selectInput: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  locationSearchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  locationSearchInput: {
    flex: 1,
    minWidth: 0,
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 13,
  },
  locationResults: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
  },
  locationResult: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8FF',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  locationResultPressed: {
    backgroundColor: '#EAF4FF',
  },
  locationResultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  locationResultTitle: {
    color: '#102550',
    fontSize: 14,
    fontWeight: '900',
  },
  locationResultMeta: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '700',
  },
  locationResultStatus: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '700',
    padding: 14,
  },
  locationHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    padding: 12,
  },
  locationHintText: {
    flex: 1,
    color: '#536B91',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  selectInputDisabled: {
    backgroundColor: '#F3F9FF',
    opacity: 0.78,
  },
  selectIcon: {
    width: 20,
    alignItems: 'center',
  },
  selectText: {
    flex: 1,
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderText: {
    color: '#536B91',
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureSearchInput: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  featureSearchTextInput: {
    flex: 1,
    minWidth: 0,
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 13,
  },
  smallIconButton: {
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#0B6FE8',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureSection: {
    gap: 10,
  },
  featureSectionTitle: {
    color: '#102550',
    fontSize: 14,
    fontWeight: '900',
  },
  featureEmptyText: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  chipText: {
    color: '#102550',
    fontSize: 13,
    fontWeight: '900',
  },
  popularChip: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  popularChipSelected: {
    borderColor: '#0F9D78',
    backgroundColor: '#E1F7F0',
  },
  popularChipText: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '800',
  },
  popularChipTextSelected: {
    color: '#08765B',
  },
  photoPickerButton: {
    minHeight: 154,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D6E8FF',
    backgroundColor: '#F3F9FF',
    padding: 20,
  },
  photoPickerButtonPressed: {
    backgroundColor: '#EAF4FF',
  },
  photoPickerText: {
    color: '#102550',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  photoPickerSubtext: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '700',
  },
  photoUploadStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    padding: 12,
  },
  photoUploadStatusText: {
    color: '#075BC8',
    fontSize: 13,
    fontWeight: '800',
  },
  photoCount: {
    color: '#102550',
    fontSize: 14,
    fontWeight: '900',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '48%',
    aspectRatio: 1.2,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#F3F9FF',
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
    borderRadius: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
  },
  coverBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    borderRadius: 999,
    backgroundColor: '#0B6FE8',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  setCoverButton: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  setCoverButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  addMorePhotoTile: {
    width: '48%',
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#EAF4FF',
  },
  addMorePhotoTilePressed: {
    backgroundColor: '#EAF4FF',
  },
  addMorePhotoText: {
    color: '#0B6FE8',
    fontSize: 13,
    fontWeight: '900',
  },
  documentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    padding: 12,
  },
  documentNoticeText: {
    flex: 1,
    color: '#075BC8',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  dateFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateField: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  dateFieldText: {
    flex: 1,
    color: '#102550',
    fontSize: 15,
    fontWeight: '700',
  },
  clearDateButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAF4FF',
    paddingHorizontal: 11,
  },
  clearDateText: {
    color: '#0B6FE8',
    fontSize: 12,
    fontWeight: '900',
  },
  advanceNoticeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  advanceNoticeOption: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
  },
  advanceNoticeOptionSelected: {
    borderColor: '#0F9D78',
    backgroundColor: '#E1F7F0',
  },
  advanceNoticeOptionText: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '800',
  },
  advanceNoticeOptionTextSelected: {
    color: '#08765B',
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16, 26, 53, 0.32)',
  },
  datePickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingBottom: 18,
  },
  datePickerHandle: {
    alignSelf: 'center',
    height: 4,
    width: 40,
    borderRadius: 999,
    backgroundColor: '#D6E8FF',
    marginTop: 10,
  },
  datePickerHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  datePickerTitle: {
    color: '#102550',
    fontSize: 16,
    fontWeight: '900',
  },
  datePickerDone: {
    color: '#0B6FE8',
    fontSize: 15,
    fontWeight: '900',
  },
  webDateCalendar: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  webDateCalendarNavigation: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webDateCalendarNavigationButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#EAF4FF',
  },
  webDateCalendarNavigationButtonDisabled: {
    opacity: 0.36,
  },
  webDateCalendarNavigationButtonPressed: {
    backgroundColor: '#EAF4FF',
  },
  webDateCalendarMonth: {
    color: '#102550',
    fontSize: 16,
    fontWeight: '900',
  },
  webDateCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  webDateCalendarCell: {
    width: '14.285714%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDateCalendarWeekday: {
    color: '#536B91',
    fontSize: 11,
    fontWeight: '900',
  },
  webDateCalendarDay: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  webDateCalendarDaySelected: {
    backgroundColor: '#0B6FE8',
  },
  webDateCalendarDayDisabled: {
    opacity: 0.36,
  },
  webDateCalendarDayPressed: {
    backgroundColor: '#EAF4FF',
  },
  webDateCalendarDayText: {
    color: '#102550',
    fontSize: 14,
    fontWeight: '800',
  },
  webDateCalendarDayTextSelected: {
    color: '#FFFFFF',
  },
  webDateCalendarDayTextDisabled: {
    color: '#536B91',
  },
  toggleRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  toggleTrack: {
    height: 28,
    width: 48,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#D6E8FF',
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
    color: '#102550',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  toggleHelper: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  reviewList: {
    gap: 10,
  },
  reviewVehicleCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  reviewVehicleImage: {
    height: 78,
    width: 96,
    borderRadius: 10,
    backgroundColor: '#EAF4FF',
  },
  reviewVehicleImageFallback: {
    height: 78,
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAF4FF',
  },
  reviewVehicleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  reviewVehicleName: {
    color: '#102550',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewVehicleMeta: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewVehicleSpecs: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reviewRowPressed: {
    backgroundColor: '#EAF4FF',
  },
  reviewRowIcon: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAF4FF',
  },
  reviewRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  reviewLabel: {
    color: '#102550',
    fontSize: 13,
    fontWeight: '900',
  },
  reviewValue: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  reviewCurrencyIcon: {
    color: '#0B6FE8',
    fontSize: 20,
    fontWeight: '900',
  },
  submissionComplete: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  submissionIcon: {
    height: 76,
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: '#0F9D78',
    marginBottom: 4,
  },
  submissionTitle: {
    color: '#102550',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  submissionBody: {
    color: '#536B91',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  submissionButton: {
    minHeight: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#0B6FE8',
    marginTop: 16,
  },
  submissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
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
});

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
  Circle,
  CircleAlert,
  CircleCheck,
  Clock3,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Palette,
  Plus,
  Search,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
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

type SetupSection =
  | 'details'
  | 'photos'
  | 'location'
  | 'documents'
  | 'pricing'
  | 'availability'
  | 'review';

type VehicleDocumentType = 'rc' | 'insurance' | 'puc';
type VehicleDocumentUrls = Record<VehicleDocumentType, string | null>;

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

const setupSections: Array<{
  key: SetupSection;
  title: string;
  helper: string;
}> = [
  { key: 'details', title: 'Vehicle details', helper: 'Core vehicle information and optional features.' },
  { key: 'photos', title: 'Photos', helper: 'Add clear exterior and interior photos.' },
  { key: 'location', title: 'Pickup location', helper: 'Set the renter pickup address.' },
  { key: 'documents', title: 'Vehicle documents', helper: 'Add RC, insurance and PUC details.' },
  { key: 'pricing', title: 'Pricing', helper: 'Set your daily price and rental rules.' },
  { key: 'availability', title: 'Availability', helper: 'Choose when bookings can be accepted.' },
  { key: 'review', title: 'Review & submit', helper: 'Check each requirement before approval.' },
];

const emptyDocumentUrls: VehicleDocumentUrls = { rc: null, insurance: null, puc: null };

export function HostAddVehicleWizardScreen() {
  const params = useLocalSearchParams<{
    vehicleId?: string | string[];
    section?: string | string[];
  }>();
  const requestedVehicleId = Array.isArray(params.vehicleId) ? params.vehicleId[0] : params.vehicleId;
  const requestedSection = Array.isArray(params.section) ? params.section[0] : params.section;
  const activeSection = isSetupSection(requestedSection) ? requestedSection : null;
  const queryClient = useQueryClient();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [documentUpload, setDocumentUpload] = useState<{ type: VehicleDocumentType; progress: number } | null>(null);
  const [documentUrls, setDocumentUrls] = useState<VehicleDocumentUrls>(emptyDocumentUrls);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [selectionField, setSelectionField] = useState<'make' | 'model' | 'manufacturingYear' | 'colour' | null>(null);
  const actionInFlightRef = useRef(false);
  const photoPickerOpenRef = useRef(false);

  const form = useForm<HostVehicleFormValues>({
    defaultValues: hostVehicleDefaultValues,
    resolver: zodResolver(hostVehicleFormSchema),
    mode: 'onTouched',
  });
  const { control, formState: { errors }, getValues, reset, setValue, trigger, watch } = form;

  const hostVehiclesQuery = useQuery({
    queryKey: ['host', 'vehicles'],
    queryFn: hostsApi.listVehicles,
    retry: 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (resumeChecked || hostVehiclesQuery.isLoading) {
      return;
    }

    const draft = requestedVehicleId
      ? hostVehiclesQuery.data?.find((vehicle) => vehicle.id === requestedVehicleId)
      : hostVehiclesQuery.data?.find((vehicle) => ['DRAFT', 'CHANGES_REQUIRED'].includes(vehicle.status));

    if (draft) {
      setDraftId(draft.id);
      reset(mapListingToFormValues(draft));
      setDocumentUrls(getVehicleDocumentUrls(draft.listingDocuments));
    }

    setResumeChecked(true);
  }, [hostVehiclesQuery.data, hostVehiclesQuery.isLoading, requestedVehicleId, reset, resumeChecked]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertHostVehiclePayload) =>
      draftId ? vehiclesApi.updateDraft(draftId, payload) : vehiclesApi.createDraft(payload),
    onSuccess: (vehicle) => {
      setDraftId(vehicle.id);
      reset(mapListingToFormValues(vehicle));
      queryClient.setQueryData<HostVehicleListing[]>(['host', 'vehicles'], (current = []) => {
        const existingIndex = current.findIndex((listing) => listing.id === vehicle.id);

        if (existingIndex < 0) {
          return [vehicle, ...current];
        }

        return current.map((listing) => (listing.id === vehicle.id ? vehicle : listing));
      });
      queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!draftId) {
        throw new Error('Complete vehicle setup before submitting.');
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
        throw new Error('Complete the vehicle basics before uploading photos.');
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

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ imageUri, type }: { imageUri: string; type: VehicleDocumentType }) => {
      if (!draftId) {
        throw new Error('Complete the vehicle basics before uploading documents.');
      }
      return vehiclesApi.uploadDocument(draftId, type, imageUri, (progress) => {
        setDocumentUpload({ type, progress });
      });
    },
    onMutate: ({ type }) => setDocumentUpload({ type, progress: 0 }),
    onSuccess: (listing) => {
      reset(mapListingToFormValues(listing));
      setDocumentUrls(getVehicleDocumentUrls(listing.listingDocuments));
      queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
    },
    onSettled: () => setDocumentUpload(null),
  });

  const features = watch('features');
  const imageUrls = watch('imageUrls');
  const make = watch('make');
  const selectedValue = selectionField ? String(watch(selectionField) ?? '') : '';
  const baseSelectionOptions = selectionField === 'make'
    ? makeOptions
    : selectionField === 'model'
      ? modelOptionsByMake[make] ?? []
      : selectionField === 'manufacturingYear'
        ? yearOptions
        : selectionField === 'colour'
          ? colourOptions
          : [];
  const selectionOptions = selectedValue && !baseSelectionOptions.some((option) => option.value === selectedValue)
    ? [{ label: selectedValue, value: selectedValue }, ...baseSelectionOptions]
    : baseSelectionOptions;
  const values = getValues();
  const setupProgress = getSetupProgress(values, documentUrls);
  const isRestoringDraft = hostVehiclesQuery.isLoading && !resumeChecked;
  const isBusy = saveMutation.isPending || uploadPhotosMutation.isPending || uploadDocumentMutation.isPending || submitMutation.isPending;
  const serverError = useMemo(() => {
    const error = saveMutation.error ?? uploadPhotosMutation.error ?? uploadDocumentMutation.error ?? submitMutation.error;
    return error ? normalizeApiError(error) : null;
  }, [saveMutation.error, submitMutation.error, uploadDocumentMutation.error, uploadPhotosMutation.error]);

  const goToChecklist = () => {
    if (draftId) {
      router.replace({ pathname: '/(host)/vehicles/new', params: { vehicleId: draftId } });
    }
  };
  const goToSection = (section: SetupSection) => {
    if (draftId) {
      router.push({ pathname: '/(host)/vehicles/new', params: { vehicleId: draftId, section } });
    }
  };
  const goBack = useSafeBack({
    fallback: '/(host)/cars',
    onBeforeBack: () => {
      if (activeSection && draftId) {
        goToChecklist();
        return true;
      }
      return false;
    },
  });
  useWebBackGuard({ active: Boolean(activeSection), onBack: goBack });

  const addFeature = () => {
    const nextFeature = featureInput.trim();
    if (!nextFeature || features.some((feature) => feature.toLocaleLowerCase() === nextFeature.toLocaleLowerCase())) {
      setFeatureInput('');
      return;
    }
    setValue('features', [...features, nextFeature], { shouldDirty: true, shouldValidate: false });
    setFeatureInput('');
  };
  const removeFeature = (feature: string) => {
    setValue('features', features.filter((item) => item !== feature), { shouldDirty: true, shouldValidate: false });
  };
  const togglePopularFeature = (feature: string) => {
    const existing = features.find((item) => item.toLocaleLowerCase() === feature.toLocaleLowerCase());
    if (existing) {
      removeFeature(existing);
      return;
    }
    setValue('features', [...features, feature], { shouldDirty: true, shouldValidate: false });
  };

  const addPhotoAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const invalidType = assets.some((asset) => asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType));
    const invalidSize = assets.some((asset) => asset.fileSize && asset.fileSize > maximumPhotoSizeBytes);
    const invalidDimensions = assets.some((asset) => !asset.width || !asset.height || asset.width < minimumPhotoWidth || asset.height < minimumPhotoHeight);
    if (invalidType || invalidSize || invalidDimensions) {
      setPhotoError(invalidType ? 'Choose JPG, PNG, or WebP images only.' : invalidDimensions ? `Each photo must be at least ${minimumPhotoWidth} x ${minimumPhotoHeight} pixels.` : 'Each photo must be 10 MB or smaller.');
      return;
    }
    const nextImages = await Promise.all(assets.map(async (asset) => {
      const scale = Math.min(1, maximumPhotoDimension / Math.max(asset.width, asset.height));
      return ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
    }));
    setPhotoError(null);
    setValue('imageUrls', [...imageUrls, ...nextImages.map((image) => image.uri)].slice(0, maximumPhotoCount), { shouldDirty: true, shouldValidate: false });
  };
  const pickPhotos = async (source: 'camera' | 'library') => {
    if (photoPickerOpenRef.current) return;
    photoPickerOpenRef.current = true;
    try {
      const remaining = maximumPhotoCount - imageUrls.length;
      if (remaining <= 0) {
        setPhotoError(`You can add up to ${maximumPhotoCount} photos.`);
        return;
      }
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(source === 'camera' ? 'Camera access required' : 'Photo access required', 'Allow access in device settings to add vehicle photos.');
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ['images'], quality: 1, selectionLimit: remaining });
      if (!result.canceled) await addPhotoAssets(result.assets);
    } catch {
      setPhotoError('Could not add your photos. Please try again.');
    } finally {
      photoPickerOpenRef.current = false;
    }
  };
  const removePhoto = (uri: string) => {
    setPhotoError(null);
    setValue('imageUrls', imageUrls.filter((item) => item !== uri), { shouldDirty: true, shouldValidate: false });
  };
  const setCoverPhoto = (uri: string) => {
    setValue('imageUrls', [uri, ...imageUrls.filter((item) => item !== uri)], { shouldDirty: true, shouldValidate: false });
  };
  const movePhoto = (uri: string, direction: 'earlier' | 'later') => {
    const currentIndex = imageUrls.indexOf(uri);
    const targetIndex = direction === 'earlier' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= imageUrls.length) {
      return;
    }
    const nextImages = [...imageUrls];
    [nextImages[currentIndex], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[currentIndex]];
    setValue('imageUrls', nextImages, { shouldDirty: true, shouldValidate: false });
  };

  const pickVehicleDocument = (type: VehicleDocumentType, source: 'camera' | 'library') => {
    const selectDocument = async () => {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Access required', 'Allow access in device settings to add this document image.');
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, selectionLimit: 1 });
      if (!result.canceled) {
        await uploadDocumentMutation.mutateAsync({ type, imageUri: result.assets[0].uri });
      }
    };
    void selectDocument().catch(() => undefined);
  };

  const createDraft = async () => {
    if (actionInFlightRef.current) {
      return;
    }
    actionInFlightRef.current = true;
    const valid = await trigger(['make', 'model', 'manufacturingYear', 'registrationNumber']);
    if (!valid) {
      actionInFlightRef.current = false;
      return;
    }
    try {
      const vehicle = await saveMutation.mutateAsync(buildStepPayload('vehicleDetails', getValues(), 'setup'));
      router.replace({ pathname: '/(host)/vehicles/new', params: { vehicleId: vehicle.id } });
    } catch {
      // The mutation state renders the API error.
    } finally {
      actionInFlightRef.current = false;
    }
  };

  const saveSection = async () => {
    if (!activeSection || !draftId || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setValidationMessage(null);
    try {
      if (activeSection === 'review') {
        const incomplete = setupSections.filter((section) => section.key !== 'review' && getSetupStatus(section.key, getValues(), documentUrls) !== 'completed');
        if (incomplete.length) {
          setValidationMessage(`Complete ${incomplete[0].title.toLowerCase()} before submitting.`);
          return;
        }
        await submitMutation.mutateAsync();
        return;
      }

      const fields = getSectionFields(activeSection);
      const valid = fields.length ? await trigger(fields) : true;
      if (!valid) return;
      let nextValues = getValues();
      if (activeSection === 'photos') {
        const localUris = nextValues.imageUrls.filter((uri) => !/^https?:\/\//i.test(uri) && !uri.startsWith('/uploads/'));
        if (localUris.length) {
          const listing = await uploadPhotosMutation.mutateAsync(localUris);
          nextValues = { ...nextValues, imageUrls: listing.imageUrls };
          setValue('imageUrls', listing.imageUrls, { shouldDirty: false, shouldValidate: false });
        }
      }
      await saveMutation.mutateAsync(buildSectionPayload(activeSection, nextValues));
      goToChecklist();
    } catch {
      // The mutation state renders the API error.
    } finally {
      actionInFlightRef.current = false;
    }
  };

  if (submissionComplete) {
    return <SubmissionComplete />;
  }

  const sectionDefinition = activeSection ? setupSections.find((section) => section.key === activeSection) : null;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <VehicleSetupHeader
          onBack={goBack}
          title={activeSection ? sectionDefinition?.title ?? 'Vehicle setup' : draftId ? 'Vehicle setup' : 'Add vehicle'}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {isRestoringDraft ? (
            <View style={styles.restoreDraftState}><ActivityIndicator color="#0B6FE8" size="small" /><Text style={styles.restoreDraftText}>Loading your vehicle setup...</Text></View>
          ) : !draftId ? (
            <QuickVehicleSetup control={control} errors={errors} make={make} onOpenSelection={setSelectionField} />
          ) : !activeSection ? (
            <VehicleSetupChecklist documentUrls={documentUrls} onOpenSection={goToSection} progress={setupProgress} values={values} />
          ) : (
            <View pointerEvents={isBusy ? 'none' : 'auto'} style={styles.stepContent}>
              <View style={styles.stepHeader}><Text style={styles.stepTitle}>{sectionDefinition?.title}</Text><Text style={styles.stepHelper}>{sectionDefinition?.helper}</Text></View>
              {activeSection === 'details' ? <><VehicleDetailsStep control={control} errors={errors} make={make} onOpenSelection={setSelectionField} optionalDescription /><ExpandableVehicleExtras control={control} error={errors.features?.message} featureInput={featureInput} features={features} onAddFeature={addFeature} onChangeFeatureInput={setFeatureInput} onRemoveFeature={removeFeature} onTogglePopularFeature={togglePopularFeature} /></> : null}
              {activeSection === 'location' ? <VehicleLocationStep control={control} errors={errors} setValue={setValue} /> : null}
              {activeSection === 'photos' ? <PhotosStep error={photoError ?? errors.imageUrls?.message} imageUrls={imageUrls} isUploading={uploadPhotosMutation.isPending} uploadProgress={uploadProgress} onMovePhoto={movePhoto} onPickPhotos={pickPhotos} onRemovePhoto={removePhoto} onSetCoverPhoto={setCoverPhoto} /> : null}
              {activeSection === 'documents' ? <DocumentsStep control={control} documentUpload={documentUpload} documentUrls={documentUrls} errors={errors} onPickDocument={pickVehicleDocument} /> : null}
              {activeSection === 'pricing' ? <PricingStep control={control} errors={errors} /> : null}
              {activeSection === 'availability' ? <AvailabilityStep control={control} errors={errors} setValue={setValue} /> : null}
              {activeSection === 'review' ? <ReviewStep onEdit={goToSection} values={getValues()} /> : null}
              {serverError || validationMessage ? <View style={styles.errorBox}><Text style={styles.errorBoxText}>{serverError?.message ?? validationMessage}</Text></View> : null}
            </View>
          )}
        </ScrollView>
        {!isRestoringDraft && (!draftId || activeSection) ? <VehicleSetupFooter busy={isBusy} label={!draftId ? 'Continue' : activeSection === 'review' ? 'Submit for review' : 'Save changes'} onPress={!draftId ? createDraft : saveSection} /> : null}
      </KeyboardAvoidingView>
      {selectionField ? <VehicleSelectionSheet onClose={() => setSelectionField(null)} onSelect={(value) => { if (selectionField === 'make') { setValue('make', value, { shouldDirty: true, shouldValidate: true }); setValue('model', '', { shouldDirty: true, shouldValidate: false }); } else { setValue(selectionField, value, { shouldDirty: true, shouldValidate: true }); } }} options={selectionOptions} title={selectionField === 'manufacturingYear' ? 'Select year' : selectionField === 'colour' ? 'Select colour' : `Select ${selectionField}`} value={selectedValue} visible /> : null}
    </SafeAreaView>
  );
}

function isSetupSection(value: string | undefined): value is SetupSection {
  return Boolean(value && setupSections.some((section) => section.key === value));
}

function getSectionFields(section: SetupSection): FieldPath<HostVehicleFormValues>[] {
  switch (section) {
    case 'details':
      return ['make', 'model', 'manufacturingYear', 'registrationNumber', 'vehicleType', 'transmission', 'fuelType', 'seats', 'doors'];
    case 'photos':
      return ['imageUrls'];
    case 'location':
      return ['locationId', 'address', 'city', 'state', 'country'];
    case 'documents':
      return ['registrationCertificateNumber', 'insurancePolicyNumber'];
    case 'pricing':
      return ['pricePerDay', 'securityDeposit', 'mileageLimitPerDay', 'minimumRentalDays', 'maximumRentalDays'];
    case 'availability':
      return ['availableFrom', 'availableTo', 'advanceNoticeHours'];
    default:
      return [];
  }
}

function buildSectionPayload(section: SetupSection, values: HostVehicleFormValues): UpsertHostVehiclePayload {
  if (section === 'details') {
    return {
      ...buildStepPayload('vehicleDetails', values, 'setup'),
      features: values.features,
      draftStep: 'details',
    };
  }
  const stepBySection: Partial<Record<SetupSection, StepKey>> = {
    photos: 'photos',
    location: 'vehicleLocation',
    documents: 'documents',
    pricing: 'pricing',
    availability: 'availability',
  };
  const step = stepBySection[section];
  return step ? buildStepPayload(step, values, section) : { draftStep: section };
}

function getSetupStatus(
  section: Exclude<SetupSection, 'review'>,
  values: HostVehicleFormValues,
  documentUrls: VehicleDocumentUrls = emptyDocumentUrls,
) {
  const hasDetails = Boolean(values.make && values.model && values.manufacturingYear && values.registrationNumber);
  const checks: Record<Exclude<SetupSection, 'review'>, { complete: boolean; started: boolean }> = {
    details: {
      complete: hasDetails,
      started: hasDetails,
    },
    photos: { complete: values.imageUrls.length > 0, started: values.imageUrls.length > 0 },
    location: {
      complete: Boolean(values.locationId && values.address && values.city && values.state && values.country),
      started: Boolean(values.address || values.city),
    },
    documents: {
      complete: Boolean(
        values.registrationCertificateNumber &&
          values.insurancePolicyNumber &&
          Boolean(documentUrls.rc && documentUrls.insurance),
      ),
      started: Boolean(values.registrationCertificateNumber || values.insurancePolicyNumber || values.pollutionCertificateNumber || documentUrls.rc || documentUrls.insurance || documentUrls.puc),
    },
    pricing: {
      complete: Boolean(values.pricePerDay && values.minimumRentalDays),
      started: Boolean(values.pricePerDay || values.securityDeposit || values.mileageLimitPerDay),
    },
    availability: {
      complete: Boolean(values.availableFrom),
      started: Boolean(values.availableFrom || values.availableTo),
    },
  };
  const check = checks[section];
  return check.complete ? 'completed' : check.started ? 'in_progress' : 'not_started';
}

function getSetupProgress(values: HostVehicleFormValues, documentUrls: VehicleDocumentUrls = emptyDocumentUrls) {
  const sections = setupSections.filter((section): section is typeof section & { key: Exclude<SetupSection, 'review'> } => section.key !== 'review');
  const completed = sections.filter((section) => getSetupStatus(section.key, values, documentUrls) === 'completed').length;
  return { completed, total: sections.length };
}

function VehicleSetupHeader({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={styles.setupHeader}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.setupBackButton}>
        <ChevronLeft color="#102550" size={24} />
      </Pressable>
      <View style={styles.setupHeaderCopy}>
        <Text accessibilityRole="header" style={styles.setupHeaderTitle}>{title}</Text>
      </View>
    </View>
  );
}

function VehicleSetupFooter({ busy, label, onPress }: { busy: boolean; label: string; onPress: () => void }) {
  return (
    <View style={styles.setupFooter}>
      <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress} style={[styles.setupPrimaryButton, busy && styles.setupPrimaryButtonDisabled]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.setupPrimaryButtonText}>{label}</Text><ChevronRight color="#FFFFFF" size={20} /></>}
      </Pressable>
    </View>
  );
}

function QuickVehicleSetup({
  control,
  errors,
  make,
  onOpenSelection,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
  make: string;
  onOpenSelection: (field: 'make' | 'model' | 'manufacturingYear') => void;
}) {
  return (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Add your vehicle</Text>
        <Text style={styles.stepHelper}>Enter the basics first. You can complete the remaining listing details next.</Text>
      </View>
      <View style={styles.setupIntroCard}>
        <CarFront color="#0B6FE8" size={22} />
        <Text style={styles.setupIntroText}>Your vehicle information stays private until you submit it for review.</Text>
      </View>
      <View style={styles.form}>
        <SelectField control={control} error={errors.make?.message} icon={<CarFront color="#536B91" size={18} />} label="Vehicle make" name="make" onPress={() => onOpenSelection('make')} placeholder="Select make" />
        <SelectField control={control} disabled={!make} error={errors.model?.message} icon={<CarFront color="#536B91" size={18} />} label="Vehicle model" name="model" onPress={() => onOpenSelection('model')} placeholder={make ? 'Select model' : 'Select make first'} />
        <View style={styles.row}>
          <SelectField control={control} error={errors.manufacturingYear?.message} icon={<CalendarDays color="#536B91" size={18} />} label="Manufacturing year" name="manufacturingYear" onPress={() => onOpenSelection('manufacturingYear')} placeholder="Select year" />
          <TextField control={control} error={errors.registrationNumber?.message} label="Registration number" name="registrationNumber" autoCapitalize="characters" />
        </View>
      </View>
    </View>
  );
}

function VehicleSetupChecklist({
  documentUrls,
  onOpenSection,
  progress,
  values,
}: {
  documentUrls: VehicleDocumentUrls;
  onOpenSection: (section: SetupSection) => void;
  progress: { completed: number; total: number };
  values: HostVehicleFormValues;
}) {
  return (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Vehicle setup</Text>
        <Text style={styles.stepHelper}>Complete the sections in any order, then submit your listing for review.</Text>
      </View>
      <View style={styles.setupProgressCard}>
        <View><Text style={styles.setupProgressTitle}>Listing progress</Text><Text style={styles.setupProgressText}>{progress.completed} of {progress.total} required sections complete</Text></View>
        <Text style={styles.setupProgressCount}>{Math.round((progress.completed / progress.total) * 100)}%</Text>
        <View style={styles.setupProgressTrack}><View style={[styles.setupProgressFill, { width: `${(progress.completed / progress.total) * 100}%` }]} /></View>
      </View>
      <View style={styles.setupChecklist}>
        {setupSections.map((section) => {
          const status = section.key === 'review' ? (progress.completed === progress.total ? 'completed' : 'action_required') : getSetupStatus(section.key, values, documentUrls);
          return <ChecklistRow key={section.key} onPress={() => onOpenSection(section.key)} section={section} status={status} />;
        })}
      </View>
    </View>
  );
}

function ChecklistRow({
  onPress,
  section,
  status,
}: {
  onPress: () => void;
  section: { key: SetupSection; title: string; helper: string };
  status: 'completed' | 'in_progress' | 'not_started' | 'action_required';
}) {
  const statusLabel = status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In progress' : status === 'action_required' ? 'Action required' : 'Not started';
  const Icon = status === 'completed' ? CircleCheck : status === 'action_required' ? CircleAlert : status === 'in_progress' ? Clock3 : Circle;
  return (
    <Pressable accessibilityHint={`Open ${section.title}`} accessibilityLabel={`${section.title}, ${statusLabel}`} accessibilityRole="button" key={section.key} onPress={onPress} style={({ pressed }) => [styles.checklistRow, pressed && styles.checklistRowPressed]}>
      <View style={[styles.checklistIcon, status === 'completed' && styles.checklistIconComplete]}><Icon color={status === 'completed' ? '#16805C' : status === 'action_required' ? '#FF644F' : '#536B91'} size={20} /></View>
      <View style={styles.checklistCopy}><Text style={styles.checklistTitle}>{section.title}</Text><Text numberOfLines={1} style={styles.checklistHelper}>{section.helper}</Text><Text style={[styles.checklistStatus, status === 'completed' && styles.checklistStatusComplete, status === 'action_required' && styles.checklistStatusRequired]}>{statusLabel}</Text></View>
      <ChevronRight color="#536B91" size={20} />
    </Pressable>
  );
}

function SubmissionComplete() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.submissionComplete}>
        <View style={styles.submissionIcon}><Check color="#FFFFFF" size={34} strokeWidth={3} /></View>
        <Text style={styles.submissionTitle}>Vehicle submitted for review</Text>
        <Text style={styles.submissionBody}>We'll let you know once your listing is approved.</Text>
        <Pressable accessibilityLabel="View my cars" accessibilityRole="button" onPress={() => router.replace('/(host)/cars')} style={styles.submissionButton}><Text style={styles.submissionButtonText}>View my cars</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

function VehicleDetailsStep({
  control,
  errors,
  make,
  onOpenSelection,
  optionalDescription = false,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
  make: string;
  onOpenSelection: (field: 'make' | 'model' | 'manufacturingYear' | 'colour') => void;
  optionalDescription?: boolean;
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
      {!optionalDescription ? <TextField control={control} error={errors.description?.message} label="Description" multiline name="description" /> : null}
    </View>
  );
}

function ExpandableVehicleExtras({
  control,
  error,
  featureInput,
  features,
  onAddFeature,
  onChangeFeatureInput,
  onRemoveFeature,
  onTogglePopularFeature,
}: {
  control: ReturnType<typeof useForm<HostVehicleFormValues>>['control'];
  error?: string;
  featureInput: string;
  features: string[];
  onAddFeature: () => void;
  onChangeFeatureInput: (value: string) => void;
  onRemoveFeature: (feature: string) => void;
  onTogglePopularFeature: (feature: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.extrasCard}>
      <Pressable accessibilityLabel="Optional description and features" accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.extrasHeader}>
        <View><Text style={styles.extrasTitle}>Optional details</Text><Text style={styles.extrasHelper}>Description and features help renters choose.</Text></View>
        <ChevronRight color="#536B91" size={20} style={expanded ? styles.extrasChevronExpanded : undefined} />
      </Pressable>
      {expanded ? <View style={styles.extrasContent}>
        <TextField control={control} label="Description" multiline name="description" />
        <FeaturesStep error={error} featureInput={featureInput} features={features} onAddFeature={onAddFeature} onChangeFeatureInput={onChangeFeatureInput} onRemoveFeature={onRemoveFeature} onTogglePopularFeature={onTogglePopularFeature} />
      </View> : null}
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
  onMovePhoto,
  uploadProgress,
  onPickPhotos,
  onRemovePhoto,
  onSetCoverPhoto,
}: {
  error?: string;
  imageUrls: string[];
  isUploading: boolean;
  onMovePhoto: (uri: string, direction: 'earlier' | 'later') => void;
  uploadProgress: number | null;
  onPickPhotos: (source: 'camera' | 'library') => void;
  onRemovePhoto: (uri: string) => void;
  onSetCoverPhoto: (uri: string) => void;
}) {
  return (
    <View style={styles.form}>
      {imageUrls.length === 0 ? (
        <View style={styles.photoSourceWrap}>
          <Pressable accessibilityHint="Take a vehicle photo with your camera." accessibilityLabel="Take vehicle photos" accessibilityRole="button" accessibilityState={{ busy: isUploading, disabled: isUploading }} disabled={isUploading} onPress={() => onPickPhotos('camera')} style={({ pressed }) => [styles.photoPickerButton, pressed && !isUploading && styles.photoPickerButtonPressed]}>
            <Camera color="#0B6FE8" size={30} /><Text style={styles.photoPickerText}>Use camera</Text><Text style={styles.photoPickerSubtext}>Capture exterior or interior</Text>
          </Pressable>
          <Pressable accessibilityHint="Open your photo library to select vehicle photos." accessibilityLabel="Choose vehicle photos" accessibilityRole="button" accessibilityState={{ busy: isUploading, disabled: isUploading }} disabled={isUploading} onPress={() => onPickPhotos('library')} style={({ pressed }) => [styles.photoPickerButton, pressed && !isUploading && styles.photoPickerButtonPressed]}>
            <Plus color="#0B6FE8" size={30} /><Text style={styles.photoPickerText}>Choose photos</Text><Text style={styles.photoPickerSubtext}>JPG, PNG, WebP • Max 10 MB</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.photoGuidance}><Text style={styles.photoGuidanceTitle}>Recommended coverage</Text><Text style={styles.photoGuidanceText}>Front, rear, both sides and interior. Add clear photos in good light.</Text></View>
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
          {imageUrls.map((uri, index) => {
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
            {imageUrls.length > 1 ? (
              <View style={styles.photoReorderActions}>
                <Pressable
                  accessibilityLabel="Move photo earlier"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: index === 0 }}
                  disabled={index === 0}
                  onPress={() => onMovePhoto(uri, 'earlier')}
                  style={styles.photoReorderButton}
                >
                  <ChevronLeft color="#FFFFFF" size={15} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Move photo later"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: index === imageUrls.length - 1 }}
                  disabled={index === imageUrls.length - 1}
                  onPress={() => onMovePhoto(uri, 'later')}
                  style={styles.photoReorderButton}
                >
                  <ChevronRight color="#FFFFFF" size={15} />
                </Pressable>
              </View>
            ) : null}
            </View>
            );
          })}
          {imageUrls.length < maximumPhotoCount ? (
            <Pressable
            accessibilityLabel="Add more photos"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={() => onPickPhotos('library')}
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
  documentUpload,
  documentUrls,
  errors,
  onPickDocument,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  documentUpload: { type: VehicleDocumentType; progress: number } | null;
  documentUrls: VehicleDocumentUrls;
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
  onPickDocument: (type: VehicleDocumentType, source: 'camera' | 'library') => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.documentNotice}><FileText color="#0B6FE8" size={18} /><Text style={styles.documentNoticeText}>Use a clear photo of each document. Images are validated and stored securely with your vehicle setup.</Text></View>
      <VehicleDocumentCard label="Registration certificate (RC)" uploaded={Boolean(documentUrls.rc)} uploading={documentUpload?.type === 'rc' ? documentUpload.progress : null} onPick={(source) => onPickDocument('rc', source)} />
      <TextField
        control={control}
        error={errors.registrationCertificateNumber?.message}
        label="RC number"
        name="registrationCertificateNumber"
      />
      <VehicleDocumentCard label="Insurance" uploaded={Boolean(documentUrls.insurance)} uploading={documentUpload?.type === 'insurance' ? documentUpload.progress : null} onPick={(source) => onPickDocument('insurance', source)} />
      <TextField
        control={control}
        error={errors.insurancePolicyNumber?.message}
        label="Insurance policy number"
        name="insurancePolicyNumber"
      />
      <VehicleDocumentCard label="Pollution certificate (PUC)" optional uploaded={Boolean(documentUrls.puc)} uploading={documentUpload?.type === 'puc' ? documentUpload.progress : null} onPick={(source) => onPickDocument('puc', source)} />
      <TextField
        control={control}
        label="Pollution certificate / PUC"
        name="pollutionCertificateNumber"
      />
    </View>
  );
}

function VehicleDocumentCard({
  label,
  onPick,
  optional = false,
  uploaded,
  uploading,
}: {
  label: string;
  onPick: (source: 'camera' | 'library') => void;
  optional?: boolean;
  uploaded: boolean;
  uploading: number | null;
}) {
  return (
    <View style={styles.documentUploadCard}>
      <View style={styles.documentUploadCopy}><Text style={styles.documentUploadTitle}>{label}{optional ? ' - Optional' : ''}</Text><Text style={styles.documentUploadStatus}>{uploading !== null ? `Uploading ${Math.round(uploading * 100)}%` : uploaded ? 'Image added' : 'Not uploaded'}</Text></View>
      {uploading !== null ? <ActivityIndicator color="#0B6FE8" /> : <View style={styles.documentUploadActions}><Pressable accessibilityLabel={`Use camera for ${label}`} accessibilityRole="button" onPress={() => onPick('camera')} style={styles.documentUploadButton}><Camera color="#0B6FE8" size={17} /></Pressable><Pressable accessibilityLabel={`Choose ${label} image`} accessibilityRole="button" onPress={() => onPick('library')} style={styles.documentUploadButton}><Plus color="#0B6FE8" size={17} /></Pressable></View>}
    </View>
  );
}

function PricingStep({
  control,
  errors,
}: Pick<ReturnType<typeof useForm<HostVehicleFormValues>>, 'control'> & {
  errors: ReturnType<typeof useForm<HostVehicleFormValues>>['formState']['errors'];
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
      <View style={styles.extrasCard}>
        <Pressable
          accessibilityLabel="Advanced pricing"
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((value) => !value)}
          style={styles.extrasHeader}
        >
          <View><Text style={styles.extrasTitle}>Advanced pricing</Text><Text style={styles.extrasHelper}>Mileage and booking-duration rules.</Text></View>
          <ChevronRight color="#536B91" size={20} style={advancedOpen ? styles.extrasChevronExpanded : undefined} />
        </Pressable>
        {advancedOpen ? <View style={styles.extrasContent}>
          <TextField control={control} error={errors.mileageLimitPerDay?.message} keyboardType="number-pad" label="Mileage limit per day" name="mileageLimitPerDay" placeholder="Optional" suffix="km" />
          <View style={styles.row}>
            <TextField control={control} error={errors.minimumRentalDays?.message} keyboardType="number-pad" label="Min days" name="minimumRentalDays" suffix="days" />
            <TextField control={control} error={errors.maximumRentalDays?.message} keyboardType="number-pad" label="Max days" name="maximumRentalDays" placeholder="Optional" suffix="days" />
          </View>
        </View> : null}
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
  onEdit: (section: SetupSection) => void;
  values: HostVehicleFormValues;
}) {
  const coverImageUrl = getVehicleImageVariantUrl(values.imageUrls[0], 'thumbnail');
  const rows = [
    {
      icon: <MapPin color="#0B6FE8" size={19} />,
      label: 'Location',
      section: 'location' as const,
      value: [values.address, values.city, values.state].filter(Boolean).join(', ') || 'Add pickup location',
    },
    {
      icon: <Plus color="#0B6FE8" size={19} />,
      label: 'Features',
      section: 'details' as const,
      value: values.features.length
        ? `${values.features[0]}${values.features.length > 1 ? ` + ${values.features.length - 1} more` : ''}`
        : 'Add features',
    },
    {
      icon: <Camera color="#0B6FE8" size={19} />,
      label: 'Photos',
      section: 'photos' as const,
      value: `${values.imageUrls.length} ${values.imageUrls.length === 1 ? 'photo' : 'photos'} added`,
    },
    {
      icon: <FileText color="#0B6FE8" size={19} />,
      label: 'Documents',
      section: 'documents' as const,
      value: getDocumentSummary(values),
    },
    {
      icon: <Text style={styles.reviewCurrencyIcon}>₹</Text>,
      label: 'Price',
      section: 'pricing' as const,
      value: values.pricePerDay ? `₹${formatIndianCurrency(values.pricePerDay)} / day` : 'Add daily price',
    },
    {
      icon: <CalendarDays color="#0B6FE8" size={19} />,
      label: 'Availability',
      section: 'availability' as const,
      value: values.availableFrom ? `From ${formatListingDate(values.availableFrom)}` : 'Set availability',
    },
  ];

  return (
    <View style={styles.reviewList}>
      <Pressable
        accessibilityHint="Edit vehicle details"
        accessibilityLabel="Vehicle details"
        accessibilityRole="button"
        onPress={() => onEdit('details')}
        style={({ pressed }) => [styles.reviewVehicleCard, pressed && styles.reviewRowPressed]}
      >
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
        <ChevronRight color="#536B91" size={19} />
      </Pressable>
      {rows.map((row) => (
        <Pressable
          accessibilityRole="button"
          key={row.label}
          onPress={() => onEdit(row.section)}
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
  nextStep: string,
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

function getVehicleDocumentUrls(documents: Record<string, unknown>): VehicleDocumentUrls {
  return {
    rc: stringFromRecord(documents, 'registrationCertificateImageUrl') || null,
    insurance: stringFromRecord(documents, 'insuranceImageUrl') || null,
    puc: stringFromRecord(documents, 'pollutionCertificateImageUrl') || null,
  };
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
  setupHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8FF',
    backgroundColor: '#F3F9FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  setupBackButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
  },
  setupHeaderCopy: { flex: 1, minWidth: 0, gap: 2 },
  setupHeaderTitle: { color: '#102550', fontSize: 20, fontWeight: '800' },
  setupFooter: {
    borderTopWidth: 1,
    borderTopColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  setupPrimaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#0B6FE8',
  },
  setupPrimaryButtonDisabled: { opacity: 0.6 },
  setupPrimaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  setupIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    padding: 14,
  },
  setupIntroText: { flex: 1, color: '#536B91', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  setupProgressCard: {
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  setupProgressTitle: { color: '#102550', fontSize: 15, fontWeight: '800' },
  setupProgressText: { color: '#536B91', fontSize: 12, fontWeight: '600', marginTop: 3 },
  setupProgressCount: { position: 'absolute', right: 16, top: 16, color: '#0B6FE8', fontSize: 16, fontWeight: '800' },
  setupProgressTrack: { height: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: '#D6E8FF' },
  setupProgressFill: { height: '100%', borderRadius: 999, backgroundColor: '#0B6FE8' },
  setupChecklist: { gap: 10 },
  checklistRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  checklistRowPressed: { backgroundColor: '#EAF4FF' },
  checklistIcon: { height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#EAF4FF' },
  checklistIconComplete: { backgroundColor: '#E7F5EE' },
  checklistCopy: { flex: 1, minWidth: 0, gap: 2 },
  checklistTitle: { color: '#102550', fontSize: 15, fontWeight: '800' },
  checklistHelper: { color: '#536B91', fontSize: 12, fontWeight: '600' },
  checklistStatus: { color: '#536B91', fontSize: 11, fontWeight: '800', marginTop: 3, textTransform: 'uppercase' },
  checklistStatusComplete: { color: '#16805C' },
  checklistStatusRequired: { color: '#FF644F' },
  extrasCard: { overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: '#D6E8FF', backgroundColor: '#FFFFFF' },
  extrasHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  extrasTitle: { color: '#102550', fontSize: 14, fontWeight: '800' },
  extrasHelper: { color: '#536B91', fontSize: 12, fontWeight: '600', marginTop: 3 },
  extrasChevronExpanded: { transform: [{ rotate: '90deg' }] },
  extrasContent: { gap: 14, borderTopWidth: 1, borderTopColor: '#D6E8FF', padding: 14 },
  photoSourceWrap: { flexDirection: 'row', gap: 10 },
  photoGuidance: { borderRadius: 10, backgroundColor: '#EAF4FF', padding: 12 },
  photoGuidanceTitle: { color: '#102550', fontSize: 12, fontWeight: '800' },
  photoGuidanceText: { color: '#536B91', fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 3 },
  photoReorderActions: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', gap: 4 },
  photoReorderButton: { height: 28, width: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(37, 40, 43, 0.78)' },
  documentUploadCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  documentUploadCopy: { flex: 1, minWidth: 0, gap: 3 },
  documentUploadTitle: { color: '#102550', fontSize: 13, fontWeight: '800' },
  documentUploadStatus: { color: '#536B91', fontSize: 12, fontWeight: '600' },
  documentUploadActions: { flexDirection: 'row', gap: 8 },
  documentUploadButton: { height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#EAF4FF' },
});

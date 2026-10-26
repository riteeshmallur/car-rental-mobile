import { type HostVehicleListing } from '@/types/car';

export type VehicleSetupSection =
  | 'details'
  | 'photos'
  | 'location'
  | 'documents'
  | 'pricing'
  | 'availability'
  | 'review';

export const vehicleSetupSections: Exclude<VehicleSetupSection, 'review'>[] = [
  'details',
  'photos',
  'location',
  'documents',
  'pricing',
  'availability',
];

const sectionLabels: Record<VehicleSetupSection, string> = {
  details: 'Vehicle details',
  photos: 'Photos',
  location: 'Pickup location',
  documents: 'Vehicle documents',
  pricing: 'Pricing',
  availability: 'Availability',
  review: 'Review & submit',
};

export function getVehicleSetupSectionLabel(section: VehicleSetupSection) {
  return sectionLabels[section];
}

export function getVehicleSetupProgress(vehicle: HostVehicleListing) {
  const completedSections = vehicleSetupSections.filter((section) =>
    isVehicleSetupSectionComplete(vehicle, section),
  );
  const nextSection: VehicleSetupSection =
    vehicleSetupSections.find((section) => !completedSections.includes(section)) ?? 'review';

  return {
    completed: completedSections.length,
    nextSection,
    percentage: Math.round((completedSections.length / vehicleSetupSections.length) * 100),
    total: vehicleSetupSections.length,
  };
}

export function getVehicleDraftName(vehicle: HostVehicleListing) {
  return [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle draft';
}

function isVehicleSetupSectionComplete(
  vehicle: HostVehicleListing,
  section: Exclude<VehicleSetupSection, 'review'>,
) {
  if (section === 'details') {
    return Boolean(
      vehicle.make &&
        vehicle.model &&
        vehicle.manufacturingYear &&
        vehicle.registrationNumber,
    );
  }

  if (section === 'photos') {
    return vehicle.imageUrls.length > 0;
  }

  if (section === 'location') {
    return Boolean(
      vehicle.locationId &&
        vehicle.address &&
        vehicle.city &&
        vehicle.state &&
        vehicle.country,
    );
  }

  if (section === 'documents') {
    return Boolean(
      readDocumentValue(vehicle.listingDocuments, 'registrationCertificateNumber') &&
        readDocumentValue(vehicle.listingDocuments, 'registrationCertificateImageUrl') &&
        readDocumentValue(vehicle.listingDocuments, 'insurancePolicyNumber') &&
        readDocumentValue(vehicle.listingDocuments, 'insuranceImageUrl'),
    );
  }

  if (section === 'pricing') {
    return Boolean(vehicle.pricePerDay && vehicle.minimumRentalDays);
  }

  return Boolean(readDocumentValue(vehicle.availabilitySettings, 'availableFrom'));
}

function readDocumentValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

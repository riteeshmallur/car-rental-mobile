const {
  getCarImageUrl,
  getVehicleImageVariantUrl,
} = require('@/features/customer/utils/car-formatters');
const { env } = require('@/services/config/env');

const apiOrigin = env.apiUrl.replace(/\/api\/v1\/?$/, '');

describe('vehicle image URLs', () => {
  it('resolves backend-relative uploaded image paths against the API origin', () => {
    expect(getCarImageUrl('/uploads/cars/vehicle-original.jpg')).toBe(
      `${apiOrigin}/uploads/cars/vehicle-original.jpg`,
    );
    expect(
      getVehicleImageVariantUrl('/uploads/cars/vehicle-original.jpg', 'thumbnail'),
    ).toBe(`${apiOrigin}/uploads/cars/vehicle-thumbnail.jpg`);
  });

  it('keeps local image-picker URIs intact until their upload completes', () => {
    expect(getCarImageUrl('file:///tmp/vehicle.jpg')).toBe('file:///tmp/vehicle.jpg');
    expect(getCarImageUrl('blob:http://localhost:8081/vehicle')).toBe(
      'blob:http://localhost:8081/vehicle',
    );
  });

  it('does not return legacy third-party vehicle URLs to the UI', () => {
    expect(
      getVehicleImageVariantUrl(
        'https://images.unsplash.com/photo-1571896849842-33c89424de2d',
        'thumbnail',
      ),
    ).toBeNull();
  });

  it('keeps backend and CDN object-storage vehicle media URLs', () => {
    expect(
      getVehicleImageVariantUrl(
        'https://media.hopin.example/uploads/cars/vehicle-original.jpg',
        'detail',
      ),
    ).toBe('https://media.hopin.example/uploads/cars/vehicle-detail.jpg');
  });
});

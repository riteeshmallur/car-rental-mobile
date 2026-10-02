# Mobile testing

The mobile app has three complementary test layers:

- Jest unit, component, navigation, and API-contract tests in `test/__tests__`.
- GitHub Actions quality checks for linting, TypeScript, and Jest coverage.
- Maestro native end-to-end tests for the customer booking and host booking-management flows.

## Local checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:ci
```

`test:ci` produces a local `coverage/` directory, which is ignored by Git.

## Native E2E

Maestro runs against an installed Android or iOS E2E build. Create a dedicated non-production account and resettable backend fixture before each run. The fixture must provide:

- `E2E_PHONE_NUMBER` and `E2E_OTP`: customer login credentials.
- `E2E_HOST_PHONE_NUMBER` and `E2E_HOST_OTP`: account with host capability.
- `E2E_VEHICLE_NAME`: an available vehicle returned by search that can complete the test payment flow.
- A host booking request for the host account, so the booking-detail management path is available.

The flows intentionally use real backend responses. They do not mock payment, search, booking, or host actions. Keep the E2E API URL and credentials in the CI secret store; do not commit them.

```bash
export E2E_PHONE_NUMBER=9876543210
export E2E_OTP=123456
export E2E_HOST_PHONE_NUMBER=9876543211
export E2E_HOST_OTP=123456
export E2E_VEHICLE_NAME='Hyundai Creta'
npm run test:e2e
```

The `e2e-test` profile in `eas.json` creates an Android APK and an iOS simulator build using the stable app identifier `com.hopin.carrental`. It explicitly marks the build as a test environment so the mock-payment selector is available only to Maestro. The EAS workflow at `.eas/workflows/e2e-tests.yml` executes both Maestro flows on demand. Configure its build environment with a private E2E API base URL before triggering it.

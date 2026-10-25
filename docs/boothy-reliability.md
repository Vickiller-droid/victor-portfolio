# Reliability work before the next feature

The Android pilot moves trip state and reminder scheduling out of the browser. The shared web model rejects stale and out-of-order route updates, pauses automatic arrival warnings when route timing expires, and requires a fresh manual time for fallback. A route estimate remains an estimate; arrival is confirmed by the user.

The Android project includes pure timing tests and Android API integration tests for alarm registration/cancellation, notification delivery requests without an Activity, stale notification actions, reboot recovery and persistence. Physical phone behavior is a separate acceptance gate.

The installer is debug-signed for a controlled pilot. Road timing requires owner-provided Google Maps credentials and billing configuration; these are not provisioned. See `android/README.md` for build instructions and the ordered phone test.

Scope excludes portfolio redesign, waitlist changes and additional product features. Finish the device delivery and route acceptance checks before expanding scope.

## Verification for pilot 0.2.0

- 55 Node web tests passed.
- 20 native trip-rule tests passed.
- 6 Robolectric Android API integration tests passed (Android 9 simulated framework).
- Next.js production build passed. Android compile, APK assembly and lint completed with no lint errors.
- APK signature verified; bundled JavaScript was byte-compared against the tested source.
- APK SHA-256: `26f26e704ba8aedd061c3e8c8fb253810b140825753aea8a802020001975dd65`.

No physical device or live authenticated Google route was tested here. Road timing is disabled in this APK until a configured build is produced.

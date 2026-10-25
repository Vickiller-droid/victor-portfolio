# Reliability work before the next feature

The Android pilot moves trip state and reminder scheduling out of the browser. The shared web model rejects stale and out-of-order route updates, pauses automatic arrival warnings when route timing expires, and requires a fresh manual time for fallback. A route estimate remains an estimate; arrival is confirmed by the user.

The Android project includes pure timing tests and Android API integration tests for alarm registration/cancellation, notification delivery requests without an Activity, stale notification actions, reboot recovery and persistence. Physical phone behavior is a separate acceptance gate.

The installer is debug-signed for a controlled pilot. Road timing requires owner-provided Google Maps credentials and billing configuration; these are not provisioned. See `android/README.md` for build instructions and the ordered phone test.

Scope excludes portfolio redesign, waitlist changes and additional product features. Finish the device delivery and route acceptance checks before expanding scope.

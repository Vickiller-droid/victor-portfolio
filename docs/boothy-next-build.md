# Reliability refinement 0.2.1

Changes: native short trips use a two-thirds journey lead capped at three minutes (a three-minute journey warns after one minute); collected items no longer trigger a fresh arrival alarm; speech starts after a 1.2-second attention chime, followed by a bounded remaining tone; diagnostic events distinguish a due trip alert from successful audio playback. Android location denial guidance now points to app permissions.

Verification: run Node tests plus native JUnit, Android integration tests, lint and assemble via the Boothy Android reliability workflow. Passing these does not prove physical-device delivery. Do not distribute until the workflow succeeds. Debug APK signing differs between runners; preserve the original owner signing key before replacing an installed pilot. Never advise uninstalling without explaining local trip data loss.

## Google Maps activation blocker

The branch contains Google map display, place search, destination pins and traffic-aware routing. Activation is NOT complete without owner-controlled Google Cloud billing, enabled Maps JavaScript / Places API (New) / Routes APIs, restricted browser and Android credentials, and a deployed maps-config endpoint. Never commit private server credentials.

Set BOOTHY_GOOGLE_MAPS_BROWSER_KEY on Vercel for the config endpoint. The Android BOOTHY_GOOGLE_MAPS_ANDROID_KEY must be supplied at build time and restricted to dev.boothy.app plus the actual signing certificate. Confirm restrictions against real requests before distribution. Keep quotas low and inspect billing. The current fallback map does not calculate road ETA. Selecting a pin must not be presented as activating live road timing.

## Device acceptance

Test a five-minute manual trip: automatic warning at minute two, voice follows brief chime, notification while locked, snooze once, checked items preserved, arrival does not alarm when all collected, cancellation suppresses pending alarms. Repeat with headphones. Then test a three-minute journey: no departure alarm, warning at minute one. Inspect diagnostics if an automatic alert fails; do not infer the cause from a successful preview. Google road tests follow credential activation, including GPS loss and traffic changes.

# Boothy Android pilot

A native Android reminder host for the shared Boothy UI. Android owns trip state and alarm scheduling; JavaScript timers do not deliver native trip alerts. This is a pilot pending physical-phone acceptance, not a production release.

## Build

Use JDK 17, Android SDK 36 and Gradle 8.13. Android Gradle Plugin is pinned to 8.13.2. From `android/`:

```sh
gradle :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

The build copies `../public/boothy/` into application assets. Output: `app/build/outputs/apk/debug/app-debug.apk`. Minimum Android 8 (API 26), target API 36. A current Android System WebView is required. The pilot uses debug signing. Production distribution needs an owner-managed release signing key; keep private keys outside Git.

## Reliability

- Native state changes are serialized, persisted before delivery, and reflected back into the UI. This prevents duplicate web/native reminders.
- Android `AlarmManager.setAlarmClock` schedules the next reminder. Android may show a scheduled-alarm icon; this is intentional. Notification and exact-alarm permissions are checked before departure.
- A bounded foreground service plays the selected 15-second tone and optional speech. Vibration can run even if audio focus is denied. Audio follows the phone's media output; disconnecting headphones stops playback. Media volume, Do Not Disturb, Bluetooth routing and manufacturer battery settings still require device testing.
- The initial warning is three minutes before the estimate; snooze is one minute. An ignored warning repeats once. Interacting or checking items cancels that repeat. Stopping audio does not mark belongings collected.
- GPS starts only through a user action and permission. A visible foreground service tracks an active trip, and stops on arrival, cancellation or Stop location. It does not start automatically at boot. Raw journey fixes are held in memory, not saved as a travel history.
- Routing requires a fix under 30 seconds old, with reported accuracy within 100 metres. Requests are spaced one minute apart, capped at 120 per trip with a persisted budget. Old, delayed, duplicate, wrong-trip and wrong-destination responses are rejected.
- After 90 seconds without a fresh road estimate, automatic arrival warnings pause and one tracking notice appears. A fresh route or newly entered manual time restores timing. Explicit snooze and unrelated during-ride reminders retain their meaning.
- Reboot or a system-clock change pauses the trip and asks for a new estimate. Force-stopping an app can stop alarms; Boothy cannot promise delivery after a force-stop.
- Diagnostics retain 40 event names/times, without raw coordinates, API keys, email addresses or belongings.

## Google account setup (not provisioned)

Without credentials, routing is disabled. The fallback map and straight-line pin distance are not a road ETA.

1. In the owner's Google Cloud project, configure billing and enable Maps JavaScript API, Places API (New) and Routes API. Set quotas and billing alerts. API use may incur charges.
2. Set `BOOTHY_GOOGLE_MAPS_BROWSER_KEY` in Vercel. Restrict the public browser key to the required APIs and intended website origin. The Android WebView origin is `https://appassets.androidplatform.net/*`. Verify permitted referrers succeed and other referrers fail.
3. Build Android with `BOOTHY_GOOGLE_MAPS_ANDROID_KEY` set. Restrict this key to Routes API and application `dev.boothy.app` with its signing certificate SHA-1. Requests include `X-Android-Package` and `X-Android-Cert`. Before distribution, verify missing/wrong application headers are rejected. If the selected endpoint cannot enforce those restrictions, use a protected backend instead of distributing an unrestricted key.
4. Native routing requests `TRAFFIC_AWARE` road estimates. Coverage and traffic information vary. Only the user confirms actual arrival.
5. Rebuild the APK after connecting the Android key. Do not commit private signing keys or unrestricted credentials.

## Ordered phone acceptance

First test while stationary, then as a passenger. Record the installed version.

1. In **Menu → Sound & notifications**, turn on tone and vibration and complete **Set up phone reminders**. Choose **Test phone alert in 20 seconds**, then lock the screen. Confirm notification, approximately 15 seconds of sound, vibration and tap-to-open. Look in the notification tray if no banner appears.
2. Start a five-minute trip. Switch apps and lock the screen. At about two minutes elapsed, verify the three-minute warning. Repeat with headphones and check actual audibility. Diagnostics distinguish an alarm received, a notification posted and audio started; they do not prove the sound was heard.
3. Snooze from the notification. Verify a new alert one minute later. Open the checklist, check one item and stop audio. Remaining items must stay unchecked, with no further automatic repeat.
4. Cancel a trip and confirm its pending alarm does not fire. Reopen the app to check saved settings/items. Reboot and force-stop are separate recovery tests.
5. After Maps credentials are configured: test road timing in traffic, location/data loss, the paused-timing warning, recovery and manual fallback.

Automated tests and packaging do not certify Tecno delivery, journey GPS accuracy or connected-headphone audibility. Those remain release gates.

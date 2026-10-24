# Boothy phone-notification validation

Implemented: permission-aware phone-only test after 20 seconds; cancellation; distinct trip/reminder destination data; existing-window focus or new-window fallback; checklist routing with stale-ride protection; notification settings guidance. Notification taps do not collect or acknowledge items.

The test requests an OS notification without a synthesized web tone so hearing the existing tone cannot be mistaken for notification delivery. Android controls its banner, sound, lock-screen visibility, and notification channel settings.

## Real Android acceptance checks
1. Refresh the deployed Boothy page. Open Reminders and enable phone alerts; allow the browser permission.
2. Tap “Test phone alert in 20 seconds”, switch to another app, and leave Boothy’s tab open.
3. Record whether a banner appeared, whether an entry appeared in the pull-down notification tray, and whether tapping it returned to Reminders.
4. Repeat with the screen locked. Record delivery timing and whether the alert appeared only after unlocking or returning to Boothy.
5. Test a ride reminder: tapping it must open the matching checklist with unchecked items unchanged. An old ride notification must not open a different ride’s checklist.
6. Confirm cancellation prevents the pending 20-second test. Denying notification permission must show recovery guidance without a success claim.

## Release status
Automated channel, routing, and worker tests pass. Real Android banner and locked-screen delivery remain unverified until the owner reports device results.

The current ride clock and this diagnostic use page timers. A worker can display and route a requested notification but cannot guarantee waking the page at the ride deadline. Hidden or suspended pages may delay or miss requests. This is not a production-ready background scheduler. A successful 20-second test does not prove long-trip or locked-screen reliability; evaluate Android-native background location and scheduling before making that promise.

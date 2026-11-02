# Boothy Pilot 0.2.4

Changes: Android reminder audio requests transient ducking, allowing compatible music players to lower and restore volume. Speech request/playback errors continue the enabled tone fallback. Completed checklists change title and keep a persistent belongings-reminders-stopped message while the trip continues. Existing OpenStreetMap pin selection now shows coordinates, an explicit Save destination button, and a Show destination recenter button; tile failures remain visible across UI updates.

Google Maps billing and credentials remain unconfigured. This build does not provide address search, road routes, or traffic-aware ETA. Map pins do not modify the manual arrival estimate. No extra map provider is introduced.

Verification: 66 Node tests locally pass. CI must pass native unit tests, Android lint, APK assembly, and packaged UI byte verification before delivery. Native framework tests are not proof of physical phone audio or lock-screen delivery.

Phone acceptance: play music; run a five-minute trip with unchecked items and sound/voice enabled; lock screen. Expect warning two minutes after departure (three minutes remaining), temporary music lowering where supported, speech then remaining tone. Snooze one minute: confirmation and countdown, same arrival estimate, one new warning. Collect all items: completion speech once and no further belongings alerts. Reopen map, save/change a pin, confirm location permissions, inspect GPS accuracy outdoors. Repeat with headphones.

Installer is a debug-signed pilot. Different CI debug signing keys can prevent in-place updates; do not uninstall an existing build without considering loss of locally saved trips and parking. Store release signing and real trip acceptance remain outstanding.

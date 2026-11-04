# Boothy 0.2.5 early-access candidate

Not yet distributed: owner signing secret setup and phone update acceptance are outstanding.

- Release signing requires the owner's retained key; missing configuration fails closed. Certificate fingerprint is verified before publishing an installer artifact. Debug APKs are no longer uploaded as phone installers.
- During travel, Check my things is primary; I've arrived is secondary. Reading/acknowledging a checklist does not itself confirm arrival.
- Supporting audio-service notification is labelled reminder playing (or completion voice); its timestamp is hidden. Actionable reminders retain Stop sound and Snooze. Android may still show the required service notification.
- Feedback is available from the menu and Help. Prepare feedback builds a reviewable email draft with app version, current sound/voice state, user description and optional phone details. No automatic location, belongings, logs or identifiers. Copy fallback; no false submission-success claim. Sending from the email app shares the sender's email address.
- Manual ETA and non-routing map limits are stated in setup and trip copy. Sound review and phone-permission gates remain. Google Maps is not activated.

Validation must include Node tests, native tests, lint, debug assembly, guarded release assembly with a disposable CI fixture, packaged UI byte checks and APK signature validity. None certifies physical sound, update data preservation or lock-screen delivery. Owner signing setup: docs/boothy-release-signing.md.

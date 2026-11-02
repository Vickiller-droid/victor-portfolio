# Pilot 0.2.3: explicit reminder workflow

Scope: manual timing and alert reliability; Google Maps remains deferred.

- New trips use a three-minute preparation lead. A three-minute trip warns at departure. Snooze delays the reminder one minute and never extends ETA. An explicit snooze suppresses an intervening ETA sound until the reminder is due.
- Setup explains the distinction. First real trip requires either enable-and-test plus user hearing confirmation, or explicit visual-only choice. Selecting visual-only does not bypass Android scheduling permissions. Existing sound preferences are not silently changed before user action.
- Snooze has persistent in-app countdown, acknowledgement and an Android notification. It survives state restore.
- Last collected item cancels pending pre-arrival repeat/snooze; one spoken completion per trip if voice is enabled. No long completion tune. Partial item ticks must not cancel the last-item confirmation.
- Notification and popup labels distinguish returning to travel from confirming all items collected. ETA remains an estimate and never auto-confirms arrival.

Validation: Node suite, native unit/integration suite, Android lint/assemble and actual APK asset-byte comparison in GitHub Actions. Physical Tecno locked-screen/audio/Bluetooth acceptance remains required.

Acceptance: choose sound and test, create a 5-minute trip, warn at elapsed 2 minutes, snooze and observe 60-second countdown with unchanged ETA, leave app/lock screen, receive reminder, check every item, hear one completion if voice enabled, confirm arrival without another belongings alarm. Three-minute trip warns immediately with explicit setup explanation. No map accuracy claim.

# Owner signing setup — required before distributing 0.2.5

The source is prepared; a permanent owner key has NOT been provisioned by this change. The GitHub connector cannot write repository secrets. Never paste the keystore, its base64 contents, or its passwords into chat, source control, issue comments, or workflow inputs.

## One-time setup on your own trusted computer

Install/use an official JDK containing keytool. Run in a private directory outside the repository:

```bash
umask 077
mkdir -p "$HOME/boothy-signing"
cd "$HOME/boothy-signing"
keytool -genkeypair -alias boothy -keyalg RSA -keysize 3072 -validity 10000 -storetype PKCS12 -keystore boothy-owner.p12
keytool -list -v -alias boothy -keystore boothy-owner.p12
base64 -w 0 boothy-owner.p12 > boothy-owner.base64
```

Choose and retain a strong keystore password when prompted. PKCS12 uses the same password for the key and store. Retain the alias `boothy`. The `keytool -list` output includes the SHA256 fingerprint; copy that fingerprint only into its secret below. Base64 is encoding, NOT encryption. Securely back up the original `.p12` and password separately; losing them can prevent future updates, and exposing both can let someone impersonate releases.

In repository Settings → Secrets and variables → Actions → New repository secret, create exactly:

| Secret | Value |
|---|---|
| `BOOTHY_SIGNING_KEYSTORE_BASE64` | Entire contents of your private `boothy-owner.base64` file |
| `BOOTHY_SIGNING_STORE_PASSWORD` | Keystore password |
| `BOOTHY_SIGNING_CERT_SHA256` | SHA256 fingerprint from keytool; colons accepted |

Repository secrets page: https://github.com/Vickiller-droid/victor-portfolio/settings/secrets/actions

## Build after setup

Open Actions → Boothy Android reliability → Run workflow, choose branch `boothy-reliability-android`, check `signed_release`, run. If GitHub does not show the manual-dispatch control for this branch-only workflow, use an authenticated GitHub CLI:

```bash
gh workflow run boothy-android.yml --repo Vickiller-droid/victor-portfolio --ref boothy-reliability-android -f signed_release=true
```

The verify job runs web/native checks and a release smoke build with a disposable CI fixture key. That fixture APK is deleted, never uploaded, and is NOT an owner-signed installer. Only the separate signed-release job can upload `Boothy-0.2.5-OWNER-SIGNED-APK`. It checks the retained certificate fingerprint before upload and removes its temporary keystore. No automatic key generation or debug-signing fallback occurs for distribution.

## Transition and acceptance

The existing 0.2.4 pilot is signed with a disposable debug key. A different permanent certificate cannot normally update that installed package. Do not promise an in-place update from that debug pilot. Explain and plan the one-time transition before installation; removing the old app deletes local data. Existing users can keep the old pilot until ready.

Before distributing: on a test phone, install a build signed with this permanent key, save settings/items/parking, then install a higher-version build signed with the SAME key without uninstalling. Confirm data survives. Repeat the lock-screen warning, full-minute snooze, and all-items-complete cancellation tests. This phone acceptance has not been performed by CI.

Do not attach either private signing file as a public release asset. Do not use the CI fixture key for people. Keep Google Maps billing paused.

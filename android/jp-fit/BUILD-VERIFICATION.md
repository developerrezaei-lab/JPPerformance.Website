# Verification — 2026-11-08

- Compiled all three application Java sources against the official Android API 36 android.jar with the JDK compiler (Java 17 source/bytecode).
- Ran `WorkoutRulesTest`: 21 checks passed.
- Ran `tests/test_schema.py` against the actual CREATE statements: session lifecycle, unique active session, FK/input constraints, volume and cascade deletion passed using host SQLite. This does not replace an Android database test.
- Parsed manifest/resource XML; no permissions are declared.
- Compiled and linked resources with Android SDK Build Tools 35.0.0 aapt2, desugared/dexed with D8, aligned with zipalign and signed a temporary debug APK with apksigner.
- APK verification passed signature schemes v2/v3. Badging confirms applicationId uk.co.jpperformance.fit, version 0.1.0/code 1, minSdk 26, targetSdk 36 and an exported launcher activity.
- Official downloaded platform/build-tools archive SHA-1 values matched the Android repository metadata. Gradle distribution SHA-256 is pinned in the wrapper configuration.
- `git diff --check` passed.

The complete Gradle assemble/lint pipeline did not run: the wrapper's direct network connection failed and both official distribution download attempts via the configured network route returned 504. The SDK-tools build above verifies Java/resources/dex/packaging/signing; it does not prove that Gradle sync/build or lint will succeed on the user's machine.

No emulator or physical device was available. UI appearance, accessibility, app lifecycle and storage behavior on Android still require the device checklist in TESTING-FA.md. No production keystore, Play Console account or release AAB has been created.

The APK uses a development-only temporary certificate. The certificate is not committed and must not be used for public release. A later local debug build may use a different certificate; export any test data before uninstalling an older test APK to replace it.

# Android native overlays

Tracked sources for Android files that Capacitor sync would otherwise leave as stock defaults.

`scripts/apply-android-native-overlays.sh` copies these into the local `android/` tree after `npx cap sync android` (also hooked from `scripts/update-application.sh`).

| Overlay | Purpose |
|---|---|
| `ApkUpdaterPlugin.java` | In-app APK download + system installer |
| `MainActivity.java` | Registers `ApkUpdater` |
| `AndroidManifest.xml` | `REQUEST_INSTALL_PACKAGES` |
| `file_paths.xml` | Cache path for downloaded APKs |

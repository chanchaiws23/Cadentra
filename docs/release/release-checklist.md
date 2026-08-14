# Cadentra V1 release checklist

## Repository and build

- [ ] `develop` CI is green and the owner has merged the chosen commit to `main`.
- [ ] Version code is unique and version name matches the release notes.
- [ ] Production Supabase migrations and Edge Functions are deployed.
- [ ] Production web origin, OAuth redirect URIs, VAPID/FCM, and OpenAI server secrets are configured.
- [ ] Upload keystore is stored outside Git and its four GitHub Actions secrets are configured.
- [ ] Run **Android release candidate** from `develop` and download the signed AAB artifact.
- [ ] Enrol the app in Play App Signing and upload the AAB to the closed testing track.

## Play Console declarations

- [ ] Complete developer identity verification and app access instructions.
- [ ] Deploy and verify `/privacy.html` and `/delete-account.html` on the production web origin, then add both URLs in Play Console.
- [ ] Reconcile the Data safety form with `play-data-safety.md`.
- [ ] Complete Health apps and Health Connect declarations for steps, sleep, and exercise only.
- [ ] Declare notification use and provide reviewer access to optional integrations.
- [ ] Complete content rating, target audience, ads (No), and government-app declarations.

## Store assets and beta evidence

- [ ] Upload `assets/store/play-icon-512.png` and `assets/store/feature-graphic-1024x500.jpg`.
- [ ] Capture at least two real Android screenshots without browser chrome or test credentials.
- [ ] Use the Thai and English store-listing drafts and verify character limits in Play Console.
- [ ] Run the manual matrix in `docs/product/production-qa.md` on at least one Android 13 device and one Android 16 device/emulator.
- [ ] Closed beta has no blocker crash, data leak, unrecoverable sync loss, or AI write before confirmation.
- [ ] Record final SHA, AAB checksum, tester sign-off, known issues, rollback owner, and release date.

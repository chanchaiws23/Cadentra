# Production QA gate

Run these automated gates for every release candidate:

```text
npm ci
npm run lint
npm run check
npm run check:bundle
npm audit --audit-level=high
apps/android/gradlew assembleDebug
```

The CI workflow repeats these checks on pull requests and on pushes to `develop` and `main`. Its Android job builds from a clean Linux runner. The web entry chunk has a 120 KiB gzip budget; feature pages are loaded on demand.

## Manual release matrix

- Sign in with two accounts and verify that neither can read, update, export, or delete the other's rows.
- Create tasks spanning midnight and repeat the check after changing the profile time zone.
- Make offline task and schedule changes, reconnect, then exercise both local and cloud conflict resolutions.
- Deny notification and Health Connect permissions; confirm that planning remains usable and Settings explains the recoverable state.
- Restart Android, force-stop it, and reboot the device; confirm scheduled notifications resume without duplicate delivery.
- Use TalkBack or a desktop screen reader, keyboard only, 200% font scaling, and reduced motion on Today, Tasks, Calendar, Focus, Insights, Settings, and every dialog.
- Export CSV, JSON, and PDF, then delete the account and confirm user rows, OAuth tokens, registrations, and stored files are gone.
- Generate an AI proposal, reject one, apply only selected changes, and undo; verify no task changes before confirmation.

Record device/OS/browser, test account IDs, result, evidence, and issue link for each run. A release candidate cannot ship with a blocker crash, cross-account data leak, unrecoverable sync loss, or an AI write before confirmation.

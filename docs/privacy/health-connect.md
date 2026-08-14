# Health Connect data handling

Cadentra requests read-only access to steps, sleep sessions, and exercise sessions. Permission is optional and is requested only after the user chooses to connect Health Connect in Settings.

The Android bridge calculates one aggregate per local calendar day. Only `steps`, `sleep_minutes`, `exercise_minutes`, the local date, and the user's time zone are sent to Cadentra's Supabase project. Raw Health Connect records, medical records, and heart-rate data are never uploaded.

Health aggregates are excluded from AI Coach requests by default. The user must separately enable Health data for AI and must opt in again for each proposal request. AI Coach creates a preview proposal only; it cannot write tasks before explicit confirmation.

If permission is denied or Health Connect is unavailable, the app remains usable and reports a recoverable error. A user can revoke Health Connect access from Android settings and can remove cloud data through Cadentra's account-deletion flow.

Before Play release, the Health apps declaration and Data safety form must match this document and list only activity/fitness and sleep data used for personal planning insights.

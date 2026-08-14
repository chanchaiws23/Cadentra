# Google Calendar setup

Cadentra uses a Supabase Edge Function for OAuth and sync. Browser code receives only an authorization URL; client secrets and Google tokens remain server-side.

1. Apply `202608140002_google_calendar_sync.sql` in Supabase.
2. In Google Cloud, enable Google Calendar API and OAuth consent.
3. Add this authorized redirect URI: `https://<project-ref>.supabase.co/functions/v1/google-calendar`.
4. Add Edge Function secrets: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `APP_URL`, and `GOOGLE_CALENDAR_TOKEN_KEY`.
5. Generate `GOOGLE_CALENDAR_TOKEN_KEY` as 32 random bytes encoded with base64. Never put its value in `.env.example` or a client-side `VITE_` variable.
6. Deploy the `google-calendar` Edge Function with the repository's `verify_jwt = false` setting because Google cannot attach a Supabase JWT to the callback. The function validates every POST with `auth.getUser()` and validates GET callbacks with a short-lived, one-time OAuth state.

Imported events are read-only. Cadentra stores only the event fields needed to display busy time and keeps the incremental Google sync cursor on the connection.

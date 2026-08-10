# Supabase setup

Cadentra uses Supabase for authentication and user-owned cloud data. The web
app only needs the project URL and the public anon key. Never place the service
role key in the web app.

## 1. Configure the local app

Copy `.env.example` to `.env.local`, then set:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Use the project URL exactly as shown in **Project Settings > API**. Do not add
`/rest/v1/` to it. `.env.local` is ignored by Git.

## 2. Install the initial database schema

1. Open the project in the Supabase Dashboard.
2. Open **SQL Editor** and choose **New query**.
3. Copy the complete contents of
   `supabase/migrations/202608040001_initial_schema.sql` into the editor.
4. Select **Run** once and confirm that the query completes without an error.
5. Open **Table Editor** and confirm that `profiles`, `tasks`, and `habits`
   exist.

The migration enables Row Level Security for every user-owned table. It also
creates a private trigger function that inserts a matching `profiles` row when
a user signs up.

If the initial schema was already installed, also run the complete contents of
`supabase/migrations/202608100002_offline_idempotency.sql` once. This adds the
retry keys used by the offline mutation queue to prevent duplicate habits,
point transactions, and focus sessions after reconnecting.

## 3. Configure authentication URLs

In **Authentication > URL Configuration**, use:

- Site URL: `http://localhost:5173`
- Redirect URL: `http://localhost:5173/**`

Add the production HTTPS URL before deployment. Keep email confirmation enabled
for production. During local testing, check the confirmation message sent by
Supabase before signing in.

## 4. Verify locally

Run:

```bash
npm run dev
```

Create an account in Cadentra, confirm its email, and sign in. In Supabase,
`Authentication > Users` should show the account and `Table Editor > profiles`
should show one row with the same user ID.

If the app reports that the `profiles` table is missing, repeat step 2 in the
same Supabase project referenced by `VITE_SUPABASE_URL`.

## Server-only provider secrets

Google Calendar client secrets and OpenAI keys are server credentials. Before
those integrations are enabled, store them as Supabase Edge Function secrets;
do not rename them with a `VITE_` prefix and do not commit them.

## Deploy the account-deletion function

The Settings page can export account data immediately through RLS. Permanent
account deletion additionally requires the server-authorized Edge Function:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set ALLOWED_ORIGINS=http://localhost:5173,https://YOUR_PRODUCTION_DOMAIN
npx supabase functions deploy delete-account
```

Hosted Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` to the function environment. Never copy the service
role key into `.env.local` or any `VITE_` variable. The function verifies the
caller's access token, removes files under the user's folder in every bucket,
and then deletes the Auth user so database rows cascade.

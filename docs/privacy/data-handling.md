# Data handling

- Personal tables are isolated by authenticated user ID and PostgreSQL RLS.
- Calendar OAuth credentials are stored only in a server-side encrypted store.
- Health Connect access is opt-in and limited to steps, sleep duration, and
  exercise duration. Cadentra uploads daily aggregates, never raw health records.
- Health information is excluded from AI context unless a separate consent flag
  is enabled. Consent can be withdrawn without disabling core planning features.
- Account deletion removes connected tokens, user rows, exports, and stored files.
- Product analytics must not capture task titles, reflection text, health data,
  calendar content, or AI conversation content.


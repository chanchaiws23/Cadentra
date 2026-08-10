# Cadentra

A personal discipline, planning, habit and focus system for Android and the web.

Cadentra brings daily planning, time blocking, tasks, goals, habits, focus
sessions, reflection, insights, and human-approved AI planning into one calm
workspace. Thai is the default product language and the interface is prepared
for English localization.

## Status

The repository contains the functional product foundation and an interactive
local-first web application. Supabase migrations, domain rules, Android runtime
configuration, CI, and product/security documentation are included. Calendar,
Health Connect, push delivery, and hosted AI calls require provider credentials
and production console configuration.

## Start locally

```bash
npm install
npm run dev
```

Run the complete validation suite with `npm run check`.

## Development workflow

`main` and `develop` are the only permanent branches. Each independently testable
change is developed on a short-lived `feature/*`, `fix/*`, or `chore/*` branch and
merged into `develop` through a pull request after CI passes. Only the repository
owner promotes `develop` to `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Repository layout

- `apps/web` — responsive React application
- `apps/android` — Capacitor Android runtime
- `packages/domain` — shared types and discipline rules
- `packages/data` — Supabase and local persistence adapters
- `packages/ui` — shared design tokens
- `supabase` — database migrations and edge functions
- `docs` — architecture, privacy, and product decisions

## Configuration

Copy `.env.example` to `.env.local` and fill only the values needed locally.
Never commit credentials. The app fails closed when Supabase is not configured
so sample data can never be mistaken for the user's cloud data.

For first-time cloud setup, follow the [Supabase setup guide](docs/setup/supabase.md).

## License

This is a public source-visible repository, **not open source**. No rights to
use, copy, modify, or redistribute the code are granted. See [LICENSE](LICENSE).

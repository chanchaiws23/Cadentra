# Google Play Data safety draft

This draft must be reconciled with the final production configuration in Play Console before submission.

| Data category | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Email address and user ID | Yes | No | Account management and authentication | No |
| Tasks, goals, habits, reflections, and focus activity | Yes | No | Core app functionality, sync, insights, export | No |
| Calendar events | Yes, when connected | No | User-requested calendar sync | Yes |
| App interactions and diagnostics | Only if a diagnostics provider is later enabled | No by default | Reliability | Yes |
| Steps, sleep, and exercise | Daily aggregates only, when connected | No | Personal planning insights | Yes |
| AI prompt context | Selected planning data; health only with separate consent | Sent to the configured AI processor to fulfil the request | AI Coach proposal generation | Yes |
| Push token | Yes, when notifications are enabled | Sent to the push delivery provider | Notifications | Yes |

Cadentra does not collect precise location, contacts, photos, raw Health Connect records, medical records, financial data, or advertising identifiers in V1. Data is encrypted in transit. Supabase stores account data at rest. Users can export and request deletion inside Settings.

Before submission, add links to the public privacy policy and account-deletion page, confirm the production Supabase region and retention policy, name all processors, and verify that any future analytics/crash SDK is reflected here before enabling it.

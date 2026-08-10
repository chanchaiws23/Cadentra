# Offline sync and conflict handling

Cadentra caches the latest Supabase snapshot per user and stores offline
mutations in an ordered queue. Task, habit, profile, points, and focus changes
update the cached snapshot immediately, then replay after the browser reports
that the network is online.

Every retried create or ledger write keeps the same idempotency key. A response
lost after a successful server write can therefore be retried without creating
a duplicate.

Task status changes use the task's `updated_at` value as an expected version.
Supabase only applies the update when that version still matches. If another
device changed the task first, sync stops and the UI asks the user to choose:

- **Use local data** applies the queued status without the stale expected
  version, then continues replaying dependent point transactions.
- **Use cloud data** discards the queued status and its dependent task point
  transactions, then reloads the current Supabase snapshot.

Cadentra never resolves this conflict with silent last-write-wins behavior.
Account export and permanent account deletion remain online-only operations.

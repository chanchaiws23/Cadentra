# Architecture

Cadentra is a TypeScript monorepo. The responsive React client is the primary
product surface and is packaged for Android with Capacitor. Shared domain rules
do not import UI or infrastructure code. Supabase provides authentication,
PostgreSQL, storage, and server-side functions.

The client writes to a local persistence adapter when cloud configuration is
absent. Production sync uses server timestamps, idempotency keys, soft deletion,
and per-user Row Level Security. Calendar tokens and AI credentials never reach
the browser. Imported events are read-only unless the user explicitly exports a
Cadentra time block.

AI is separated into proposal and apply operations. The proposal service cannot
mutate tasks. A user previews individual changes, accepts or rejects them, and a
subsequent transaction records both the mutation and its inverse for undo.

Planning mutations use a session-scoped command history. Each completed status
or soft-delete operation records an inverse gateway mutation, so Undo and Redo
also pass through the offline queue instead of changing UI state only. A command
moves between history stacks only after its inverse succeeds. History is cleared
when the signed-in account changes, and stale toast actions cannot undo a newer
command. Create operations join this history only after their gateway contract
returns the generated entity ID; their inverse is a soft delete and Redo restores
the same entity instead of creating a duplicate.

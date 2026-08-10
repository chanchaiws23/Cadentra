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


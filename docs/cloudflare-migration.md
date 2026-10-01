# Runtime notes

The application is a Next.js app. Local development stores data in SQLite. The schema migrations for the hosted database are in `cloudflare/migrations/`.

Lesson replies use OpenRouter. Profile images still use the existing upload path in the application code.

`scripts/export-cloudflare-data.mjs` can write a SQL snapshot from a local database. Do not commit that snapshot. It can contain account records.

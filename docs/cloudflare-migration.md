# Preparing to move Melearn to Cloudflare

The target the user chose: run the app on Workers, use D1 for accounts, history, and progress, R2 for images, and Workers AI for replies, and bring the existing data along. The user selected the Melearn.vmi account and `chat.melearn.io`. Runtime keys and a production session secret are now stored in Cloudflare Secrets Store; see `docs/public-repo-and-deployment.md`. D1 is created in APAC with its schema applied. A route-free bootstrap Worker version was uploaded with D1 and Secrets Store bindings; Cloudflare reported no deployment targets. R2 remains unavailable until it is enabled for the account in the Cloudflare Dashboard. The application itself is not deployed; see `cloudflare/wrangler.jsonc` and `cloudflare/bootstrap-worker.mjs`.

## What is already prepared

- `cloudflare/migrations/`: a D1 schema that can hold the current data, including `avatar_url`, `education_stage`, and `preferred_subject`. Apply every migration in order.
- `scripts/export-cloudflare-data.mjs`: reads SQLite read-only in one snapshot and writes INSERT statements to a new file with mode 0600. It does not print user data, and it does not overwrite the source file or the source database.
- The exported SQL has been loaded back into the new schema with sample data, including Thai text, quote characters, a profile image, and chat history.

Example command for the data move (not yet run against a real user database):

```sh
npm run db:export:cloudflare -- --database '/absolute/path/melearn.db' --output '/private/path/melearn-import.sql'
```

The export contains accounts and password hashes. Keep it out of Git and out of logs. Import into a new D1 database before opening it to users. If the import fails, fix the cause or create a fresh staging database. Do not rerun the import on a database that is only partly loaded without checking it first.

Pending wallet challenges and `data/session.secret` are not migrated. Wallets must sign a new message, and users must sign in again after the move. Accounts and history stay. Existing images remain in `avatar_url` in the export. After an R2 adapter exists, move the images to R2 and update the URLs inside D1.

## Runtime work still to do

- Add an OpenNext adapter for the current Next.js version, and set Workers bindings after the resource names exist.
- Change synchronous `node:sqlite` queries to asynchronous D1 queries across auth, viewer, learning, and purchases.
- Change callback transactions to a D1 batch with SQL guards so nonce, quota, and duplicate messages are still enforced in the database.
- Use a Workers `SESSION_SECRET`. Stop depending on a local file, and check that password hashing works on workerd while keeping existing password hashes.
- Serve images from R2, and resize or validate them in a way Workers supports. The current native `sharp` path still has to change.
- Move model calls to a Workers AI binding. Point rate limits and diagnostics at Cloudflare, and stop depending on process memory or local files.
- Test MetaMask, Phantom, and Solflare auth, plus the learning and profile flows, on workerd before deploy.

The development app still uses SQLite and the current AI provider. This document and these migrations do not mean the app is ready to run on Workers.

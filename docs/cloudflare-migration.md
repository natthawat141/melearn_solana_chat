# Preparing to move Melearn to Cloudflare

The target the user chose: run the app on Workers, use D1 for accounts, history, and progress, R2 for images, and Workers AI for replies, and bring the existing data along. The user selected the Melearn.vmi account and `chat.melearn.io`. Runtime keys and a production session secret are now stored in Cloudflare Secrets Store; see `docs/public-repo-and-deployment.md`. D1 is created in APAC with its schema applied. The R2 bucket `melearn-chat-uploads-prod` is created in APAC and declared as the `UPLOADS` binding. A route-free bootstrap Worker version was uploaded with D1, R2, and Secrets Store bindings; Cloudflare reported no deployment targets. The application itself is not deployed; see `cloudflare/wrangler.jsonc` and `cloudflare/bootstrap-worker.mjs`.

## What is already prepared

- `cloudflare/migrations/`: a D1 schema that can hold the current data, including `avatar_url`, `education_stage`, `preferred_subject`, and the existing quota `bonus` column. All five migrations are applied.
- `scripts/export-cloudflare-data.mjs`: reads SQLite read-only in one snapshot and writes INSERT statements to a new file with mode 0600. It does not print user data, and it does not overwrite the source file or the source database.
- The active `data/melearn.db` snapshot was imported into D1. Counts match: 7 users, 112 guests, 7 conversations, 25 messages, 7 progress records, and 5 quotas. Purchases and entitlements were empty. There are no orphan messages. The source SQLite database was not modified.

Example command for the data move (not yet run against a real user database):

```sh
npm run db:export:cloudflare -- --database '/absolute/path/melearn.db' --output '/private/path/melearn-import.sql'
```

The export contained accounts and password hashes and was kept in a mode-0600 temporary file outside the repository; the file was removed after import and count verification. `credit_purchases` was a legacy table with zero rows. Pending wallet challenges and email verification/reset codes were intentionally not imported because they expire or must be reissued.

Pending wallet challenges and `data/session.secret` are not migrated. Wallets must sign a new message, and users must sign in again after the move. Existing `avatar_url` values were preserved in D1; one is a data URL and two are external HTTPS URLs. New uploads and the existing image data still need an application R2 adapter before the bucket serves profile photos.

## Runtime status

- OpenNext is configured for the existing Next.js app and deployed through `wrangler.jsonc`.
- Auth, viewer, learning, quota, email-code, wallet, and purchase queries use an async D1 adapter on Workers and keep SQLite only for local development.
- `chat.melearn.io/*` is attached as a Worker Route on the `melearn.io` zone. The hostname already had DNS records, so a route was used instead of deleting the records for a Custom Domain.
- Change callback transactions to a D1 batch with SQL guards so nonce, quota, and duplicate messages are still enforced in the database.
- Session signing reads the Workers Secrets Store binding; local development still falls back to `data/session.secret`.
- New profile image uploads still use the existing data URL path. The R2 binding is provisioned, but an R2 image adapter should be added before storing larger user media.
- Serve images from R2, and resize or validate them in a way Workers supports. The current native `sharp` path still has to change.
- Move model calls to a Workers AI binding. Point rate limits and diagnostics at Cloudflare, and stop depending on process memory or local files.
- Test MetaMask, Phantom, and Solflare auth, plus the learning and profile flows, on workerd before deploy.

The development app still uses SQLite and the current AI provider. This document and these migrations do not mean the app is ready to run on Workers.

# Public repository and Cloudflare deployment

The competition source is public at https://github.com/natthawat141/melearn_solana_chat. Keep one source repository. GitHub Actions performs code verification without production credentials. Cloudflare Workers Builds will build and deploy the same source after the Workers runtime migration is complete.

## Current state

- GitHub remote: `github`; the `origin` remote points to the older Cursor Git service.
- Cloudflare account: Melearn.vmi. The account ID and intended hostname `chat.melearn.io` are recorded in `cloudflare/deployment-target.json`. That file contains public resource identifiers and ordinary configuration, never secret values. It is a deployment manifest, not a working Wrangler configuration.
- Cloudflare Secrets Store `melearn-chat` contains the active AI, Tavily, Supadata, and Resend API keys, plus a newly generated production session secret. The names are prefixed `MELEARN_CHAT_` to isolate this application. Their bindings are declared in Wrangler for the private bootstrap Worker.
- Local `.env.local` and the SQLite database remain private and usable for development. Legacy Supabase/Dynamic/MoonPay credentials were not uploaded because this app no longer uses them.
- D1 `melearn-chat` exists in APAC and all four schema migrations are applied; it is empty and has no imported user records.
- Worker `melearn-chat` has a bootstrap version uploaded with D1 and Secrets Store bindings. `workers.dev`, preview URLs, and routes are disabled, and Wrangler confirmed no deployment targets. The bootstrap responds with migration-pending if later given a route; it is not the app deployment.
- R2 is not enabled for the account yet, so `melearn-chat-uploads-prod` is not created and no R2 binding is present. Enabling R2 requires signing into the target Melearn.vmi Cloudflare account in its dashboard; Wrangler returns API error 10042 until then.
- The app has not been deployed to Workers. `chat.melearn.io` has not been attached. SQLite, native image processing, and other runtime dependencies still need the migration described in `docs/cloudflare-migration.md`.

## Before publishing source

```sh
npm run check:public -- --history
npm run lint
npm test
npm run typecheck
```

The public-repository guard checks working files, staged blobs, private paths, known local credential values, common token patterns, and (with `--history`) reachable Git history. It reports filenames only. This is a preventive check, not a guarantee that every possible secret format can be recognized. Review unfamiliar configuration before publishing it.

`.gitignore` excludes environment files, credentials, local databases, private D1 imports, and build artifacts. Only `.env.example` is published, with empty credential placeholders. Ignoring a file does not remove an older committed copy; do not bypass a failed history check.

Firebase's web app configuration is intentionally client-visible. Firebase rules, Google provider settings, authorized domains, and API restrictions control its use; it is not a server credential.

## CI and CD

`.github/workflows/ci.yml` runs on pushes and pull requests with read-only repository permissions. It scans for accidental credentials, installs the lockfile dependencies, and runs lint, tests, and TypeScript checks. Actions are pinned to commit SHAs. It uses neither deployment tokens nor app secrets.

After the app runs on workerd with D1/R2:

1. Add and validate the real Wrangler/OpenNext configuration and bind the stored secrets. Secrets Store bindings return secret values asynchronously; adapt runtime access rather than assuming these objects are strings in `process.env`.
2. Connect only this repository in Cloudflare Workers Builds under the Melearn account. Set `main` as the production branch, using the validated build/deploy commands from the adapter. Do not connect it before the runtime is ready.
3. Set ordinary runtime variables from the deployment manifest. Keep runtime secrets out of build-time variables and static assets. Cloudflare documents build variables and runtime variables as separate settings.
4. Use staging resources and secrets for preview builds. Never expose production secrets to untrusted pull-request code. Initially use version uploads/manual promotion; promote a production release only after its GitHub CI passes. Cloudflare Builds does not automatically make GitHub CI a deployment gate.
5. Attach `chat.melearn.io` after verifying the zone and existing DNS destination. Do not replace an existing live record blindly.

No separate private deployment repository is needed for this design. If GitHub Actions later performs deployment, give its protected production environment a narrowly scoped Cloudflare deployment token; keep the app's runtime keys on Cloudflare.

## Data migration

Bring the existing accounts and chat history into D1 using the private export tool. Exported SQL includes password hashes and user content: never commit it or upload it as a public CI artifact. Keep the current database until the imported data and application flows are verified. The new production session secret means users sign in again after migration.

References: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [build configuration and variables](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Secrets Store integration](https://developers.cloudflare.com/secrets-store/integrations/workers/), [Firebase API keys](https://firebase.google.com/docs/projects/api-keys).

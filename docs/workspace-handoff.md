# Handoff: one project checkout

Read this with `AGENTS.md` before editing files or opening a preview.

## Canonical folder

```text
/Volumes/Extreme SSD/bill_dev/melearn_solana_chat
```

The nested path `melearn_solana_chat/melearn_solana_chat` is a symlink back to the root so tools that remember the old path still open this checkout. It is not a second project. Do not replace it with a directory, clone, or new copy, and do not walk the symlink recursively.

Before starting work, check:

```bash
pwd -P
git rev-parse --show-toplevel
git status --short
```

The first two commands must both name the physical folder above. Keep uncommitted work. If the SSD is not mounted, stop editing the repository. Do not create a replacement directory under `/Volumes`.

## What was fixed on 27 September 2026

Two Git repositories were nested. The outer one had the new landing page; the inner one still had the old pages. The preview on port 43123 was running from the inner copy, and the Cursor workspace pointed there, so the old UI showed even though the new code was in the outer checkout. There is no evidence that identifies which AI created the copy or switched the server.

The whole inner directory, including Git, uncommitted work, environment files, and the previous data, was moved to:

```text
/Volumes/Extreme SSD/bill_dev_archives/melearn_solana_chat-duplicate-20260927-160150
```

Use that only to recover something. Do not open it as the working project or run a server from there. Do not copy its database or environment files over the active project automatically.

## How to run and check the preview

Use `npm run dev` while editing UI so the page follows the code. For a production preview, stop the dev server, then use `npm run build` and `npm start`.

Both dev and start go through `scripts/run-next.mjs`, which resolves the real directory of the script, uses the repository root as the working directory, refuses a repository nested inside itself, and checks port 43123 before starting. Open `http://127.0.0.1:43123/`.

Do not call `next dev` or `next start` directly to skip that check. Do not run the dev server and the production preview at the same time, and do not quietly move to another port.

If the page looks like an old version:

1. Check the real path and Git status before changing code.
2. Check the port with `lsof -nP -iTCP:43123 -sTCP:LISTEN`.
3. Use the PID you found to check its directory with `lsof -a -p <PID> -d cwd`. Do not print the command line or environment, which may contain secrets.
4. If it is running from the wrong directory, stop only that preview, then run `npm run dev` from the canonical root. Do not kill every Node or editor process.
5. If an old production build is being served, switch to dev or rebuild for the task, then reload and check the change briefly.

Do not fix this by resetting Git, deleting uncommitted work, restoring old pages, or creating another repository.

## Code and rules to keep

- `app/(public)/`: landing, login, pricing; `app/(user)/`: classroom and account
- `components/landing/` and `content/landing.ts`: public UI and copy
- A visitor can see a mockup, but a real chat and a submitted answer require login, both in the page and in the API
- Pro is sample pricing and sample benefits. There is no sale and no payment
- Use the original image logo in the navbar and footer, with no separate printed Melearn name beside it
- The large hero keeps its background and the math conversation demo. The tone is light blue and white, with no yellow decoration
- Do not use impeccable, and do not add decorative labels above headings, such as “พื้นที่เล็ก ๆ สำหรับความสงสัยของคุณ”

This document is an instruction for agents. It is not a lock that every tool enforces. The check at startup helps when the defined npm scripts are used.

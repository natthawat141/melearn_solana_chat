# Melearn Chat

For an AI agent or the next person taking over this work, read [AGENTS.md](AGENTS.md) and the [workspace handoff](docs/workspace-handoff.md) before starting.

The interior UX plan and the guest, auth, and setup flow are in [docs/interior-ui-plan.md](docs/interior-ui-plan.md). That file is a handoff plan, not a claim that the work is finished.

The running shape of the app is in [docs/architecture.md](docs/architecture.md). Open [docs/melearn-architecture.html](docs/melearn-architecture.html) in a browser for the diagram.

Character teachers for this Solana Colosseum demo. Ray (English) and Pi (mathematics) are available to chat, ask for a hint, ask for an example, practice, and save progress. Nova, Bit, and Time are shown as coming soon.

During the demo every lesson is free. Nothing is charged. One account can send 10 messages in 24 hours, then waits for the quota to reload. Visitors can see the landing page and a lesson preview, and must sign in before a real chat. The Pro package on the landing page is sample content and is not for sale.

## Run locally

Node.js 22 or newer is required.

There is one active project, at `/Volumes/Extreme SSD/bill_dev/melearn_solana_chat`. The nested `melearn_solana_chat/` path is a symlink back to that root so tools that remember the old path still land in the same checkout. It is not a second copy. Do not clone or copy the project inside itself.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Google sign-in uses Firebase Authentication. Enable the Google provider and authorize the local hostname used by the browser (`localhost` or `127.0.0.1`) in Firebase Authentication settings. Add the production hostname there before launch.

`npm run dev` and `npm start` always use the repository root, and they stop with an error if port 43123 is already taken. Use `npm run dev` while editing UI so the page follows the code without a fresh production build.

An older copy, including its Git history, uncommitted work, `.env.local`, and previous data, is kept only for recovery at `/Volumes/Extreme SSD/bill_dev_archives/melearn_solana_chat-duplicate-20260927-160150`.

```bash
npm test
npm run lint
```

Open lesson replies call GPT-6 Luna Pro through OpenRouter (`openai/gpt-6-luna-pro`). Copy `.env.example` to `.env.local` and set `AI_API_KEY` from [openrouter.ai/keys](https://openrouter.ai/keys). Without a key, the server uses the lesson tutor. Set `TAVILY_API_KEY` as well when the model should look up current facts, news, prices, statistics, or sources. Found links are attached to the answer. Without that key, the app does not search the web. Set `SUPADATA_API_KEY` when a message that contains a YouTube link should include that video's existing captions. Hints, examples, practice, and answer checks stay on the server and are not sent to the model or to Supadata.

The site uses shadcn/ui, including the sidebar, and can switch between dark and light themes. The main palette stays Melearn white and light blue.

Solana devnet transaction checks with `@solana/kit` and Wallet Standard are still in the project. This demo path does not collect payment, and a chat message cannot unlock a lesson.

The live store is SQLite at `data/melearn.db`. A Cloudflare D1 export is prepared in `cloudflare/` and is not the running database. See [docs/cloudflare-migration.md](docs/cloudflare-migration.md).

Public-repo checks, CI, the selected Cloudflare account, stored production secrets, and current Cloudflare resources are documented in [docs/public-repo-and-deployment.md](docs/public-repo-and-deployment.md). GitHub CI checks code without production credentials; deployment will use Cloudflare Workers Builds after the runtime migration.

## Demo path

1. The home page introduces the product, teachers, a lesson sample, packages, and FAQ on one page. Switching teachers and pressing hint in the sample does not call the model.
2. Start learning, register or sign in at `/login`, then enter the classroom. Choosing a teacher on the home page returns to that lesson after sign-in.
3. Chat, ask for a hint, ask for an example, or try it yourself. The sidebar goes to teachers, chats, learning, pricing, and profile.
4. After 10 messages the server stops accepting more until 24 hours have passed. The Pro top-up button does not charge anyone.
5. `/pricing` returns to the package section on the landing page and does not use the app sidebar.

## Data

Chats, profiles, progress, and entitlements live in SQLite at `data/melearn.db`. On-chain data, when a test payment is built, is only a test SOL transfer. Student names and chat text are not written on-chain.

The 10-message quota for real chat is tied to the account. The 24-hour window starts at the first message of that window. Older guest data can still be migrated into an account by the existing logic, but starting a conversation, sending a message, and submitting an answer require a signed-in session.

Wallet sign-in (MetaMask, Phantom, Solflare) is verified on this server. See [docs/wallet-login.md](docs/wallet-login.md).

## Screen layout

- `app/(public)/`: landing page, login, and the pricing entry, with the public header and footer
- `app/(user)/`: teachers, learning, chat, and profile, with the app layout
- `components/landing/`: components and CSS for public pages only
- `content/landing.ts`: Thai and English copy, including the mock conversation and sample packages
- `public/landing/math-background.webp`: hero background from image generation; the prompt is in `docs/landing-image.md`

Route groups do not change the existing URLs. Splitting directories is not an access control: `/learn/...` can be previewed by a guest, and chat APIs check the session before they run.

The introduction and percentage lessons come from the Dev Kit. The drink-order and discount lessons are demo content and are free during this period.

Source specs are in `docs/specs/`. Color tokens are in `design/tokens.json`.

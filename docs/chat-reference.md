# Chat layout reference

Date: 28 September 2026

Use https://www.librechat.ai/ as the reference for the chat area.

Chat history sits at the bottom of the shadcn Sidebar, in the same bar as the app menu. The app menu stays at the top. Do not build a separate history bar.

Follow the structure visible in that site's chat room:

- History is on the left of the conversation
- New chat
- Search chats
- Group by day: today, yesterday, previous 7 days, previous 30 days, older
- On a phone, open history from the side panel

Teachers, lessons, quota, and the sign-in step before the first message stay Melearn's. This reference is for the chat layout the user sees. It is not a request to bring over LibreChat's agents, MCP, or code runner.

## General chat update — 1 October 2026

The user approved a compact sidebar and assistant-ui for `/chat`:

- Remove Main menu, Learner, the redundant Chats row and Back to homepage.
- Keep New chat, search and date groups in the existing shadcn Sidebar.
- History uses one truncated line, a soft active background and a `⋯` dropdown.
- History actions include Open in new tab, Copy chat link, Rename, and Delete.
- The empty greeting and composer sit together in the center; the composer
  stays at the bottom once messages exist. Keep language and theme controls.
- Use assistant-ui ExternalStoreRuntime with the existing authenticated JSON
  API, quota and client message idempotency keys. Keep MessageMarkdown for math.

Components checked: existing Sidebar, DropdownMenu, Button, InputGroup, Alert,
Tooltip, LanguageSwitcher, ThemeToggle and MessageMarkdown. Loaded the official
Radix thread registry via shadcn and adapted its thread/viewport/composer/message
primitives. The full template includes attachment, voice, tool, feedback and
branch controls that Melearn's current API does not support; these were omitted.
No parallel sidebar or backend runtime was introduced. Lesson chat is unchanged.

Verification for this round is TypeScript and targeted lint; the user requested
that they perform browser/UI testing themselves.

Follow-up: add a compact Choose a teacher sidebar link to the existing `/app`
home page (Ray and the other teachers). Remove General chat's title and top
header; move its existing language/theme controls to the sidebar footer. Keep a
standalone mobile sidebar trigger so navigation remains accessible on phones.

Theme follow-up: `/chat` must allow the existing next-themes choice. Show the
shared language/theme controls on all app pages, including lesson chat and the
collapsed sidebar. App light surfaces use white `#FFFFFF`; dark surfaces use
neutral charcoal (`#181818` conversation, `#242424` sidebar, `#2B2B2B` composer)
instead of navy. Scope palette tokens to the app layout, including portalled
menus/dialogs, while preserving the public landing palette.

Settings follow-up: `/profile` is the unified Settings page. Reuse installed
Tabs (compact category navigation), Card without outer rings, Field/Input,
profile/avatar and learning-preference components, plus existing language/theme
controls. Categories are General, Account, Learning preferences, Learning
progress and Account controls. Remove duplicate sign-out actions; preserve the
existing save/upload/wallet/history APIs and deletion confirmation. Both app
palettes apply. No UI/browser verification requested by the user.

Chat management follow-up: history `⋯` now includes Rename and Delete with a
confirmation dialog. Custom names persist in `conversations.title`; migration
`cloudflare/migrations/0006_conversation_title.sql` must accompany deployment.
The local SQLite schema upgrades existing databases additively. Mutations are
scoped to the authenticated owner. Deleting a chat deletes its messages but
preserves progress, purchases, entitlements and quota. An open deleted chat
returns to `/chat`. Brand accents use pastel blue on buttons and selected rows;
conversation backgrounds remain white in light mode and charcoal in dark mode.

Three-theme follow-up: the shared ThemeToggle and next-themes provider offer
Melearn (white with pastel blue accents), Light (white/grey monochrome), and
Dark (charcoal/grey monochrome). Melearn is the default for new visitors;
existing saved light/dark choices remain valid. The app conversation background
stays white in both light variants. All three choices are available in the
sidebar and Settings and persist through the existing theme provider. Public
landing pages keep their established palette.

Settings consolidation follow-up: use three categories instead of five:
General (profile/account, language, theme, sign-out and history management),
Learning preferences, and Learning progress. Remove language/theme shortcuts
from the sidebar. Settings uses the shared LanguageSwitcher with a labelled
rectangular dropdown; the public header keeps its compact variant. ThemeToggle
now composes installed ToggleGroup/Item as three named theme preview cards.
Increase category spacing and the gap between settings navigation and content.
Preserve save endpoints, theme persistence and destructive confirmations.

Responsive follow-up: on phones, keep the general-chat composer at the bottom
with safe-area padding and put the greeting in the remaining reading space.
Desktop retains the centered empty-chat layout. Limit the mobile heading width,
use a compact auto-growing input and a 44px send/menu target, and contain long
messages horizontally. The app shell must allow its flex children to shrink.
Settings uses stacked or wrapping categories until there is enough room for a
second navigation column at `xl`; keep the existing Sidebar/Sheet, Tabs,
InputGroup and assistant-ui primitives. Viewport configuration requests content
resizing for supported mobile keyboards and preserves browser zoom.
Verification is TypeScript, targeted lint and deployment build; the user handles
browser/UI verification, including mobile keyboard behavior.

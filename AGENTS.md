# Workspace

- Before editing files or starting a server, read `docs/workspace-handoff.md`. These instructions apply to every AI agent working in this repository, including agents entering through the legacy path.
- The repository root is the only active Melearn source. On this machine it is `/Volumes/Extreme SSD/bill_dev/melearn_solana_chat`.
- Verify `pwd -P` and `git rev-parse --show-toplevel` before working. Both must identify that physical directory. A folder with the same name is not proof that it is the correct checkout.
- `melearn_solana_chat/` inside the root is a compatibility symlink to the root, not another project. Do not replace it with a directory, clone/copy the repository into itself, or follow the link recursively.
- Use `npm run dev` for local UI work and `npm start` after a production build. Both use `scripts/run-next.mjs`, the canonical directory, and port 43123. Do not bypass this runner with direct Next commands or silently choose another port.
- If the preview shows old UI, inspect the listening process's working directory first. Do not restore old source, create another checkout, or overwrite current work to fix a server-path problem.
- Stop only the identified preview when a restart is necessary. Do not kill all Node or editor processes.
- The historical duplicate is preserved outside this repository under `/Volumes/Extreme SSD/bill_dev_archives/`. Do not run or edit that backup as the active app.
- Preserve uncommitted changes. Do not reset, clean, delete backups, or copy archived databases/environment files over the active project without an explicit user request.

# Product structure

- Public pages live in `app/(public)` and use `components/landing`. Application pages live in `app/(user)`; route groups preserve the existing URLs.
- Guests may open `/learn/[lessonId]` to preview the classroom. Render a static greeting without creating a conversation or consuming quota. Sending a message or requesting hints/examples/practice opens a login/register Dialog; real chat and lesson submissions require server-side authentication.
- First-time account setup belongs on `/setup` after authentication, not on `/app`. Save learning preferences per account and preserve the selected lesson through login and setup.
- Pro pricing is mock content, not an available purchase or payment flow.

# UI

- Do not use impeccable.
- Never add decorative eyebrow, kicker, or introductory labels above hero headings, section headings, cards, or other components. Examples include “พื้นที่เล็ก ๆ สำหรับความสงสัยของคุณ”. Start with the actual heading and useful content. Functional form labels and factual status indicators are separate.
- Keep the original image logo in the public navbar and footer, without a separate Melearn text wordmark.
- Keep the landing bright light blue and white, with restrained dark text/shadows; no yellow decoration. Preserve the large illustrated math-conversation hero unless the user asks to change it.
- Keep verification proportional to the change; the user prefers a brief visual check for small UI edits.
- Public and app headers must share `LanguageSwitcher` and `ThemeToggle`. Compose existing `components/ui/button` and `components/ui/dropdown-menu`; do not add a parallel native select or a second settings implementation.
- Keep action buttons pastel blue with readable dark text. Theme changes should interpolate colors smoothly and respect reduced motion; do not re-enable `disableTransitionOnChange`.
- Reply in Thai by default and report observed results rather than assumed success.

# Component workflow

- The user paused implementation and requested a detailed handoff plan only. Do not continue coding from that planning request. Partial changes made before the interruption are unaccepted work in progress; review them against `docs/interior-ui-plan.md` when a separate development task is assigned.

- Before writing UI, inventory `components/ui` and run `npx shadcn@latest info --json`. Reuse existing shadcn components first.
- If a suitable component is missing, read its official docs and add it through `npx shadcn@latest add <component>`. Do not overwrite customized components or reinstall the preset.
- Only write custom UI when an appropriate existing/registry component cannot meet the requirement; document why. Compose business behavior around library components rather than recreating controls.
- Login/register and setup use shadcn Card, Field, Input, Button, ToggleGroup, Alert, and Spinner. Use semantic theme tokens, never fixed white surfaces that break dark mode.
- Read `docs/interior-ui-plan.md` before changing application pages. The landing design is accepted; preserve it except for links needed by the agreed access flow.

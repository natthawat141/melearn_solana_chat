# Workspace

- Before editing files or starting a server, read `docs/workspace-handoff.md`. These instructions apply to every AI agent working in this repository, including agents entering through the legacy path.
- The repository root is the only active Melearn source.
- Verify `pwd -P` and `git rev-parse --show-toplevel` before working. Both must identify that physical directory. A folder with the same name is not proof that it is the correct checkout.
- `melearn_solana_chat/` inside the root is a compatibility symlink to the root, not another project. Do not replace it with a directory, clone/copy the repository into itself, or follow the link recursively.
- Use `npm run dev` for local UI work and `npm start` after a production build. Both use `scripts/run-next.mjs`, the canonical directory, and port 43123. Do not bypass this runner with direct Next commands or silently choose another port.
- If the preview shows old UI, inspect the listening process's working directory first. Do not restore old source, create another checkout, or overwrite current work to fix a server-path problem.
- Stop only the identified preview when a restart is necessary. Do not kill all Node or editor processes.
- Preserve uncommitted changes. Do not reset, clean, or copy databases or environment files over the active project without an explicit user request.

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
- Landing navigation uses `components/landing/marketing-header.tsx`; app navigation uses `components/app-shell.tsx`. Keep these navigation components separate. Landing navigation must not render a theme toggle; `ThemeToggle` belongs in the app header. Reuse `LanguageSwitcher` and existing `components/ui/button` and `components/ui/dropdown-menu` primitives; do not add a parallel native select or a second settings implementation.
- Keep action buttons pastel blue with readable dark text. Theme changes should interpolate colors smoothly and respect reduced motion; do not re-enable `disableTransitionOnChange`.
- Reply in Thai by default and report observed results rather than assumed success.
- Use https://www.librechat.ai/ as the chat reference. Read `docs/chat-reference.md` before changing chat screens.

# Component workflow

- **Mandatory for every agent and delegated agent: load and reuse components before creating UI.** Inventory `components/ui` and shared business components, read the relevant implementations, and run `npx shadcn@latest info --json` before writing UI.
- If an installed component or block meets the requirement, import and compose it. Do not create a parallel control, copy, or visual imitation.
- If nothing installed is suitable, search the official/library registry, read its docs, and load the source with `npx shadcn@latest view <registry-item>`. Add missing components through `npx shadcn@latest add <component>` before using them. Do not overwrite customized components or reinstall the preset.
- Create custom UI only after confirming no existing or registry component can meet the requirement. Record what was checked and why it cannot be reused in the handoff. Compose business behavior around library components rather than recreating controls.
- Include this components-first workflow in every delegated UI task. Tool-specific instruction files must reference this root `AGENTS.md` as the canonical rule; do not maintain competing copies.
- Login/register and setup use shadcn Card, Field, Input, Button, ToggleGroup, Alert, and Spinner. Use semantic theme tokens, never fixed white surfaces that break dark mode.
- Read `docs/interior-ui-plan.md` before changing application pages. The landing design is accepted; preserve it except for links needed by the agreed access flow.

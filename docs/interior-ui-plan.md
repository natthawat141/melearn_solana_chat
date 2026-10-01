# Interior UX plan

Date: 27 September 2026

This file records the UI plan used while the classroom was being built. The running application is the source of truth.

## 1. Goal and scope

The landing page is accepted. The next round is to bring the interior up to the same quality and consistency as the public pages, by fixing the path into a lesson, registration, profile setup, and components that do not follow the theme.

Required outcomes:

1. A visitor can open a teacher page, a lesson, and the conversation room without logging in.
2. Before sending a message, asking for a hint, asking for an example, or starting practice, they must log in or register.
3. After a new registration, learning-profile setup is its own step, separate from `/app`.
4. After auth and setup, return to the teacher and lesson that were selected. Do not dump the user on the home page without a reason.
5. The main app page helps someone choose what to study and continue. It does not mix in a level questionnaire.
6. Login, register, and setup use shadcn/ui components that are already installed, composed together.
7. Light and dark share the same semantic tokens. There is no locked white surface or text color that becomes unreadable.
8. The AI that continues the work uses the single canonical repository and checks components before writing new ones.

Out of scope: redesigning the landing page, changing the AI tutor or grading, adding real payments, a production deploy, several learners inside one account, or rebuilding the database without a need.

## 2. Areas covered by the plan

| Area | State at handoff | What the next person must do |
| --- | --- | --- |
| `/learn/[lessonId]` | A static guest greeting preview was started | Confirm it does not create a conversation and does not use quota or the model |
| `ChatRoom` | A login/register Dialog before send was started | Check every action, an expired session, and returning to the lesson |
| LoginPanel | A move to Card, Field, Input, and Button, plus a setup redirect, was started | Check validation, errors, mode switch, and the return path |
| `/setup` | The route and a new Onboarding exist | Check layout, save/skip, authentication, and redirect loops |
| `/app` | The Onboarding that was embedded on the home page was partly removed | Check guest and member layout, and that setup is not repeated |
| Register API | New accounts were started as not yet onboarded | Check the effect on guest preferences and existing data |
| UI wrappers | Some `bg-white` was replaced with `bg-card` | Check remaining surfaces across the app; this is not a finished audit |
| shadcn components | Field, ToggleGroup/Toggle, Alert, and Spinner were added through the CLI | Read the files before use, and keep the Button whose color was already adjusted |

Earlier landing, logo, route-group, language and theme button, and workspace changes are a different round of work. Do not use `git reset`, `git checkout .`, or `git clean` to throw away the combined diff. That would also delete work the user already accepted.

If something that was started does not match the plan, change only the related part, or revert only that diff after checking where it came from. Do not assume an untracked file can be deleted.

## 3. Component rule: check and load before writing

Required for every new page or control:

1. Read `AGENTS.md`, `components.json`, and the inventory in `components/ui`.
2. Run `npx shadcn@latest info --json` to confirm the preset, base, and installed components.
3. If a component is already there, use it. Do not download it again or build a lookalike.
4. If it is missing, search the registry and read the official docs first, then add it with `npx shadcn@latest add <component>`.
5. Do not init or reinstall the preset, and do not `--overwrite` a customized component on your own.
6. Write only business behavior and page composition once a primitive already covers the control.
7. If a custom control is necessary, record the requirement the existing component cannot meet in the work notes.

Do not install every component in the table ahead of time. Install one when the task that uses it starts.

| Need | Component to use |
| --- | --- |
| Action buttons and links | Button and its variants; links use `asChild` |
| Login and register | Card, FieldGroup, Field, FieldLabel, Input, Button, Alert, Spinner |
| Choose one level or goal | ToggleGroup or RadioGroup, whichever fits. Do not hand-roll an active button |
| Ask to log in before chatting | Dialog with DialogTitle, Description, and Footer |
| Sidebar and phone | The existing Sidebar, SidebarTrigger, and Sheet |
| Teacher and lesson lists | Card, Avatar with a fallback, Badge |
| Language | The existing LanguageSwitcher built on DropdownMenu |
| Theme | The existing ThemeToggle. Do not add another copy on each page |
| Saving or sending | Spinner and a disabled state |
| Waiting for data | A Skeleton that matches the page structure |
| Errors and notices | Alert. Use a toast when the result does not need to stay on the page |
| No chats or no history | Empty, if it fits. Check it and add it before use |
| Chat composer | Check InputGroup, InputGroupTextarea, and Addons before building a composer by hand |
| Progress | Progress, when showing a ratio that comes from real data |

Keep the keyboard navigation, focus, labels, loading, and disabled behavior the component already has. Do not reduce it to appearance only.

## 4. Flows and user states

### 4.1 Visitor

Landing, then choose a teacher or lesson, then `/learn/[lessonId]`, then see the room and a greeting, then press send, hint, example, or practice, then a Dialog asks them to log in or register.

- The room opens. Do not redirect to login on arrival.
- Opening the preview does not create a conversation, progress, or a real message.
- The greeting comes from the lesson content. It does not call the model.
- Do not show a quota count as if they can chat for free before login.
- They may type a draft so the control is understandable. Do not send it to the API before auth.
- The Dialog can be closed, and they stay in the same room.
- "Log in" and "Register" are clear, and they explain that the user will return to this lesson.
- Chips and Enter go through the same gate as the send button.
- Do not show someone else's history, and do not create history for a guest.

### 4.2 New registration

Conversation room, then register, then a session is created, then `/setup?next=<the same lesson>`, then save or skip, then the same lesson.

- A new account starts as not yet set up. Do not accidentally inherit a guest's completed flag.
- Setup is its own page. It does not have a Sidebar competing for attention.
- If they register from a general button and no lesson was selected, go to `/app` when setup finishes.
- Do not send a draft typed before registration automatically. The user presses send themselves after they return.

### 4.3 Existing account

Conversation room, then login, then back to the same lesson. If setup is already done, do not ask for level again.

If an older account has never completed setup, show setup once before the learning flow. Do not insert the form into the dashboard on every visit.

### 4.4 Expired session

- A message API that returns 401 shows the auth gate, not a generic network retry button.
- Keep the unsent draft on the page that is open.
- Returning from auth must check ownership again and use the current account's conversation.
- Do not attach a previous account's conversation when the user logs in as someone else.

### 4.5 Return path and draft

- Validate `next` on the server with the existing allowlist. Do not accept an external URL or an API path.
- Keep the original lesson through login, register, setup, and mode switch.
- If a draft must survive navigation, use temporary browser storage, bind it to the lesson, and clear it after a successful send or logout. Limit its size and lifetime.
- Do not store a password or session token in the draft mechanism.
- A draft that survives navigation is a separate task. Say clearly whether it is supported. Do not claim the draft is restored if only the lesson is restored.

## 5. Access and routes

| Page or action | Guest | Account not set up | Account set up |
| --- | --- | --- | --- |
| Landing, pricing, teacher info | Can view | Can view | Can view |
| `/app` teacher and lesson list | Can view, no personal data | Can view the list, setup is not embedded | Can view and continue |
| `/learn/...` room | Preview only | Go to setup before real study | Use the account's conversation |
| Login and register | Available | Go to setup for the context | Go to the correct destination |
| `/setup` | Ask for auth | Can set preferences | Go to the destination, do not loop setup |
| `/chats`, `/learning` | Show that login is required. Do not show history | No guest history mixed in | The account's data |
| `/profile` | Sign-in CTA | Account data and a way into setup | Edit profile and preferences |
| Create conversation, send a message, submit an answer | 401 | Must be an account; the UI leads to setup | Must check the account and ownership |

Setup is a UX step for learner information. It does not replace API authentication or ownership checks. Keep the server-side checks even when a UI button opens a Dialog.

## 6. Screens to adjust

### 6.1 App shell and color — do this before screen details

- Interior pages share spacing, card radius, typography, and control sizes.
- The Sidebar shows the main menu: learn, chats, learning history, profile. Pricing is public information, not a fake checkout page.
- On a phone, open and close the Sidebar with the existing component. Do not invent a second menu.
- The header uses the same LanguageSwitcher and ThemeToggle as the landing page.
- Do not add a separate Melearn text name beside the logo unless that was agreed.
- The background may use a very light blue radial gradient, but reading and typing surfaces stay calm.
- Replace `bg-white`, hardcoded blue or purple, and inline surface styles with semantic tokens.
- Colors that belong to a teacher's image can stay. Card, text, border, and control colors follow the theme.
- A light-blue action with dark text must stay readable in both themes. Do not put white text on light blue.
- Motion is only for a response or a state change. Respect reduced motion.

Check `app/globals.css`, `components/melearn-ui.tsx`, `components/app-shell.tsx`, `components/ui/button.tsx`, and the wrappers used in profile and chat.

### 6.2 Login and register

- A real heading, a short description, fields, submit, a way to switch mode, and a way back.
- No decorative label above the heading.
- Compose Card and Field. Do not wrap a raw input in a new one-off CSS kit.
- Validation matches the existing API: required fields, name and password length, a duplicate name, a wrong login, and a network error.
- Show the error near the form with Alert or FieldError. Do not use tiny unreadable text.
- While submitting, block a second press and show a Spinner. The layout does not jump.
- Switching login and register keeps `next` and clears errors that no longer apply.
- Do not keep AuthPanel and LoginPanel as two parallel forms with different behavior. Pick one shared business form and use it in both places.
- Keep `autocomplete` and labels bound to inputs.
- Do not change the auth method or add OAuth in this UI pass.

### 6.3 Learning profile setup

Starting data: the level that feels right, and the learning goal.

- Ask briefly. Do not turn it into a test.
- Include "not sure" and "skip for now".
- Use ToggleGroup or RadioGroup with a selected state that is clear in both themes.
- Save onto the account profile. Do not write over the guest and then treat the account as finished.
- `onboarded` changes only after a successful save. A failed save stays on the same page with a way to try again.
- Skip means the preferences are set as not sure, and the question is not asked on every visit. The user can change them later.
- `/profile` is where preferences are edited after setup.
- In this round, a profile is the learning profile of one account. It does not include several learners in one account.
- A level per subject is a future proposal. Agree the schema and behavior first. Do not add it to the scope on your own.

### 6.4 Dashboard `/app`

Content order:

1. A main heading and a line that says what to do next.
2. "Continue" only for a member who has history.
3. Teachers, subjects, and lessons that can be selected.
4. Progress that comes from real data. If there is none, an empty state that invites them to pick a lesson.

- Remove level and goal selection from the dashboard.
- A guest sees the lesson list and can open a room. They do not see a fake history block.
- Each teacher shows a portrait, name, subject, a short description, and one clear action.
- Do not show statistics or recommendations that were not actually calculated.
- Do not repeat every landing section inside the dashboard.

### 6.5 Teacher page `/teachers/[id]`

- Portrait, name, subject, a short character note, and lessons.
- A lesson shows its name, level or duration when that data exists, a status, and an action.
- A guest uses "view classroom". A member uses "start", "continue", or "review" according to real data.
- A teacher who is not ready has a status and does not lead to a room that cannot be used.
- Use Card, Avatar, Badge, and Button instead of a separate HTML kit with its own CSS.

### 6.6 Conversation room

- Desktop: a clear teacher header, a reading surface in the center, and a composer stuck to the bottom.
- Mobile: the composer sits above the safe area and the keyboard. The header does not consume so much space that messages are unreadable.
- User and teacher messages are distinguishable without loud color.
- Long messages, Thai, English, and math formulas stay inside the viewport.
- Do not rebuild math rendering, and do not bring in unsafe HTML to make formulas look nicer.
- Hint, example, and practice use Button variants from the same set.
- Every guest action goes through the auth gate. The greeting does not pretend it was saved.
- Member actions show sending, error, retry, and quota from real data.
- When quota is exhausted, show the wait time clearly. Do not add a top-up button that implies Pro can already be bought.
- Follow the scroll when the user is at the bottom. If they are reading above, announce a new message instead of jumping down.
- Keep desktop Enter and Shift+Enter, and the mobile behavior. Do not send a message just because newline was pressed.
- Before changing the composer, check InputGroup. Do not write a new set of buttons inside the input unless that is necessary.

### 6.7 Chats and learning history

- `/chats`: teacher or lesson name, latest message, a relevant time, and an action back to the room.
- `/learning`: in progress, completed, or review. Do not show progress that has no data.
- No data uses Empty with an action to choose a teacher.
- A guest gets an auth CTA that says history will be saved. Do not show an empty list that looks like missing data.
- Loading uses Skeleton. An error uses Alert with a suitable action.

### 6.8 Profile

- Separate account data, learning preferences, and sign out.
- Level and goal chosen during setup can be edited with the same form controls.
- Saving shows success or failure. It does not stay silent or navigate away before the result is clear.
- Language and theme use the shared controls. Do not add a new set with different behavior.
- Do not mix guest onboarding, login, and member data in one window without a clear state.
- Card, input, and option surfaces follow the theme. Check hardcoded colors in `profile-panel.tsx`.

## 7. Work order and acceptance

| Task | What to deliver | What to accept |
| --- | --- | --- |
| 0. Check workspace and diff | A summary of files already changed, and what to keep or fix | One root. Do not overwrite landing work or data |
| 1. Tokens and shared components | An app shell and surfaces that follow the theme | Light and dark are readable. No stuck white card in dark mode |
| 2. Auth UI | One login/register form built from shadcn | Required fields, errors, pending, mode switch, and return path work |
| 3. Profile setup | The setup page and the post-auth flow | It does not appear inside `/app`. Save or skip returns to the destination |
| 4. Guest classroom and auth gate | The room opens before auth, with an API boundary | A guest gets no conversation, model call, or quota mutation. Every send goes through the gate |
| 5. Dashboard and teacher page | Choosing a lesson and continuing is clear | Guest and member content match their state. No mock history |
| 6. Chat refinement | Composer, states, and mobile layout | Send, retry, quota, keyboard, and scroll do not regress |
| 7. History and profile | Chat, history, and profile pages that share components | Loading, empty, and error states exist, and preferences can be edited |

Build in slices that can be looked at. Do not change everything at once, but finish the flow started in each slice. Do not hand off a registration that leads to a route that cannot be used.

## 8. Enough checking

The user does not want a check that is heavier than the change. One pass that covers what changed and the real risks:

- Lint and TypeScript through the project scripts
- A guest can open a room. Viewing it does not add a conversation or progress. Write APIs still return 401
- Send, Enter, and chips share one gate, and no model request is made
- New registration goes to setup and then the same lesson. An existing account logs in and returns to the same lesson
- Setup save, skip, and error do not loop redirects. An external `next` is rejected
- The dashboard has no level form, and profile can still edit level
- One desktop size and one mobile size, light and dark, and Thai and English
- Login and register forms, and cards and inputs, do not break when the theme changes

Use a fixture or a test account in separate data. Do not change a real user's account to make a test pass. Do not call the real model just to test the auth gate.

If a browser check is unavailable, say so. Do not claim a visual or interaction check passed because the server returned HTML 200.

## 1 October 2026: approved card and preference follow-up

The user authorized redesigning first-entry cards and Learning preferences.
The teacher picker now uses one equal-height card grid for available and coming
soon teachers, with a fixed image height and aligned actions. Availability and
teacher/lesson routes remain unchanged. The setup wizard is a single inline
shadcn Card instead of a duplicate card behind a locked Dialog. It retains quick
and detailed modes, account persistence and the chosen destination, and offers
Skip for each question as the existing copy promises.

Shared PreferenceChoices composes the installed shadcn ToggleGroup/Item. Setup,
education preferences and learning preferences use the same equal-sized option
cards, selected check marks and blue accents. Existing Field/FieldSet and Card
components were read and reused; no parallel selection control was created.
Verification is TypeScript and targeted lint; the user handles UI testing.

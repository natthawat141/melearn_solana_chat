# Melearn Chat — Developer handoff v0.1

25 September 2026 | Design proposal, not a working application

## Scope

One character teaches one subject: Ray English / Pi Mathematics / Nova Science / Time History / Bit Computing & AI.

The MVP opens teachers Ray and Pi, each with one lesson. The others exist in the data for later expansion. Time still has no portrait. Do not enable a start-learning button for a teacher who is not ready.

Starting audience: secondary students and university students, and people who want to review on their own. Text chat comes first. Voice, image attachments, and an animated avatar are later phases.

Confirmed in conversation: the app name, blue palette, all five characters, no Thai-language subject, and learning through chat.

Proposals in this kit that can still change: working colors, spacing, rubric, package shape, price, and revenue share (not decided).

## Design system

Reference mobile width 390px, horizontal padding 20px, gap 16px, card radius 20px. Button minimum height 48px, touch targets at least 44px. Body 16px/1.6; headings 28/22px. Use a dark primary with white text. Use cyan for decoration and backgrounds. Do not use cyan on white as the main content color.

Desktop at 768px and up: teacher directory plus main content; chat content max 760px. At 320px the layout must reflow without horizontal scroll. Avoid fixed screen heights for content. Respect the safe-area bottom and the keyboard.

Focus must be visible, labels accessible, and teacher images need alt text. Do not encode state by color alone. Use aria-live politely for a completed message, not for every token. Respect reduced motion. Let Thai text wrap normally.

The proposed type stack is the system stack in `tokens.css`. No external font files are included.

## S01 Onboarding

Choose language TH/EN, choose a level (starting out / some background / not sure), and a goal (conversation / review / practice problems). Skipping is allowed. Do not ask for a birthday, address, or wallet just to try the product.

Success goes to Home. Validation is inline. Save the selected preferences. A guest can use one lesson, and is asked to sign in when saving across devices.

## S02 Home

Header with a small logo and profile. Title: what do you want to learn today? Show a continue card only when progress exists. Teacher cards are two columns, and one column on a very narrow viewport. Ray and Pi are active. The others are labelled coming soon and disabled. Bottom nav: Home / Chats / My learning / Profile.

Loading uses a skeleton. A failed fetch offers retry. No history means hide Continue rather than fake progress.

## S03 Teacher detail

Portrait, AI teacher label, subject, persona, lesson list, free or locked status. CTA: start learning / continue. Do not invent ratings or learner counts. A locked CTA goes to purchase review.

## S04 Chat

Teacher header and back, lesson title, message list, AI notice, chips for Hint / Example / Practice, text input and send. Enter sends. Shift+Enter inserts a newline on desktop. No microphone or image button until those features exist.

On send: persist a unique `clientMessageId`, block a duplicate submit, and keep the draft if there is an error. A pending stream may show stop. Preserve scroll when the reader is in older messages, and provide a new-message indicator. Retry does not create a duplicate user turn. Empty text is ignored. The limit is 2000 characters, with a visible count near the limit.

Practice answers are checked against the lesson rubric. The lesson-complete card shows achieved goals, attempts, hints, and the next action. Do not show an unsupported percentage proficiency score.

## S05 My learning

Lesson cards: not started / in progress / completed, last studied timestamp, and continue. The summary uses real lesson records only. Empty state CTA: choose a teacher.

## S06 Profile

Preferred name is optional, plus locale, learning level, wallet link status (optional), and learning-history controls. A guest sees a login-to-save prompt. Confirm before delete, and explain the retention that the implemented policy actually uses. Do not add fabricated account-provider buttons.

## S07 Unlock / checkout

Lesson name, included content, duration and access terms, the configured USDC price, and a network-fee disclosure. Until price and terms are configured, there is no live pay button. Connect a wallet only here. The demo shows a test-mode badge. A test token is not real USDC.

States: disconnected, connected, review, wallet approval, pending, confirmed, entitlement granted. Cancellation returns to review. Insufficient balance has a clear message. Pending never prompts an automatic repayment. An already owned lesson opens the lesson.

## S08 Result

Show the payment outcome, purchase ID, network label, and a receipt link when a real signature exists. A pending entitlement after a confirmed payment is syncing: poll the backend, and never ask the user to pay again. Success opens the lesson.

## Navigation flows

Guest, then Onboarding or Skip, then Home, then Teacher, then a free lesson, then Chat, then Result, then My learning.

A locked lesson goes to checkout, then connect, then an explicit user payment approval, then backend confirmation, then access, then Chat.

Back from checkout keeps the selection. Back from chat saves progress on the server for a signed-in user, and locally only for a guest, with a clear label.

## Acceptance checklist

1. Selecting Ray or Pi produces different greetings and instructions.
2. A hint helps without giving an unrelated answer. Numeric math grading is correct.
3. Reload restores signed-in progress. Guest state is clearly labelled.
4. A failed send keeps the draft, and retry is idempotent.
5. Cancelling payment does not grant access. Duplicate confirmations do not grant twice.
6. A transaction on the wrong network, mint, amount, or recipient is rejected.
7. Do not invent transactions, reviews, scores, or users.
8. Thai and English keys are complete. Keyboard use and a 320px layout work.
9. API keys never reach the browser. Direct unauthorized conversation access is blocked.
10. No live transactions until a product price, terms, and wallet config are supplied.

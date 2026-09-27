# Melearn Chat — Developer handoff v0.1
วันที่ 25 กันยายน 2026 | Design proposal, not a working application

## ขอบเขต
คาแรกเตอร์หนึ่งคนสอนหนึ่งวิชา: Ray English / Pi Mathematics / Nova Science / Time History / Bit Computing & AI.
MVP เปิดครู Ray และ Pi พร้อมบทเรียนคนละหนึ่งบท รายอื่นอยู่ในข้อมูลสำหรับขยาย ภาพ Time ยังไม่มี ห้ามเปิดปุ่มเริ่มเรียนสำหรับครูที่ยังไม่พร้อม
กลุ่มเริ่มต้น: นักเรียนมัธยม/นักศึกษา ผู้ต้องการทบทวนด้วยตัวเอง ใช้ text chat ก่อน เสียง แนบภาพ และ animated avatar เป็นระยะถัดไป
สิ่งที่ยืนยันแล้วจากการคุย: ชื่อแอป สีฟ้า/น้ำเงิน ตัวละครทั้งห้า ไม่มีวิชาภาษาไทย การเรียนผ่านแชต
ข้อเสนอในชุดนี้ที่ยังปรับได้: สีใช้งานจริง ระยะห่าง rubric รูปแบบแพ็ก ราคาและส่วนแบ่ง (ยังไม่กำหนด)

## Design system
Reference mobile 390px, horizontal padding 20px, gap 16px, card radius 20px. Button min height 48px, touch targets >=44px. Body 16px/1.6; headings 28/22px. ใช้ primary สีเข้มกับตัวอักษรขาว สี cyan สำหรับตกแต่ง/พื้นหลัง ไม่ใช้ cyan บนขาวเป็นเนื้อหาหลัก
Desktop >=768px: teacher directory + main content; chat content max 760px. Mobile at 320px must reflow without horizontal scroll. Avoid fixed screen heights for content, respect safe-area bottom/keyboard.
Focus visible, labels accessible, alt text for teachers, no color-only state. Use aria-live politely for completed message, not every token. Respect reduced motion. Keep Thai text wrapping normally.
Typography proposed system stack in tokens.css; no external font files included.

## S01 Onboarding
เลือกภาษา TH/EN, เลือกระดับ เริ่มต้น/พอมีพื้นฐาน/ไม่แน่ใจ และเป้าหมาย สนทนา/ทบทวน/ฝึกโจทย์ มีข้าม ไม่ขอวันเกิด ที่อยู่ หรือกระเป๋าเพื่อทดลอง
Success → Home. Validation inline. Save selected preferences; guest can use one lesson, ask sign-in when saving across devices.
## S02 Home
Header small logo + profile. Title วันนี้อยากเรียนอะไร? Continue card only if progress exists. Two-column teacher cards, single-column on very narrow viewport. Ray/Pi active. Others labelled เร็ว ๆ นี้ and disabled. Bottom nav Home / Chats / My learning / Profile.
Loading skeleton; failed fetch → retry; no history → hide Continue rather than fake progress.
## S03 Teacher detail
Portrait, AI teacher label, subject, persona, lesson list, free/locked status. CTA เริ่มเรียน / เรียนต่อ. Do not invent ratings or learner counts. Locked CTA → purchase review.
## S04 Chat
Teacher header/back, lesson title, message list, AI notice, chips Hint/Example/Practice, text input+send. Enter send, Shift+Enter newline on desktop. No microphone/image button until implemented.
On send: persist unique clientMessageId, disable duplicate submit, keep draft if error. Streaming pending can show stop. Preserve scroll if reading older messages; provide new-message indicator. Retry does not create duplicate user turn. Empty text ignored, limit 2000 chars with visible count near limit.
Practice answers checked per lesson rubric. Lesson complete card shows achieved goals, attempts, hints, next action; no unsupported percentage proficiency score.
## S05 My learning
Lesson cards: not started/in progress/completed; last studied timestamp; continue. Summary based on real lesson records only. Empty state CTA เลือกครู.
## S06 Profile
Preferred name optional, locale, learning level, wallet link status (optional), learning history controls. Guest sees login-to-save prompt. Confirm before delete; explain actual retention based on implemented policy. No fabricated account provider buttons.
## S07 Unlock / checkout
Lesson name, included content, duration/access terms, configured USDC price and network fee disclosure. Until price and terms configured: no live pay button. Connect wallet only here. Demo shows test-mode badge; test token not real USDC.
State: disconnected → connected → review → wallet approval → pending → confirmed → entitlement granted. Cancellation returns review; insufficient balance clear message; pending never prompts automatic repayment; already owned opens lesson.
## S08 Result
Show payment outcome, purchase ID, network label and receipt link when a real signature exists. Pending entitlement after confirmed payment → syncing; poll backend, never ask to repay. Success → lesson.

## Navigation flows
Guest → Onboarding/Skip → Home → Teacher → free lesson → Chat → Result → My learning.
Locked lesson → checkout → connect → explicit user payment approval → backend confirmation → access → Chat.
Back from checkout preserves selection. Back from chat saves progress server-side for signed-in user, local only for guest with clear label.

## Acceptance checklist
1. Select Ray/Pi and receive different greetings/instructions.
2. Hint gives help, not an unrelated answer; numeric math grading correct.
3. Reload restores signed-in progress; guest state clearly labelled.
4. Failed send retains draft and retry is idempotent.
5. Payment cancellation does not grant access; duplicate confirmations do not double-grant.
6. Wrong network/mint/amount/recipient transaction rejected.
7. No invented transactions, reviews, scores or users.
8. Thai/English keys complete; keyboard and 320px layout usable.
9. API keys never in browser; direct unauthorized conversation access blocked.
10. No live transactions enabled until product price/terms and wallet config are supplied.

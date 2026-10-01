import type { Locale } from "@/lib/types";

const th = {
  nav: { teachers: "รู้จักครู", how: "เรียนอย่างไร", pricing: "แพ็กเกจ", login: "เข้าสู่ระบบ", start: "เริ่มเรียนฟรี", resume: "ไปพื้นที่เรียน", menu: "เปิดเมนู", close: "ปิดเมนู" },
  hero: {
    title: "โจทย์ที่ดูยาก",
    titleAccent: "เข้าใจได้ทีละขั้น",
    body: "ฝึกอังกฤษและคณิตกับครู AI ที่มีคาแรกเตอร์เฉพาะตัว ค่อย ๆ ทำความเข้าใจ ลองตอบ และเรียนรู้ในจังหวะของคุณ",
    start: "เริ่มเรียนฟรี", preview: "ดูตัวอย่างการเรียน", note: "สมัครก่อนเริ่มแชต · ไม่ต้องใช้บัตรเครดิต",
    artworkAlt: "ภาพพื้นหลังรูปทรงคณิตศาสตร์สีฟ้าอ่อนและขาว",
    float: "ค่อย ๆ คิดไปด้วยกัน", previewTag: "ตัวอย่างบทสนทนา", previewName: "ครูเรย์", previewSubject: "ครู AI · ภาษาอังกฤษ",
    question: "I like sing. แบบนี้ถูกไหมครับ?", answer: "เข้าใจเลยครับ! ลองเปลี่ยนเป็น “I like singing.” หลัง like เราใช้คำกริยาเติม -ing ได้ ลองแต่งอีกประโยคกันไหม?",
    mini: "ผิดได้ ถามใหม่ได้ เรียนต่อได้", subjects: ["ภาษาอังกฤษ", "คณิตศาสตร์", "เรียนผ่านบทสนทนา"],
  },
  teachers: {
    title: "เจอครูที่คุยด้วยแล้วอยากเรียนต่อ", body: "เลือกวิชาที่อยากฝึก แล้วให้ครูช่วยพาคุณผ่านคำถามทีละขั้น", ai: "ครู AI", action: "เรียนกับ", soon: "กำลังเตรียมบทเรียนใหม่", soonSubjects: "วิทยาศาสตร์ · คอมพิวเตอร์และ AI",
    items: [
      { id: "ray", name: "ครูเรย์", subject: "ภาษาอังกฤษ", tagline: "กล้าพูดขึ้นอีกนิด ในทุกบทสนทนา", description: "ครูใจดีที่ชวนคุณลองใช้ภาษา แก้จุดสำคัญพร้อมตัวอย่าง โดยไม่ทำให้กลัวการตอบผิด", topics: ["แนะนำตัว", "บทสนทนาในชีวิตประจำวัน"], lessonId: "english-intro-01" },
      { id: "pi", name: "ครูพาย", subject: "คณิตศาสตร์", tagline: "เข้าใจวิธีคิด มากกว่าจำคำตอบ", description: "ค่อย ๆ แยกโจทย์ที่ดูยากให้เป็นขั้นตอนเล็ก ๆ ชวนคิดและให้คำใบ้ก่อนลองทำด้วยตัวเอง", topics: ["ร้อยละ", "ส่วนลดและโจทย์ใกล้ตัว"], lessonId: "math-percent-01" },
    ],
  },
  experience: {
    title: "ติดตรงไหน ก็เริ่มตรงนั้น", body: "ไม่จำเป็นต้องรู้คำตอบตั้งแต่แรก ถามครู ขอคำใบ้ แล้วค่อยลองทำด้วยตัวเอง", tabs: ["ฝึกอังกฤษกับเรย์", "คิดเลขกับพาย"], preview: "ตัวอย่างการเรียน", previewNote: "บทสนทนาจำลอง · ยังไม่ใช่แชตจริง", hint: "ขอคำใบ้", example: "ดูตัวอย่าง", practice: "ลองตอบ", placeholder: "เปิดห้องแชตได้เลย ข้อความแรกต้องสมัคร", login: "เปิดห้องแชต", stepTitle: "จากสงสัย ไปสู่ความเข้าใจ", steps: [
      { title: "เลือกครูและบทเรียน", body: "เริ่มจากอังกฤษหรือคณิต ในเรื่องที่คุณอยากฝึก" },
      { title: "คุย ถาม และขอคำใบ้", body: "เมื่อยังไม่เข้าใจ ให้ครูช่วยอธิบายจากขั้นที่ติดอยู่" },
      { title: "ลองทำ แล้วกลับมาเรียนต่อ", body: "รับคำอธิบายหลังตอบ และเก็บความคืบหน้าไว้ในบัญชี" },
    ],
    demos: [
      { teacher: "ครูเรย์", subject: "ภาษาอังกฤษ · แนะนำตัว", welcome: "Hi! วันนี้ลองแนะนำตัวเป็นภาษาอังกฤษกันไหมครับ?", user: "My name is May. I like sing.", answer: "ยินดีที่ได้รู้จักครับ May! ประโยคแรกดีแล้ว ส่วนประโยคที่สองลองใช้ “I like singing.” นะครับ", hint: "หลัง like ลองเปลี่ยนกริยา sing ให้เป็นรูป -ing ดูนะครับ", example: "ตัวอย่าง: “I like reading.” ลองเปลี่ยน reading เป็นกิจกรรมที่คุณชอบครับ", practice: "ลองเติมประโยคนี้ด้วยกิจกรรมที่คุณชอบ: “I like ____.”" },
      { teacher: "ครูพาย", subject: "คณิตศาสตร์ · ร้อยละ", welcome: "เสื้อราคา 500 บาท ลด 20% เราต้องจ่ายเท่าไร? ลองคิดไปด้วยกันนะ", user: "ต้องจ่าย 100 บาทใช่ไหมคะ?", answer: "100 บาทคือส่วนลดค่ะ เราจึงนำ 500 − 100 เหลือราคาที่ต้องจ่าย 400 บาท ลองแยก “ส่วนลด” กับ “ราคาหลังลด” ดูนะ", hint: "เริ่มจากหา 10% ของ 500 ก่อน แล้วค่อยเพิ่มเป็น 20% นะคะ", example: "ของราคา 200 บาท ลด 10% ส่วนลดคือ 20 บาท จึงจ่าย 200 − 20 = 180 บาทค่ะ", practice: "ลองทำเอง: เสื้อราคา 300 บาท ลด 10% ต้องจ่ายกี่บาท?" },
    ],
  },
  features: { title: "พื้นที่เรียนที่กลับมาได้เสมอ", body: "คำถามวันนี้ กลายเป็นจุดเริ่มต้นของบทเรียนถัดไป", items: [
    { title: "คำใบ้ก่อนคำตอบ", body: "ลองคิดด้วยตัวเอง โดยมีครูช่วยเมื่อคุณต้องการ", icon: "hint" },
    { title: "แบบฝึกที่ได้ลองทำ", body: "นำสิ่งที่คุยไปใช้ แล้วรับคำอธิบายหลังตอบ", icon: "practice" },
    { title: "เก็บการเรียนไว้ในบัญชี", body: "ย้อนดูบทสนทนาและกลับมาเรียนต่อจากบทเดิม", icon: "history" },
  ] },
  pricing: {
    title: "เริ่มเรียนฟรี ในจังหวะของคุณ", body: "ลองรู้จักครูและวิธีเรียนก่อน ช่วงเดโมยังไม่มีการเรียกเก็บเงิน", free: "Free", freeSub: "สำหรับเริ่มต้นและลองเรียน", freePrice: "฿0", freePeriod: "ช่วงเดโม", freeFeatures: ["เรียนกับครูเรย์และครูพาย", "10 ข้อความในรอบ 24 ชั่วโมง", "บทเรียนที่เปิดในเดโมทั้งหมด", "เก็บบทสนทนาและความคืบหน้า"], freeCta: "สมัครเพื่อเริ่มเรียนฟรี", pro: "Pro", proSub: "แนวคิดแพ็กเกจสำหรับเรียนต่อเนื่อง", proPrice: "$20", proPeriod: "/ เดือน", proBadge: "แพ็กเกจตัวอย่าง", proFeatures: ["แนวคิด: เพิ่มจำนวนข้อความ", "แนวคิด: เรียนต่อได้โดยไม่รอโควตา", "ใช้ครูและบทเรียนที่เปิดให้บริการ"], proStatus: "ยังไม่เปิดให้สมัคร Pro", proNote: "ราคาและสิทธิ์ Pro เป็นตัวอย่างสำหรับการออกแบบ ยังไม่ใช่ข้อเสนอขาย และยังไม่มีการชำระเงิน", quotaNote: "โควตาฟรีเริ่มนับ 24 ชั่วโมงจากข้อความแรกของแต่ละรอบ ไม่ใช่การรีเซ็ตทุกเที่ยงคืน",
  },
  faq: { title: "ก่อนเริ่ม มีอะไรอยากรู้ไหม?", items: [
    { question: "ต้องสมัครก่อนเรียนไหม?", answer: "ดูข้อมูลครู ราคา และตัวอย่างการเรียนได้โดยไม่ต้องสมัคร แต่ต้องเข้าสู่ระบบก่อนเริ่มแชตจริง เพื่อเก็บบทสนทนาและความคืบหน้าไว้ในบัญชีของคุณ" },
    { question: "ครูเป็นคนจริงหรือ AI?", answer: "ครูเรย์และครูพายเป็นครู AI ที่ออกแบบบุคลิกและบทเรียนไว้ คำตอบจาก AI อาจผิดพลาดได้ ควรตรวจสอบข้อมูลสำคัญและถามเพิ่มเมื่อยังไม่เข้าใจ" },
    { question: "ใช้ครบ 10 ข้อความแล้วทำอย่างไร?", answer: "รอให้ครบ 24 ชั่วโมงจากข้อความแรกของรอบนั้น แล้วเริ่มรอบใหม่ได้ ปุ่มคำใบ้ ตัวอย่าง และแบบฝึกในแชตจริงนับรวมในโควตา ขณะนี้ยังซื้อโควตาเพิ่มไม่ได้" },
    { question: "ต้องใช้บัตรเครดิตหรือเชื่อมกระเป๋าไหม?", answer: "ไม่ต้องใช้บัตรเครดิตหรือเชื่อมกระเป๋าเพื่อเรียนในช่วงเดโม หน้านี้ไม่มีการเรียกเก็บเงิน และแพ็กเกจ Pro ยังเป็นตัวอย่าง" },
  ] },
  closing: { title: "เริ่มจากคำถามเล็ก ๆ ของคุณ", body: "ครูเรย์และครูพายพร้อมชวนคุณลองคิด ลองตอบ และเรียนรู้ไปด้วยกัน", action: "เริ่มเรียนฟรี", note: "สมัครบัญชีก่อนแชต · ฟรีในช่วงเดโม" },
  footer: { tagline: "ทุกคำถาม คือจุดเริ่มต้นของการเรียนรู้", note: "AI learning demo", preview: "ตัวอย่างผลิตภัณฑ์ · ไม่มีการเรียกเก็บเงิน" },
  controls: { language: "เปลี่ยนภาษา", light: "ใช้ธีมสว่าง", dark: "ใช้ธีมมืด", error: "เปลี่ยนภาษาไม่สำเร็จ ลองอีกครั้ง" },
  auth: { title: "เข้าสู่ระบบหรือสมัคร", registerTitle: "เริ่มต้นการเรียนของคุณ", body: "เลือกกระเป๋าเพื่อคุยกับครูและบันทึกความคืบหน้า", registerBody: "สร้างบัญชี แล้วเริ่มคุยกับครูเรย์และครูพาย", name: "ชื่อบัญชี", password: "รหัสผ่าน", submit: "เข้าสู่ระบบ", register: "สร้างบัญชีฟรี", pending: "รอสักครู่…", switchLogin: "มีบัญชีแล้ว? เข้าสู่ระบบ", switchRegister: "ยังไม่มีบัญชี? สร้างบัญชีฟรี", back: "กลับหน้าแรก", error: "เชื่อมต่อไม่สำเร็จ ลองอีกครั้ง", note: "ใช้ฟรีในช่วงเดโม" },
};

const en: typeof th = {
  nav: { teachers: "Meet the teachers", how: "How it works", pricing: "Plans", login: "Log in", start: "Start learning", resume: "My learning", menu: "Open menu", close: "Close menu" },
  hero: { title: "A tricky question.", titleAccent: "A little clearer, step by step.", body: "Practice English and maths with AI teachers who have their own personality. Ask, try, and learn at your own pace.", start: "Start learning for free", preview: "See how learning works", note: "Sign up to chat · No credit card needed", artworkAlt: "Pale blue and white mathematical shapes", float: "Let's think it through", previewTag: "Conversation preview", previewName: "Teacher Ray", previewSubject: "AI teacher · English", question: "Is “I like sing” correct?", answer: "I understand you! Try “I like singing.” We can use the -ing form after like. Want to try another sentence?", mini: "Make mistakes. Ask again. Keep learning.", subjects: ["English", "Maths", "Learning through conversation"] },
  teachers: { title: "Meet a teacher you'll want to learn with", body: "Choose what you'd like to practice, and work through your questions one step at a time.", ai: "AI teacher", action: "Learn with", soon: "More lessons in the making", soonSubjects: "Science · Computing & AI", items: [
    { id: "ray", name: "Teacher Ray", subject: "English", tagline: "A little more confidence, every conversation", description: "A friendly teacher who invites you to try, with examples and gentle corrections that make mistakes feel manageable.", topics: ["Introductions", "Everyday conversations"], lessonId: "english-intro-01" },
    { id: "pi", name: "Teacher Pi", subject: "Maths", tagline: "Understand the thinking behind the answer", description: "Break a tricky question into small steps. Get a hint, think it through, and try it for yourself.", topics: ["Percentages", "Discounts & everyday problems"], lessonId: "math-percent-01" },
  ] },
  experience: { title: "Start wherever you're stuck", body: "You don't need the answer already. Ask your teacher, get a hint, then give it a try.", tabs: ["English with Ray", "Maths with Pi"], preview: "Learning preview", previewNote: "Sample conversation · Not a live chat", hint: "Get a hint", example: "See an example", practice: "Try answering", placeholder: "Open the chat room. Register before your first message.", login: "Open the chat room", stepTitle: "From curiosity to understanding", steps: [
    { title: "Choose a teacher and a lesson", body: "Start with an English or maths topic you'd like to practice." },
    { title: "Chat, ask, and get a hint", body: "Have your teacher explain the step that's giving you trouble." },
    { title: "Try it, then return to learn more", body: "Get feedback on your answer and save your progress to your account." },
  ], demos: [
    { teacher: "Teacher Ray", subject: "English · Introductions", welcome: "Hi! Shall we practice introducing ourselves today?", user: "My name is May. I like sing.", answer: "Nice to meet you, May! Your first sentence is good. For the second one, try “I like singing.”", hint: "After like, try using the -ing form of sing.", example: "For example: “I like reading.” Replace reading with something you enjoy.", practice: "Your turn: complete “I like ____.” with an activity you enjoy." },
    { teacher: "Teacher Pi", subject: "Maths · Percentages", welcome: "A shirt costs 500 baht with 20% off. How much do we pay? Let's think it through.", user: "Do we pay 100 baht?", answer: "100 baht is the discount. Subtract it from 500 to get a final price of 400 baht. Keep the discount and final price separate.", hint: "Start by finding 10% of 500, then double it to find 20%.", example: "An item costs 200 baht with 10% off. The discount is 20, so we pay 200 − 20 = 180 baht.", practice: "Your turn: a 300-baht shirt has 10% off. What is the final price?" },
  ] },
  features: { title: "A learning space you can return to", body: "Today's question can be the beginning of your next lesson.", items: [
    { title: "Hints before answers", body: "Think for yourself, with a teacher to help when you need it.", icon: "hint" },
    { title: "Practice you can try", body: "Put your learning to work and get feedback on your answer.", icon: "practice" },
    { title: "Keep your learning history", body: "Revisit conversations and return to the same lesson.", icon: "history" },
  ] },
  pricing: { title: "Start free, learn at your own pace", body: "Get to know the teachers and the learning experience first. There are no charges during the demo.", free: "Free", freeSub: "For your first steps and a little practice", freePrice: "$0", freePeriod: "during the demo", freeFeatures: ["Learn with Ray and Pi", "10 messages per 24-hour window", "All lessons open in the demo", "Save conversations and progress"], freeCta: "Sign up to learn for free", pro: "Pro", proSub: "A concept for more continuous learning", proPrice: "$20", proPeriod: "/ month", proBadge: "Sample plan", proFeatures: ["Planned: a higher message allowance", "Planned: learn without the quota wait", "Access available teachers and lessons"], proStatus: "Pro is not available yet", proNote: "Pro pricing and benefits are design examples, not an offer for sale. Checkout is not available.", quotaNote: "The free window lasts 24 hours from its first message. It does not reset at midnight." },
  faq: { title: "A few things before you begin", items: [
    { question: "Do I need an account to learn?", answer: "You can browse teachers, plans, and lesson previews without an account. Log in before starting a real chat so your conversations and progress can be saved to your account." },
    { question: "Are these real teachers or AI?", answer: "Ray and Pi are AI teachers with designed personalities and lessons. AI answers can be wrong. Check important information and ask follow-up questions when something is unclear." },
    { question: "What happens after 10 messages?", answer: "Wait until 24 hours have passed from the first message in that window. Hints, examples, and practice actions in a real chat count toward your quota too. Extra quota cannot be purchased yet." },
    { question: "Do I need a credit card or wallet?", answer: "No credit card or wallet is needed to learn during the demo. This page does not charge you, and Pro is still a sample plan." },
  ] },
  closing: { title: "Start with a little question of your own", body: "Ray and Pi are ready to help you think, try, and learn together.", action: "Start learning for free", note: "Sign up before chatting · Free during the demo" },
  footer: { tagline: "Every question is a beginning.", note: "AI learning demo", preview: "Product preview · No charges" },
  controls: { language: "Change language", light: "Switch to light theme", dark: "Switch to dark theme", error: "Couldn't change language. Please try again." },
  auth: { title: "Sign in or create an account", registerTitle: "Begin your learning journey", body: "Choose a wallet to chat with your teachers and save your progress.", registerBody: "Create an account, then start learning with Ray and Pi.", name: "Account name", password: "Password", submit: "Log in", register: "Create a free account", pending: "Please wait…", switchLogin: "Already have an account? Log in", switchRegister: "New here? Create a free account", back: "Back to home", error: "Couldn't connect. Please try again.", note: "Free during the demo" },
};

export function landingCopy(locale: Locale) {
  return locale === "en" ? en : th;
}
export type LandingCopy = typeof th;

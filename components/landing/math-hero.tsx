import Image from "next/image";
import { Check, PenLine } from "lucide-react";
import type { Locale } from "@/lib/types";

export function MathHero({ locale }: { locale: Locale }) {
  const th = locale === "th";
  return (
    <div className="m-math-scene" aria-label={th ? "ตัวอย่างครู AI อธิบายโจทย์ส่วนลดด้วยสูตรคณิตศาสตร์" : "An AI teacher explains a discount using maths"}>
      <div className="m-math-question">
        <span className="m-student-avatar" aria-hidden="true">M</span>
        <p>{th ? "เสื้อราคา 500 บาท ลด 20% ต้องจ่ายเท่าไรคะ?" : "A shirt costs 500 baht with 20% off. How much do I pay?"}</p>
      </div>
      <div className="m-math-response">
        <div className="m-math-teacher"><Image src="/teachers/pi.webp" alt="" width={44} height={44} /><div><strong>{th ? "ครูพาย" : "Teacher Pi"}</strong><span>{th ? "ครู AI · คณิตศาสตร์" : "AI teacher · Maths"}</span></div><PenLine size={18} aria-hidden="true" /></div>
        <p>{th ? "ลองแยกส่วนลดกับราคาที่ต้องจ่ายนะคะ ครูวาดให้ดูแบบนี้ค่ะ" : "Let's separate the discount from the final price. Here's how it works."}</p>
        <div className="m-formula-board">
          <div className="m-formula-line"><span className="m-formula-caption">{th ? "ส่วนลด" : "Discount"}</span><div className="m-equation"><span>500</span><span className="m-math-operator">×</span><span className="m-fraction"><span>20</span><span>100</span></span><span className="m-math-operator">=</span><strong>100</strong></div></div>
          <div className="m-discount-diagram" role="img" aria-label={th ? "ราคา 500 บาทแบ่งเป็นส่วนลด 100 บาทและราคาที่จ่าย 400 บาท" : "500 baht split into a 100-baht discount and a 400-baht final price"}><div className="m-discount-bar"><span className="m-bar-discount">20%</span><span className="m-bar-pay">80%</span></div><div className="m-bar-labels"><span>{th ? "ลด 100" : "Save 100"}</span><span>{th ? "จ่าย 400" : "Pay 400"}</span></div></div>
          <div className="m-formula-final"><span>{th ? "ราคาที่จ่าย" : "Final price"}</span><p>500 − 100 = <strong>400</strong><span>{th ? "บาท" : "baht"}</span></p></div>
        </div>
        <div className="m-math-result"><Check size={16} aria-hidden="true" />{th ? "100 บาทคือส่วนลด เราจึงจ่าย 400 บาทค่ะ" : "100 baht is the discount, so you pay 400 baht."}</div>
      </div>
      <p className="m-math-demo-note">{th ? "บทสนทนาจำลอง · เข้าสู่ระบบเพื่อเรียนจริง" : "Sample conversation · Log in to start learning"}</p>
    </div>
  );
}

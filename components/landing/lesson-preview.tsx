"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, Lightbulb, MessageCircle } from "lucide-react";
import type { LandingCopy } from "@/content/landing";

type PreviewMode = "answer" | "hint" | "example" | "practice";

export function LessonPreview({ copy, }: { copy: LandingCopy["experience"] }) {
  const [teacher, setTeacher] = useState(0);
  const [mode, setMode] = useState<PreviewMode>("answer");
  const demo = copy.demos[teacher];
  const id = teacher === 0 ? "ray" : "pi";
  const actions = [
    { id: "hint" as const, label: copy.hint, Icon: Lightbulb },
    { id: "example" as const, label: copy.example, Icon: BookOpen },
    { id: "practice" as const, label: copy.practice, Icon: Check },
  ];
  return (
    <div className="m-lesson-demo">
      <div className="m-demo-tabs" role="group" aria-label={copy.preview}>
        {copy.tabs.map((label, index) => <button key={label} type="button" aria-pressed={teacher === index} onClick={() => { setTeacher(index); setMode("answer"); }}><MessageCircle size={16} aria-hidden="true" />{label}</button>)}
      </div>
      <div className="m-demo-window">
        <div className="m-demo-header">
          <Image className="m-avatar" src={`/teachers/${id}.webp`} alt="" width={42} height={42} />
          <div><strong>{demo.teacher}</strong><span>{demo.subject}</span></div>
          <span className="m-preview-label">{copy.preview}</span>
        </div>
        <div className="m-demo-messages" aria-live="polite" aria-atomic="true">
          <div className="m-demo-assistant"><p>{demo.welcome}</p></div>
          <div className="m-demo-user"><p>{demo.user}</p></div>
          <div className="m-demo-assistant m-demo-feedback"><span className="m-feedback-icon"><Lightbulb size={18} aria-hidden="true" /></span><p>{demo[mode]}</p></div>
        </div>
        <div className="m-demo-composer">
          <div className="m-demo-chips">{actions.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}><Icon size={14} aria-hidden="true" />{label}</button>)}</div>
          <Link className="m-demo-input" href={`/learn/${teacher === 0 ? "english-intro-01" : "math-percent-01"}`} aria-label={copy.login}><MessageCircle size={16} aria-hidden="true" /><span>{copy.placeholder}</span><ArrowRight size={18} aria-hidden="true" /></Link>
          <p className="m-demo-caption">{copy.previewNote}</p>
        </div>
      </div>
    </div>
  );
}

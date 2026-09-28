import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Clock3, History, Lightbulb, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { MathHero } from "@/components/landing/math-hero";
import { ScrollEffects } from "@/components/landing/scroll-effects";
import { LessonPreview } from "@/components/landing/lesson-preview";
import { landingCopy } from "@/content/landing";
import { getViewer } from "@/lib/viewer";

export default async function LandingPage() {
  const viewer = await getViewer();
  const copy = landingCopy(viewer.locale);
  const signedIn = Boolean(viewer.user);
  const start = "/app";
  const featureIcons = [Lightbulb, BookOpen, History];
  return (
    <main id="main-content">
      <ScrollEffects />
      <section className="m-hero">
        <div className="m-hero-backdrop" aria-hidden="true"><Image src="/landing/math-background.webp" alt="" fill sizes="100vw" priority /></div>
        <div className="m-container m-hero-grid">
          <div className="m-hero-copy">
            <h1>{copy.hero.title}<br /><span>{copy.hero.titleAccent}</span></h1>
            <p className="m-hero-body">{copy.hero.body}</p>
            <div className="m-hero-actions"><Link className="m-button" href={start}>{signedIn ? copy.nav.resume : copy.hero.start}<ArrowUpRight size={19} aria-hidden="true" /></Link><a className="m-text-link" href="#how-it-works">{copy.hero.preview}<ArrowDown size={16} aria-hidden="true" /></a></div>
            <p className="m-hero-note"><ShieldCheck size={15} aria-hidden="true" />{copy.hero.note}</p>
            <div className="m-hero-teachers"><div className="m-avatar-stack"><Image src="/teachers/ray.webp" alt="" width={36} height={36} /><Image src="/teachers/pi.webp" alt="" width={36} height={36} /></div><span>{copy.hero.mini}</span></div>
          </div>
          <MathHero locale={viewer.locale} />
        </div>
        <div className="m-container m-subject-strip">{copy.hero.subjects.map((subject, index) => <span key={subject}>{index === 2 ? <MessageCircle size={18} aria-hidden="true" /> : <BookOpen size={18} aria-hidden="true" />}{subject}</span>)}</div>
      </section>

      <section id="teachers" className="m-section m-teachers">
        <div className="m-container">
          <div className="m-section-heading"><h2>{copy.teachers.title}</h2><p>{copy.teachers.body}</p></div>
          <div className="m-teacher-grid">{copy.teachers.items.map((teacher) => <article className={`m-teacher m-teacher-${teacher.id}`} key={teacher.id}>
            <div className="m-teacher-portrait"><Image src={`/teachers/${teacher.id}.webp`} alt={teacher.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1080px) 35vw, 240px" /><span className="m-teacher-label">{copy.teachers.ai}</span></div>
            <div className="m-teacher-info"><span className="m-subject-tag">{teacher.subject}</span><h3>{teacher.name}</h3><p className="m-teacher-tagline">{teacher.tagline}</p><p className="m-teacher-description">{teacher.description}</p><div className="m-topic-list">{teacher.topics.map(topic => <span key={topic}>{topic}</span>)}</div><Link className="m-text-link" href={`/learn/${teacher.lessonId}`}>{copy.teachers.action} {teacher.name}<ArrowRight size={16} aria-hidden="true" /></Link></div>
          </article>)}</div>
          <div className="m-coming-soon"><div className="m-small-portraits"><Image src="/teachers/nova.webp" alt="" width={32} height={32} /><Image src="/teachers/bit.webp" alt="" width={32} height={32} /></div><p><strong>{copy.teachers.soon}</strong><span>{copy.teachers.soonSubjects}</span></p></div>
        </div>
      </section>

      <section id="how-it-works" className="m-section m-experience">
        <div className="m-container m-experience-grid">
          <div className="m-experience-copy"><h2>{copy.experience.title}</h2><p className="m-section-body">{copy.experience.body}</p><ol className="m-steps" aria-label={copy.experience.stepTitle}>{copy.experience.steps.map((step, index) => <li key={step.title}><span className="m-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol></div>
          <LessonPreview copy={copy.experience} />
        </div>
      </section>

      <section className="m-section m-features"><div className="m-container"><div className="m-section-heading"><h2>{copy.features.title}</h2><p>{copy.features.body}</p></div><div className="m-feature-grid">{copy.features.items.map((feature, index) => { const Icon = featureIcons[index]; return <article className="m-feature" key={feature.title}><span className={`m-feature-icon m-feature-icon-${index}`}><Icon size={25} strokeWidth={1.6} aria-hidden="true" /></span><h3>{feature.title}</h3><p>{feature.body}</p></article>; })}</div></div></section>

      <section id="pricing" className="m-section m-pricing"><div className="m-container"><div className="m-section-heading"><h2>{copy.pricing.title}</h2><p>{copy.pricing.body}</p></div><div className="m-plan-grid">
        <article className="m-plan m-plan-free"><div className="m-plan-heading"><span className="m-plan-symbol"><BookOpen size={22} aria-hidden="true" /></span><h3>{copy.pricing.free}</h3></div><p className="m-plan-description">{copy.pricing.freeSub}</p><p className="m-price"><strong>{copy.pricing.freePrice}</strong><span>{copy.pricing.freePeriod}</span></p><ul>{copy.pricing.freeFeatures.map(feature => <li key={feature}><Check size={17} aria-hidden="true" />{feature}</li>)}</ul><Link className="m-button" href={start}>{signedIn ? copy.nav.resume : copy.pricing.freeCta}<ArrowUpRight size={18} aria-hidden="true" /></Link><p className="m-plan-note"><Clock3 size={14} aria-hidden="true" />{copy.pricing.quotaNote}</p></article>
        <article className="m-plan m-plan-pro"><div className="m-plan-heading"><span className="m-plan-symbol"><Sparkles size={22} aria-hidden="true" /></span><h3>{copy.pricing.pro}</h3><span className="m-sample-badge">{copy.pricing.proBadge}</span></div><p className="m-plan-description">{copy.pricing.proSub}</p><p className="m-price"><strong>{copy.pricing.proPrice}</strong><span>{copy.pricing.proPeriod}</span></p><ul>{copy.pricing.proFeatures.map(feature => <li key={feature}><Check size={17} aria-hidden="true" />{feature}</li>)}</ul><p className="m-plan-unavailable">{copy.pricing.proStatus}</p><p className="m-plan-note">{copy.pricing.proNote}</p></article>
      </div></div></section>

      <section id="faq" className="m-section m-faq"><div className="m-container m-faq-grid"><div><h2>{copy.faq.title}</h2></div><div className="m-faq-list">{copy.faq.items.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></div></section>

      <section className="m-closing"><div className="m-container m-closing-inner"><h2>{copy.closing.title}</h2><p>{copy.closing.body}</p><Link className="m-button m-button-white" href={start}>{signedIn ? copy.nav.resume : copy.closing.action}<ArrowUpRight size={19} aria-hidden="true" /></Link><span className="m-closing-note">{copy.closing.note}</span></div></section>
    </main>
  );
}

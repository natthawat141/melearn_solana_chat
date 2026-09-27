import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

const buttonStyles = {
  primary: "bg-primary text-white hover:bg-brand",
  secondary: "bg-[#E7EDFF] text-primary hover:bg-[#d9e2ff]",
  ghost: "bg-transparent text-primary",
  danger: "bg-transparent text-error",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-4 font-semibold disabled:cursor-not-allowed disabled:bg-border disabled:text-muted ${buttonStyles[variant]} ${className}`}
        {...props}
      />
    );
  },
);

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="min-h-12 w-full rounded-[12px] border border-border bg-surface px-3 text-ink outline-none" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="w-full resize-none rounded-[12px] border border-border bg-surface px-3 py-3 text-ink outline-none" {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-[20px] border border-border bg-surface p-4 ${className}`}>{children}</section>;
}

export function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "muted" }) {
  const color = tone === "muted" ? "bg-border text-muted" : "bg-[#E7EDFF] text-primary";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}

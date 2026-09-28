import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { Button as ShadButton } from "@/components/ui/button";
import { Card as ShadCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const variants = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }>(
  function Button({ variant = "primary", className, ...props }, ref) {
    return (
      <ShadButton
        ref={ref}
        variant={variants[variant]}
        className={cn("min-h-12 rounded-[14px] px-4 text-base font-semibold", className)}
        {...props}
      />
    );
  },
);

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={cn("h-12 min-h-12 rounded-[12px] border-border bg-card px-3 text-base md:text-base", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Textarea
      className={cn("min-h-24 rounded-[12px] border-border bg-card px-3 py-3 text-base focus-visible:ring-primary/30 md:text-base", className)}
      {...props}
    />
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <ShadCard className={cn("rounded-[20px] border border-border bg-card p-4 shadow-none ring-0", className)}>{children}</ShadCard>;
}

export function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "muted" }) {
  return (
    <Badge variant={tone === "muted" ? "outline" : "secondary"} className="h-auto rounded-full px-3 py-1 text-xs font-semibold">
      {children}
    </Badge>
  );
}

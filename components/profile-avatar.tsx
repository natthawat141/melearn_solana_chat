"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function ProfileAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase();
  return (
    <Avatar className={cn("size-10", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="bg-action text-action-foreground text-base font-semibold">
        {initial || <UserRound aria-hidden="true" />}
      </AvatarFallback>
    </Avatar>
  );
}

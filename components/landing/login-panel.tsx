"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { LandingCopy } from "@/content/landing";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function LoginPanel({
  copy,
  locale,
  initialMode,
  nextPath,
}: {
  copy: LandingCopy["auth"];
  locale: Locale;
  initialMode: "login" | "register";
  nextPath: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function switchMode() {
    const nextMode = mode === "login" ? "register" : "login";
    setMode(nextMode);
    setError(null);
    setNameError(null);
    setPasswordError(null);
    const params = new URLSearchParams();
    params.set("next", nextPath);
    if (nextMode === "register") params.set("mode", "register");
    router.replace(`/login?${params.toString()}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const displayName = String(values.get("displayName") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const nextNameError = !displayName || displayName.length > 40 ? t(locale, "auth.nameInvalid") : null;
    const nextPasswordError =
      !password || password.length > 72 || (mode === "register" && password.length < 4) ? t(locale, "auth.shortPassword") : null;
    setNameError(nextNameError);
    setPasswordError(nextPasswordError);
    setError(null);
    if (nextNameError || nextPasswordError) return;

    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, password }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok) {
        setError(data?.message || copy.error);
        return;
      }
      router.replace(data?.user?.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{mode === "login" ? copy.title : copy.registerTitle}</h1>
          </CardTitle>
          <CardDescription>{mode === "login" ? copy.body : copy.registerBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} aria-busy={pending}>
            <FieldGroup>
              <Field data-disabled={pending || undefined} data-invalid={nameError ? true : undefined}>
                <FieldLabel htmlFor="account-name">{copy.name}</FieldLabel>
                <Input
                  className="h-12"
                  id="account-name"
                  name="displayName"
                  autoComplete="username"
                  required
                  maxLength={40}
                  disabled={pending}
                  aria-invalid={nameError ? true : undefined}
                />
                <FieldError>{nameError}</FieldError>
              </Field>
              <Field data-disabled={pending || undefined} data-invalid={passwordError ? true : undefined}>
                <FieldLabel htmlFor="account-password">{copy.password}</FieldLabel>
                <Input
                  className="h-12"
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  minLength={mode === "register" ? 4 : undefined}
                  maxLength={72}
                  disabled={pending}
                  aria-invalid={passwordError ? true : undefined}
                />
                <FieldError>{passwordError}</FieldError>
              </Field>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {nextPath.startsWith("/learn/") ? (
                <p className="text-sm text-muted-foreground">{t(locale, "auth.returnNote")}</p>
              ) : null}
              <Button className="h-12 w-full" type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? copy.pending : mode === "login" ? copy.submit : copy.register}
                {pending ? null : <ArrowUpRight data-icon="inline-end" aria-hidden="true" />}
              </Button>
            </FieldGroup>
          </form>
          <Button className="mt-4 min-h-11 w-full" variant="link" type="button" disabled={pending} onClick={switchMode}>
            {mode === "login" ? copy.switchRegister : copy.switchLogin}
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">{copy.note}</p>
        </CardFooter>
      </Card>
      <Link className="m-text-link m-auth-back" href="/">
        <ArrowLeft size={16} aria-hidden="true" />
        {copy.back}
      </Link>
    </div>
  );
}

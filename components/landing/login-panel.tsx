"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { LandingCopy } from "@/content/landing";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { connectLoginWallet, type LoginWallet } from "@/lib/auth-wallet";
import { walletDiagnostic, walletRetryUntil, walletErrorCode, walletErrorKey, type WalletDiagnostic, type WalletLoginStage } from "@/lib/wallet-errors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { getMelearnFirebaseAuth } from "@/lib/firebase-client";
import { GoogleAuthProvider, signInWithPopup, signOut } from "@firebase/auth";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Copy, KeyRound, Mail, RefreshCw, ShieldCheck, User } from "lucide-react";

const COOLDOWN_KEY = "ml_local_wallet_retry_until_v1";

const wallets: Array<{ id: LoginWallet; label: string; logo: string }> = [
  { id: "metamask", label: "MetaMask", logo: "/wallets/metamask.svg" },
  { id: "phantom", label: "Phantom", logo: "/wallets/phantom.svg" },
  { id: "solflare", label: "Solflare", logo: "/wallets/solflare.svg" },
];

export function LoginPanel({
  copy,
  locale,
  initialMode = "login",
  nextPath,
}: {
  copy: LandingCopy["auth"];
  locale: Locale;
  initialMode?: "login" | "register";
  nextPath: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">(initialMode);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // Registration state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regCooldown, setRegCooldown] = useState(0);

  // Password reset state
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0);

  // Common UI state
  const [pending, setPending] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<LoginWallet | null>(null);
  const [pendingGoogle, setPendingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Inline field errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Wallet diagnostic state
  const [diagnostic, setDiagnostic] = useState<WalletDiagnostic | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"ready" | "copied" | "failed">("ready");
  const [retryUntil, setRetryUntil] = useState(0);

  useEffect(() => {
    try {
      const stored = Number(sessionStorage.getItem(COOLDOWN_KEY));
      if (Number.isFinite(stored) && stored > Date.now() && stored <= Date.now() + 86400_000) {
        setRetryUntil(stored);
        setError(t(locale, "auth.walletCooldown"));
      }
    } catch { /* Storage may be disabled; in-page cooldown still works. */ }
  }, [locale]);

  useEffect(() => {
    if (!retryUntil) return;
    const timer = window.setTimeout(() => {
      setRetryUntil(0);
      try { sessionStorage.removeItem(COOLDOWN_KEY); } catch { /* Optional persistence. */ }
    }, Math.max(0, retryUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryUntil]);

  useEffect(() => {
    if (regCooldown <= 0) return;
    const interval = setInterval(() => {
      setRegCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [regCooldown]);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const interval = setInterval(() => {
      setResetCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetCooldown]);

  function resetErrors() {
    setError(null);
    setSuccessInfo(null);
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setOtpError(null);
    setDiagnostic(null);
  }

  function recordWalletFailure(wallet: LoginWallet, stage: WalletLoginStage, response?: Response, body?: unknown) {
    const detail = walletDiagnostic(body, wallet, stage, response?.status);
    setDiagnostic(detail);
    console.warn("[wallet-auth]", detail);
    if (response) {
      const deadline = walletRetryUntil(response.status, body, response.headers.get("Retry-After"));
      if (deadline) {
        setRetryUntil(deadline);
        try { sessionStorage.setItem(COOLDOWN_KEY, String(deadline)); } catch { /* Optional persistence. */ }
      }
    }
  }

  async function copyDiagnostic() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      setDetailsOpen(true);
    }
  }

  async function signInWithWallet(walletName: LoginWallet) {
    if (pending || retryUntil > Date.now()) return;
    setPending(true);
    setPendingWallet(walletName);
    resetErrors();
    setDetailsOpen(false);
    setCopyState("ready");
    let stage: WalletLoginStage = "connect";
    try {
      const wallet = await connectLoginWallet(walletName);
      if (!wallet) {
        recordWalletFailure(walletName, stage);
        setError(t(locale, "auth.walletMissing"));
        return;
      }
      stage = "challenge";
      const issued = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicKey: wallet.publicKey, chain: wallet.chain, walletName: wallet.walletName, chainId: wallet.chainId }),
      });
      const challenge = (await issued.json().catch(() => null)) as { message?: string; nonce?: string } | null;
      if (!issued.ok || !challenge?.message || !challenge.nonce) {
        recordWalletFailure(walletName, stage, issued, challenge);
        setError(challenge?.message || t(locale, "auth.walletChallengeFailed"));
        return;
      }
      stage = "sign";
      const signature = await wallet.signMessage(challenge.message);
      if (!signature) {
        recordWalletFailure(walletName, stage);
        setError(t(locale, "auth.walletSignFailed"));
        return;
      }
      stage = "verify";
      const response = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey,
          nonce: challenge.nonce,
          signature,
          chain: wallet.chain,
          walletName: wallet.walletName,
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        recordWalletFailure(walletName, stage, response, data);
        setError(data?.message || t(locale, "auth.walletVerifyFailed"));
        return;
      }
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch (error) {
      const detail = walletDiagnostic(null, walletName, stage);
      const code = walletErrorCode(error);
      if (code !== undefined) detail.walletCode = code;
      setDiagnostic(detail);
      console.warn("[wallet-auth]", detail);
      setError(t(locale, walletErrorKey(error, stage)));
    } finally {
      setPending(false);
      setPendingWallet(null);
    }
  }

  async function signInWithGoogle() {
    if (pending) return;
    setPending(true);
    setPendingGoogle(true);
    resetErrors();
    let firebaseAuth: ReturnType<typeof getMelearnFirebaseAuth> | null = null;
    try {
      firebaseAuth = getMelearnFirebaseAuth();
      firebaseAuth.languageCode = locale === "th" ? "th" : "en";
      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = (await response.json().catch(() => null)) as { code?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        await signOut(firebaseAuth).catch(() => undefined);
        setError(t(locale, data?.code === "GOOGLE_AUTH_UNAVAILABLE" ? "auth.googleUnavailable" : "auth.googleError"));
        return;
      }
      await signOut(firebaseAuth).catch(() => undefined);
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch (error) {
      if (firebaseAuth) await signOut(firebaseAuth).catch(() => undefined);
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      const messageKey = code === "auth/popup-blocked"
        ? "auth.googlePopupBlocked"
        : code === "auth/unauthorized-domain"
          ? "auth.googleDomain"
          : code === "auth/operation-not-allowed"
            ? "auth.googleProviderDisabled"
            : "auth.googleError";
      setError(t(locale, messageKey));
    } finally {
      setPending(false);
      setPendingGoogle(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const displayName = String(values.get("displayName") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const nextNameError = !displayName || displayName.length > 100 ? t(locale, "auth.nameInvalid") : null;
    const nextPasswordError = !password || password.length > 72 ? t(locale, "auth.shortPassword") : null;
    setNameError(nextNameError);
    setPasswordError(nextPasswordError);
    setError(null);
    if (nextNameError || nextPasswordError) return;

    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, password }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        setError(data?.message || copy.error);
        return;
      }
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  async function handleRegisterRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim().toLowerCase();
    const password = String(values.get("password") ?? "");
    const displayName = String(values.get("displayName") ?? "").trim();

    const nextEmailError = !email || !email.includes("@") || email.length > 254 ? t(locale, "auth.emailRequired") : null;
    const nextPasswordError = !password || password.length < 6 || password.length > 72 ? t(locale, "auth.shortPassword") : null;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setError(null);
    if (nextEmailError || nextPasswordError) return;

    setPending(true);
    try {
      const response = await fetch("/api/auth/register/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message || copy.error);
        return;
      }
      setRegEmail(email);
      setRegPassword(password);
      setRegDisplayName(displayName);
      setRegisterStep(2);
      setRegCooldown(60);
      setSuccessInfo(null);
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  async function handleRegisterResendOtp() {
    if (pending || regCooldown > 0 || !regEmail || !regPassword) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword, displayName: regDisplayName }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message || copy.error);
        return;
      }
      setRegCooldown(60);
      setSuccessInfo(locale === "th" ? "ส่งรหัส OTP ใหม่ไปยังอีเมลของคุณแล้ว" : "New OTP code sent to your email");
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  async function handleRegisterVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const cleanCode = regOtp.trim();
    if (cleanCode.length !== 6) {
      setOtpError(t(locale, "auth.otpInvalid"));
      return;
    }
    setOtpError(null);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: regEmail, code: cleanCode }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        setError(data?.message || t(locale, "auth.otpInvalid"));
        return;
      }
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  async function handleResetRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setEmailError(t(locale, "auth.emailRequired"));
      return;
    }
    setEmailError(null);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; ok?: boolean; email?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message || copy.error);
        return;
      }
      setResetEmail(data.email || email);
      setResetStep(2);
      setResetCooldown(60);
      setSuccessInfo(null);
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  async function handleResetResendOtp() {
    if (pending || resetCooldown > 0 || !resetEmail) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.message || copy.error);
        return;
      }
      setResetCooldown(60);
      setSuccessInfo(locale === "th" ? "ส่งรหัส OTP ใหม่แล้ว" : "New OTP code sent");
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  async function handleResetConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const cleanCode = resetOtp.trim();
    if (cleanCode.length !== 6) {
      setOtpError(t(locale, "auth.otpInvalid"));
      return;
    }
    if (resetNewPassword.length < 6) {
      setPasswordError(t(locale, "auth.shortPassword"));
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setPasswordError(t(locale, "auth.passwordMismatch"));
      return;
    }
    setOtpError(null);
    setPasswordError(null);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code: cleanCode, newPassword: resetNewPassword }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; user?: { onboarded: boolean } } | null;
      if (!response.ok || !data?.user) {
        setError(data?.message || copy.error);
        return;
      }
      router.replace(data.user.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="auth-card">
      <CardHeader className="auth-card-header">
        <Image src="/brand/logo.png" alt="Melearn Chat" width={64} height={64} className="auth-logo" priority />
        {mode === "login" && (
          <>
            <CardTitle><h1>{locale === "th" ? "เข้าสู่ระบบ " : "Sign in to "}<span>Melearn Chat</span></h1></CardTitle>
            <CardDescription>{locale === "th" ? "ยินดีต้อนรับกลับมา! เข้าสู่ระบบเพื่อเรียนรู้ต่อ" : "Welcome back! Sign in to continue learning."}</CardDescription>
          </>
        )}
        {mode === "register" && registerStep === 1 && (
          <>
            <CardTitle><h1>{copy.registerTitle}</h1></CardTitle>
            <CardDescription>{copy.registerBody}</CardDescription>
          </>
        )}
        {mode === "register" && registerStep === 2 && (
          <>
            <CardTitle><h1>{t(locale, "auth.verifyAndRegister")}</h1></CardTitle>
            <CardDescription>{t(locale, "auth.otpSentTo")} <strong className="font-semibold text-foreground">{regEmail}</strong></CardDescription>
          </>
        )}
        {mode === "forgot-password" && resetStep === 1 && (
          <>
            <CardTitle><h1>{t(locale, "auth.resetPasswordTitle")}</h1></CardTitle>
            <CardDescription>{t(locale, "auth.resetPasswordDesc")}</CardDescription>
          </>
        )}
        {mode === "forgot-password" && resetStep === 2 && (
          <>
            <CardTitle><h1>{t(locale, "auth.resetPasswordTitle")}</h1></CardTitle>
            <CardDescription>{t(locale, "auth.otpSentTo")} <strong className="font-semibold text-foreground">{resetEmail}</strong></CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="auth-card-content">
        {error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              <p>{error}</p>
              {retryUntil ? <p>{t(locale, "auth.walletRetryAt")} {new Date(retryUntil).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US")}</p> : null}
              {diagnostic ? (
                <div className="flex flex-col gap-2">
                  {diagnostic.requestId ? <p className="break-all">{t(locale, "auth.walletReference")}: {diagnostic.requestId}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyDiagnostic()}><Copy data-icon="inline-start" />{t(locale, copyState === "copied" ? "auth.walletCopied" : "auth.walletCopyDetails")}</Button>
                    <Button type="button" variant="ghost" size="sm" aria-expanded={detailsOpen} aria-controls="wallet-error-details" onClick={() => setDetailsOpen(!detailsOpen)}>{t(locale, "auth.walletDetails")}</Button>
                  </div>
                  {copyState === "failed" ? <p>{t(locale, "auth.walletCopyFailed")}</p> : null}
                  {detailsOpen ? <pre id="wallet-error-details" className="whitespace-pre-wrap break-all">{JSON.stringify(diagnostic, null, 2)}</pre> : null}
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {successInfo ? (
          <Alert className="border-primary/30 bg-primary/10 text-primary">
            <CheckCircle2 aria-hidden="true" />
            <AlertDescription>{successInfo}</AlertDescription>
          </Alert>
        ) : null}

        {/* Social login buttons (only on initial login and register step 1) */}
        {(mode === "login" || (mode === "register" && registerStep === 1)) && (
          <>
            <div className="flex flex-col gap-3">
              <Button type="button" variant="outline" className="h-11 w-full" disabled={pending} onClick={() => void signInWithGoogle()}>
                {pendingGoogle ? <Spinner aria-label={t(locale, "auth.googlePending")} /> : <span aria-hidden="true" className="font-bold text-[#4285F4]">G</span>}
                {pendingGoogle ? t(locale, "auth.googlePending") : t(locale, "auth.google")}
              </Button>
              <div className="auth-wallets" aria-label={t(locale, "auth.walletProviders")}>
                {wallets.map(({ id, label, logo }) => (
                  <Button key={id} type="button" variant="outline" className="auth-wallet-button" disabled={pending || !!retryUntil} onClick={() => void signInWithWallet(id)}>
                    {pendingWallet === id ? <><Spinner aria-label={copy.pending} /><span>{copy.pending}</span></> : <><Image src={logo} alt="" width={22} height={22} /><span>{label}</span></>}
                  </Button>
                ))}
              </div>
            </div>
            <FieldSeparator>{locale === "th" ? "หรือ" : "or"}</FieldSeparator>
          </>
        )}

        {/* 1. Login Form */}
        {mode === "login" && (
          <form onSubmit={handleLogin} aria-busy={pending}>
            <FieldGroup className="gap-4">
              <Field data-invalid={!!nameError} data-disabled={pending}>
                <FieldLabel htmlFor="account-login-name">{locale === "th" ? "อีเมลหรือชื่อบัญชี" : "Email or account name"}</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon><Mail aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput id="account-login-name" name="displayName" autoComplete="username" required maxLength={100} disabled={pending} aria-invalid={!!nameError} aria-describedby={nameError ? "account-name-error" : undefined} />
                </InputGroup>
                {nameError ? <Alert variant="destructive" id="account-name-error"><CircleAlert aria-hidden="true" /><AlertDescription>{nameError}</AlertDescription></Alert> : null}
              </Field>

              <Field data-invalid={!!passwordError} data-disabled={pending}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="account-password">{copy.password}</FieldLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      resetErrors();
                      setMode("forgot-password");
                      setResetStep(1);
                    }}
                  >
                    {t(locale, "auth.forgotPassword")}
                  </Button>
                </div>
                <Input className="h-11" id="account-password" name="password" type="password" autoComplete="current-password" required maxLength={72} disabled={pending} aria-invalid={!!passwordError} aria-describedby={passwordError ? "account-password-error" : undefined} />
                {passwordError ? <Alert variant="destructive" id="account-password-error"><CircleAlert aria-hidden="true" /><AlertDescription>{passwordError}</AlertDescription></Alert> : null}
              </Field>

              <Button type="submit" disabled={pending} className="h-11 w-full">
                {pending && !pendingWallet && !pendingGoogle ? <Spinner aria-label={copy.pending} /> : null}
                {pending && !pendingWallet && !pendingGoogle ? copy.pending : copy.submit}
                {!pending ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
              </Button>
            </FieldGroup>
          </form>
        )}

        {/* 2. Registration Step 1: Input Email + Password */}
        {mode === "register" && registerStep === 1 && (
          <form onSubmit={handleRegisterRequestOtp} aria-busy={pending}>
            <FieldGroup className="gap-4">
              <Field data-invalid={!!emailError} data-disabled={pending}>
                <FieldLabel htmlFor="reg-email">{t(locale, "auth.email")}</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon><Mail aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput id="reg-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required maxLength={254} disabled={pending} aria-invalid={!!emailError} aria-describedby={emailError ? "reg-email-error" : undefined} />
                </InputGroup>
                {emailError ? <Alert variant="destructive" id="reg-email-error"><CircleAlert aria-hidden="true" /><AlertDescription>{emailError}</AlertDescription></Alert> : null}
              </Field>

              <Field data-invalid={!!passwordError} data-disabled={pending}>
                <FieldLabel htmlFor="reg-password">{copy.password}</FieldLabel>
                <Input className="h-11" id="reg-password" name="password" type="password" autoComplete="new-password" placeholder={locale === "th" ? "อย่างน้อย 6 ตัวอักษร" : "At least 6 characters"} required minLength={6} maxLength={72} disabled={pending} aria-invalid={!!passwordError} aria-describedby={passwordError ? "reg-password-error" : undefined} />
                {passwordError ? <Alert variant="destructive" id="reg-password-error"><CircleAlert aria-hidden="true" /><AlertDescription>{passwordError}</AlertDescription></Alert> : null}
              </Field>

              <Field data-invalid={!!nameError} data-disabled={pending}>
                <FieldLabel htmlFor="reg-name">{copy.name}</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon><User aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput id="reg-name" name="displayName" autoComplete="nickname" placeholder={locale === "th" ? "เช่น บิล หรือ ป่าน (ไม่บังคับ)" : "e.g. Bill (optional)"} maxLength={40} disabled={pending} />
                </InputGroup>
              </Field>

              <Button type="submit" disabled={pending} className="h-11 w-full">
                {pending ? <Spinner aria-label={copy.pending} /> : null}
                {pending ? copy.pending : t(locale, "auth.sendOtp")}
                {!pending ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
              </Button>
            </FieldGroup>
          </form>
        )}

        {/* 3. Registration Step 2: Verify 6-digit OTP */}
        {mode === "register" && registerStep === 2 && (
          <form onSubmit={handleRegisterVerifyOtp} aria-busy={pending}>
            <FieldGroup className="gap-4">
              <p className="text-center text-xs text-muted-foreground">
                {t(locale, "auth.otpExpiresIn")}
              </p>

              <Field data-invalid={!!otpError} data-disabled={pending}>
                <FieldLabel htmlFor="reg-otp" className="text-center block">{t(locale, "auth.otpLabel")}</FieldLabel>
                <Input
                  className="h-14 text-center font-mono text-2xl tracking-[0.4em] font-bold"
                  id="reg-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  autoFocus
                  disabled={pending}
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? "reg-otp-error" : undefined}
                />
                {otpError ? <Alert variant="destructive" id="reg-otp-error"><CircleAlert aria-hidden="true" /><AlertDescription>{otpError}</AlertDescription></Alert> : null}
              </Field>

              <Button type="submit" disabled={pending || regOtp.trim().length !== 6} className="h-11 w-full">
                {pending ? <Spinner aria-label={copy.pending} /> : null}
                {pending ? copy.pending : t(locale, "auth.verifyAndRegister")}
                {!pending ? <ShieldCheck data-icon="inline-end" aria-hidden="true" /> : null}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending || regCooldown > 0}
                  onClick={() => void handleRegisterResendOtp()}
                >
                  <RefreshCw data-icon="inline-start" className={regCooldown > 0 ? "opacity-50" : ""} />
                  {regCooldown > 0 ? `${t(locale, "auth.resendOtp")} (${regCooldown}s)` : t(locale, "auth.resendOtp")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    resetErrors();
                    setRegisterStep(1);
                  }}
                >
                  {t(locale, "auth.changeEmail")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}

        {/* 4. Password Reset Step 1: Input Email */}
        {mode === "forgot-password" && resetStep === 1 && (
          <form onSubmit={handleResetRequestOtp} aria-busy={pending}>
            <FieldGroup className="gap-4">
              <Field data-invalid={!!emailError} data-disabled={pending}>
                <FieldLabel htmlFor="reset-email">{t(locale, "auth.email")}</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon><Mail aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput id="reset-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required maxLength={254} disabled={pending} aria-invalid={!!emailError} aria-describedby={emailError ? "reset-email-error" : undefined} />
                </InputGroup>
                {emailError ? <Alert variant="destructive" id="reset-email-error"><CircleAlert aria-hidden="true" /><AlertDescription>{emailError}</AlertDescription></Alert> : null}
              </Field>

              <Button type="submit" disabled={pending} className="h-11 w-full">
                {pending ? <Spinner aria-label={copy.pending} /> : null}
                {pending ? copy.pending : t(locale, "auth.sendOtp")}
                {!pending ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
              </Button>

              <div className="text-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    resetErrors();
                    setMode("login");
                  }}
                >
                  <ArrowLeft data-icon="inline-start" />
                  {t(locale, "auth.backToLogin")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}

        {/* 5. Password Reset Step 2: OTP + New Password */}
        {mode === "forgot-password" && resetStep === 2 && (
          <form onSubmit={handleResetConfirm} aria-busy={pending}>
            <FieldGroup className="gap-4">
              <Field data-invalid={!!otpError} data-disabled={pending}>
                <FieldLabel htmlFor="reset-otp">{t(locale, "auth.otpLabel")}</FieldLabel>
                <Input
                  className="h-12 text-center font-mono text-xl tracking-[0.3em] font-bold"
                  id="reset-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  autoFocus
                  disabled={pending}
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? "reset-otp-error" : undefined}
                />
                {otpError ? <Alert variant="destructive" id="reset-otp-error"><CircleAlert aria-hidden="true" /><AlertDescription>{otpError}</AlertDescription></Alert> : null}
              </Field>

              <Field data-invalid={!!passwordError} data-disabled={pending}>
                <FieldLabel htmlFor="reset-new-password">{t(locale, "auth.newPassword")}</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon><KeyRound aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput
                    id="reset-new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={72}
                    disabled={pending}
                  />
                </InputGroup>
              </Field>

              <Field data-invalid={!!passwordError} data-disabled={pending}>
                <FieldLabel htmlFor="reset-confirm-password">{t(locale, "auth.confirmPassword")}</FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon><KeyRound aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={72}
                    disabled={pending}
                  />
                </InputGroup>
                {passwordError ? <Alert variant="destructive" id="reset-password-error"><CircleAlert aria-hidden="true" /><AlertDescription>{passwordError}</AlertDescription></Alert> : null}
              </Field>

              <Button type="submit" disabled={pending || resetOtp.trim().length !== 6} className="h-11 w-full">
                {pending ? <Spinner aria-label={copy.pending} /> : null}
                {pending ? copy.pending : t(locale, "auth.resetPasswordSubmit")}
                {!pending ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending || resetCooldown > 0}
                  onClick={() => void handleResetResendOtp()}
                >
                  <RefreshCw data-icon="inline-start" className={resetCooldown > 0 ? "opacity-50" : ""} />
                  {resetCooldown > 0 ? `${t(locale, "auth.resendOtp")} (${resetCooldown}s)` : t(locale, "auth.resendOtp")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    resetErrors();
                    setMode("login");
                  }}
                >
                  {t(locale, "auth.backToLogin")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}

        {/* Switch between Login and Register */}
        {mode !== "forgot-password" && (
          <p className="auth-switch">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                resetErrors();
                if (mode === "login") {
                  setMode("register");
                  setRegisterStep(1);
                } else {
                  setMode("login");
                }
              }}
            >
              {mode === "register" ? copy.switchLogin : copy.switchRegister}
            </Button>
          </p>
        )}
      </CardContent>

      <CardFooter className="auth-card-footer">
        <ShieldCheck aria-hidden="true" />
        <span>{locale === "th" ? "ลงชื่อเข้าใช้กับ Melearn Chat อย่างปลอดภัย" : "Sign in securely with Melearn Chat"}</span>
      </CardFooter>
    </Card>
  );
}

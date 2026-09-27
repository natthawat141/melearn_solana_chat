"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPanel } from "@/components/auth-panel";
import { Button, Card, Pill } from "@/components/melearn-ui";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { connectSolanaWallet, sendSolanaTransaction } from "@/lib/wallet";

type Phase = "review" | "approval" | "pending" | "cancelled" | "failed" | "insufficient" | "success";

type Purchase = { id: string; status: string; signature: string | null };

function bytesFromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function UnlockPanel({
  locale,
  lessonId,
  title,
  summary,
  objectives,
  priceLabel,
  lamports,
  recipient,
  terms,
  tokenLabel,
  signedIn,
  owned,
  initialPurchase,
}: {
  locale: Locale;
  lessonId: string;
  title: string;
  summary: string;
  objectives: string[];
  priceLabel: string | null;
  lamports: number | null;
  recipient: string;
  terms: string;
  tokenLabel: string;
  signedIn: boolean;
  owned: boolean;
  initialPurchase: Purchase | null;
}) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(owned ? "success" : initialPurchase?.status === "pending" ? "pending" : initialPurchase?.status === "failed" ? "failed" : "review");
  const [purchase, setPurchase] = useState<Purchase | null>(initialPurchase);
  const [error, setError] = useState<string | null>(null);
  const [walletMissing, setWalletMissing] = useState(false);

  async function connect() {
    const account = await connectSolanaWallet();
    if (!account) {
      setWalletMissing(true);
      return;
    }
    setPublicKey(account);
    setWalletMissing(false);
  }

  async function check(id: string, signature: string) {
    const response = await fetch(`/api/purchases/${id}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signature }),
    });
    const data = (await response.json()) as { status?: string; message?: string; signature?: string };
    if (data.status === "confirmed") {
      setPhase("success");
      setPurchase({ id, status: "confirmed", signature });
      return true;
    }
    if (data.status === "pending") {
      setPhase("pending");
      setPurchase({ id, status: "pending", signature });
      setError(data.message || t(locale, "pay.pending"));
      return false;
    }
    setPhase("failed");
    setError(data.message || t(locale, "pay.failed"));
    return false;
  }

  async function pay() {
    if (!publicKey || lamports === null) return;
    setError(null);
    setPhase("approval");
    const quoteResponse = await fetch("/api/purchases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId }),
    });
    const quote = (await quoteResponse.json()) as { purchase?: Purchase; message?: string; code?: string };
    if (quote.code === "OWNED") {
      setPhase("success");
      return;
    }
    if (!quoteResponse.ok || !quote.purchase) {
      setPhase("failed");
      setError(quote.message || t(locale, "pay.failed"));
      return;
    }
    const txResponse = await fetch(`/api/purchases/${quote.purchase.id}/transaction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payer: publicKey }),
    });
    const built = (await txResponse.json()) as { transaction?: string; rpcUrl?: string; message?: string };
    if (!txResponse.ok || !built.transaction || !built.rpcUrl) {
      setPhase("failed");
      setError(built.message || t(locale, "pay.failed"));
      return;
    }
    try {
      const signature = await sendSolanaTransaction(bytesFromBase64(built.transaction), built.rpcUrl);
      setPurchase({ id: quote.purchase.id, status: "pending", signature });
      setPhase("pending");
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const done = await check(quote.purchase.id, signature);
        if (done) return;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (/insufficient/i.test(message)) {
        setPhase("insufficient");
        return;
      }
      if (/reject|cancel|denied|4001|user rejected/i.test(message)) {
        await fetch(`/api/purchases/${quote.purchase.id}/cancel`, { method: "POST" });
        setPurchase({ id: quote.purchase.id, status: "cancelled", signature: null });
        setPhase("cancelled");
        return;
      }
      setPhase("failed");
      setError(message);
    }
  }

  const steps = ["pay.step.connect", "pay.step.review", "pay.step.approve", "pay.step.verify", "pay.step.unlock"] as const;
  const activeStep = phase === "success" ? 4 : phase === "pending" ? 3 : phase === "approval" ? 2 : publicKey ? 1 : 0;
  const receipt = purchase?.signature ? `https://explorer.solana.com/tx/${purchase.signature}?cluster=devnet` : null;

  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-4 px-5 py-2">
      <Pill>{t(locale, "pay.testBadge")}</Pill>
      <h1>{t(locale, "pay.title")}</h1>
      <p className="text-muted-foreground">{t(locale, "pay.test")}</p>
      <Card>
        <h2 className="text-[18px]">{title}</h2>
        <p className="mt-1 text-muted-foreground">{summary}</p>
        <p className="mt-3 text-sm font-semibold">{t(locale, "pay.included")}</p>
        <ul className="mt-1 list-disc pl-5 text-sm">
          {objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li key={step} className={`rounded-[14px] px-3 py-2 text-sm font-semibold ${index === activeStep ? "bg-[#E7EDFF] text-primary" : "text-muted-foreground"}`}>
            {index + 1}. {t(locale, step)}
          </li>
        ))}
      </ol>
      {!signedIn ? (
        <Card>
          <p className="mb-3 text-sm">{t(locale, "auth.needAccount")}</p>
          <AuthPanel locale={locale} />
        </Card>
      ) : (
        <Card className="grid gap-3">
          <p>
            <span className="font-semibold">{t(locale, "pay.price")}: </span>
            {priceLabel ?? t(locale, "common.empty")}
          </p>
          <p>
            <span className="font-semibold">{t(locale, "pay.network")}: </span>
            devnet · {tokenLabel}
          </p>
          <p className="break-all text-sm">
            <span className="font-semibold">{t(locale, "pay.recipient")}: </span>
            {recipient}
          </p>
          <p className="text-sm text-muted-foreground">{t(locale, "pay.fee")}</p>
          <p className="text-sm font-semibold">{t(locale, "pay.termsTitle")}</p>
          <p className="text-sm">{terms}</p>
          {phase === "success" || owned ? (
            <div className="grid gap-3">
              <p className="font-semibold text-success">{t(locale, "pay.success")}</p>
              {receipt ? (
                <a href={receipt} className="font-semibold text-primary" target="_blank" rel="noreferrer">
                  {t(locale, "pay.receipt")}
                </a>
              ) : null}
              <Link href={`/learn/${lessonId}`} className="inline-flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-4 font-semibold text-white">
                {t(locale, "pay.openLesson")}
              </Link>
            </div>
          ) : null}
          {phase === "pending" ? (
            <div className="grid gap-3">
              <p>{t(locale, "pay.pending")}</p>
              <p className="text-sm text-muted-foreground">{t(locale, "pay.syncing")}</p>
              {purchase?.signature ? (
                <Button type="button" variant="secondary" onClick={() => check(purchase.id, purchase.signature || "")}>
                  {t(locale, "pay.checkAgain")}
                </Button>
              ) : null}
            </div>
          ) : null}
          {phase === "cancelled" ? (
            <p>
              {t(locale, "pay.cancelled")} {t(locale, "pay.cancelledHint")}
            </p>
          ) : null}
          {phase === "failed" ? (
            <p className="text-error">
              {error || t(locale, "pay.failed")} {t(locale, "pay.failedHint")}
            </p>
          ) : null}
          {phase === "insufficient" ? (
            <p>
              {t(locale, "pay.insufficient")}{" "}
              <a className="font-semibold text-primary" href="https://faucet.solana.com" target="_blank" rel="noreferrer">
                {t(locale, "pay.faucet")}
              </a>
            </p>
          ) : null}
          {walletMissing ? <p className="text-sm">{t(locale, "pay.noWallet")}</p> : null}
          {phase !== "success" && phase !== "pending" && !owned ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">{t(locale, "pay.review")}</p>
              {!publicKey ? (
                <Button type="button" onClick={connect}>
                  {t(locale, "pay.connect")}
                </Button>
              ) : (
                <p className="break-all text-sm">{publicKey}</p>
              )}
              <Button type="button" disabled={!publicKey || lamports === null || phase === "approval"} onClick={pay}>
                {priceLabel ? `${t(locale, "pay.confirm")} · ${priceLabel}` : t(locale, "pay.confirm")}
              </Button>
              <p className="text-xs text-muted-foreground">{t(locale, "pay.connectHint")}</p>
            </div>
          ) : null}
          {phase === "failed" || phase === "cancelled" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPurchase(null);
                setPhase("review");
                setError(null);
              }}
            >
              {t(locale, "pay.newQuote")}
            </Button>
          ) : null}
        </Card>
      )}
    </div>
  );
}

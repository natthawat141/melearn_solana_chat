export type ParsedIx = {
  programId?: string;
  program?: string;
  parsed?: unknown;
};

export type ParsedTx = {
  err: unknown;
  instructions: ParsedIx[];
  signers: string[];
};

export type TransferExpectation = {
  purchaseId: string;
  recipient: string;
  lamports: number;
  payer: string;
};

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export function memoFor(purchaseId: string) {
  return `melearn:${purchaseId}`;
}

function memoText(instruction: ParsedIx) {
  const programId = instruction.programId ?? "";
  const program = instruction.program ?? "";
  const isMemo = programId === MEMO_PROGRAM || program === "spl-memo" || program === "memo";
  if (!isMemo) return null;
  const parsed = instruction.parsed;
  if (typeof parsed === "string") return parsed;
  if (parsed && typeof parsed === "object" && "info" in parsed) {
    const info = (parsed as { info?: { memo?: string } }).info;
    if (typeof info?.memo === "string") return info.memo;
  }
  if (parsed && typeof parsed === "object" && "memo" in parsed) {
    const memo = (parsed as { memo?: string }).memo;
    if (typeof memo === "string") return memo;
  }
  return null;
}

function transferInfo(instruction: ParsedIx) {
  const programId = instruction.programId ?? "";
  const program = instruction.program ?? "";
  const isSystem = programId === SYSTEM_PROGRAM || program === "system";
  if (!isSystem || !instruction.parsed || typeof instruction.parsed !== "object") return null;
  const parsed = instruction.parsed as { type?: string; info?: { source?: string; destination?: string; lamports?: number } };
  if (parsed.type !== "transfer" || !parsed.info) return null;
  const { source, destination, lamports } = parsed.info;
  if (!source || !destination || typeof lamports !== "number") return null;
  return { source, destination, lamports };
}

export function verifyTransfer(
  tx: ParsedTx,
  expected: TransferExpectation,
): { ok: true } | { ok: false; code: string } {
  if (tx.err) return { ok: false, code: "TX_FAILED" };
  const transfers = tx.instructions.map(transferInfo).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (transfers.length !== 1) return { ok: false, code: "MISSING_TRANSFER" };
  const transfer = transfers[0];
  if (transfer.source !== expected.payer) return { ok: false, code: "PAYER_MISMATCH" };
  if (!tx.signers.includes(expected.payer)) return { ok: false, code: "PAYER_MISMATCH" };
  if (transfer.destination !== expected.recipient) return { ok: false, code: "RECIPIENT_MISMATCH" };
  if (transfer.lamports !== expected.lamports) return { ok: false, code: "AMOUNT_MISMATCH" };
  const memo = tx.instructions.map(memoText).find((item) => item !== null) ?? "";
  if (memo !== memoFor(expected.purchaseId)) return { ok: false, code: "MEMO_MISMATCH" };
  return { ok: true };
}

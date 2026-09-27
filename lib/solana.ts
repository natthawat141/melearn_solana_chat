import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { paymentNetwork, paymentRecipient, rpcUrl } from "@/lib/content";
import { memoFor, type ParsedTx, verifyTransfer, type TransferExpectation } from "@/lib/verify-transfer";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function assertDevnet() {
  const network = paymentNetwork();
  if (network !== "devnet") {
    throw new Error("NETWORK");
  }
  return network;
}

export function recipientKey() {
  return new PublicKey(paymentRecipient());
}

export function buildUnsignedTransfer(input: {
  payer: string;
  recipient: string;
  lamports: number;
  purchaseId: string;
  blockhash: string;
}) {
  const payer = new PublicKey(input.payer);
  const tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(input.recipient),
      lamports: input.lamports,
    }),
  );
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoFor(input.purchaseId), "utf8"),
    }),
  );
  tx.feePayer = payer;
  tx.recentBlockhash = input.blockhash;
  return tx;
}

export async function recentBlockhash() {
  assertDevnet();
  const connection = new Connection(rpcUrl(), "confirmed");
  return connection.getLatestBlockhash("confirmed");
}

type RpcInstruction = {
  programId?: string;
  program?: string;
  parsed?: unknown;
};

type RpcResponse = {
  meta?: { err?: unknown } | null;
  transaction?: {
    message?: {
      accountKeys?: Array<{ pubkey?: string; signer?: boolean } | string>;
      instructions?: RpcInstruction[];
    };
  };
};

export function fromRpcTransaction(response: RpcResponse): ParsedTx {
  const keys = response.transaction?.message?.accountKeys ?? [];
  const signers = keys
    .map((key) => {
      if (typeof key === "string") return null;
      return key.signer ? key.pubkey ?? null : null;
    })
    .filter((key): key is string => Boolean(key));
  return {
    err: response.meta?.err ?? null,
    instructions: response.transaction?.message?.instructions ?? [],
    signers,
  };
}

export async function verifySignature(signature: string, expected: TransferExpectation) {
  assertDevnet();
  const connection = new Connection(rpcUrl(), "confirmed");
  try {
    const response = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!response) return { found: false as const, invalid: false as const };
    const parsed = fromRpcTransaction(response as unknown as RpcResponse);
    return { found: true as const, invalid: false as const, result: verifyTransfer(parsed, expected) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/WrongSize|invalid param/i.test(message)) return { found: false as const, invalid: true as const };
    throw error;
  }
}

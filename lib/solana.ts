import { getAddMemoInstruction } from "@solana-program/memo";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Signature,
} from "@solana/kit";
import type { Blockhash } from "@solana/rpc-types";
import { paymentNetwork, rpcUrl } from "@/lib/content";
import { memoFor, type ParsedTx, verifyTransfer, type TransferExpectation } from "@/lib/verify-transfer";

export function assertDevnet() {
  const network = paymentNetwork();
  if (network !== "devnet") throw new Error("NETWORK");
  return network;
}

export function buildUnsignedTransfer(input: {
  payer: string;
  recipient: string;
  lamports: number;
  purchaseId: string;
  blockhash: string;
  lastValidBlockHeight?: bigint;
}) {
  const payer = address(input.payer);
  const signer = createNoopSigner(payer);
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (draft) => setTransactionMessageFeePayer(payer, draft),
    (draft) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: input.blockhash as Blockhash, lastValidBlockHeight: input.lastValidBlockHeight ?? 0n },
        draft,
      ),
    (draft) =>
      appendTransactionMessageInstructions(
        [
          getTransferSolInstruction({
            source: signer,
            destination: address(input.recipient),
            amount: input.lamports,
          }),
          getAddMemoInstruction({ memo: memoFor(input.purchaseId), signers: [signer] }),
        ],
        draft,
      ),
  );
  return getBase64EncodedWireTransaction(compileTransaction(message));
}

export async function recentBlockhash() {
  assertDevnet();
  const rpc = createSolanaRpc(rpcUrl());
  const { value } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  return value;
}

type RpcInstruction = {
  programId?: string;
  program?: string;
  parsed?: unknown;
};

type RpcAccount = { pubkey?: string; signer?: boolean } | string;

type RpcResponse = {
  meta?: { err?: unknown } | null;
  transaction?: {
    message?: {
      accountKeys?: readonly RpcAccount[];
      instructions?: readonly RpcInstruction[];
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
    instructions: [...(response.transaction?.message?.instructions ?? [])],
    signers,
  };
}

export async function verifySignature(signature: string, expected: TransferExpectation) {
  assertDevnet();
  const rpc = createSolanaRpc(rpcUrl());
  try {
    const response = await rpc
      .getTransaction(signature as Signature, {
        commitment: "confirmed",
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
      })
      .send();
    if (!response) return { found: false as const, invalid: false as const };
    return { found: true as const, invalid: false as const, result: verifyTransfer(fromRpcTransaction(response), expected) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/WrongSize|invalid param|invalid base58|invalid signature/i.test(message)) return { found: false as const, invalid: true as const };
    throw error;
  }
}

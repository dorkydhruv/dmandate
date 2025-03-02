import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";
import BN from "bn.js";

/**
 * Load keypair from file
 */
export function loadKeypairFromFile(filePath: string): Keypair {
  const expanded = filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;

  if (!fs.existsSync(expanded)) {
    throw new Error(`Keypair file not found at: ${expanded}`);
  }

  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(expanded, "utf-8"))
  );
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Format timestamp to readable date string
 */
export function formatTimestamp(timestamp: BN | number): string {
  const ts = typeof timestamp === "number" ? timestamp : timestamp.toNumber();
  return new Date(ts * 1000).toLocaleString();
}

/**
 * Calculate next payment date for a mandate
 */
export function calculateNextPaymentDate(
  lastPaymentTimestamp: BN,
  frequency: BN
): Date {
  const nextTimestamp = lastPaymentTimestamp.add(frequency).toNumber() * 1000;
  return new Date(nextTimestamp);
}

/**
 * Find a user PDA
 */
export function findUserPda(
  userPublicKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user"), userPublicKey.toBuffer()],
    programId
  );
}

/**
 * Find a mandate PDA
 */
export function findMandatePda(
  payerPublicKey: PublicKey,
  payeePublicKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("dmandate"),
      payerPublicKey.toBuffer(),
      payeePublicKey.toBuffer(),
    ],
    programId
  );
}

/**
 * Find a payment history PDA
 */
export function findPaymentHistoryPda(
  mandatePda: PublicKey,
  paymentNumber: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_history"),
      mandatePda.toBuffer(),
      new BN(paymentNumber).toBuffer("le", 4),
    ],
    programId
  );
}

/**
 * Convert seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months`;
  return `${Math.floor(seconds / 31536000)} years`;
}

/**
 * Format token amount based on decimals
 */
export function formatTokenAmount(
  amount: BN | number,
  decimals: number = 0
): string {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  if (decimals === 0) return value.toString();

  const factor = Math.pow(10, decimals);
  const result = value / factor;
  return result.toFixed(decimals);
}

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import type { PaymentProof } from "@/lib/shared/types";

export const dynamic = "force-dynamic";

type ProofRow = RowDataPacket & {
  payment_intent_id: string; invoice_id: string; amount: string; currency: string; supplier_id: string;
  destination_wallet: string; chain_id: number | string; tx_hash: string; block_number: number | string;
  network: string; explorer_url: string; confirmed_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProof(value: unknown): PaymentProof | null {
  if (!isRecord(value)) return null;
  const { paymentIntentId, invoiceId, amount, currency, supplierId, destinationWallet, chainId, txHash, blockNumber, network, explorerUrl, confirmedAt } = value;
  if (typeof paymentIntentId !== "string" || paymentIntentId.length < 1 || paymentIntentId.length > 191) return null;
  if (typeof invoiceId !== "string" || invoiceId.length < 1 || invoiceId.length > 191) return null;
  if (typeof supplierId !== "string" || supplierId.length < 1 || supplierId.length > 191) return null;
  if (typeof amount !== "string" || !/^(0|[1-9]\d*)(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) return null;
  if (currency !== "USDC" || chainId !== 11155111 || network !== "Ethereum Sepolia") return null;
  if (typeof destinationWallet !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(destinationWallet)) return null;
  if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) return null;
  if (typeof blockNumber !== "number" || !Number.isSafeInteger(blockNumber) || blockNumber < 1) return null;
  if (typeof confirmedAt !== "string" || !Number.isFinite(Date.parse(confirmedAt))) return null;
  const normalizedHash = txHash.toLowerCase();
  const expectedExplorerUrl = "https://sepolia.etherscan.io/tx/" + normalizedHash;
  if (explorerUrl !== expectedExplorerUrl) return null;
  return {
    paymentIntentId, invoiceId, amount, currency, supplierId,
    destinationWallet: destinationWallet as PaymentProof["destinationWallet"],
    chainId, txHash: normalizedHash as PaymentProof["txHash"], blockNumber,
    network, explorerUrl: expectedExplorerUrl, confirmedAt: new Date(confirmedAt).toISOString(),
  };
}

function fromRow(row: ProofRow): PaymentProof {
  return {
    paymentIntentId: row.payment_intent_id, invoiceId: row.invoice_id, amount: row.amount, currency: row.currency,
    supplierId: row.supplier_id, destinationWallet: row.destination_wallet as PaymentProof["destinationWallet"],
    chainId: Number(row.chain_id), txHash: row.tx_hash as PaymentProof["txHash"], blockNumber: Number(row.block_number),
    network: "Ethereum Sepolia", explorerUrl: row.explorer_url, confirmedAt: row.confirmed_at,
  };
}

async function ensureTable(connection: mysql.Connection) {
  await connection.execute(
    "CREATE TABLE IF NOT EXISTS payment_proofs (" +
      "payment_intent_id VARCHAR(191) NOT NULL PRIMARY KEY, invoice_id VARCHAR(191) NOT NULL, " +
      "amount VARCHAR(80) NOT NULL, currency VARCHAR(16) NOT NULL, supplier_id VARCHAR(191) NOT NULL, " +
      "destination_wallet CHAR(42) NOT NULL, chain_id BIGINT UNSIGNED NOT NULL, tx_hash CHAR(66) NOT NULL UNIQUE, " +
      "block_number BIGINT UNSIGNED NOT NULL, network VARCHAR(64) NOT NULL, explorer_url VARCHAR(512) NOT NULL, " +
      "confirmed_at CHAR(24) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "INDEX payment_proofs_invoice_confirmed (invoice_id, confirmed_at)" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  );
}

export async function GET(request: Request) {
  const invoiceId = new URL(request.url).searchParams.get("invoiceId");
  if (!invoiceId || invoiceId.length > 191) return NextResponse.json({ error: "A valid invoiceId is required." }, { status: 400 });
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://root:@localhost:3306/trustpay");
    await ensureTable(connection);
    const [rows] = await connection.execute<ProofRow[]>(
      "SELECT * FROM payment_proofs WHERE invoice_id = ? ORDER BY confirmed_at DESC LIMIT 1", [invoiceId],
    );
    return NextResponse.json({ proof: rows[0] ? fromRow(rows[0]) : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load payment proof." }, { status: 503 });
  } finally {
    await connection?.end();
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const proof = isRecord(body) ? parseProof(body.proof) : null;
  if (!proof) return NextResponse.json({ error: "PaymentProof is invalid or is not an Ethereum Sepolia USDC proof." }, { status: 400 });

  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://root:@localhost:3306/trustpay");
    await ensureTable(connection);
    await connection.execute(
      "INSERT IGNORE INTO payment_proofs " +
      "(payment_intent_id, invoice_id, amount, currency, supplier_id, destination_wallet, chain_id, tx_hash, block_number, network, explorer_url, confirmed_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [proof.paymentIntentId, proof.invoiceId, proof.amount, proof.currency, proof.supplierId, proof.destinationWallet, proof.chainId, proof.txHash, proof.blockNumber, proof.network, proof.explorerUrl, proof.confirmedAt],
    );
    const [rows] = await connection.execute<ProofRow[]>(
      "SELECT * FROM payment_proofs WHERE payment_intent_id = ? OR tx_hash = ? LIMIT 1", [proof.paymentIntentId, proof.txHash],
    );
    if (!rows[0]) return NextResponse.json({ error: "PaymentProof could not be saved." }, { status: 500 });
    const saved = fromRow(rows[0]);
    if (JSON.stringify(saved) !== JSON.stringify(proof)) {
      return NextResponse.json({ error: "A different proof already uses this intent or transaction." }, { status: 409 });
    }
    return NextResponse.json({ proof: saved, saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save payment proof." }, { status: 503 });
  } finally {
    await connection?.end();
  }
}

"use client";
import { useState } from "react";
import { approvePaymentIntent, connectBrowserWallet, executeSepoliaPayment, getSepoliaBalances } from "@/lib/blockchain/wallet";
import type { HumanApproval, PaymentIntent, PaymentProof, TrustResult } from "@/lib/shared/types";

const steps = ["ASK", "ANALYZE", "VERIFY", "APPROVE", "PAY", "PROVE"];
type Analysis = { intent: PaymentIntent; trust: TrustResult; mode: string };
type WalletBalances = { eth: string; usdc: string; usdcUnits: string };
const USDC_DECIMALS = 6;

function toUnits(amount: string): bigint | null {
  const parts = amount.split(".");
  if (parts.length > 2 || !/^(0|[1-9][0-9]*)$/.test(parts[0]) || (parts[1] !== undefined && (!/^[0-9]+$/.test(parts[1]) || parts[1].length > USDC_DECIMALS))) return null;
  return BigInt(parts[0] + (parts[1] ?? "").padEnd(USDC_DECIMALS, "0"));
}

export default function Home() {
  const [request, setRequest] = useState("Pay ABC Software invoice INV-001 for 1 USDC");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [network, setNetwork] = useState("");
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [approval, setApproval] = useState<HumanApproval | null>(null);
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [sending, setSending] = useState(false);

  const invoiceTotal = analysis?.trust.checks.find((check) => check.code === "AMOUNT_MATCH")?.expected ?? "";
  const partialDemo = !!analysis && invoiceTotal !== analysis.intent.amount;
  const intendedUnits = analysis ? toUnits(analysis.intent.amount) : null;
  const enoughUsdc = intendedUnits !== null && balances !== null && intendedUnits <= BigInt(balances.usdcUnits);

  async function analyze() {
    setLoading(true); setError(""); setAnalysis(null); setApproval(null); setProof(null);
    try {
      const response = await fetch("/api/demo/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Analysis failed");
      setAnalysis(result as Analysis);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed"); }
    finally { setLoading(false); }
  }

  async function connect() {
    setError(""); setApproval(null); setBalances(null);
    try {
      const connected = await connectBrowserWallet();
      const currentBalances = await getSepoliaBalances(connected.address);
      setWallet(connected.address);
      setNetwork("Ethereum Sepolia · chain " + connected.chainId);
      setBalances(currentBalances);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Wallet connection failed."); }
  }

  async function approve() {
    if (!analysis || analysis.trust.status !== "APPROVED" || !wallet || !enoughUsdc) return;
    setError(""); setProof(null);
    try { setApproval(await approvePaymentIntent(analysis.intent, wallet)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Approval failed."); }
  }

  async function pay() {
    if (!analysis || analysis.trust.status !== "APPROVED" || !approval || !wallet || !enoughUsdc) return;
    setError(""); setProof(null); setSending(true);
    try {
      const confirmed = await executeSepoliaPayment(analysis.intent, analysis.trust, approval, wallet);
      setProof(confirmed.proof);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sepolia transaction failed."); }
    finally { setSending(false); }
  }

  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:py-24">
    <p className="text-sm font-semibold tracking-[0.2em] text-blue-700">VBT TRUSTPAY · SEPOLIA TEST MODE</p>
    <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Business payments, with trust built in.</h1>
    <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">AI proposes payment details. Deterministic controls verify them. A person approves the exact intent before the browser wallet asks for a transaction signature.</p>
    <ol className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-6">{steps.map((step, i) => <li key={step} className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">0{i + 1}</span><p className="mt-2 font-semibold">{step}</p></li>)}</ol>
    <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-6">
      <label htmlFor="payment-request" className="text-sm font-semibold">ASK · Describe a testnet payment</label>
      <textarea id="payment-request" className="mt-3 min-h-28 w-full rounded-lg border border-slate-300 p-3" value={request} onChange={(event) => setRequest(event.target.value)} />
      <div className="mt-3 flex flex-wrap gap-3">
        <button onClick={analyze} disabled={loading || sending} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Analyzing…" : "Analyze payment"}</button>
        <button onClick={() => { setRequest("Pay ABC Software INV-001 for 1 USDC to an altered wallet"); setAnalysis(null); setApproval(null); setProof(null); setError(""); }} className="rounded-lg border px-5 py-3">Load wallet mismatch test</button>
      </div>
      {error && <p role="alert" className="mt-4 break-words text-red-700">{error}</p>}
      {analysis && <div className="mt-8 border-t pt-6">
        <p className="text-sm text-slate-500">{analysis.mode.toUpperCase()} · TRUST ENGINE: {analysis.trust.status}</p>
        <h2 className="mt-2 text-2xl font-semibold">{analysis.intent.invoiceId} · {analysis.intent.amount} {analysis.intent.currency}</h2>
        <p className="mt-2 break-all text-sm text-slate-600">ABC Software registered destination: {analysis.intent.destinationWallet}</p>
        {partialDemo && <p className="mt-3 rounded-lg bg-amber-50 p-4 text-amber-900">TESTNET DEMO · Partial transfer of {analysis.intent.amount} USDC against an invoice total of {invoiceTotal} USDC. This does not settle or mark the full invoice paid.</p>}
        <ul className="mt-5 space-y-2">{analysis.trust.checks.map((check) => <li key={check.code} className={check.passed ? "text-emerald-700" : "text-red-700"}>{check.passed ? "✓" : "✕"} {check.code}: {check.message}</li>)}</ul>
        {analysis.trust.status === "APPROVED" && <div className="mt-6 rounded-xl border p-4">
          <p className="break-all text-sm">{wallet ? "Connected sender: " + wallet : "Connect your Rabby sender wallet to continue."}</p>
          {network && <p className="mt-1 text-sm text-slate-600">Network: {network}</p>}
          {balances && <p className="mt-1 text-sm text-slate-600">Rabby balance on Sepolia: {balances.usdc} USDC · {balances.eth} ETH</p>}
          {!wallet && <button onClick={connect} className="mt-4 rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-800">Connect Rabby · Ethereum Sepolia</button>}
          {wallet && !enoughUsdc && <p className="mt-3 text-sm text-red-700">The connected Sepolia USDC balance is below this intent amount. Lower the amount and analyze again before approval.</p>}
          {wallet && enoughUsdc && !approval && <button onClick={approve} className="mt-4 rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-800">I approve this exact intent</button>}
          {approval && <div className="mt-4">
            <h3 className="font-semibold">Review before Rabby opens</h3>
            <dl className="mt-2 space-y-1 break-all text-sm"><div><dt className="inline font-semibold">Provider: </dt><dd className="inline">ABC Software</dd></div><div><dt className="inline font-semibold">Invoice: </dt><dd className="inline">{analysis.intent.invoiceId}{invoiceTotal ? " · total " + invoiceTotal + " USDC" : ""}</dd></div><div><dt className="inline font-semibold">Amount: </dt><dd className="inline">{analysis.intent.amount} USDC{partialDemo ? " · partial testnet demo" : ""}</dd></div><div><dt className="inline font-semibold">Token: </dt><dd className="inline">Circle USDC · Sepolia</dd></div><div><dt className="inline font-semibold">Destination: </dt><dd className="inline">{analysis.intent.destinationWallet}</dd></div><div><dt className="inline font-semibold">Network: </dt><dd className="inline">Ethereum Sepolia (11155111)</dd></div><div><dt className="inline font-semibold">Reason: </dt><dd className="inline">Sepolia testnet demonstration; {partialDemo ? "a partial transfer that does not settle the invoice" : "manual payment proof"}.</dd></div></dl>
            <p className="mt-3 text-sm text-slate-600">Next, Rabby will show the transaction. Check the token contract, amount, destination, and network there. Confirm it yourself in Rabby to sign and send.</p>
            <button onClick={pay} disabled={sending || !enoughUsdc} className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{sending ? "Waiting for Sepolia receipt…" : "Review in Rabby · " + analysis.intent.amount + " USDC"}</button>
          </div>}
        </div>}
        {proof && <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <h3 className="font-semibold text-emerald-900">Payment confirmed · {proof.network}</h3>
          <dl className="mt-3 space-y-1 break-all text-sm"><div><dt className="inline font-semibold">TX hash: </dt><dd className="inline">{proof.txHash}</dd></div><div><dt className="inline font-semibold">Block: </dt><dd className="inline">{proof.blockNumber}</dd></div><div><dt className="inline font-semibold">Amount: </dt><dd className="inline">{proof.amount} {proof.currency}</dd></div><div><dt className="inline font-semibold">Destination: </dt><dd className="inline">{proof.destinationWallet}</dd></div><div><dt className="inline font-semibold">Confirmed: </dt><dd className="inline">{proof.confirmedAt}</dd></div></dl>
          <a className="mt-4 inline-block font-semibold text-blue-800 underline" href={proof.explorerUrl} target="_blank" rel="noreferrer">View transaction on Etherscan</a>
        </div>}
      </div>}
    </section>
    <p className="mt-6 text-sm text-slate-500">Ethereum Sepolia only. Use test USDC and test ETH. Signing occurs only in Rabby; VBT TrustPay never handles private keys. This testnet demo does not settle or mark the invoice paid.</p>
  </main>;
}

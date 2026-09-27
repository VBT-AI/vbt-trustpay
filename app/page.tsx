"use client";
import { useState } from "react";
import { approvePaymentIntent, connectBrowserWallet, executeSepoliaPayment } from "@/lib/blockchain/wallet";
import type { HumanApproval, PaymentIntent, PaymentProof, TrustResult } from "@/lib/shared/types";

const steps = ["ASK", "ANALYZE", "VERIFY", "APPROVE", "PAY", "PROVE"];
type Analysis = { intent: PaymentIntent; trust: TrustResult; mode: string };
const recipientSetting = process.env.NEXT_PUBLIC_SEPOLIA_PAYMENT_RECIPIENT_ADDRESS ?? "";

export default function Home() {
  const [request, setRequest] = useState("Pay ABC Software invoice INV-001 for 500 USDC");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [network, setNetwork] = useState("");
  const [approval, setApproval] = useState<HumanApproval | null>(null);
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [sending, setSending] = useState(false);
  const recipientMatches = /^0x[a-fA-F0-9]{40}$/.test(recipientSetting) && analysis?.intent.destinationWallet.toLowerCase() === recipientSetting.toLowerCase();

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
    setError(""); setApproval(null);
    try {
      const connected = await connectBrowserWallet();
      setWallet(connected.address); setNetwork(`Ethereum Sepolia · chain ${connected.chainId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Wallet connection failed."); }
  }

  async function approve() {
    if (!analysis || analysis.trust.status !== "APPROVED" || !wallet || !recipientMatches) return;
    setError(""); setProof(null);
    try { setApproval(await approvePaymentIntent(analysis.intent, wallet)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Approval failed."); }
  }

  async function pay() {
    if (!analysis || analysis.trust.status !== "APPROVED" || !approval || !wallet) return;
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
      <label htmlFor="payment-request" className="text-sm font-semibold">ASK · Describe a payment</label>
      <textarea id="payment-request" className="mt-3 min-h-28 w-full rounded-lg border border-slate-300 p-3" value={request} onChange={(event) => setRequest(event.target.value)} />
      <div className="mt-3 flex flex-wrap gap-3">
        <button onClick={analyze} disabled={loading || sending} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Analyzing…" : "Analyze payment"}</button>
        <button onClick={() => { setRequest("Pay ABC Software INV-001 for 500 USDC to an altered wallet"); setAnalysis(null); setApproval(null); setProof(null); setError(""); }} className="rounded-lg border px-5 py-3">Load wallet attack</button>
      </div>
      {error && <p role="alert" className="mt-4 break-words text-red-700">{error}</p>}
      {analysis && <div className="mt-8 border-t pt-6">
        <p className="text-sm text-slate-500">{analysis.mode.toUpperCase()} · TRUST ENGINE: {analysis.trust.status}</p>
        <h2 className="mt-2 text-2xl font-semibold">{analysis.intent.invoiceId} · {analysis.intent.amount} {analysis.intent.currency}</h2>
        <p className="mt-2 break-all text-sm text-slate-600">Recipient: {analysis.intent.destinationWallet}</p>
        <ul className="mt-5 space-y-2">{analysis.trust.checks.map((check) => <li key={check.code} className={check.passed ? "text-emerald-700" : "text-red-700"}>{check.passed ? "✓" : "✕"} {check.code}: {check.message}</li>)}</ul>
        {!recipientMatches && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-amber-900">Real payment is locked. Set NEXT_PUBLIC_SEPOLIA_PAYMENT_RECIPIENT_ADDRESS in .env.local to the intended public recipient address, restart the app, then analyze again. Demo wallet addresses are synthetic and cannot be paid.</p>}
        {analysis.trust.status === "APPROVED" && recipientMatches && <div className="mt-6 rounded-xl border p-4">
          <p className="break-all text-sm">{wallet ? `Connected wallet: ${wallet}` : "Connect the sender wallet in your browser to continue."}</p>
          {network && <p className="mt-1 text-sm text-slate-600">Network: {network}</p>}
          {!wallet && <button onClick={connect} className="mt-4 rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-800">Connect wallet · Ethereum Sepolia</button>}
          {wallet && !approval && <button onClick={approve} className="mt-4 rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-800">I approve this exact payment</button>}
          {approval && <div className="mt-4">
            <p className="text-sm font-semibold text-emerald-700">Human approval recorded for {approval.approvedBy} · intent digest {approval.intentDigest.slice(0, 12)}…</p>
            <p className="mt-2 text-sm text-slate-600">Review the recipient, amount, and Sepolia network in your wallet before signing.</p>
            <button onClick={pay} disabled={sending} className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{sending ? "Waiting for Sepolia receipt…" : `Sign & send ${analysis.intent.amount} ${analysis.intent.currency}`}</button>
          </div>}
        </div>}
        {proof && <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <h3 className="font-semibold text-emerald-900">Payment confirmed · {proof.network}</h3>
          <dl className="mt-3 space-y-1 break-all text-sm"><div><dt className="inline font-semibold">TX hash: </dt><dd className="inline">{proof.txHash}</dd></div><div><dt className="inline font-semibold">Block: </dt><dd className="inline">{proof.blockNumber}</dd></div><div><dt className="inline font-semibold">Recipient: </dt><dd className="inline">{proof.destinationWallet}</dd></div><div><dt className="inline font-semibold">Confirmed: </dt><dd className="inline">{proof.confirmedAt}</dd></div></dl>
          <a className="mt-4 inline-block font-semibold text-blue-800 underline" href={proof.explorerUrl} target="_blank" rel="noreferrer">View transaction on Etherscan</a>
        </div>}
      </div>}
    </section>
    <p className="mt-6 text-sm text-slate-500">Ethereum Sepolia only. Use test USDC and test ETH. Signing happens only in your wallet; no private keys are handled by VBT TrustPay.</p>
  </main>;
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Blocks, Check,
  ChevronDown, CircleAlert, CircleCheck, ClipboardList, Clock3, CreditCard,
  FileCheck2, FileText, LayoutDashboard, LockKeyhole, Plus, Search, ShieldAlert,
  ShieldCheck, Users, WalletCards,
} from "lucide-react";
import { PaymentReview } from "@/components/payment-review";
import { approvePaymentIntent, connectBrowserWallet, connectTangemWallet, executeSepoliaPayment, getSepoliaBalances } from "@/lib/blockchain/wallet";
import type { HumanApproval, PaymentIntent, PaymentProof, TrustResult } from "@/lib/shared/types";
import type { WalletConnection, WalletProvider } from "@/lib/blockchain/wallet";

const FLOW = ["ASK", "ANALYZE", "VERIFY", "APPROVE", "PAY", "PROVE"] as const;
const REGISTERED_WALLET = "0x669bcC0eca97bE32Cb3677c005B0dC869ead07A8";
const EXISTING_TX = "0xc8a1ec3fff87020447e56ebf59ef60190227eccc5a9dfdd42a110830c26cb2b4";
const EXISTING_TX_URL = `https://sepolia.etherscan.io/tx/${EXISTING_TX}`;
const INVOICE_TOTAL = "500.00";
const USDC_DECIMALS = 6;

type Page = "dashboard" | "new-payment" | "payments" | "suppliers" | "invoices" | "security" | "audit" | "proof";
type Analysis = { intent: PaymentIntent; trust: TrustResult; mode: string };
type WalletBalances = { eth: string; usdc: string; usdcUnits: string };

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "suppliers", label: "Suppliers", icon: Users },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "security", label: "Security events", icon: ShieldAlert },
  { id: "audit", label: "Audit trail", icon: ClipboardList },
];

function walletErrorMessage(cause: unknown, kind: WalletConnection["kind"]): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (cause && typeof cause === "object") {
    const detail = cause as { message?: unknown; shortMessage?: unknown; code?: unknown; data?: { message?: unknown } };
    const message = [detail.shortMessage, detail.message, detail.data?.message].find((value): value is string => typeof value === "string" && value.length > 0);
    if (message) return message;
    if (typeof detail.code === "number" || typeof detail.code === "string") return `Wallet connection failed (code ${detail.code}).`;
  }
  return kind === "tangem" ? "Tangem could not connect. Add Ethereum to your Tangem wallet and try again." : "Wallet connection failed.";
}

function toUnits(amount: string): bigint | null {
  const parts = amount.split(".");
  if (parts.length > 2 || !/^(0|[1-9][0-9]*)$/.test(parts[0]) || (parts[1] !== undefined && (!/^[0-9]+$/.test(parts[1]) || parts[1].length > USDC_DECIMALS))) return null;
  return BigInt(parts[0] + (parts[1] ?? "").padEnd(USDC_DECIMALS, "0"));
}

function StepTimeline({ analysis, approval, proof, sending, loading }: { analysis: Analysis | null; approval: HumanApproval | null; proof: PaymentProof | null; sending: boolean; loading: boolean }) {
  let current = 0;
  let blocked = false;
  if (loading) current = 1;
  else if (analysis?.trust.status === "BLOCKED") { current = 2; blocked = true; }
  else if (analysis && proof) current = 5;
  else if (analysis && sending) current = 4;
  else if (analysis && approval) current = 4;
  else if (analysis) current = 3;

  return <ol className="flow-timeline" aria-label="Payment workflow">
    {FLOW.map((step, index) => {
      const done = index < current || (index === 5 && !!proof);
      const active = index === current && !proof;
      const stopped = blocked && active;
      const Icon = done ? Check : index === 4 ? WalletCards : index === 5 ? FileCheck2 : index === 2 ? ShieldCheck : index === 3 ? LockKeyhole : Activity;
      return <li key={step} className={`flow-step ${done ? "done" : ""} ${active ? "active" : ""} ${stopped ? "stopped" : ""}`}>
        <span className="flow-step-icon"><Icon size={18} strokeWidth={2.1} /></span>
        <span className="flow-step-name">{step}</span>
        <span className="flow-step-state">{stopped ? "Blocked" : done ? "Complete" : active ? (loading ? "Working" : "In progress") : "Next"}</span>
      </li>;
    })}
  </ol>;
}

function SectionTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="section-subtitle">{subtitle}</p></div>{action}</div>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function ExistingProofRow({ onOpen }: { onOpen: () => void }) {
  return <div className="payment-row">
    <div className="payment-icon"><CreditCard size={19} /></div>
    <div className="payment-description"><strong>INV-001 · ABC Software</strong><span>Sepolia testnet · partial demo payment</span></div>
    <div className="payment-amount"><strong>1.00 USDC</strong><span className="inline-status success"><i /> Confirmed</span></div>
    <button className="icon-action" onClick={onOpen} aria-label="Open payment proof"><ArrowUpRight size={18} /></button>
  </div>;
}

function ProofDetails({ proof }: { proof: PaymentProof | null }) {
  if (proof) return <div className="proof-details">
    <div className="proof-confirmed"><CircleCheck size={22} /><div><strong>Payment proof confirmed</strong><span>Receipt observed on Ethereum Sepolia</span></div></div>
    <dl className="proof-grid">
      <div><dt>Supplier</dt><dd>ABC Software</dd></div>
      <div><dt>Invoice</dt><dd>{proof.invoiceId} · demo invoice</dd></div>
      <div><dt>Transfer amount</dt><dd>{proof.amount} {proof.currency}</dd></div>
      <div><dt>Invoice total</dt><dd>{INVOICE_TOTAL} USDC</dd></div>
      <div><dt>Destination</dt><dd>{proof.destinationWallet}</dd></div>
      <div><dt>Network</dt><dd>{proof.network} · chain {proof.chainId}</dd></div>
      <div><dt>Block number</dt><dd>{proof.blockNumber.toLocaleString()}</dd></div>
      <div className="proof-hash"><dt>Transaction hash</dt><dd>{proof.txHash}</dd></div>
      <div><dt>Confirmed</dt><dd>{new Date(proof.confirmedAt).toLocaleString()}</dd></div>
    </dl>
    <p className="notice notice-amber"><strong>PARTIAL TESTNET DEMO</strong><br />This {proof.amount} USDC transfer is against a demo invoice totaling {INVOICE_TOTAL} USDC. It does not settle or mark the full invoice paid.</p>
    <a className="button button-secondary" href={proof.explorerUrl} target="_blank" rel="noreferrer">View on Sepolia Etherscan <ArrowUpRight size={16} /></a>
  </div>;

  return <div className="proof-details">
    <div className="proof-confirmed"><CircleCheck size={22} /><div><strong>Existing Sepolia payment</strong><span>Real testnet transaction supplied for this demo</span></div></div>
    <dl className="proof-grid">
      <div><dt>Supplier</dt><dd>ABC Software</dd></div>
      <div><dt>Invoice</dt><dd>INV-001 · demo invoice</dd></div>
      <div><dt>Block number</dt><dd>11,794,765</dd></div>
      <div><dt>Transfer amount</dt><dd>1.00 USDC</dd></div>
      <div><dt>Invoice total</dt><dd>{INVOICE_TOTAL} USDC</dd></div>
      <div><dt>Destination</dt><dd>{REGISTERED_WALLET}</dd></div>
      <div><dt>Network</dt><dd>Ethereum Sepolia · chain 11155111</dd></div>
      <div className="proof-hash"><dt>Transaction hash</dt><dd>{EXISTING_TX}</dd></div>
    </dl>
    <p className="notice notice-amber"><strong>PARTIAL TESTNET DEMO</strong><br />The 1 USDC transfer is partial against a demo invoice totaling 500.00 USDC. It does not settle or mark the full invoice paid.</p>
    <a className="button button-secondary" href={EXISTING_TX_URL} target="_blank" rel="noreferrer">View on Sepolia Etherscan <ArrowUpRight size={16} /></a>
    <p className="muted-note">Transaction details are shown as provided. No missing block or timestamp fields have been inferred.</p>
  </div>;
}

export default function Home() {
  const [page, setPage] = useState<Page>("dashboard");
  const [request, setRequest] = useState("Pay ABC Software invoice INV-001 for 1 USDC");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [walletKind, setWalletKind] = useState<WalletConnection["kind"] | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [network, setNetwork] = useState("");
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [approval, setApproval] = useState<HumanApproval | null>(null);
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [proofStorageError, setProofStorageError] = useState("");
  const [proofLoadError, setProofLoadError] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/demo/payment-proof?invoiceId=INV-001", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load saved PaymentProof.");
        if (active) setProof(result.proof ?? null);
      })
      .catch((cause: unknown) => { if (active) setProofLoadError(cause instanceof Error ? cause.message : "Could not load saved PaymentProof."); });
    return () => { active = false; };
  }, []);
  const invoiceTotal = analysis?.trust.checks.find((check) => check.code === "AMOUNT_MATCH")?.expected ?? INVOICE_TOTAL;
  const intendedUnits = analysis ? toUnits(analysis.intent.amount) : null;
  const enoughUsdc = intendedUnits !== null && balances !== null && intendedUnits <= BigInt(balances.usdcUnits);
  const blocked = analysis?.trust.status === "BLOCKED";
  const pendingApproval = !!analysis && analysis.trust.status === "APPROVED" && !approval && !proof;
  const proofCount = proof && proof.txHash !== EXISTING_TX ? 2 : 1;

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

  async function connect(kind: WalletConnection["kind"]) {
    if (!analysis || analysis.trust.status !== "APPROVED") return;
    setError(""); setApproval(null); setBalances(null); setConnectingWallet(true);
    try {
      const connected = kind === "tangem" ? await connectTangemWallet() : await connectBrowserWallet();
      setWallet(connected.address); setWalletProvider(connected.provider); setWalletKind(connected.kind); setWalletChainId(connected.chainId);
      setNetwork(connected.chainId === 11155111 ? `Ethereum Sepolia · chain ${connected.chainId}` : `Connected network · chain ${connected.chainId}`);
      if (connected.chainId === 11155111) setBalances(await getSepoliaBalances(connected.address, connected.provider));
    } catch (cause) { setError(walletErrorMessage(cause, kind)); }
    finally { setConnectingWallet(false); }
  }

  async function approve() {
    if (!analysis || analysis.trust.status !== "APPROVED" || !wallet || walletChainId !== 11155111 || !enoughUsdc) return;
    setError(""); setProof(null);
    try { setApproval(await approvePaymentIntent(analysis.intent, wallet)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Approval failed."); }
  }

  async function pay() {
    if (!analysis || analysis.trust.status !== "APPROVED" || !approval || !wallet || !enoughUsdc) return;
    setError(""); setProofStorageError(""); setSending(true);
    try {
      if (!walletProvider || walletChainId !== 11155111) throw new Error("This demo payment requires an active wallet connection on Ethereum Sepolia.");
      const confirmed = await executeSepoliaPayment(analysis.intent, analysis.trust, approval, wallet, walletProvider);
      setProof(confirmed.proof);
      setPage("proof");
      try {
        const response = await fetch("/api/demo/payment-proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proof: confirmed.proof }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment confirmed, but PaymentProof could not be saved.");
        setProof(result.proof);
        setProofLoadError("");
      } catch (cause) {
        setProofStorageError(cause instanceof Error ? cause.message : "Payment confirmed, but PaymentProof could not be saved. Do not send this payment again.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sepolia transaction failed."); }
    finally { setSending(false); }
  }

  function startNewPayment() {
    setRequest("Pay ABC Software invoice INV-001 for 1 USDC");
    setAnalysis(null); setApproval(null); setProof(null); setError(""); setPage("new-payment");
  }

  function openSearchResult() {
    const query = search.toLowerCase();
    if (query.includes("suppl") || query.includes("abc")) setPage("suppliers");
    else if (query.includes("invoice") || query.includes("inv-")) setPage("invoices");
    else if (query.includes("security") || query.includes("wallet mismatch")) setPage("security");
    else setPage("payments");
  }

  const pageAction = <button className="button button-primary" onClick={startNewPayment}><Plus size={18} /> New payment</button>;

  function paymentControls() {
    if (!analysis || analysis.trust.status !== "APPROVED") return null;
    return <div className="gate-actions">
      {!wallet && <div className="wallet-options"><button className="button button-secondary" onClick={() => connect("browser")} disabled={connectingWallet}><WalletCards size={17} /> Connect browser wallet · Sepolia</button><button className="button button-secondary" onClick={() => connect("tangem")} disabled={connectingWallet}><WalletCards size={17} /> Connect Tangem Wallet · read-only</button></div>}
      {wallet && <div className="wallet-summary"><span className="wallet-dot" /><div><strong>{walletKind === "tangem" ? "Tangem Wallet · WalletConnect" : "Browser wallet connected"}</strong><span>{wallet}</span></div></div>}
      {network && <p className="wallet-meta">{network}{balances ? ` · ${balances.usdc} USDC · ${balances.eth} ETH` : walletChainId === 11155111 ? " · Checking balances…" : " · Read-only connection"}</p>}
      {wallet && walletChainId !== 11155111 && <p className="inline-warning">This Tangem connection is read-only on Ethereum mainnet. Tangem Wallet does not list Sepolia for WalletConnect, and this testnet payment cannot be approved or signed here.</p>}
      {wallet && !enoughUsdc && <p className="inline-warning">The connected Sepolia USDC balance is below this intent amount. Lower the amount and analyze again before approval.</p>}
      {wallet && walletChainId === 11155111 && enoughUsdc && !approval && <button className="button button-primary" onClick={approve}>I approve this exact intent <ArrowRight size={17} /></button>}
      {approval && walletChainId === 11155111 && <div className="transaction-review">
        <div className="review-facts review-facts-compact">
          <div><span>Provider</span><strong>{analysis.intent.supplierName}</strong></div>
          <div><span>Invoice</span><strong>{analysis.intent.invoiceId}{invoiceTotal ? ` · total ${invoiceTotal} USDC` : ""}</strong></div>
          <div><span>Amount</span><strong>{analysis.intent.amount} USDC · partial testnet demo</strong></div>
          <div><span>Token</span><strong>Circle USDC · Sepolia</strong></div>
          <div className="fact-destination"><span>Destination</span><strong>{analysis.intent.destinationWallet}</strong></div>
          <div><span>Network</span><strong>Ethereum Sepolia · 11155111</strong></div>
          <div className="fact-reason"><span>Reason</span><strong>Partial testnet demonstration; the invoice remains unpaid in this demo.</strong></div>
        </div>
        <p className="muted-note">Rabby will show the final transaction. Check the token, amount, destination and network there; only your explicit confirmation in Rabby can sign and send.</p>
        <button className="button button-primary" onClick={pay} disabled={sending || !enoughUsdc}>{sending ? <><span className="spinner" /> Waiting for Sepolia receipt…</> : <>Review in Rabby · {analysis.intent.amount} USDC <ArrowRight size={17} /></>}</button>
      </div>}
      {sending && <div className="processing-state" role="status"><span className="spinner" /><div><strong>Waiting for receipt</strong><span>Checking Sepolia for confirmation. Do not retry while this transaction is pending.</span></div></div>}
    </div>;
  }

  function renderDashboard() {
    return <>
      <SectionTitle eyebrow="CONTROL CENTER · TESTNET DEMO" title="Payment control center" subtitle="Monitor verified activity, review risk and control every testnet payment." action={pageAction} />
      <div className="metric-grid">
        <Card className="metric-card"><div className="metric-top"><span className="metric-icon blue"><CreditCard size={19} /></span><span className="metric-label">Verified testnet transfers</span><ArrowUpRight size={17} className="metric-trend" /></div><strong className="metric-value">{proofCount}</strong><span className="metric-foot"><i className="dot-green" /> Includes the existing 1 USDC partial demo transfer</span></Card>
        <Card className="metric-card"><div className="metric-top"><span className="metric-icon amber"><Clock3 size={19} /></span><span className="metric-label">Awaiting human approval</span></div><strong className="metric-value">{pendingApproval ? "1" : "0"}</strong><span className="metric-foot">{pendingApproval ? `${analysis?.intent.amount} ${analysis?.intent.currency} · Trust Engine approved` : "No current intent is awaiting approval"}</span></Card>
        <Card className="metric-card"><div className="metric-top"><span className="metric-icon green"><ShieldCheck size={19} /></span><span className="metric-label">Invoice status</span></div><strong className="metric-value metric-value-word">Open</strong><span className="metric-foot">500.00 USDC demo invoice · partial transfer only</span></Card>
        <Card className="metric-card"><div className="metric-top"><span className="metric-icon red"><ShieldAlert size={19} /></span><span className="metric-label">Blocked this session</span></div><strong className="metric-value">{blocked ? "1" : "0"}</strong><span className="metric-foot">{blocked ? "No transaction or wallet signature requested" : "No blocked analysis in this session"}</span></Card>
      </div>

      <Card className="workflow-panel">
        <div className="panel-heading"><div><h2>Payment workflow</h2><p>{analysis ? `${analysis.intent.invoiceId} · ${analysis.intent.amount} ${analysis.intent.currency}` : "The timeline follows each payment as it moves through review."}</p></div><span className="tag tag-testnet"><Blocks size={14} /> Sepolia testnet</span></div>
        <StepTimeline analysis={analysis} approval={approval} proof={proof} sending={sending} loading={loading} />
        {!analysis && <div className="workflow-empty"><p>No active payment intent</p><button className="text-button" onClick={startNewPayment}>Start a new payment <ArrowRight size={15} /></button></div>}
        {analysis?.trust.status === "BLOCKED" && <div className="workflow-stop"><CircleAlert size={17} /><span>Blocked at verification. No wallet action is available.</span><button className="text-button" onClick={() => setPage("security")}>Review security event <ArrowRight size={15} /></button></div>}
      </Card>

      <div className="dashboard-grid">
        <Card>
          <div className="panel-heading"><div><h2>Recent payments</h2><p>Confirmed testnet activity only</p></div><button className="text-button" onClick={() => setPage("payments")}>View all <ArrowRight size={15} /></button></div>
          <ExistingProofRow onOpen={() => setPage("proof")} />
          {proof && proof.txHash !== EXISTING_TX && <div className="payment-row"><div className="payment-icon"><CreditCard size={19} /></div><div className="payment-description"><strong>{proof.invoiceId} · ABC Software</strong><span>Added from a receipt observed in this session</span></div><div className="payment-amount"><strong>{proof.amount} {proof.currency}</strong><span className="inline-status success"><i /> Confirmed</span></div><button className="icon-action" onClick={() => setPage("proof")} aria-label="Open new payment proof"><ArrowUpRight size={18} /></button></div>}
          <div className="partial-payment-note"><ArrowDownRight size={16} /><span>1.00 USDC is partial against 500.00 USDC. The invoice remains open.</span></div>
        </Card>
        <Card>
          <div className="panel-heading"><div><h2>Latest Trust Engine result</h2><p>Deterministic checks decide whether a wallet is available</p></div></div>
          {analysis ? <div className={`latest-result ${blocked ? "latest-result-blocked" : "latest-result-approved"}`}>
            {blocked ? <CircleAlert size={20} /> : <CircleCheck size={20} />}
            <div><strong>{blocked ? "PAYMENT BLOCKED" : "Payment intent approved for human review"}</strong><span>{blocked ? analysis.trust.reasons.join(" · ") : "No transaction is sent until a person approves and confirms in Rabby."}</span></div>
          </div> : <div className="empty-state"><ShieldCheck size={24} /><p>Run an analysis to see live verification checks here.</p></div>}
        </Card>
      </div>
      <div className="dashboard-grid dashboard-grid-bottom">
        <Card>
          <div className="panel-heading"><div><h2>Supplier verification</h2><p>Registered payee for the demo workspace</p></div><button className="text-button" onClick={() => setPage("suppliers")}>Details <ArrowRight size={15} /></button></div>
          <div className="supplier-inline"><span className="supplier-avatar">AB</span><div><strong>ABC Software</strong><span>Invoice INV-001 · demo data</span></div><span className="tag tag-registered"><ShieldCheck size={14} /> Wallet registered</span></div>
          <p className="address-line">{REGISTERED_WALLET}</p>
        </Card>
        <Card>
          <div className="panel-heading"><div><h2>Blockchain network</h2><p>Connected only when Trust Engine approves</p></div></div>
          <div className="network-summary"><span className="ethereum-mark">Ξ</span><div><strong>Ethereum Sepolia</strong><span>Test network · Chain ID 11155111</span></div><span className="tag tag-testnet">TESTNET</span></div>
          <p className="network-foot"><LockKeyhole size={15} /> Wallet signatures are handled by your wallet. TrustPay never handles private keys.</p>
        </Card>
      </div>
    </>;
  }

  function renderNewPayment() {
    return <>
      <SectionTitle eyebrow="PAYMENTS · NEW REQUEST" title="New payment" subtitle="Describe the invoice payment. TrustPay analyzes it, verifies it, then waits for your approval." />
      <Card className="new-payment-flow">
        <div className="panel-heading"><div><h2>Payment timeline</h2><p>{analysis ? `${analysis.intent.invoiceId} · ${analysis.intent.amount} ${analysis.intent.currency}` : "Live status for this payment intent"}</p></div><span className="tag tag-testnet"><Blocks size={14} /> Ethereum Sepolia</span></div>
        <StepTimeline analysis={analysis} approval={approval} proof={proof} sending={sending} loading={loading} />
      </Card>
      <div className="composer-layout">
        <Card className="assistant-card">
          <div className="assistant-heading"><span className="assistant-avatar"><Activity size={18} /></span><div><strong>Payment assistant</strong><span>Demo mode · suggestions are not approvals</span></div><span className="online-status"><i /> Ready</span></div>
          <div className="assistant-message"><p>Describe the supplier, invoice and amount. I can help organize the request; the Trust Engine independently checks it before any wallet action.</p></div>
          <label htmlFor="payment-request">Your payment request</label>
          <textarea id="payment-request" value={request} maxLength={1000} onChange={(event) => setRequest(event.target.value)} placeholder="Example: Pay ABC Software invoice INV-001 for 1 USDC" />
          <div className="composer-footer"><span>{request.length}/1000 · No private keys or secrets</span><button className="button button-primary" onClick={analyze} disabled={loading || sending || !request.trim()}>{loading ? <><span className="spinner" /> Analyzing…</> : <>Analyze payment <ArrowRight size={17} /></>}</button></div>
          <div className="demo-context"><strong>Demo context</strong><span>ABC Software · INV-001 · invoice total 500.00 USDC</span><span>Registered wallet: {REGISTERED_WALLET}</span></div>
          <button className="scenario-button" onClick={() => { setRequest("Pay ABC Software invoice INV-001 for 1 USDC to an altered wallet"); setAnalysis(null); setApproval(null); setProof(null); setError(""); }}>Load WALLET_MISMATCH test <ArrowRight size={15} /></button>
        </Card>
        <Card className="flow-explainer"><p className="eyebrow">CONTROL SEQUENCE</p><h2>People stay in control</h2>
          <ol className="control-list"><li><span>01</span><div><strong>AI proposes details</strong><p>Demo assistant extracts invoice and amount only.</p></div></li><li><span>02</span><div><strong>Trust Engine verifies</strong><p>Deterministic checks validate payee, invoice, amount and wallet.</p></div></li><li><span>03</span><div><strong>A person approves</strong><p>Approval applies to this exact payment intent.</p></div></li><li><span>04</span><div><strong>Rabby signs and sends</strong><p>Only after explicit review in the wallet.</p></div></li></ol>
          <div className="security-note"><LockKeyhole size={17} /><span>VBT TrustPay never stores or handles private keys.</span></div>
        </Card>
      </div>
      {error && <p role="alert" className="error-banner"><CircleAlert size={18} /> {error}</p>}
      {analysis && <PaymentReview intent={analysis.intent} trust={analysis.trust} mode={analysis.mode} invoiceTotal={invoiceTotal}>{paymentControls()}</PaymentReview>}
      {proof && <Card className="result-proof"><div className="panel-heading"><div><p className="eyebrow">PROVE</p><h2>Payment proof</h2></div></div><ProofDetails proof={proof} /></Card>}
    </>;
  }

  function renderPayments() {
    const matches = !search || "INV-001 ABC Software 1 USDC Sepolia confirmed".toLowerCase().includes(search.toLowerCase()) || EXISTING_TX.toLowerCase().includes(search.toLowerCase());
    return <><SectionTitle eyebrow="PAYMENTS · ACTIVITY" title="Payments" subtitle="Confirmed transfers are linked to their on-chain receipt. Drafts and blocked requests are shown separately." action={pageAction} />
      <Card><div className="table-toolbar"><div className="table-heading"><h2>Payment activity</h2><p>One existing testnet transaction</p></div><span className="tag tag-testnet"><Blocks size={14} /> Sepolia only</span></div>
        {matches && <ExistingProofRow onOpen={() => setPage("proof")} />}
        {analysis && <div className="payment-row"><div className={`payment-icon ${blocked ? "payment-icon-danger" : ""}`}>{blocked ? <ShieldAlert size={19} /> : <Clock3 size={19} />}</div><div className="payment-description"><strong>{analysis.intent.invoiceId} · ABC Software</strong><span>{blocked ? "Blocked before blockchain execution · no transaction created" : proof ? "Confirmed in this session" : "Current payment intent · not yet sent"}</span></div><div className="payment-amount"><strong>{analysis.intent.amount} {analysis.intent.currency}</strong><span className={`inline-status ${blocked ? "danger" : proof ? "success" : "pending"}`}><i /> {blocked ? "Blocked" : proof ? "Confirmed" : "In review"}</span></div><button className="icon-action" onClick={() => setPage(blocked ? "security" : proof ? "proof" : "new-payment")} aria-label="Open payment details"><ArrowUpRight size={18} /></button></div>}
        {!matches && !analysis && <div className="empty-state"><Search size={22} /><p>No payment matches “{search}”.</p></div>}
        <p className="partial-payment-note"><ArrowDownRight size={16} /><span>Existing 1.00 USDC transfer is partial against invoice total 500.00 USDC. Invoice remains open.</span></p>
      </Card>
    </>;
  }

  function renderSuppliers() {
    return <><SectionTitle eyebrow="DIRECTORY · DEMO DATA" title="Suppliers" subtitle="Registered destination details used by the deterministic Trust Engine." />
      <Card className="supplier-detail"><div className="supplier-detail-head"><span className="supplier-avatar supplier-avatar-large">AB</span><div><p className="eyebrow">DEMO SUPPLIER</p><h2>ABC Software</h2><span>Supplier ID · supplier-abc</span></div><span className="tag tag-registered"><ShieldCheck size={14} /> Verified wallet record</span></div>
        <div className="review-facts supplier-facts"><div><span>Registered destination wallet</span><strong>{REGISTERED_WALLET}</strong></div><div><span>Demo invoice</span><strong>INV-001 · 500.00 USDC · Open</strong></div><div><span>Network policy</span><strong>Ethereum Sepolia testnet</strong></div></div>
        <div className="security-note"><LockKeyhole size={17} /><span>Wallet mismatch blocks payment execution. Registered supplier details remain unchanged by the test.</span></div>
      </Card></>;
  }

  function renderInvoices() {
    return <><SectionTitle eyebrow="INVOICES · DEMO DATA" title="Invoices" subtitle="The testnet transfer is recorded as a partial demo payment and does not settle this invoice." />
      <Card><div className="invoice-header"><div className="invoice-file"><FileText size={20} /></div><div><p className="eyebrow">DEMO INVOICE</p><h2>INV-001 <span className="tag tag-open">OPEN · NOT SETTLED</span></h2><p>ABC Software · USDC</p></div></div>
        <div className="invoice-values"><div><span>Invoice total</span><strong>500.00 <small>USDC</small></strong></div><div><span>Existing partial testnet transfer</span><strong>1.00 <small>USDC</small></strong></div><div><span>Settlement status</span><strong className="text-amber">Not paid in full</strong></div></div>
        <p className="notice notice-amber"><strong>TESTNET DEMO · PARTIAL TRANSFER</strong><br />The 1 USDC transaction is real on Ethereum Sepolia, but it is only a partial transfer against the 500.00 USDC demo invoice. TrustPay has not marked this invoice paid.</p>
        <button className="text-button" onClick={() => setPage("proof")}>View payment proof <ArrowRight size={15} /></button>
      </Card></>;
  }

  function renderSecurity() {
    return <><SectionTitle eyebrow="SECURITY · TRUST ENGINE" title="Security events" subtitle="Only actual checks from this session and the supplied testnet payment are shown." />
      {blocked && analysis ? <Card className="security-event-card"><div className="security-event-heading"><span className="metric-icon red"><ShieldAlert size={21} /></span><div><p className="eyebrow">TRUST ENGINE: BLOCKED</p><h2>WALLET MISMATCH</h2><span>Payment prevented before blockchain execution</span></div><span className="tag tag-blocked">PAYMENT BLOCKED</span></div>
        <div className="wallet-comparison security-comparison"><div><span>Supplier · ABC Software</span><strong>Registered wallet</strong><code>{analysis.trust.checks.find((check) => check.code === "WALLET_MATCH")?.expected ?? REGISTERED_WALLET}</code></div><div><span>Invoice · {analysis.intent.invoiceId}</span><strong>Requested destination</strong><code>{analysis.intent.destinationWallet}</code></div></div>
        <p className="blocked-message">The requested destination does not match the supplier&apos;s registered wallet. Payment execution was blocked.</p>
        <ul className="execution-assurances"><li><span>✓</span> No transaction was created</li><li><span>✓</span> No wallet signature was requested</li><li><span>✓</span> Payment was prevented before blockchain execution</li></ul>
        <p className="muted-note">This test changes only the requested destination inside the demo PaymentIntent. ABC Software’s registered wallet was not changed.</p>
      </Card> : <Card><div className="empty-state"><ShieldCheck size={28} /><h2>No blocked analysis in this session</h2><p>Run the WALLET_MISMATCH test from New Payment to review how a mismatch is stopped.</p><button className="button button-secondary" onClick={startNewPayment}>Open new payment <ArrowRight size={16} /></button></div></Card>}
    </>;
  }

  function renderAudit() {
    return <><SectionTitle eyebrow="GOVERNANCE · ACTIVITY" title="Audit trail" subtitle="A concise record of confirmed proof and the current in-session review state." />
      <Card><div className="audit-entry"><span className="audit-marker success"><Check size={14} /></span><div><strong>Sepolia testnet transfer confirmed</strong><p>1.00 USDC · partial demo payment against INV-001</p><a href={EXISTING_TX_URL} target="_blank" rel="noreferrer">{EXISTING_TX}</a></div><span className="audit-kind">ON-CHAIN PROOF</span></div>
        {analysis && <div className={`audit-entry ${blocked ? "audit-entry-blocked" : ""}`}><span className={`audit-marker ${blocked ? "danger" : "pending"}`}>{blocked ? <ShieldAlert size={14} /> : <Clock3 size={14} />}</span><div><strong>{blocked ? "Payment request blocked by Trust Engine" : "PaymentIntent analyzed"}</strong><p>{analysis.intent.invoiceId} · {analysis.intent.amount} {analysis.intent.currency}{blocked ? " · WALLET MISMATCH · no transaction created" : " · No blockchain action unless explicitly approved"}</p></div><span className="audit-kind">CURRENT SESSION</span></div>}
        {approval && <div className="audit-entry"><span className="audit-marker success"><Check size={14} /></span><div><strong>Human approval created for exact intent</strong><p>Approval is bound to the connected public wallet and payment digest.</p></div><span className="audit-kind">APPROVAL</span></div>}
        <div className="audit-caption"><LockKeyhole size={15} /><span>Transaction hash, block and network are displayed only when provided or observed from a successful Sepolia receipt.</span></div>
      </Card>
    </>;
  }

  function renderProof() {
    return <><SectionTitle eyebrow="EVIDENCE · BLOCKCHAIN" title="Payment proof" subtitle="Observed transaction evidence for the existing partial Sepolia transfer." action={<a className="button button-secondary" href={proof?.explorerUrl ?? EXISTING_TX_URL} target="_blank" rel="noreferrer">Open explorer <ArrowUpRight size={16} /></a>} />
      <Card className="proof-panel"><ProofDetails proof={proof} /></Card>
      {proofLoadError && !proof && <p className="error-banner" role="status">Saved PaymentProof could not be loaded: {proofLoadError}</p>}
      {proofStorageError && <p className="error-banner" role="status">Payment was confirmed on Sepolia, but its proof was not saved: {proofStorageError} Do not send the payment again.</p>}
    </>;
  }

  const titleForPage: Record<Page, string> = { dashboard: "Dashboard", "new-payment": "New payment", payments: "Payments", suppliers: "Suppliers", invoices: "Invoices", security: "Security events", audit: "Audit trail", proof: "Payment proof" };

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand-block" onClick={() => setPage("dashboard")} aria-label="VBT TrustPay dashboard"><Image className="brand-logo" src="/vbt-logo.svg" width={400} height={110} priority alt="VBT AI Consulting — Inteligencia que transforma. Resultados que multiplican." /></button>
      <p className="brand-caption">Intelligent payment<br />control layer</p>
      <button className="sidebar-new-payment" onClick={startNewPayment}><Plus size={18} /> New payment</button>
      <nav className="primary-nav" aria-label="Main navigation">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${page === id ? "nav-link-active" : ""}`} onClick={() => setPage(id)}><Icon size={19} strokeWidth={1.8} /><span>{label}</span>{id === "security" && blocked && <span className="nav-count">1</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="security-promo"><span className="promo-shield"><ShieldCheck size={35} /></span><strong>Ask.<br />Verify.<br />Approve.<br />Pay.<br />Prove.</strong></div>
        <div className="sidebar-network"><span className="network-cube"><Blocks size={20} /></span><div><strong>Ethereum Sepolia</strong><span><i className="dot-green" /> Testnet demo</span></div></div>
        <div className="sidebar-disclaimer">Test assets only<br />No private keys handled</div>
      </div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <form className="global-search" onSubmit={(event) => { event.preventDefault(); openSearchResult(); }}><Search size={18} /><input aria-label="Search invoices, suppliers or payments" placeholder="Search invoices, suppliers or payments…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>↵</kbd></form>
        <div className="topbar-right"><span className="demo-badge"><span className="demo-dot" /> DEMO WORKSPACE</span><button className="topbar-icon" aria-label="No new notifications"><Bell size={19} /><span className="notification-dot" /></button><span className="topbar-divider" /><button className="profile-button"><span className="profile-avatar">V</span><span className="profile-label"><strong>VBT TrustPay</strong><small>Finance workspace</small></span><ChevronDown size={16} /></button></div>
      </header>
      <main className="main-content" aria-label={titleForPage[page]}>
        {page === "dashboard" && renderDashboard()}
        {page === "new-payment" && renderNewPayment()}
        {page === "payments" && renderPayments()}
        {page === "suppliers" && renderSuppliers()}
        {page === "invoices" && renderInvoices()}
        {page === "security" && renderSecurity()}
        {page === "audit" && renderAudit()}
        {page === "proof" && renderProof()}
        <footer className="app-footer"><span>VBT TrustPay · Sepolia test mode</span><span><LockKeyhole size={13} /> Sepolia demo signatures stay in your wallet · No mainnet payments</span></footer>
      </main>
    </div>
  </div>;
}

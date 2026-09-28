import type { ReactNode } from "react";
import type { PaymentIntent, TrustResult } from "@/lib/shared/types";

const REGISTERED_ABC_WALLET = "0x669bcC0eca97bE32Cb3677c005B0dC869ead07A8";

type PaymentReviewProps = {
  intent: PaymentIntent;
  trust: TrustResult;
  mode: string;
  invoiceTotal: string;
  children?: ReactNode;
};

export function PaymentReview({ intent, trust, mode, invoiceTotal, children }: PaymentReviewProps) {
  const blocked = trust.status !== "APPROVED";
  const walletCheck = trust.checks.find((check) => check.code === "WALLET_MATCH");
  const walletMismatch = !!walletCheck && !walletCheck.passed;
  const registeredWallet = walletCheck?.expected ?? REGISTERED_ABC_WALLET;
  const partial = invoiceTotal !== "" && invoiceTotal !== intent.amount;

  return (
    <section className={`review-card ${blocked ? "review-card-blocked" : "review-card-approved"}`} aria-live="polite">
      <div className="review-heading-row">
        <div>
          <p className="eyebrow">{mode === "demo" ? "DEMO ANALYSIS" : "AI ANALYSIS"} · DETERMINISTIC VERIFICATION</p>
          <h2>{intent.invoiceId} <span>·</span> {intent.amount} {intent.currency}</h2>
        </div>
        <span className={`status-pill ${blocked ? "status-pill-blocked" : "status-pill-approved"}`}>
          {blocked ? "TRUST ENGINE: BLOCKED" : "TRUST ENGINE: APPROVED"}
        </span>
      </div>

      <div className="review-facts">
        <div><span>Supplier</span><strong>{intent.supplierName}</strong></div>
        <div><span>Invoice</span><strong>{intent.invoiceId} <small>· demo</small></strong></div>
        <div><span>Requested amount</span><strong>{intent.amount} {intent.currency}</strong></div>
        <div className="fact-destination"><span>Requested destination</span><strong>{intent.destinationWallet}</strong></div>
      </div>

      {partial && <p className="notice notice-amber"><strong>TESTNET DEMO · PARTIAL PAYMENT</strong><br />{intent.amount} USDC against the demo invoice total of {invoiceTotal} USDC. This does not settle or mark the full invoice paid.</p>}

      <div className="checklist-heading"><h3>Trust Engine checks</h3><span>{trust.checks.filter((check) => check.passed).length}/{trust.checks.length} passed</span></div>
      <ul className="trust-checks">
        {trust.checks.map((check) => <li key={check.code} className={check.passed ? "check-pass" : "check-fail"}>
          <span aria-hidden="true">{check.passed ? "✓" : "×"}</span>
          <div><strong>{check.code.replaceAll("_", " ")}</strong><p>{check.message}</p></div>
          {check.code === "WALLET_MATCH" && <span className="check-value">{check.passed ? "true" : "false"}</span>}
        </li>)}
      </ul>

      {blocked ? <section className="blocked-result" role="alert" aria-labelledby="blocked-title">
        <div className="blocked-result-title"><span aria-hidden="true">!</span><div><p className="eyebrow">PAYMENT BLOCKED</p><h3 id="blocked-title">{walletMismatch ? "WALLET MISMATCH" : trust.reasons[0]?.replaceAll("_", " ") ?? "TRUST CHECK FAILED"}</h3></div></div>
        {walletMismatch ? <>
          <p className="blocked-message">The requested destination does not match the supplier&apos;s registered wallet. Payment execution was blocked.</p>
          <dl className="wallet-comparison">
            <div><dt>Registered wallet</dt><dd>{registeredWallet}</dd></div>
            <div><dt>Requested destination</dt><dd>{intent.destinationWallet}</dd></div>
          </dl>
        </> : <p className="blocked-message">Trust Engine checks did not pass. Payment execution was blocked before wallet approval.</p>}
        <ul className="execution-assurances">
          <li><span aria-hidden="true">✓</span> No transaction was created</li>
          <li><span aria-hidden="true">✓</span> No wallet signature was requested</li>
          <li><span aria-hidden="true">✓</span> Payment was prevented before blockchain execution</li>
        </ul>
      </section> : <section className="approval-gate">
        <div><span className="eyebrow">NEXT · HUMAN CONTROL</span><h3>Review this exact payment intent</h3><p>Rabby is only available after Trust Engine approval. The wallet will show its own final transaction confirmation.</p></div>
        {children}
      </section>}
    </section>
  );
}

"use client";
import { useState } from "react";

const steps = ["ASK", "ANALYZE", "VERIFY", "APPROVE", "PAY", "PROVE"];
type Analysis = { intent: { id: string; invoiceId: string; amount: string; currency: string; destinationWallet: string }; trust: { status: string; checks: Array<{ code: string; passed: boolean; message: string }> }; mode: string };

export default function Home() {
  const [request, setRequest] = useState("Pay ABC Software invoice INV-001 for 500 USDC");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  
  async function analyze() {
    setLoading(true); setError(""); setApproved(false);
    try {
      const response = await fetch("/api/demo/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Analysis failed");
      setAnalysis(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed"); setAnalysis(null); }
    finally { setLoading(false); }
  }

  async function approvePayment() {
    if (!analysis) return;
    try {
      const res = await fetch("/api/demo/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: analysis.intent.invoiceId })
      });
      if (res.ok) {
        setApproved(true);
      } else {
        alert("Error al actualizar la base de datos");
      }
    } catch (error) {
      console.error("Fallo la conexión con el servidor", error);
    }
  }

  // --- AQUÍ SE AGREGÓ LA FUNCIÓN DEL RESET ---
  async function resetDemo() {
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setAnalysis(null);
      setApproved(false);
      setRequest("Pay ABC Software invoice INV-001 for 500 USDC");
    } catch (error) {
      console.error("Fallo el reset", error);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 sm:py-24">
      <p className="text-sm font-semibold tracking-[0.2em] text-blue-700">VBT TRUSTPAY · DEMO MODE</p>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Business payments, with trust built in.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">AI proposes payment details. Deterministic controls verify them. A person reviews before any payment can proceed.</p>
      <ol className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-6">
        {steps.map((step, i) => (
          <li key={step} className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-xs text-slate-500">0{i + 1}</span>
            <p className="mt-2 font-semibold">{step}</p>
          </li>
        ))}
      </ol>
      <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-6">
        <label htmlFor="payment-request" className="text-sm font-semibold">ASK · Describe a payment</label>
        <textarea id="payment-request" className="mt-3 min-h-28 w-full rounded-lg border border-slate-300 p-3" value={request} onChange={(event) => setRequest(event.target.value)} />
        
        {/* --- AQUÍ SE AGREGÓ EL BOTÓN DE RESET --- */}
        <div className="mt-3 flex flex-wrap gap-3">
          <button onClick={analyze} disabled={loading} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Analyzing…" : "Analyze payment"}</button>
          
          <button onClick={() => { setRequest("Pay ABC Software INV-001 for 500 USDC to an altered wallet"); setAnalysis(null); setApproved(false); }} className="rounded-lg border px-5 py-3">
            Load wallet attack
          </button>

          <button onClick={resetDemo} className="rounded-lg border px-5 py-3 hover:bg-slate-50">
            Reset Demo
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        {analysis && (
          <div className="mt-8 border-t pt-6">
            <p className="text-sm text-slate-500">{analysis.mode.toUpperCase()} · {analysis.trust.status}</p>
            <h2 className="mt-2 text-2xl font-semibold">{analysis.intent.invoiceId} · {analysis.intent.amount} {analysis.intent.currency}</h2>
            <p className="mt-2 break-all text-sm text-slate-600">Destination: {analysis.intent.destinationWallet}</p>
            <ul className="mt-5 space-y-2">
              {analysis.trust.checks.map((check) => (
                <li key={check.code} className={check.passed ? "text-emerald-700" : "text-red-700"}>{check.passed ? "✓" : "✕"} {check.code}: {check.message}</li>
              ))}
            </ul>
            {analysis.trust.status === "APPROVED" && !approved && (
              <button onClick={approvePayment} className="mt-6 rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-800">Review and approve this intent</button>
            )}
            {approved && (
              <p className="mt-5 text-sm font-bold text-emerald-700">✓ Pago procesado. La factura {analysis.intent.invoiceId} fue marcada como 'paid' en la base de datos MariaDB.</p>
            )}
          </div>
        )}
      </section>
      <p className="mt-6 text-sm text-slate-500">Demo transactions use synthetic data. Blockchain broadcast is disabled. Testnet only; no real funds.</p>
    </main>
  );
}
import { NextResponse } from "next/server";
import { extractPaymentIntent } from "@/lib/ai";
import { demoTrustContext } from "@/lib/data/demo";
import { evaluatePayment } from "@/lib/trust";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("request" in body) || typeof body.request !== "string") {
      return NextResponse.json({ error: "request must be a string" }, { status: 400 });
    }
    const intent = await extractPaymentIntent(body.request);
    const trust = await evaluatePayment(intent, demoTrustContext);
    
    return NextResponse.json({ intent, trust, mode: process.env.AI_PROVIDER === "openai" ? "ai" : "demo" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis failed" }, { status: 400 });
  }
}
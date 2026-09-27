import { NextResponse } from "next/server";
import { extractPaymentIntent } from "@/lib/ai";
import { demoTrustContext } from "@/lib/data/demo";
import type { PaymentIntent } from "@/lib/shared/types";
import { evaluatePayment } from "@/lib/trust";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("request" in body) || typeof body.request !== "string") {
      return NextResponse.json({ error: "request must be a string" }, { status: 400 });
    }
    const intent = await extractPaymentIntent(body.request);
    const configuredRecipient = process.env.NEXT_PUBLIC_SEPOLIA_PAYMENT_RECIPIENT_ADDRESS;
    const demoRecipient = demoTrustContext.suppliers[0]?.registeredWallet;
    const useConfiguredRecipient = Boolean(configuredRecipient && demoRecipient && intent.destinationWallet.toLowerCase() === demoRecipient.toLowerCase());
    const configuredIntent: PaymentIntent = useConfiguredRecipient && configuredRecipient
      ? { ...intent, destinationWallet: configuredRecipient as `0x${string}` }
      : intent;
    const trustContext = configuredRecipient
      ? { ...demoTrustContext, suppliers: demoTrustContext.suppliers.map((supplier) => ({ ...supplier, registeredWallet: configuredRecipient })) }
      : demoTrustContext;
    const trust = evaluatePayment(configuredIntent, trustContext);
    return NextResponse.json({ intent: configuredIntent, trust, mode: process.env.AI_PROVIDER === "openai" ? "ai" : "demo" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis failed" }, { status: 400 });
  }
}

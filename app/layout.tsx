import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "VBT TrustPay", description: "Ask. Analyze. Verify. Approve. Pay. Prove." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

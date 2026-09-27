import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function POST() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://root:@localhost:3306/trustpay");
    await connection.execute("UPDATE invoices SET status = 'unpaid' WHERE id = 'INV-001'");
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
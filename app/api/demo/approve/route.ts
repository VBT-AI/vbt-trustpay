import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoiceId = body.invoiceId;

    if (!invoiceId) {
      return NextResponse.json({ error: "No invoice ID provided" }, { status: 400 });
    }

    // Conectamos a tu XAMPP local
    const connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://root:@localhost:3306/trustpay");
    
    // Cambiamos el status a 'paid' en la base de datos
    await connection.execute("UPDATE invoices SET status = 'paid' WHERE id = ?", [invoiceId]);
    
    await connection.end();

    return NextResponse.json({ success: true, message: `Invoice ${invoiceId} marked as paid in database.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}
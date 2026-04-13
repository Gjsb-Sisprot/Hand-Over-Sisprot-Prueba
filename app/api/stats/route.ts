import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const client = new Client({
    user: "postgres.mkluqieffbwelhkxbovk",
    password: "Sisprot.2025",
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT status FROM conversations");
    const data = res.rows;
    
    return NextResponse.json({
      active: data.filter((c: any) => c.status === "active").length,
      waitingAgent: data.filter((c: any) => c.status === "waiting_specialist").length,
      handedOver: data.filter((c: any) => c.status === "handed_over").length,
      closed: data.filter((c: any) => c.status === "closed").length,
      total: data.length
    });
  } catch (error: any) {
    return NextResponse.json({
      active: 0, waitingAgent: 0, handedOver: 0, closed: 0, total: 0,
      error: error.message
    });
  } finally {
    await client.end();
  }
}

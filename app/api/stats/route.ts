import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Configuración directa de la base de datos (Pooler de Supabase)
  // El usuario de la BD DEBE incluir el ID del proyecto en el Transaction Pooler
  const DB_URI = "postgresql://postgres.mkluqieffbwelhkxbovk:Sisprot.2025@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
  
  const client = new Client({
    connectionString: DB_URI,
    ssl: {
      rejectUnauthorized: false // Requerido para conexiones externas a Supabase sin el certificado root
    }
  });

  try {
    await client.connect();
    
    // Consulta directa a la base de datos
    const res = await client.query('SELECT status FROM conversations');
    const data = res.rows;
    
    return NextResponse.json({
      active: data.filter((c: any) => c.status === "active").length,
      waitingAgent: data.filter((c: any) => c.status === "waiting_specialist").length,
      handedOver: data.filter((c: any) => c.status === "handed_over").length,
      closed: data.filter((c: any) => c.status === "closed").length,
      total: data.length,
      debug: {
        method: "NATIVE_POSTGRES_POOLER",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[STATS_DB_ERROR]", error);
    return NextResponse.json(
      {
        active: 0,
        waitingAgent: 0,
        handedOver: 0,
        closed: 0,
        total: 0,
        error: error.message,
        debug: {
          method: "DB_DIRECT_FAIL",
          timestamp: new Date().toISOString()
        }
      }
    );
  } finally {
    await client.end();
  }
}

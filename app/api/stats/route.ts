import { NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/[\r\n\t ]/g, "").trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/[\r\n\t ]/g, "").trim();
  
  try {
    // Conexión NATIVA vía REST (emulando CURL) para evitar bugs de la librería en Vercel
    const restUrl = `${supabaseUrl}/rest/v1/conversations?select=status`;
    
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    
    const stats = {
      total: data.length,
      active: data.filter((c: any) => c.status === "active").length,
      waiting_agent: data.filter((c: any) => c.status === "waiting_specialist").length,
      handed_over: data.filter((c: any) => c.status === "handed_over").length,
      closed: data.filter((c: any) => c.status === "closed").length,
    };

    return NextResponse.json({
      active: stats.active,
      waitingAgent: stats.waiting_agent,
      handedOver: stats.handed_over,
      closed: stats.closed,
      total: stats.total,
      debug: {
        method: "NATIVE_REST",
        url_end: supabaseUrl.slice(-7),
        key_end: supabaseServiceRoleKey.slice(-5),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error("[STATS_CRITICAL_ERROR]", error);
    return NextResponse.json(
      {
        active: 0,
        waitingAgent: 0,
        handedOver: 0,
        closed: 0,
        total: 0,
        error: error.message,
        debug: {
          method: "NATIVE_REST_FAIL",
          timestamp: new Date().toISOString()
        }
      }
    );
  }
}

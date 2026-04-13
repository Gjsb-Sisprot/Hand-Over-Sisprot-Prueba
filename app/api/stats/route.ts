import { NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Limpieza extrema de variables para evitar cualquier carácter invisible
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  
  const supabaseUrl = rawUrl.replace(/[\r\n\t ]/g, "").trim();
  const supabaseServiceRoleKey = rawKey.replace(/[\r\n\t ]/g, "").trim();
  
  try {
    // URL limpia sin barras dobles al final
    const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const restUrl = `${baseUrl}/rest/v1/conversations?select=status`;
    
    // Simplificación de Headers: Solo apikey (a veces Bearer causa conflicto si no es JWT exacto)
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    let errorBody = null;
    if (!response.ok) {
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = await response.text();
      }
      throw new Error(`Supabase Reject: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      active: data.filter((c: any) => c.status === "active").length,
      waitingAgent: data.filter((c: any) => c.status === "waiting_specialist").length,
      handedOver: data.filter((c: any) => c.status === "handed_over").length,
      closed: data.filter((c: any) => c.status === "closed").length,
      total: data.length,
      debug: {
        method: "REST_DIRECT_CLEAN",
        url_check: baseUrl.slice(-10),
        key_check: supabaseServiceRoleKey.slice(-5),
        status: response.status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error("[STATS_ERROR]", error);
    return NextResponse.json(
      {
        active: 0,
        waitingAgent: 0,
        handedOver: 0,
        closed: 0,
        total: 0,
        error: error.message,
        debug: {
          method: "REST_DIRECT_FAIL",
          timestamp: new Date().toISOString()
        }
      }
    );
  }
}

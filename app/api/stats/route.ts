import { NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  let supabaseError = null;
  try {
    // Verificación de salud de variables de entorno (sin exponer valores)
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/[\r\n\t ]/g, "").trim();
    const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/[\r\n\t ]/g, "").trim();
    const hasUrl = !!supabaseUrl;
    const hasKey = !!supabaseServiceRoleKey;
    
    if (!hasUrl || !hasKey) {
      console.error("[STATS_ERROR] Missing Environment Variables in Vercel:", { hasUrl, hasKey });
    }

    let stats;
    try {
      const response = await mcpClient.getConversationStats();
      stats = response;
      // @ts-ignore - Guardamos el error de supabase si existe en una propiedad extendida
      if (response.error) supabaseError = response.error;
    } catch (mcpError: any) {
      console.error("[STATS_ERROR] MCP Client failed:", mcpError);
      supabaseError = mcpError.message;
      stats = {
        waiting_agent: 0,
        handed_over: 0,
        closed: 0,
        total: 0,
        active: 0,
      };
    }

    return NextResponse.json({
      active: stats.active || 0,
      waitingAgent: stats.waiting_agent,
      handedOver: stats.handed_over,
      closed: stats.closed,
      total: stats.total,
      debug: {
        env_url: hasUrl,
        env_key: hasKey,
        url_end: supabaseUrl.slice(-7), // Vemos el final del dominio
        key_end: supabaseServiceRoleKey.slice(-5), // Vemos el final de la llave
        error: supabaseError,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[STATS_CRITICAL_ERROR]", error);
    return NextResponse.json(
      {
        active: 0,
        waitingAgent: 0,
        handedOver: 0,
        closed: 0,
        total: 0,
        error: "Critical Failure"
      }
    );
  }
}

import { NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export async function GET() {
  try {
    // Verificación de salud de variables de entorno (sin exponer valores)
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasUrl || !hasKey) {
      console.error("[STATS_ERROR] Missing Environment Variables in Vercel:", { hasUrl, hasKey });
    }

    let stats;
    try {
      stats = await mcpClient.getConversationStats();
    } catch (mcpError) {
      console.error("[STATS_ERROR] MCP Client failed:", mcpError);
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
        env_key: hasKey
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

import { NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export async function GET() {
  try {
    let stats;

    try {
      stats = await mcpClient.getConversationStats();
    } catch (mcpError) {
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        active: 0,
        waitingAgent: 0,
        handedOver: 0,
        closed: 0,
        total: 0,
      }
    );
  }
}

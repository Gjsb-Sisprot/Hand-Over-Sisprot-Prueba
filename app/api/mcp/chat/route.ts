import { NextRequest, NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "sessionId is required"
        },
        { status: 400 }
      );
    }

    try {
      const messages = await mcpClient.getConversationHistory(sessionId, limit);

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          messages,
          totalMessages: messages.length,
        }
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          messages: [],
          totalMessages: 0,
        }
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Error fetching chat history"
      },
      { status: 500 }
    );
  }
}

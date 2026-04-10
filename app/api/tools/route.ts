import { NextRequest, NextResponse } from "next/server";


const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

interface ToolRequest {
  tool: string;
  args: Record<string, unknown>;
}

interface ToolResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ToolResponse>> {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.REQUIRE_AUTH === "true") {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Missing API key" },
          { status: 401 }
        );
      }
    }

    const body = (await request.json()) as ToolRequest;
    const { tool, args } = body;

    if (!tool) {
      return NextResponse.json(
        { success: false, error: "Missing tool name" },
        { status: 400 }
      );
    }

    const mcpResponse = await fetch(`${MCP_URL}/api/tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MCP_API_KEY && { Authorization: `Bearer ${MCP_API_KEY}` }),
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(30000),
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `MCP Error: ${mcpResponse.status} - ${mcpResponse.statusText}`
        },
        { status: mcpResponse.status }
      );
    }

    const mcpData = await mcpResponse.json();
    return NextResponse.json(mcpData);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const mcpHealth = await fetch(`${MCP_URL}/api/health`, {
      method: "GET",
      headers: {
        ...(MCP_API_KEY && { Authorization: `Bearer ${MCP_API_KEY}` }),
      },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    const mcpStatus = mcpHealth?.ok ? "connected" : "disconnected";

    return NextResponse.json({
      status: "ok",
      service: "handover-proxy",
      mcp: {
        url: MCP_URL,
        status: mcpStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: "ok",
      service: "handover-proxy",
      mcp: {
        url: MCP_URL,
        status: "unknown",
      },
      timestamp: new Date().toISOString(),
    });
  }
}

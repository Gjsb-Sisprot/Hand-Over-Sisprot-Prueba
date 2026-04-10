import { NextRequest, NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp-client";
import type { MCPListConversationsResponse } from "@/types/mcp";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const agentEmail = searchParams.get("agentEmail") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const includeAll = searchParams.get("includeAll") === "true";

    let status: string | string[] | undefined;
    if (statusParam) {
      status = statusParam.includes(",") ? statusParam.split(",") : statusParam;
    }

    let response: MCPListConversationsResponse;

    try {
      response = await mcpClient.listConversations({
        status,
        agentEmail,
        page,
        pageSize,
        includeAll,
      });
    } catch {
      response = {
        conversations: [],
        pagination: {
          page: 1,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: { includeAll: false },
      };
    }

    return NextResponse.json(response);


  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching conversations" },
      { status: 500 }
    );
  }
}

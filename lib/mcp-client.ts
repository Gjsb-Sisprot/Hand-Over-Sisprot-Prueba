
import type {
  MCPConversation,
  MCPClient,
  MCPTimestamps,
  MCPAgent,
  MCPChatMessage,
  MCPConversationStats,
  MCPAgentStats,
  MCPToolResponse,
  MCPListConversationsResponse
} from "@/types/mcp";

const MCP_URL = (process.env.MCP_SERVER_URL || "http://localhost:3001").replace(/\/+$/, "");
const MCP_API_KEY = process.env.MCP_API_KEY || "";
const MCP_TIMEOUT = parseInt(process.env.MCP_TIMEOUT || "10000", 10);

function countReplacementChars(value: unknown): number {
  if (typeof value === "string") {
    return (value.match(/�/g) || []).length;
  }
  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + countReplacementChars(item), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (acc, item) => acc + countReplacementChars(item),
      0
    );
  }
  return 0;
}

function repairMojibake(value: string): string {
  let repaired = value;

  if (/[ÃÂâ€]/.test(repaired)) {
    try {
      repaired = Buffer.from(repaired, "latin1").toString("utf8");
    } catch {
    }
  }

  return repaired.normalize("NFC");
}

function normalizeTextDeep<T>(value: T): T {
  if (typeof value === "string") {
    return repairMojibake(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTextDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const normalizedEntries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => [key, normalizeTextDeep(item)]
    );
    return Object.fromEntries(normalizedEntries) as T;
  }
  return value;
}

async function parseJsonWithCharsetFallback<T>(response: Response): Promise<T> {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const contentType = response.headers.get("content-type") || "";
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  const charset = charsetMatch?.[1]?.trim().toLowerCase();

  const candidateCharsets = [
    charset,
    "utf-8",
    "windows-1252",
    "iso-8859-1",
    "latin1",
  ].filter((c, index, arr): c is string => !!c && arr.indexOf(c) === index);

  let bestParsed: unknown = null;
  let bestReplacementCount = Number.POSITIVE_INFINITY;
  let lastError: unknown = null;

  for (const candidate of candidateCharsets) {
    try {
      const decoded = new TextDecoder(candidate, {
        fatal: false,
      }).decode(bytes);
      const parsed = JSON.parse(decoded);
      const replacementCount = countReplacementChars(parsed);

      if (replacementCount < bestReplacementCount) {
        bestParsed = parsed;
        bestReplacementCount = replacementCount;
      }

      if (replacementCount === 0) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (bestParsed === null) {
    throw (lastError instanceof Error ? lastError : new Error("Invalid MCP JSON response"));
  }

  return normalizeTextDeep(bestParsed as T);
}

async function callMCPTool<T = unknown>(
  tool: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  try {
    const response = await fetch(`${MCP_URL}/api/tools/${encodeURIComponent(tool)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MCP_API_KEY && { Authorization: `Bearer ${MCP_API_KEY}` }),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(MCP_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`MCP Error: ${response.status} ${response.statusText}`);
    }

    const responseData = await parseJsonWithCharsetFallback<{ success: boolean; result?: T; error?: string }>(response);

    if (!responseData.success) {
      throw new Error(responseData.error || "Unknown MCP error");
    }

    return responseData.result as T;
  } catch (error) {
    throw error;
  }
}



interface MCPPendingResponse {
  count: number;
  conversations: MCPConversation[];
}

interface MCPActiveResponse {
  count: number;
  conversations: MCPConversation[];
}

interface MCPListResponse {
  conversations: MCPConversation[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    status?: string | string[];
    identification?: string;
    contract?: string;
    includeAll: boolean;
  };
}

interface MCPHistoryResponse {
  session_id: string;
  messages: MCPChatMessage[];
}

interface MCPSearchResponse {
  count: number;
  conversations: MCPConversation[];
}


export async function getPendingConversations(): Promise<MCPConversation[]> {
  const response = await callMCPTool<MCPPendingResponse | MCPConversation[]>("get_pending_conversations");

  if (Array.isArray(response)) {
    return response;
  }
  return response?.conversations || [];
}

export async function getActiveConversations(): Promise<MCPConversation[]> {
  const response = await callMCPTool<MCPActiveResponse | MCPConversation[]>("get_active_conversations");

  if (Array.isArray(response)) {
    return response;
  }
  return response?.conversations || [];
}

export async function searchConversations(params: {
  identification?: string;
  contract?: string;
  status?: string;
  agentId?: string;
}): Promise<MCPConversation[]> {
  const response = await callMCPTool<MCPSearchResponse | MCPConversation[]>("search_conversations", params);

  if (Array.isArray(response)) {
    return response;
  }
  return response?.conversations || [];
}

export async function listConversations(params: {
  status?: string | string[];
  identification?: string;
  contract?: string;
  agentEmail?: string;
  page?: number;
  pageSize?: number;
  includeAll?: boolean;
  sortBy?: "updated_at" | "created_at";
  sortOrder?: "asc" | "desc";
}): Promise<MCPListConversationsResponse> {
  const mcpParams = {
    limit: params.pageSize || 50,
    offset: ((params.page || 1) - 1) * (params.pageSize || 50),
    orderBy: params.sortBy || "updated_at",
    order: params.sortOrder || "desc",
    ...(params.status && typeof params.status === "string" ? { status: params.status } : {}),
  };

  interface MCPRawConv {
  sessionId?: string;
  id?: string;
  userId?: string;
  status?: string;
  summary?: string | null;
  messageCount?: number | string;
  priority?: string;
  contactName?: string | null;
  identification?: string | null;
  contract?: string | null;
  sector?: string | null;
  email?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  contactPhone?: string | null;
  specialistId?: string | null;
  specialistName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  escalatedAt?: string | null;
  closedAt?: string | null;
  takenAt?: string | null;
  closedBy?: string | null;
  glpiTicketId?: number | null;
  metadata?: Record<string, unknown>;
  client?: {
    name?: string | null;
    identification?: string | null;
    contract?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  timestamps?: {
    createdAt?: string;
    updatedAt?: string;
    escalatedAt?: string | null;
    closedAt?: string | null;
  };
  agent?: {
    email: string;
    name: string;
    takenAt: string;
  };
}

  const response = await callMCPTool<{
    success: boolean;
    total: number;
    count: number;
    conversations: MCPRawConv[];
  }>("list_conversations", mcpParams);

  const rawConvs = response?.conversations || [];
  const total = response?.total ?? rawConvs.length;
  const pageSize = params.pageSize || 50;
  const page = params.page || 1;

  const conversations: MCPConversation[] = rawConvs.map((c) => {
    const summary = c.summary || "";

    let extractedName = c.contactName || c.client?.name || null;
    let extractedId = c.identification || c.client?.identification || null;
    let extractedContract = c.contract || c.client?.contract || null;

    if (!extractedName && summary.includes("Cliente:")) {
      const match = summary.match(/Cliente:\s*([^|]+)/);
      if (match) extractedName = match[1].trim();
    }
    if (!extractedId && summary.includes("Cédula:")) {
      const match = summary.match(/Cédula:\s*([^|]+)/);
      if (match) extractedId = match[1].trim();
    }
    if (!extractedContract && summary.includes("Contrato:")) {
      const match = summary.match(/Contrato:\s*([^|]+)/);
      if (match) extractedContract = match[1].trim();
    }

    return {
      id: c.id || c.sessionId || "",
      sessionId: c.sessionId || c.id || "",
      status: (c.status as MCPConversation["status"]) || "active",
      summary: c.summary || null,
      messageCount: typeof c.messageCount === "string" ? parseInt(c.messageCount, 10) : (c.messageCount || 0),
      isUrgent: c.priority === "high" || c.priority === "critical",
      client: {
        name: extractedName,
        identification: extractedId,
        contract: extractedContract,
        email: c.email || c.contactEmail || c.client?.email || null,
        phone: c.phone || c.contactPhone || c.client?.phone || null,
      },
      timestamps: {
        createdAt: c.createdAt || c.timestamps?.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || c.timestamps?.updatedAt || new Date().toISOString(),
        escalatedAt: c.escalatedAt || (c.metadata as any)?.escalatedAt || null,
        closedAt: c.closedAt || null,
      },
      agent: c.agent || (c.specialistId
        ? {
            email: c.specialistId,
            name: c.specialistName || c.specialistId,
            takenAt: c.takenAt || c.updatedAt || new Date().toISOString(),
          }
        : undefined),
      glpiTicketId: c.glpiTicketId || null,
      closedBy: c.closedBy || null,
      metadata: c.metadata || {},
    } as MCPConversation;
  });

  return {
    conversations,
    pagination: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
    filters: {
      status: params.status,
      includeAll: params.includeAll || false,
    },
  };
}



export async function getConversationStatus(
  sessionId: string
): Promise<MCPConversation | null> {
  const result = await callMCPTool<any>("get_conversation_status", {
    sessionId,
  });

  if (!result || !result.exists) return null;

  const contact = result.contactInfo || {};
  const summary = result.summary || "";

  let name = contact.name;
  let id = contact.identification || contact.id;

  if (!name && summary.includes("Cliente:")) {
    const match = summary.match(/Cliente:\s*([^|]+)/);
    if (match) name = match[1].trim();
  }

  return {
    id: sessionId,
    sessionId: sessionId,
    status: result.status,
    summary: result.summary,
    client: {
      name: name || "Sin nombre",
      identification: id || "Sin identificación",
      contract: contact.contract || null,
      email: contact.email || null,
      phone: contact.phone || null,
    },
    timestamps: {
      createdAt: result.createdAt || result.timestamps?.createdAt || new Date().toISOString(),
      updatedAt: result.updatedAt || result.timestamps?.updatedAt || new Date().toISOString(),
      escalatedAt: result.escalatedAt || result.timestamps?.escalatedAt || null,
      closedAt: result.closedAt || result.timestamps?.closedAt || null,
    },
    messageCount: result.messageCount || 0,
    agent: result.specialistId ? {
      email: result.specialistId,
      name: result.specialistName || result.specialistId,
      takenAt: result.takenAt || new Date().toISOString(),
    } : undefined,
    metadata: result.metadata || {}
  };
}

export async function getConversationHistory(
  sessionId: string,
  limit?: number
): Promise<MCPChatMessage[]> {
  const response = await callMCPTool<MCPHistoryResponse | MCPChatMessage[]>("get_conversation_history", {
    sessionId,
    limit: limit || 100,
  });

  if (Array.isArray(response)) {
    return response;
  }
  return response?.messages || [];
}


export async function takeoverConversation(
  sessionId: string,
  agentEmail: string,
  agentName: string,
  options?: {
    createTicket?: boolean;
    ticketTypeId?: number;
    ticketTypeName?: string;
    ticketSummary?: string;
    urgency?: number;
    reason?: string;
  }
): Promise<{ success: boolean; conversation?: MCPConversation; glpiTicketId?: number; ticket?: { created: boolean; ticketId?: number; error?: string } }> {
  return callMCPTool("takeover_conversation", {
    sessionId,
    specialistEmail: agentEmail,
    specialistName: agentName,
    ...options,
  });
}

export async function pauseConversation(
  sessionId: string,
  reason: string,
  options?: {
    createTicket?: boolean;
    ticketTypeId?: number;
    ticketTypeName?: string;
    ticketSummary?: string;
    urgency?: number;
    specialistName?: string;
    specialistEmail?: string;
  }
): Promise<{ success: boolean; glpiTicketId?: number; ticket?: { created: boolean; ticketId?: number; error?: string } }> {
  return callMCPTool("pause_conversation", {
    sessionId,
    reason,
    ...options,
  });
}

export async function closeConversation(
  sessionId: string,
  resolution: string,
  options?: {
    closedBy?: "system" | "agent" | "user";
    createTicket?: boolean;
    ticketTypeId?: number;
    ticketTypeName?: string;
    ticketSummary?: string;
    specialistName?: string;
    specialistEmail?: string;
  }
): Promise<{ success: boolean; glpiTicketId?: number; ticket?: { processed: boolean; ticketId?: number; error?: string } }> {
  return callMCPTool("close_conversation", {
    sessionId,
    resolution,
    ...options,
  });
}

export async function updateSummary(
  sessionId: string,
  summary: string
): Promise<{ success: boolean }> {
  return callMCPTool("update_summary", { sessionId, summary });
}


export async function getConversationStats(): Promise<MCPConversationStats> {
  const [pending, active] = await Promise.all([
    getPendingConversations().catch(() => []),
    getActiveConversations().catch(() => []),
  ]);

  const allConversations = [...pending, ...active];
  const uniqueConversations = allConversations.filter(
    (conv, index, self) => index === self.findIndex((c) => c.id === conv.id)
  );

  return {
    total: uniqueConversations.length,
    active: uniqueConversations.filter((c) => c.status === "active").length,
    waiting_agent: uniqueConversations.filter((c) => c.status === "waiting_specialist").length,
    handed_over: uniqueConversations.filter((c) => c.status === "handed_over").length,
    closed: uniqueConversations.filter((c) => c.status === "closed").length,
  };
}

export async function getAgentStats(agentEmail: string): Promise<MCPAgentStats> {
  const result = await callMCPTool<{
    specialistEmail: string;
    stats: {
      activeConversations: number;
      closedToday: number;
      avgResponseTime: number | null;
    };
  }>("get_specialist_stats", { specialistEmail: agentEmail });

  const s = result.stats;
  return {
    agentEmail,
    totalConversations: s.activeConversations + s.closedToday,
    activeConversations: s.activeConversations,
    closedConversations: s.closedToday,
    pendingConversations: 0,
    avgClosureTimeMinutes: s.avgResponseTime,
    lastTakenAt: null,
  };
}


export async function checkMCPHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MCP_URL}/health`, {
      method: "GET",
      headers: {
        ...(MCP_API_KEY && { Authorization: `Bearer ${MCP_API_KEY}` }),
      },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getMCPStatus(): Promise<{
  available: boolean;
  url: string;
  latency?: number;
}> {
  const start = Date.now();
  const available = await checkMCPHealth();
  const latency = Date.now() - start;

  return {
    available,
    url: MCP_URL,
    latency: available ? latency : undefined,
  };
}

export const mcpClient = {
  getPendingConversations,
  getActiveConversations,
  searchConversations,
  listConversations,
  getConversationStatus,
  getConversationHistory,
  takeoverConversation,
  pauseConversation,
  closeConversation,
  updateSummary,
  getConversationStats,
  getAgentStats,
  checkMCPHealth,
  getMCPStatus,
};

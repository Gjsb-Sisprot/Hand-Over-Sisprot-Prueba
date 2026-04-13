
import { supabaseAdmin } from "./supabase/service-role";
import type {
  MCPConversation,
  MCPChatMessage,
  MCPConversationStats,
  MCPAgentStats,
  MCPListConversationsResponse
} from "@/types/mcp";

/**
 * Normaliza una fila de la base de datos de Supabase al formato MCPConversation
 * que espera el frontend.
 */
function mapRowToConversation(conv: any): MCPConversation {
  return {
    id: conv.session_id || conv.id,
    sessionId: conv.session_id || conv.id,
    status: conv.status || "active",
    summary: conv.summary || null,
    messageCount: conv.message_count || 0,
    client: {
      name: conv.contact_name || "Sin nombre",
      identification: conv.identification || "Sin identificación",
      contract: conv.contract || null,
      email: conv.contact_email || null,
      phone: conv.contact_phone || null,
    },
    timestamps: {
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      escalatedAt: conv.escalated_at || conv.updated_at,
      closedAt: conv.closed_at || null,
    },
    agent: conv.specialist_name ? {
      email: conv.specialist_name,
      name: conv.specialist_name,
      takenAt: conv.updated_at,
    } : undefined,
    glpiTicketId: conv.glpi_ticket_id || null,
    closedBy: conv.closed_by || null,
    metadata: conv.metadata || {},
    isUrgent: conv.priority === "high" || conv.priority === "critical",
  } as MCPConversation;
}

export async function getPendingConversations(): Promise<MCPConversation[]> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("status", "waiting_specialist")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[SUPABASE_LIST_PENDING_ERROR]", error);
    return [];
  }
  return (data || []).map(mapRowToConversation);
}

export async function getActiveConversations(): Promise<MCPConversation[]> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("status", "handed_over")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[SUPABASE_LIST_ACTIVE_ERROR]", error);
    return [];
  }
  return (data || []).map(mapRowToConversation);
}

export async function searchConversations(params: {
  identification?: string;
  contract?: string;
  status?: string;
  agentId?: string;
}): Promise<MCPConversation[]> {
  let query = supabaseAdmin.from("conversations").select("*");

  if (params.identification) query = query.ilike("identification", `%${params.identification}%`);
  if (params.contract) query = query.ilike("contract", `%${params.contract}%`);
  if (params.status) query = query.eq("status", params.status);
  
  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("[SUPABASE_SEARCH_ERROR]", error);
    return [];
  }
  return (data || []).map(mapRowToConversation);
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
  const pageSize = params.pageSize || 50;
  const page = params.page || 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("conversations")
    .select("*", { count: "exact" });

  if (params.status) {
    if (Array.isArray(params.status)) {
      query = query.in("status", params.status);
    } else {
      query = query.eq("status", params.status);
    }
  }

  if (params.identification) query = query.ilike("identification", `%${params.identification}%`);
  if (params.contract) query = query.ilike("contract", `%${params.contract}%`);
  
  const { data, count, error } = await query
    .order(params.sortBy || "updated_at", { ascending: params.sortOrder === "asc" })
    .range(from, to);

  if (error) {
    console.error("[SUPABASE_LIST_ERROR]", error);
  }

  const total = count || 0;
  const conversations = (data || []).map(mapRowToConversation);

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
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToConversation(data);
}

export async function getConversationHistory(
  sessionId: string,
  limit?: number
): Promise<MCPChatMessage[]> {
  // Primero buscamos el UUID
  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
    .maybeSingle();

  if (!conv) return [];

  const { data, error } = await supabaseAdmin
    .from("chat_logs")
    .select("*")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(limit || 100);

  if (error) {
    console.error("[SUPABASE_HISTORY_ERROR]", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    role: row.role === "model" ? "assistant" : row.role,
    content: row.content,
    createdAt: row.created_at,
    toolName: row.tool_name,
    metadata: {
      attachments: row.attachments
    }
  })) as MCPChatMessage[];
}

export async function takeoverConversation(
  sessionId: string,
  agentEmail: string,
  agentName: string
): Promise<{ success: boolean }> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .update({
      status: "handed_over",
      specialist_name: agentName,
      updated_at: new Date().toISOString()
    })
    .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

  return { success: !error };
}

export async function pauseConversation(
  sessionId: string,
  reason: string
): Promise<{ success: boolean }> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .update({
      status: "paused",
      escalation_reason: reason,
      updated_at: new Date().toISOString()
    })
    .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

  return { success: !error };
}

export async function closeConversation(
  sessionId: string,
  resolution: string
): Promise<{ success: boolean }> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .update({
      status: "closed",
      escalation_reason: resolution,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

  return { success: !error };
}

export async function updateSummary(
  sessionId: string,
  summary: string
): Promise<{ success: boolean }> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .update({
      summary,
      updated_at: new Date().toISOString()
    })
    .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

  return { success: !error };
}

export async function getConversationStats(): Promise<MCPConversationStats> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("status");

  if (error) return { total: 0, active: 0, waiting_agent: 0, handed_over: 0, closed: 0 };

  return {
    total: data.length,
    active: data.filter(c => c.status === "active").length,
    waiting_agent: data.filter(c => c.status === "waiting_specialist").length,
    handed_over: data.filter(c => c.status === "handed_over").length,
    closed: data.filter(c => c.status === "closed").length,
  };
}

export async function getAgentStats(agentEmail: string): Promise<MCPAgentStats> {
  const { count: active } = await supabaseAdmin
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("specialist_name", agentEmail) // Usando email como nombre para el filtro rápido
    .eq("status", "handed_over");

  return {
    agentEmail,
    totalConversations: (active || 0),
    activeConversations: (active || 0),
    closedConversations: 0,
    pendingConversations: 0,
    avgClosureTimeMinutes: 0,
    lastTakenAt: null,
  };
}

export async function checkMCPHealth(): Promise<boolean> {
  return true; // Supabase está "siempre" vivo
}

export async function getMCPStatus(): Promise<{ available: boolean; url: string }> {
  return { available: true, url: "Supabase Native" };
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

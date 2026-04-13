"use server";


import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mcpClient } from "@/lib/mcp-client";
import type { MCPConversation, MCPChatMessage, MCPListConversationsResponse } from "@/types/mcp";
import type { AgentRole } from "@/lib/auth/permissions";


/**
 * Ya no dependemos de Supabase Auth ya que estaba dando problemas de sesión.
 * Ahora simplemente buscamos al agente en la base de datos si es necesario.
 */
async function getCurrentAgent(): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: AgentRole;
} | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Intentar encontrar al agente por el ID de Auth
  const { data: agent } = await supabase
    .from("agents")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle();

  return agent;
}

function filterConversationsByPermissions(
  conversations: MCPConversation[],
  agentEmail: string,
  role: AgentRole
): MCPConversation[] {
  void agentEmail;
  void role;
  return conversations;
}


export async function getConversations(
  status?: string | string[],
  includeAll?: boolean
): Promise<MCPConversation[]> {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return [];
    }

    const response = await mcpClient.listConversations({
      status,
      includeAll: includeAll || false,
      pageSize: 100,
    });

    const filteredConversations = filterConversationsByPermissions(
      response.conversations,
      agent.email,
      agent.role
    );

    return filteredConversations;
  } catch (error) {
    return [];
  }
}

export async function getConversationsPaginated(params: {
  status?: string | string[];
  page?: number;
  pageSize?: number;
  includeAll?: boolean;
}): Promise<MCPListConversationsResponse> {
  try {
    const agent = await getCurrentAgent();
    const response = await mcpClient.listConversations(params);

    // Permitimos ver sin filtrar por ahora si no hay agente detectado
    if (!agent) {
      return response;
    }

    const filteredConversations = filterConversationsByPermissions(
      response.conversations,
      agent.email,
      agent.role
    );

    return {
      ...response,
      conversations: filteredConversations,
      pagination: {
        ...response.pagination,
        totalItems: filteredConversations.length,
      },
    };
  } catch (error) {
    return {
      conversations: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      filters: { includeAll: false },
    };
  }
}

export async function getConversationBySessionId(
  sessionId: string
): Promise<MCPConversation | null> {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return null;
    }

    const conversation = await mcpClient.getConversationStatus(sessionId);
    if (!conversation) return null;

    return conversation;
  } catch (error) {
    return null;
  }
}

export async function getChatHistory(
  sessionId: string,
  limit?: number
): Promise<MCPChatMessage[]> {
  try {
    const conversation = await getConversationBySessionId(sessionId);
    if (!conversation) {
      return [];
    }

    return await mcpClient.getConversationHistory(sessionId, limit);
  } catch (error) {
    return [];
  }
}

export async function takeoverConversation(
  sessionId: string,
  options?: {
    createTicket?: boolean;
    ticketTypeId?: number;
    ticketTypeName?: string;
    ticketSummary?: string;
    urgency?: number;
    reason?: string;
  }
) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return { error: "No autenticado" };
  }


  try {
    const result = await mcpClient.takeoverConversation(
      sessionId,
      agent?.email || "agente@sisprot.com",
      agent?.name || agent?.email || "Agente",
      {
        createTicket: options?.createTicket ?? true,
        ticketTypeId: options?.ticketTypeId,
        ticketTypeName: options?.ticketTypeName,
        ticketSummary: options?.ticketSummary,
        urgency: options?.urgency,
        reason: options?.reason,
      }
    );

    if (agent) {
      const supabase = await createClient();
      await supabase
        .from("agents")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", agent.id);
    }

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId: result.glpiTicketId };
  } catch (error) {
    return { error: "Error al tomar la conversación" };
  }
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
  }
) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return { error: "No autenticado" };
  }


  try {
    await mcpClient.pauseConversation(sessionId, reason, {
      ...options,
      specialistName: agent.name || undefined,
      specialistEmail: agent.email,
    });

    const supabase = await createClient();
    await supabase
      .from("agents")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", agent.id);

    revalidatePath("/dashboard/conversations");
    return { success: true };
  } catch (error) {
    return { error: "Error al pausar la conversación" };
  }
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
  }
) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return { error: "No autenticado" };
  }


  try {
    await mcpClient.closeConversation(sessionId, resolution, {
      closedBy: options?.closedBy ?? "agent",
      createTicket: options?.createTicket ?? true,
      ticketTypeId: options?.ticketTypeId,
      ticketTypeName: options?.ticketTypeName,
      ticketSummary: options?.ticketSummary,
      specialistName: agent.name || undefined,
      specialistEmail: agent.email,
    });

    const supabase = await createClient();
    await supabase
      .from("agents")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", agent.id);

    revalidatePath("/dashboard/conversations");
    return { success: true };
  } catch (error) {
    return { error: "Error al cerrar la conversación" };
  }
}

export async function getConversationStats() {
  try {
    const stats = await mcpClient.getConversationStats();

    return {
      waitingAgent: stats.waiting_agent,
      handedOver: stats.handed_over,
      closed: stats.closed,
      total: stats.total,
    };
  } catch (error) {
    return {
      waitingAgent: 0,
      handedOver: 0,
      closed: 0,
      total: 0,
    };
  }
}

export async function searchConversations(params: {
  identification?: string;
  contract?: string;
  status?: string;
}): Promise<MCPConversation[]> {
  try {
    return await mcpClient.searchConversations(params);
  } catch (error) {
    return [];
  }
}


export async function checkMCPStatus(): Promise<boolean> {
  return mcpClient.checkMCPHealth();
}


export async function getMyAgentStats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return null;
  }

  try {
    return await mcpClient.getAgentStats(agent.email);
  } catch (error) {
    return null;
  }
}

export async function updateAgentAvailability(isAvailable: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { error } = await supabase
    .from("agents")
    .update({
      is_available: isAvailable,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Error al actualizar disponibilidad" };
  }

  return { success: true };
}


export async function getUnreadNotifications() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("agent_notifications")
    .select("*")
    .eq("agent_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return data || [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { error } = await supabase
    .from("agent_notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("agent_id", user.id);

  if (error) {
    return { error: "Error al marcar notificación" };
  }

  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { error } = await supabase
    .from("agent_notifications")
    .update({ is_read: true })
    .eq("agent_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { error: "Error al marcar notificaciones" };
  }

  return { success: true };
}

export async function sendMessage(sessionId: string, content: string) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return { error: "No autenticado" };
  }

  try {
    const supabase = await createClient();
    
    // Buscar UUID de la conversación
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    if (!conv) return { error: "Conversación no encontrada" };

    const { error } = await supabase
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: "agent",
        content: content,
        author_name: agent.name || agent.email
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("[SEND_MESSAGE_ERROR]", error);
    return { error: "Error al enviar el mensaje" };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { mcpClient } from "../mcp-client";
import { createTicket as createGlpiTicket } from "../glpi";
import type { MCPConversation, MCPChatMessage, MCPListConversationsResponse } from "../../types/mcp";
import type { AgentRole } from "../auth/permissions";

async function getCurrentAgent(): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: AgentRole;
} | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Intentar por ID (UUID de Auth)
  const { data: agentById } = await supabase
    .from("agents")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (agentById) return agentById;

  // 2. Intentar por Email (Respaldo por si el ID no coincide)
  if (user.email) {
    const { data: agentByEmail } = await supabase
      .from("agents")
      .select("id, email, name, role")
      .eq("email", user.email)
      .maybeSingle();
      
    return agentByEmail;
  }

  return null;
}

function filterConversationsByPermissions(
  conversations: MCPConversation[],
  agentEmail?: string,
  role?: AgentRole
): MCPConversation[] {
  // Si no hay correo o rol (no se detectó agente), permitimos ver todo por ahora
  if (!agentEmail || !role) return conversations;
  
  // En el futuro aquí irían reglas granulares por departamento/rol
  return conversations;
}


export async function getConversations(
  status?: string | string[],
  includeAll?: boolean
): Promise<MCPConversation[]> {
  try {
    const agent = await getCurrentAgent();
    
    // Ya no bloqueamos la carga de datos si no hay agente
    const response = await mcpClient.listConversations({
      status,
      includeAll: includeAll || false,
      pageSize: 100,
    });

    const filteredConversations = filterConversationsByPermissions(
      response.conversations,
      agent?.email,
      agent?.role
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
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
    const conversation = await getConversationBySessionId(sessionId);
    let glpiTicketId: number | undefined;

    if (options?.createTicket !== false && conversation) {
      const clientName = conversation.client?.name || "Cliente";
      const contract = conversation.client?.contract || "S/N";
      const reason = options?.reason || "Especialista toma control";

      const glpiResult = await createGlpiTicket({
        name: `Toma de control - Contrato ${contract} - ${clientName}`,
        content: options?.ticketSummary || `Observación: ${reason}\n\nCliente: ${clientName}\nContrato: ${contract}\nEspecialista: ${agent.name || agent.email}`,
        urgency: options?.urgency || 3,
      });

      if (glpiResult.success) {
        glpiTicketId = glpiResult.ticketId;
      }
    }

    const result = await mcpClient.takeoverConversation(
      sessionId,
      agent?.email || "agente@sisprot.com",
      agent?.name || agent?.email || "Agente",
      {
        ...options,
        glpiTicketId, // Pasar el ID del ticket si se creó
      }
    );

    // Actualizar ticket ID en Supabase si se creó
    if (glpiTicketId) {
      const supabase = await createClient();
      await supabase
        .from("conversations")
        .update({ glpi_ticket_id: glpiTicketId.toString() })
        .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);
    }

    if (agent) {
      const supabase = await createClient();
      await supabase
        .from("agents")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", agent.id);
    }

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId: glpiTicketId || result.glpiTicketId };
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
    const conversation = await getConversationBySessionId(sessionId);
    let glpiTicketId: number | undefined;

    if (options?.createTicket !== false && conversation) {
      const clientName = conversation.client?.name || "Cliente";
      const contract = conversation.client?.contract || "S/N";

      const glpiResult = await createGlpiTicket({
        name: `Pausa - Contrato ${contract} - ${clientName}`,
        content: options?.ticketSummary || `Motivo de pausa: ${reason}\n\nCliente: ${clientName}\nContrato: ${contract}\nEspecialista: ${agent.name || agent.email}`,
        urgency: options?.urgency || 3,
      });

      if (glpiResult.success) {
        glpiTicketId = glpiResult.ticketId;
      }
    }

    await mcpClient.pauseConversation(sessionId, reason, {
      ...options,
      specialistName: agent.name || undefined,
      specialistEmail: agent.email,
    });

    const supabase = await createClient();
    const updateData: any = { 
      status: "paused",
      last_active_at: new Date().toISOString() 
    };
    if (glpiTicketId) updateData.glpi_ticket_id = glpiTicketId.toString();

    await supabase
      .from("conversations")
      .update(updateData)
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

    await supabase
      .from("agents")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", agent.id);

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId };
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
    const conversation = await getConversationBySessionId(sessionId);
    let glpiTicketId: number | undefined;

    // Solo crear si no tiene ya un ticket previo
    if (options?.createTicket !== false && conversation && !conversation.glpiTicketId) {
      const clientName = conversation.client?.name || "Cliente";
      const contract = conversation.client?.contract || "S/N";

      const glpiResult = await createGlpiTicket({
        name: `Resolución - Contrato ${contract} - ${clientName}`,
        content: options?.ticketSummary || `Resolución: ${resolution}\n\nCliente: ${clientName}\nContrato: ${contract}\nEspecialista: ${agent.name || agent.email}`,
        urgency: 3,
      });

      if (glpiResult.success) {
        glpiTicketId = glpiResult.ticketId;
      }
    }

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
    const updateData: any = { 
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (glpiTicketId) updateData.glpi_ticket_id = glpiTicketId.toString();

    await supabase
      .from("conversations")
      .update(updateData)
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

    await supabase
      .from("agents")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", agent.id);

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId };
  } catch (error) {
    return { error: "Error al cerrar la conversación" };
  }
}

export async function getConversationStats() {
  try {
    const stats = await mcpClient.getConversationStats();

    return {
      active: stats.active,
      waitingAgent: stats.waiting_agent,
      handedOver: stats.handed_over,
      closed: stats.closed,
      total: stats.total,
    };
  } catch (error) {
    return {
      active: 0,
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

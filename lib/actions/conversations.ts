"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { mcpClient } from "../mcp-client";
import { createTicket as createGlpiTicket, USUARIOS_GLPI, CATEGORIAS_TI_GLPI } from "../glpi";
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
    
    if (!user) return null;

    // Búsqueda directa en Supabase (Función Local)
    const { data: conv, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    if (error || !conv) return null;

    // Mapeo robusto (Fallback para teléfono y nombre)
    const metadata = (conv.metadata || {}) as any;
    const phone = conv.contact_phone || metadata.phone || metadata.tel || null;
    const email = conv.contact_email || metadata.email || null;
    const name = conv.contact_name || conv.name || metadata.name || conv.identification || "Cliente";

    return {
      id: conv.id,
      sessionId: conv.session_id || conv.id,
      status: conv.status as any,
      summary: conv.summary || null,
      client: {
        name,
        identification: conv.identification || null,
        contract: conv.contract || null,
        email,
        phone,
      },
      timestamps: {
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        escalatedAt: conv.escalated_at || conv.updated_at,
        closedAt: conv.closed_at || null,
      },
      agent: conv.specialist_name ? {
        email: conv.agent_email || conv.specialist_name,
        name: conv.specialist_name,
        takenAt: conv.updated_at,
      } : undefined,
      glpiTicketId: conv.glpi_ticket_id || null,
      closedBy: conv.closed_by || null,
      metadata: conv.metadata || {},
      isUrgent: conv.priority === "high" || conv.priority === "critical",
    } as MCPConversation;
  } catch (error) {
    console.error("[GET_CONV_ERROR]", error);
    return null;
  }
}

export async function getChatHistory(
  sessionId: string,
  limit?: number
): Promise<MCPChatMessage[]> {
  try {
    const supabase = await createClient();
    
    // 1. Intentamos encontrar la conversación por session_id o por ID (UUID)
    const { data: currentConv } = await supabase
      .from("conversations")
      .select("id, identification")
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    let conversationIds: string[] = [];
    
    if (currentConv) {
      conversationIds.push(currentConv.id);
      
      // 2. Si tiene identificación (DNI/RUC), buscamos TODAS las sesiones de ese cliente
      if (currentConv.identification) {
        const { data: relatedConvs } = await supabase
          .from("conversations")
          .select("id")
          .eq("identification", currentConv.identification);
        
        if (relatedConvs && relatedConvs.length > 0) {
          const ids = relatedConvs.map(c => c.id);
          conversationIds = Array.from(new Set([...conversationIds, ...ids]));
        }
      }
    } else {
      // Fallback: tratar el sessionId como el ID de conversación si no hay registro previo
      conversationIds = [sessionId];
    }

    // 3. Consulta unificada a chat_logs para todos los IDs asociados
    const { data, error } = await supabase
      .from("chat_logs")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true })
      .limit(limit || 200);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      role: (row.role === "model" || row.role === "assistant") ? "assistant" : row.role,
      content: row.content,
      createdAt: row.created_at,
      toolName: row.tool_name,
      metadata: {
        attachments: row.attachments
      }
    })) as MCPChatMessage[];
  } catch (error) {
    console.error("[GET_HISTORY_ERROR]", error);
    return [];
  }
}

/**
 * Prepara los datos del ticket para GLPI basándose en la conversación
 */
function prepareGlpiTicketData(conversation: MCPConversation, agentName: string | null, customObservation?: string) {
  const client = conversation.client;
  const metadata = (conversation.metadata || {}) as any;
  const summary = customObservation || conversation.summary || "Sin resumen disponible";

  // Mapeo de usuario GLPI
  const requesterId = agentName ? USUARIOS_GLPI[agentName] || 19 : 19;

  // Detección básica de categoría
  let categoryId = 1; // Administrativo por defecto
  let urgency = 5;

  for (const [key, val] of Object.entries(CATEGORIAS_TI_GLPI)) {
    if (summary.toLowerCase().includes(key.toLowerCase())) {
      categoryId = val.id;
      urgency = val.urgency;
      break;
    }
  }

  // Formateo del contenido
  const content = `Observacion: ${summary}

Sector: ${metadata.sector || 'Consultar en Pay Fast'}
Cliente: ${client?.name || 'N/A'}
N° de contrato: ${client?.contract || 'N/A'}
IP Actual: ${metadata.ip_actual || 'Consultar en Pay Fast'}
Teléfono: ${client?.phone || 'N/A'}
VLAN Actual: ${metadata.vlan_actual || 'Consultar en Pay Fast'}
Serial GPON: ${metadata.serial_gpon || 'Consultar en Pay Fast'}
Plan Contratado: ${metadata.plan_contratado || 'Consultar en Pay Fast'}

Potencia Leida: 0
Potencia Calculada: 0

Dirección: ${metadata.direccion || 'Consultar en Pay Fast'}
Ubicación: ${metadata.ubicacion_url || 'N/A'}`;

  const firstLine = summary.split('\n')[0];
  const ticketName = `${firstLine.substring(0, 40)} - Contrato ${client?.contract || 'S/N'} - ${client?.name || 'Cliente'}`;

  return {
    name: ticketName,
    content,
    itilcategories_id: categoryId,
    urgency,
    _users_id_requester: requesterId
  };
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
      const ticketData = prepareGlpiTicketData(conversation, agent.name, options?.reason);
      
      const glpiResult = await createGlpiTicket({
        ...ticketData,
        // Permitir sobrescribir opcionalmente desde las opciones
        urgency: options?.urgency || ticketData.urgency,
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
      const ticketData = prepareGlpiTicketData(conversation, agent.name, `Pausa: ${reason}`);

      const glpiResult = await createGlpiTicket({
        ...ticketData,
        urgency: options?.urgency || ticketData.urgency,
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
      const ticketData = prepareGlpiTicketData(conversation, agent.name, `Resuelto: ${resolution}`);

      const glpiResult = await createGlpiTicket(ticketData);

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

/**
 * Busca la conversación activa en el sistema Pay-Fast para un cliente.
 */
export async function getPayFastConversation(identification: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("conversations")
    .select("id, session_id, status, updated_at")
    .eq("identification", identification)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: "Error al buscar sesión de Pay-Fast" };
  return { success: true, conversation: data };
}

/**
 * Envía un mensaje como especialista a una conversación de Pay-Fast.
 */
export async function sendPayFastBridgeMessage(conversationId: string, content: string) {
  const agent = await getCurrentAgent();
  if (!agent) return { error: "No autenticado" };

  const supabase = await createClient();
  
  const { error } = await supabase
    .from("chat_logs")
    .insert({
      conversation_id: conversationId,
      role: "model", // En Pay-Fast, el rol del agente se ve como 'model' (asistente) para el cliente
      content: content,
      author_name: agent.name || agent.email
    });

  if (error) return { error: "Error al enviar el mensaje" };
  
  // Actualizar status de la conversación para que el asistente no responda automáticamente
  await supabase
    .from("conversations")
    .update({ status: "handed_over", updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { success: true };
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

import { evolutionService } from "../services/evolution";

export async function sendMessage(sessionId: string, content: string) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return { error: "No autenticado" };
  }

  try {
    const supabase = await createClient();
    
    // Buscar UUID de la conversación y toda la información necesaria
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    if (!conv) return { error: "Conversación no encontrada" };

    // Mapeo robusto del teléfono (local)
    const metadata = (conv.metadata || {}) as any;
    const phone = conv.contact_phone || metadata.phone || metadata.tel || null;

    // Intentar enviar por WhatsApp si hay un teléfono disponible
    let whatsappResult = null;
    if (phone) {
      whatsappResult = await evolutionService.sendWhatsAppMessage(phone, content);
      
      if (!whatsappResult.success) {
        console.warn('[WHATSAPP_SEND_FAILURE]', whatsappResult.error);
      }
    } else {
      console.warn('[WHATSAPP_SEND_SKIP] No phone number available for conversation', sessionId);
    }

    const { error } = await supabase
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: "agent",
        content: content,
        author_name: agent.name || agent.email,
        attachments: {
          whatsapp_sent: whatsappResult?.success || false,
          whatsapp_error: whatsappResult?.error || null,
          delivered_at: whatsappResult?.success ? new Date().toISOString() : null
        }
      });

    if (error) throw error;

    // Si falló el envío de WhatsApp, informamos pero el mensaje quedó guardado en el dashboard
    if (whatsappResult && !whatsappResult.success) {
      return { 
        success: true, 
        warning: `El mensaje se guardó pero no se pudo enviar por WhatsApp: ${whatsappResult.error}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[SEND_MESSAGE_ERROR]", error);
    return { error: "Error al enviar el mensaje" };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { supabaseAdmin } from "../supabase/service-role";
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


function mapSupabaseToMCPConversation(conv: any): MCPConversation {
  const metadata = (conv.metadata || {}) as any;
  const phone = conv.contact_phone || metadata.phone || metadata.tel || null;
  const email = conv.contact_email || metadata.email || null;
  const name = conv.contact_name || conv.name || metadata.name || conv.identification || "Cliente";

  return {
    id: conv.id,
    sessionId: conv.session_id || conv.id,
    status: conv.status as any,
    summary: conv.summary || null,
    messageCount: 0, // Se puede hidratar luego si es necesario
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
  };
}

export async function getConversations(
  status?: string | string[],
  includeAll?: boolean
): Promise<MCPConversation[]> {
  try {
    const agent = await getCurrentAgent();
    
    let query = supabaseAdmin
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (status) {
      if (Array.isArray(status)) {
        query = query.in("status", status);
      } else {
        query = query.eq("status", status);
      }
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error("[GET_CONVERSATIONS_ERROR]", error);
      return [];
    }

    const filteredConversations = filterConversationsByPermissions(
      (data || []).map(mapSupabaseToMCPConversation),
      agent?.email,
      agent?.role
    );

    return filteredConversations;
  } catch (error) {
    console.error("[GET_CONVERSATIONS_CRITICAL]", error);
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
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("conversations")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (params.status) {
      if (Array.isArray(params.status)) {
        query = query.in("status", params.status);
      } else {
        query = query.eq("status", params.status);
      }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("[GET_CONVERSATIONS_PAGINATED_ERROR]", error);
      throw error;
    }

    const mcpConvs = (data || []).map(mapSupabaseToMCPConversation);
    const filteredConversations = filterConversationsByPermissions(
      mcpConvs,
      agent?.email,
      agent?.role
    );

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      conversations: filteredConversations,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: { 
        status: params.status,
        includeAll: params.includeAll || false 
      },
    };
  } catch (error) {
    console.error("[GET_CONVERSATIONS_PAGINATED_CRITICAL]", error);
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
    if (!sessionId) return [];

    // 1. Identificar la conversación y el cliente asociado
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, session_id, identification")
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle();

    if (convError) {
      console.error("[GET_HISTORY_QUERY_ERROR]", convError);
    }

    let conversationIds: string[] = [sessionId];
    let identification: string | null = null;

    if (conv) {
      conversationIds = [conv.id];
      if (conv.session_id) conversationIds.push(conv.session_id);
      identification = conv.identification;
    }

    // 2. Si hay identificación (DNI/RUC), buscar TODAS las sesiones de este cliente
    // Esto permite ver el historial unificado de múltiples chats del mismo usuario
    if (identification) {
      const { data: allSessions } = await supabaseAdmin
        .from("conversations")
        .select("id, session_id")
        .eq("identification", identification);
      
      if (allSessions) {
        allSessions.forEach(s => {
          conversationIds.push(s.id);
          if (s.session_id) conversationIds.push(s.session_id);
        });
      }
    }

    // Limpiamos y preparamos los IDs para la consulta final
    const uniqueIds = Array.from(new Set(conversationIds.filter(Boolean)));

    // 3. Recuperar logs (Bypass RLS para asegurar visibilidad total en Handover)
    // Buscamos mensajes asociados a cualquiera de los IDs vinculados (UUID o String)
    const { data, error } = await supabaseAdmin
      .from("chat_logs")
      .select("*")
      .in("conversation_id", uniqueIds)
      .order("created_at", { ascending: true })
      .limit(limit || 250);

    if (error) {
      console.error("[GET_CHAT_LOGS_ERROR]", error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      role: (row.role === "model" || row.role === "assistant") ? "assistant" : row.role,
      content: row.content,
      createdAt: row.created_at,
      authorName: row.author_name,
      toolName: row.tool_name,
      metadata: {
        attachments: row.attachments,
        ...(row.metadata || {})
      }
    })) as MCPChatMessage[];
  } catch (error) {
    console.error("[GET_HISTORY_CRITICAL_ERROR]", error);
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
        urgency: options?.urgency || ticketData.urgency,
      });

      if (glpiResult.success) {
        glpiTicketId = glpiResult.ticketId;
      }
    }

    // ACTUALIZACIÓN DIRECTA EN SUPABASE
    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        status: "handed_over",
        specialist_name: agent.name || agent.email,
        agent_email: agent.email,
        glpi_ticket_id: glpiTicketId ? glpiTicketId.toString() : conversation?.glpiTicketId?.toString(),
        updated_at: new Date().toISOString(),
      })
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

    if (updateError) throw updateError;

    if (agent) {
      await supabaseAdmin
        .from("agents")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", agent.id);
    }

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId };
  } catch (error) {
    console.error("[TAKEOVER_ERROR]", error);
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

    // ACTUALIZACIÓN DIRECTA EN SUPABASE
    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({ 
        status: "paused",
        updated_at: new Date().toISOString(),
        glpi_ticket_id: glpiTicketId ? glpiTicketId.toString() : conversation?.glpiTicketId?.toString(),
      })
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

    if (updateError) throw updateError;

    await supabaseAdmin
      .from("agents")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", agent.id);

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId };
  } catch (error) {
    console.error("[PAUSE_ERROR]", error);
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

    if (options?.createTicket !== false && conversation && !conversation.glpiTicketId) {
      const ticketData = prepareGlpiTicketData(conversation, agent.name, `Resuelto: ${resolution}`);
      const glpiResult = await createGlpiTicket(ticketData);
      if (glpiResult.success) glpiTicketId = glpiResult.ticketId;
    }

    // ACTUALIZACIÓN DIRECTA EN SUPABASE
    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({ 
        status: "closed",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        closed_by: options?.closedBy ?? "agent",
        glpi_ticket_id: glpiTicketId ? glpiTicketId.toString() : conversation?.glpiTicketId?.toString(),
      })
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`);

    if (updateError) throw updateError;

    await supabaseAdmin
      .from("agents")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", agent.id);

    revalidatePath("/dashboard/conversations");
    return { success: true, glpiTicketId };
  } catch (error) {
    console.error("[CLOSE_ERROR]", error);
    return { error: "Error al cerrar la conversación" };
  }
}

export async function getConversationStats() {
  try {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("status");

    if (error) throw error;

    const stats = {
      active: 0,
      waitingAgent: 0,
      handedOver: 0,
      closed: 0,
      total: data?.length || 0,
    };

    data?.forEach((conv) => {
      if (conv.status === "active") stats.active++;
      if (conv.status === "waiting_specialist" || conv.status === "waiting_agent") stats.waitingAgent++;
      if (conv.status === "handed_over") stats.handedOver++;
      if (conv.status === "closed") stats.closed++;
    });

    return stats;
  } catch (error) {
    console.error("[GET_CONV_STATS_ERROR]", error);
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
    let query = supabaseAdmin
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (params.identification) {
      query = query.ilike("identification", `%${params.identification}%`);
    }
    if (params.contract) {
      query = query.ilike("contract", `%${params.contract}%`);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;

    return (data || []).map(mapSupabaseToMCPConversation);
  } catch (error) {
    console.error("[SEARCH_CONVERSATIONS_ERROR]", error);
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
  // Siempre retornamos true si decidimos ignorar MCP y usar Supabase directamente
  return true;
}


export async function getMyAgentStats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const { data: agent } = await supabase
      .from("agents")
      .select("email, name")
      .eq("id", user.id)
      .single();

    if (!agent) return null;

    // Obtener estadísticas reales de Supabase
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("status")
      .eq("agent_email", agent.email);

    const stats = {
      agentEmail: agent.email,
      totalConversations: conversations?.length || 0,
      activeConversations: conversations?.filter(c => c.status === 'handed_over').length || 0,
      closedConversations: conversations?.filter(c => c.status === 'closed').length || 0,
      pendingConversations: conversations?.filter(c => c.status === 'waiting_specialist').length || 0,
      avgClosureTimeMinutes: null,
      lastTakenAt: null,
    };

    return stats;
  } catch (error) {
    console.error("[GET_MY_AGENT_STATS_ERROR]", error);
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

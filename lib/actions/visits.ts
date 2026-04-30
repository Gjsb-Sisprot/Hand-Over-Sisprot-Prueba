"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../supabase/service-role";
import { createClient } from "../supabase/server";

export type SupportVisit = {
  id: string;
  client_name: string;
  client_identification: string;
  contract_number: string | null;
  visit_date: string;
  reason: string;
  technician_id: string | null;
  technician_id_2: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'confirmed' | 'rescheduled';
  category: 'support' | 'administration';
  team: 'Equipo A' | 'Equipo B' | null;
  agent_id: string | null;
  conversation_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  technicians?: {
    name: string;
  };
  technician_2?: {
    name: string;
  };
};

export type Technician = {
  id: string;
  name: string;
  area: string | null;
  specialty: 'Equipo A' | 'Equipo B' | 'Ambos' | null;
  avatar_url: string | null;
  is_active: boolean;
};

export async function getTechnicians(): Promise<Technician[]> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("technicians")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[GET_TECHNICIANS_ERROR]", error);
    return [];
  }
}

export async function getVisits(startDate: string, endDate: string, category?: 'support' | 'administration', team?: 'Equipo A' | 'Equipo B'): Promise<SupportVisit[]> {
  try {
    let query = (supabaseAdmin as any)
      .from("support_visits")
      .select("*, technicians(name)")
      .gte("visit_date", startDate)
      .lte("visit_date", endDate);

    if (category) {
      query = query.eq("category", category);
    }

    if (team) {
      query = query.eq("team", team);
    }

    const { data, error } = await query.order("visit_date", { ascending: true });

    if (error) throw error;
    return (data || []) as any;
  } catch (error) {
    console.error("[GET_VISITS_ERROR]", error);
    return [];
  }
}

export async function createVisit(visitData: Partial<SupportVisit>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Validar disponibilidad
    if (visitData.visit_date) {
      const isAvailable = await checkAvailability(visitData.visit_date);
      if (!isAvailable) {
        return { data: null, error: "Este horario ya está ocupado. Por favor selecciona otra hora." };
      }
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("support_visits")
      .insert([{
        ...visitData,
        agent_id: user?.id
      }])
      .select("*, technicians(name)")
      .single();

    if (error) throw error;
    
    // Notificar a n8n
    if (data) {
      await notifyN8N(data);
    }

    revalidatePath("/dashboard/calendar");
    return { data, error: null };
  } catch (error: any) {
    console.error("[CREATE_VISIT_ERROR]", error);
    return { data: null, error: error.message };
  }
}

/**
 * Crea una visita técnica desde el flujo de la IA (Susana)
 */
export async function createVisitFromAI(params: {
  sessionId: string;
  visitDate: string;
  reason: string;
}) {
  try {
    // 1. Buscar la conversación para obtener los datos del cliente utilizando privilegios de admin
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, glpi_ticket_id, contact_name, identification, contract, name")
      .or(`session_id.eq.${params.sessionId},id.eq.${params.sessionId}`)
      .maybeSingle();

    if (convError || !conv) {
      throw new Error(`No se pudo encontrar la conversación ${params.sessionId}`);
    }

    const clientName = conv.contact_name || conv.name || "Cliente AI";

    // 2. Insertar directamente usando supabaseAdmin para evitar checks de RLS de usuario
    const { data, error } = await (supabaseAdmin as any)
      .from("support_visits")
      .insert([{
        client_name: clientName,
        client_identification: conv.identification || "",
        contract_number: conv.contract || "",
        visit_date: params.visitDate,
        reason: params.reason || "Agendado por Susana AI",
        status: "scheduled",
        category: "support",
        metadata: {
          glpi_ticket_id: conv.glpi_ticket_id || conv.id,
          source: "susana_ai"
        },
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // 🚀 NOTIFICACIÓN: Enviar confirmación a n8n para avisar al cliente
    try {
      await notifyN8N(data as any);
    } catch (err) {
      console.error("[NOTIFY_N8N_ERROR]", err);
    }

    return { success: true, visitId: data.id };
  } catch (error: any) {
    console.error("[CREATE_VISIT_FROM_AI_ERROR]", error);
    return { success: false, error: error.message };
  }
}

export async function updateVisit(id: string, visitData: Partial<SupportVisit>) {
  try {
    // Validar disponibilidad si se está cambiando la fecha
    if (visitData.visit_date) {
      const isAvailable = await checkAvailability(visitData.visit_date, id);
      if (!isAvailable) {
        return { data: null, error: "Este horario ya está ocupado. Por favor selecciona otra hora." };
      }
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("support_visits")
      .update({
        ...visitData,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*, technicians(name)")
      .single();

    if (error) throw error;
    
    // Notificar a n8n si el estado es confirmado o si hay cambios relevantes
    if (data) {
      await notifyN8N(data);
    }

    revalidatePath("/dashboard/calendar");
    return { data, error: null };
  } catch (error: any) {
    console.error("[UPDATE_VISIT_ERROR]", error);
    return { data: null, error: error.message };
  }
}

export async function deleteVisit(id: string) {
  try {
    const { error } = await (supabaseAdmin as any)
      .from("support_visits")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    revalidatePath("/dashboard/calendar");
    return { error: null };
  } catch (error: any) {
    console.error("[DELETE_VISIT_ERROR]", error);
    return { error: error.message };
  }
}

export async function getVisitByTicketId(ticketId: string) {
  try {
    console.log(`[GET_VISIT] Buscando ticket: ${ticketId}`);
    
    // 1. Intentar buscar por metadata->>glpi_ticket_id (Texto)
    const { data: byMetadata, error: error1 } = await (supabaseAdmin as any)
      .from("support_visits")
      .select("*, technicians(name)")
      .filter("metadata->>glpi_ticket_id", "eq", ticketId)
      .maybeSingle();

    if (byMetadata) return byMetadata as SupportVisit;

    // 2. Intentar buscar por ID de Supabase (si es UUID)
    if (ticketId.length > 30) {
      const { data: byId, error: error2 } = await (supabaseAdmin as any)
        .from("support_visits")
        .select("*, technicians(name)")
        .eq("id", ticketId)
        .maybeSingle();
      
      if (byId) return byId as SupportVisit;
    }

    // 3. Fallback: buscar por contract_number
    const { data: byContract, error: error3 } = await (supabaseAdmin as any)
      .from("support_visits")
      .select("*, technicians(name)")
      .eq("contract_number", ticketId)
      .maybeSingle();

    if (byContract) return byContract as SupportVisit;

    // 4. Búsqueda profunda en metadata por si el ticket está en otro campo
    // Esto es más lento pero útil como último recurso
    const { data: allVisits } = await (supabaseAdmin as any)
      .from("support_visits")
      .select("*, technicians(name)")
      .limit(100);
    
    const deepSearch = (allVisits || []).find((v: any) => 
      v.metadata?.glpi_ticket_id?.toString() === ticketId || 
      v.metadata?.ticket_id?.toString() === ticketId ||
      v.metadata?.id?.toString() === ticketId
    );

    return deepSearch as SupportVisit || null;
  } catch (error) {
    console.error("[GET_VISIT_BY_TICKET_ERROR]", error);
    return null;
  }
}

/**
 * Función auxiliar para notificar a n8n
 */
async function notifyN8N(visit: SupportVisit) {
  try {
    const ticketId = visit.metadata?.glpi_ticket_id || visit.id;
    
    // Obtener nombres de técnicos de forma manual para el payload
    const { data: techs } = await (supabaseAdmin as any)
      .from("technicians")
      .select("name")
      .in("id", [visit.technician_id, visit.technician_id_2].filter(Boolean));
    
    const nombresTecnicos = techs?.map((t: any) => t.name).join(" y ") || "Por asignar";

    await fetch("https://n8n.sisprottaurus.com/webhook/envio_confirmacion_visita_tecnica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_tickect: ticketId,
        contrato: visit.contract_number || "N/A",
        fecha: visit.visit_date.split('T')[0],
        hora: visit.visit_date.split('T')[1]?.substring(0, 5) || "Pendiente",
        motivo: visit.reason || "Agendado vía Dashboard",
        tecnico: nombresTecnicos,
        estado: visit.status
      })
    });
  } catch (err) {
    console.error("[NOTIFY_N8N_ERROR]", err);
  }
}

/**
 * Verifica si un horario está disponible
 */
async function checkAvailability(visitDate: string, excludeId?: string): Promise<boolean> {
  try {
    let query = (supabaseAdmin as any)
      .from("support_visits")
      .select("id")
      .eq("visit_date", visitDate)
      .neq("status", "cancelled");

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Si hay algún registro a la misma hora que no esté cancelado, no está disponible
    return (data || []).length === 0;
  } catch (error) {
    console.error("[CHECK_AVAILABILITY_ERROR]", error);
    return true; // En caso de error, permitimos para no bloquear, pero logueamos
  }
}

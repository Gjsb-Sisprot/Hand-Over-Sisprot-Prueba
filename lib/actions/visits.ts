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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'confirmed' | 'rescheduled';
  category: 'support' | 'administration';
  agent_id: string | null;
  conversation_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  technicians?: {
    name: string;
  };
};

export type Technician = {
  id: string;
  name: string;
  area: string | null;
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

export async function getVisits(startDate: string, endDate: string, category?: 'support' | 'administration'): Promise<SupportVisit[]> {
  try {
    let query = (supabaseAdmin as any)
      .from("support_visits")
      .select("*, technicians(name)")
      .gte("visit_date", startDate)
      .lte("visit_date", endDate);

    if (category) {
      query = query.eq("category", category);
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

    const { data, error } = await (supabaseAdmin as any)
      .from("support_visits")
      .insert([{
        ...visitData,
        agent_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    
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
      await fetch("https://n8n.sisprottaurus.com/webhook/envio_confirmacion_visita_tecnica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_tickect: conv.glpi_ticket_id || conv.id,
          contrato: conv.contract || "N/A",
          fecha: params.visitDate.split('T')[0],
          hora: params.visitDate.split('T')[1]?.substring(0, 5) || "Pendiente",
          motivo: params.reason || "Agendado vía Dashboard"
        })
      });
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
    const { data, error } = await (supabaseAdmin as any)
      .from("support_visits")
      .update({
        ...visitData,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
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

/**
 * Busca una visita técnica por el ID del ticket de GLPI guardado en metadata
 */
export async function getVisitByTicketId(ticketId: string) {
  try {
    // Buscamos en la tabla support_visits donde metadata contenga el glpi_ticket_id
    const { data, error } = await supabaseAdmin
      .from("support_visits")
      .select("*, technicians(name)")
      .filter("metadata->>glpi_ticket_id", "eq", ticketId)
      .maybeSingle();

    if (error) throw error;
    return data as SupportVisit | null;
  } catch (error) {
    console.error("[GET_VISIT_BY_TICKET_ERROR]", error);
    return null;
  }
}

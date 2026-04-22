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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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

export async function getVisits(startDate: string, endDate: string): Promise<SupportVisit[]> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("support_visits")
      .select("*, technicians(name)")
      .gte("visit_date", startDate)
      .lte("visit_date", endDate)
      .order("visit_date", { ascending: true });

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

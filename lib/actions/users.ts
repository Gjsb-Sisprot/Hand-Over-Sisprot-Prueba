"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data;
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("agents")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  
  // Nota: Esto solo borra de la tabla agents. 
  // Para borrar el auth de Supabase, necesitaríamos service_role key.
  const { error } = await supabase
    .from("agents")
    .delete()
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

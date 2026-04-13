import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

// Logs de seguridad para depuración en Vercel (solo prefijos)
if (process.env.NODE_ENV === 'production') {
  console.log("[AUTH_DEBUG] Supabase URL:", supabaseUrl.substring(0, 15) + "...");
  console.log("[AUTH_DEBUG] Service Role Key starts with:", supabaseServiceRoleKey.substring(0, 10));
}

// Único cliente administrativo para el servidor (Bypass RLS)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

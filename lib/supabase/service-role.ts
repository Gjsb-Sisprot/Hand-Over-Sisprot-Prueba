import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// CONFIGURACIÓN HARDCODED PARA BYPASS TOTAL DE VERCEL
const supabaseUrl = "https://mkluqieffbwelhkxbovk.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbHVxaWVmZmJ3ZWxoa3hib3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgwMjU2MywiZXhwIjoyMDgzMzc4NTYzfQ.GgZfYL4w2gJggzUZmLhO4ifN3Qbnga4yuLqmx6ygITs";

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

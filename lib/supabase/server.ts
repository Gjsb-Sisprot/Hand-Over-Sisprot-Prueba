import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    "https://mkluqieffbwelhkxbovk.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbHVxaWVmZmJ3ZWxoa3hib3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDI1NjMsImV4cCI6MjA4MzM3ODU2M30.Mb_H5skSS6QcUz5vKi23AG7PZDamjwUia7fLugtnu_8",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any) {
          try {
            cookiesToSet.forEach((cookie: any) =>
              cookieStore.set(cookie.name, cookie.value, cookie.options)
            );
          } catch {
          }
        },
      },
    }
  );
}

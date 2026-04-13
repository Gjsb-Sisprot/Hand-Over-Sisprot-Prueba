import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = "https://mkluqieffbwelhkxbovk.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbHVxaWVmZmJ3ZWxoa3hib3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgwMjU2MywiZXhwIjoyMDgzMzc4NTYzfQ.GgZfYL4w2gJggzUZmLhO4ifN3Qbnga4yuLqmx6ygITs";
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('status');

    if (error) throw error;

    return NextResponse.json({
      active: data.filter((c: any) => c.status === "active").length,
      waitingAgent: data.filter((c: any) => c.status === "waiting_specialist").length,
      handedOver: data.filter((c: any) => c.status === "handed_over").length,
      closed: data.filter((c: any) => c.status === "closed").length,
      total: data.length
    });
  } catch (error: any) {
    return NextResponse.json({
      active: 0, waitingAgent: 0, handedOver: 0, closed: 0, total: 0,
      error: error.message
    });
  }
}

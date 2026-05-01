import { createClient } from "@/lib/supabase/server";
import { DashboardStats } from "@/components/dashboard/stats";
import { AgentStatsCard } from "@/components/dashboard/agent-stats-card";
import {
  getConversationStats,
  getConversations,
  getMyAgentStats,
} from "@/lib/actions/conversations";
import { DashboardHeader } from "@/components/dashboard/header";

import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: agent } = (await supabase
    .from("agents")
    .select("*")
    .eq("id", user?.id || "")
    .single()) as { data: any };
    
  if (agent?.role === "agent") {
    redirect("/dashboard/calendar");
  } else if (agent?.role === "operador") {
    redirect("/dashboard/conversations");
  }

  const [stats, conversations, agentStats] = await Promise.all([
    getConversationStats(),
    getConversations(),
    getMyAgentStats(),
  ]);

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto relative">
      {/* Watermark Logo sutil */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.04] overflow-hidden">
        <img 
          src="/logo.png" 
          alt="Watermark" 
          className="w-[500px] md:w-[800px] h-auto grayscale brightness-0 invert dark:invert-0" 
        />
      </div>

      <div className="relative z-10 flex flex-col w-full">
        <DashboardHeader agent={agent} />
        <div className="container mx-auto p-6 space-y-6">
        {}
        {agentStats && (
          <div>
            <h2 className="text-lg font-semibold text-muted-foreground mb-4">Mi Rendimiento</h2>
            <AgentStatsCard stats={agentStats} />
          </div>
        )}

        {}
        <DashboardStats
          agent={agent}
          stats={stats}
          pendingConversations={conversations}
        />
      </div>
    </div>
  </div>
  );
}


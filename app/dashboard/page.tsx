import { DashboardHeader } from "@/components/dashboard/header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", user?.id || "")
    .single();

  const [stats, conversations, agentStats] = await Promise.all([
    getConversationStats(),
    getConversations(),
    getMyAgentStats(),
  ]);

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
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
  );
}

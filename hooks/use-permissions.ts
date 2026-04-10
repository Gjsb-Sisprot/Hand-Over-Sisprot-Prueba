
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentRole } from "@/lib/auth/permissions";
import {
  hasPermission,
  canViewAllConversations,
  canTakeoverConversation,
  canPauseConversation,
  canCloseConversation,
  canSendMessage,
  canViewConversation,
  type Permission,
} from "@/lib/auth/permissions";

interface Agent {
  id: string;
  email: string;
  name: string | null;
  role: AgentRole;
}

export function usePermissions() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgent() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: agentData } = await supabase
        .from("agents")
        .select("id, email, name, role")
        .eq("id", user.id)
        .single();

      if (agentData) {
        setAgent(agentData);
      }

      setLoading(false);
    }

    loadAgent();
  }, []);

  const role: AgentRole = agent?.role || "agent";
  const email = agent?.email || "";

  return {
    agent,
    loading,
    role,
    email,

    isAdmin: role === "admin",
    isSupervisor: role === "supervisor",
    isAgent: role === "agent",

    can: (permission: Permission) => hasPermission(role, permission),

    canViewAll: canViewAllConversations(role),
    canTakeover: canTakeoverConversation(role),
    canPause: canPauseConversation(role),
    canClose: canCloseConversation(role),
    canSend: canSendMessage(role),

    canView: (conversation: { status: string; agent_email?: string | null }) =>
      canViewConversation(role, email, conversation),
  };
}

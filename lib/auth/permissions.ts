
import type { Database } from "@/types/database";

export type AgentRole = Database["public"]["Tables"]["agents"]["Row"]["role"];


export const PERMISSIONS = {
  VIEW_ALL_CONVERSATIONS: "view_all_conversations",
  VIEW_OWN_CONVERSATIONS: "view_own_conversations",
  VIEW_PENDING_CONVERSATIONS: "view_pending_conversations",
  VIEW_CLIENT_DATA: "view_client_data",
  VIEW_CONVERSATION_HISTORY: "view_conversation_history",

  TAKEOVER_CONVERSATION: "takeover_conversation",
  PAUSE_CONVERSATION: "pause_conversation",
  CLOSE_CONVERSATION: "close_conversation",
  UPDATE_SUMMARY: "update_summary",
  SEND_MESSAGE: "send_message",

  MANAGE_AGENTS: "manage_agents",
  VIEW_ALL_STATS: "view_all_stats",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];


const ROLE_PERMISSIONS: Record<AgentRole, Permission[]> = {
  admin: [
    PERMISSIONS.VIEW_ALL_CONVERSATIONS,
    PERMISSIONS.VIEW_OWN_CONVERSATIONS,
    PERMISSIONS.VIEW_PENDING_CONVERSATIONS,
    PERMISSIONS.VIEW_CLIENT_DATA,
    PERMISSIONS.VIEW_CONVERSATION_HISTORY,
    PERMISSIONS.VIEW_ALL_STATS,
    PERMISSIONS.MANAGE_AGENTS,
    PERMISSIONS.TAKEOVER_CONVERSATION,
    PERMISSIONS.PAUSE_CONVERSATION,
    PERMISSIONS.CLOSE_CONVERSATION,
    PERMISSIONS.UPDATE_SUMMARY,
    PERMISSIONS.SEND_MESSAGE,
  ],

  supervisor: [
    PERMISSIONS.VIEW_ALL_CONVERSATIONS,
    PERMISSIONS.VIEW_OWN_CONVERSATIONS,
    PERMISSIONS.VIEW_PENDING_CONVERSATIONS,
    PERMISSIONS.VIEW_CLIENT_DATA,
    PERMISSIONS.VIEW_CONVERSATION_HISTORY,
    PERMISSIONS.VIEW_ALL_STATS,
    PERMISSIONS.TAKEOVER_CONVERSATION,
    PERMISSIONS.PAUSE_CONVERSATION,
    PERMISSIONS.CLOSE_CONVERSATION,
    PERMISSIONS.UPDATE_SUMMARY,
    PERMISSIONS.SEND_MESSAGE,
  ],

  agent: [
    PERMISSIONS.VIEW_OWN_CONVERSATIONS,
    PERMISSIONS.VIEW_PENDING_CONVERSATIONS,
    PERMISSIONS.VIEW_CLIENT_DATA,
    PERMISSIONS.VIEW_CONVERSATION_HISTORY,
    PERMISSIONS.TAKEOVER_CONVERSATION,
    PERMISSIONS.PAUSE_CONVERSATION,
    PERMISSIONS.CLOSE_CONVERSATION,
    PERMISSIONS.UPDATE_SUMMARY,
    PERMISSIONS.SEND_MESSAGE,
  ],
};


export function hasPermission(role: AgentRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAllPermissions(role: AgentRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function hasAnyPermission(role: AgentRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function getRolePermissions(role: AgentRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}


export function canViewAllConversations(role: AgentRole): boolean {
  return hasPermission(role, PERMISSIONS.VIEW_ALL_CONVERSATIONS);
}

export function canTakeoverConversation(role: AgentRole): boolean {
  return hasPermission(role, PERMISSIONS.TAKEOVER_CONVERSATION);
}

export function canPauseConversation(role: AgentRole): boolean {
  return hasPermission(role, PERMISSIONS.PAUSE_CONVERSATION);
}

export function canCloseConversation(role: AgentRole): boolean {
  return hasPermission(role, PERMISSIONS.CLOSE_CONVERSATION);
}

export function canSendMessage(role: AgentRole): boolean {
  return hasPermission(role, PERMISSIONS.SEND_MESSAGE);
}

export function canViewConversation(
  role: AgentRole,
  agentEmail: string,
  conversation: {
    status: string;
    agent_email?: string | null;
  }
): boolean {
  if (canViewAllConversations(role)) {
    return true;
  }

  if (conversation.status === "waiting_specialist") {
    return true;
  }

  if (conversation.agent_email === agentEmail) {
    return true;
  }

  return false;
}


export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

export function checkPermission(
  role: AgentRole,
  permission: Permission
): PermissionCheck {
  const allowed = hasPermission(role, permission);

  if (!allowed) {
    return {
      allowed: false,
      reason: `El rol '${role}' no tiene el permiso '${permission}'`,
    };
  }

  return { allowed: true };
}

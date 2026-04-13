
export interface MCPClient {
  name: string | null;
  identification: string | null;
  contract: string | null;
  email: string | null;
  phone: string | null;
}

export interface MCPTimestamps {
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  closedAt: string | null;
  handedOverAt?: string | null;
}

export interface MCPAgent {
  email: string;
  name: string;
  takenAt: string;
}

export interface MCPConversation {
  id: string;
  sessionId: string;
  status: "active" | "paused" | "waiting_specialist" | "handed_over" | "closed";
  summary: string | null;
  messageCount: number;
  client: MCPClient;
  timestamps: MCPTimestamps;
  isUrgent?: boolean;
  agent?: MCPAgent;
    glpiTicketId?: number | string | null;
    closedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MCPChatMessage {
  id: number;
  role: "user" | "assistant" | "model" | "system" | "tool" | "agent";
  content: string;
  createdAt: string;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPConversationStats {
  total: number;
  active: number;
  waiting_agent: number;
  handed_over: number;
  closed: number;
}

export interface MCPAgentStats {
  agentEmail: string;
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  pendingConversations: number;
  avgClosureTimeMinutes: number | null;
  lastTakenAt: string | null;
}

export interface MCPPaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface MCPListConversationsResponse {
  conversations: MCPConversation[];
  pagination: MCPPaginationInfo;
  filters: {
    status?: string | string[];
    identification?: string;
    contract?: string;
    agentEmail?: string;
    includeAll: boolean;
  };
}

export interface MCPToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

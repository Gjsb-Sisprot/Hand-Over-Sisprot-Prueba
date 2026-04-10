"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MCPConversation, MCPListConversationsResponse, MCPPaginationInfo } from "@/types/mcp";

interface UseRealtimeConversationsOptions {
  initialData?: MCPConversation[];
  status?: string | string[];
  agentEmail?: string;
  includeAll?: boolean;
  pollingInterval?: number;
  onNewConversation?: (conversation: MCPConversation) => void;
  onConversationUpdated?: (conversation: MCPConversation) => void;
}

export function useRealtimeConversations({
  initialData = [],
  status,
  agentEmail,
  includeAll = false,
  pollingInterval = 10000,
  onNewConversation,
  onConversationUpdated,
}: UseRealtimeConversationsOptions = {}) {
  const hasInitialData = initialData.length > 0;
  const [conversations, setConversations] = useState<MCPConversation[]>(initialData);
  const [pagination, setPagination] = useState<MCPPaginationInfo | null>(
    hasInitialData
      ? {
          page: 1,
          pageSize: initialData.length,
          totalItems: initialData.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      : null
  );
  const [isConnected, setIsConnected] = useState(hasInitialData);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [error, setError] = useState<Error | null>(null);

  const previousIdsRef = useRef<Set<string>>(new Set(initialData.map((c) => c.id)));
  const conversationsRef = useRef<MCPConversation[]>(initialData);
  const previousFilterRef = useRef<string | null>(null);
  const isLoadingRef = useRef(!hasInitialData);
  const onNewRef = useRef(onNewConversation);
  const onUpdatedRef = useRef(onConversationUpdated);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { onNewRef.current = onNewConversation; }, [onNewConversation]);
  useEffect(() => { onUpdatedRef.current = onConversationUpdated; }, [onConversationUpdated]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (status) {
      const statusValue = Array.isArray(status) ? status.join(",") : status;
      params.set("status", statusValue);
    }
    if (agentEmail) params.set("agentEmail", agentEmail);
    if (includeAll) params.set("includeAll", "true");
    const queryString = params.toString();
    return `/api/mcp/conversations${queryString ? `?${queryString}` : ""}`;
  }, [status, agentEmail, includeAll]);

  const fetchConversations = useCallback(
    async (isFilterChange = false) => {
      try {
        if (isFilterChange) setIsLoading(true);

        const url = buildUrl();
        const response = await fetch(url);

        if (!response.ok) throw new Error("Error fetching conversations");

        const data: MCPListConversationsResponse = await response.json();
        const convs = data.conversations || [];

        if (!isFilterChange) {
          const currentIds = new Set(convs.map((c) => c.id));

          convs.forEach((conv) => {
            if (!previousIdsRef.current.has(conv.id)) {
              onNewRef.current?.(conv);
            }
          });

          convs.forEach((conv) => {
            const existing = conversationsRef.current.find((c) => c.id === conv.id);
            if (existing && JSON.stringify(existing) !== JSON.stringify(conv)) {
              onUpdatedRef.current?.(conv);
            }
          });

          previousIdsRef.current = currentIds;
        } else {
          previousIdsRef.current = new Set(convs.map((c) => c.id));
        }

        setConversations(convs);
        setPagination(data.pagination || null);
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsConnected(false);
        setIsLoading(false);
      }
    },
    [buildUrl]
  );

  useEffect(() => {
    const currentFilter = JSON.stringify({ status, agentEmail, includeAll });

    if (previousFilterRef.current !== null && previousFilterRef.current !== currentFilter) {
      setPagination(null);
      setConversations([]);
      fetchConversations(true);
    } else if (previousFilterRef.current === null && !hasInitialData) {
      fetchConversations(false);
    }

    previousFilterRef.current = currentFilter;
  }, [status, agentEmail, includeAll, initialData.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoadingRef.current) {
        fetchConversations(false);
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingInterval, fetchConversations]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/mcp/conversations/events");

      es.addEventListener("status_changed", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const { sessionId: evtSessionId, status: newStatus } = data;

          if (evtSessionId && newStatus) {
            setConversations((prev) => {
              const idx = prev.findIndex(
                (c) => c.sessionId === evtSessionId || c.id === evtSessionId
              );
              if (idx === -1) {
                if (!isLoadingRef.current) fetchConversations(false);
                return prev;
              }
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                status: newStatus as MCPConversation["status"],
                timestamps: {
                  ...updated[idx].timestamps,
                  updatedAt: new Date().toISOString(),
                },
              };
              conversationsRef.current = updated;
              return updated;
            });
          }
        } catch {
          if (!isLoadingRef.current) fetchConversations(false);
        }
      });

      es.onerror = () => {
      };
    } catch {
    }
    return () => { es?.close(); };
  }, [fetchConversations]);

    const optimisticUpdate = useCallback(
    (sessionId: string, updates: Partial<MCPConversation>) => {
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) => c.sessionId === sessionId || c.id === sessionId
        );
        if (idx === -1) return prev;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ...updates,
          timestamps: {
            ...updated[idx].timestamps,
            ...updates.timestamps,
            updatedAt: new Date().toISOString(),
          },
        };
        conversationsRef.current = updated;
        return updated;
      });
    },
    []
  );

    const removeFromList = useCallback(
    (sessionId: string) => {
      setConversations((prev) => {
        const filtered = prev.filter(
          (c) => c.sessionId !== sessionId && c.id !== sessionId
        );
        conversationsRef.current = filtered;
        return filtered;
      });
    },
    []
  );

  return {
    conversations,
    pagination,
    isConnected,
    isLoading,
    error,
    refresh: () => fetchConversations(false),
    optimisticUpdate,
    removeFromList,
  };
}

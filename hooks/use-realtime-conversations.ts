"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MCPConversation, MCPPaginationInfo } from "@/types/mcp";
import { createClient } from "@/lib/supabase/client";
import { getConversationsPaginated } from "@/lib/actions/conversations";

interface UseDashboardConversationsOptions {
  initialData?: MCPConversation[];
  status?: string | string[];
  agentEmail?: string;
  includeAll?: boolean;
  pollingInterval?: number;
  onNewConversation?: (conversation: MCPConversation) => void;
  onConversationUpdated?: (conversation: MCPConversation) => void;
}

/**
 * REFORMULATED HOOK - Version 2.1 (useDashboardConversations)
 * Regresa explícitamente { conversations, pagination, isConnected, isLoading, error, refresh, optimisticUpdate, removeFromList }
 */
export function useDashboardConversations({
  initialData = [],
  status,
  agentEmail,
  includeAll = false,
  pollingInterval = 30000,
  onNewConversation,
  onConversationUpdated,
}: UseDashboardConversationsOptions = {}) {
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

  const fetchConversations = useCallback(
    async (isFilterChange = false) => {
      try {
        if (isFilterChange) setIsLoading(true);

        // Limpiar el estado para evitar enviar "undefined" o "$undefined" como string
        const cleanStatus = (status === "undefined" || status === "$undefined" || !status) ? undefined : status;

        const data = await getConversationsPaginated({
          status: cleanStatus,
          includeAll,
          pageSize: 100,
        });
        
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
    [status, agentEmail, includeAll]
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
  }, [status, agentEmail, includeAll, initialData.length, fetchConversations, hasInitialData]);

  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel("realtime-conversations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs",
        },
        async () => {
          if (!isLoadingRef.current) {
            fetchConversations(false);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        async () => {
          if (!isLoadingRef.current) {
            fetchConversations(false);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoadingRef.current) {
        fetchConversations(false);
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingInterval, fetchConversations]);

  const optimisticUpdate = useCallback(
    (id: string, updates: Partial<MCPConversation>) => {
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) => c.id === id || c.sessionId === id
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
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter(
          (c) => c.id !== id && c.sessionId !== id
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

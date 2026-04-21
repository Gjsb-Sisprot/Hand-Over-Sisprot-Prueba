"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MCPChatMessage } from "@/types/mcp";
import { getChatHistory } from "@/lib/actions/conversations";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeMessagesOptions {
    conversationId: string | null;
    initialMessages?: MCPChatMessage[];
    isActive?: boolean;
}

/**
 * REFORMULATED HOOK - Version 2.2 (useDashboardMessages)
 * Regresa explícitamente { messages, isMessagesLoading, refresh }
 */
export function useDashboardMessages({
  conversationId,
  initialMessages = [],
  isActive = true,
}: UseRealtimeMessagesOptions): {
  messages: MCPChatMessage[];
  isMessagesLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [messages, setMessages] = useState<MCPChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      if (messages.length === 0) setIsLoading(true);
      const newMessages = await getChatHistory(conversationId);
      setMessages(newMessages || []);
    } catch (err) {
      console.error("[USE_REALTIME_MESSAGES_FETCH_ERROR]", err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [conversationId, messages.length]);

  useEffect(() => {
    if (conversationId && isActive) {
      fetchMessages();
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId, isActive, fetchMessages]);

  useEffect(() => {
    if (!conversationId || !isActive) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log(`[REALTIME] EVENTO RECIBIDO en ${conversationId}:`, payload);
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log(`[REALTIME] Estado de suscripción para ${conversationId}:`, status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      console.log(`[REALTIME] Desconectando canal ${conversationId}`);
      supabase.removeChannel(channel);
    };
  }, [conversationId, isActive, fetchMessages]);

  return {
    messages,
    isMessagesLoading: isLoading,
    isConnected, // Añadido para diagnóstico
    refresh: fetchMessages,
  };
}

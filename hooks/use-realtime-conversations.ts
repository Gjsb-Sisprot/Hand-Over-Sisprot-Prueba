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

export function useRealtimeMessages({
  conversationId,
  initialMessages = [],
  isActive = true,
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<MCPChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      if (messages.length === 0) setIsLoading(true);
      const newMessages = await getChatHistory(conversationId);
      setMessages(newMessages);
    } catch (err) {
      console.error("[USE_REALTIME_MESSAGES_FETCH_ERROR]", err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [conversationId, messages.length]);

  // Carga inicial al cambiar de conversación
  useEffect(() => {
    if (conversationId && isActive) {
      fetchMessages();
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId, isActive, fetchMessages]);

  // Suscripción de tiempo real filtrada por conversation_id
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
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isActive, fetchMessages]);

  return {
    messages,
    isLoading,
    refresh: fetchMessages,
  };
}

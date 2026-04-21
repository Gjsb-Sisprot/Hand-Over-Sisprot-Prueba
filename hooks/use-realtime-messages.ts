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
  isConnected: boolean;
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
      // Solo mostramos el cargador si no tenemos ningún mensaje aún
      if (messages.length === 0) setIsLoading(true);
      const newMessages = await getChatHistory(conversationId);
      setMessages(newMessages || []);
    } catch (err) {
      console.error("[USE_REALTIME_MESSAGES_FETCH_ERROR]", err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // ELIMINADO messages.length para evitar bucles

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
          // Usamos la función de refresco aquí
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isActive]); // ELIMINADO fetchMessages para no reconectar cada vez que cambie

  return {
    messages,
    isMessagesLoading: isLoading,
    isConnected, // Añadido para diagnóstico
    refresh: fetchMessages,
  };
}

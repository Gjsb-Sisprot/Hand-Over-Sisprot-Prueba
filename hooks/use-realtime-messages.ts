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
    
    // Para el tiempo real robusto, necesitamos saber si el mensaje viene por UUID o por SessionID
    const channel = supabase
      .channel(`chat-monitor-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs"
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Validamos contra el ID actual del hook
          // Si el mensaje entrante coincide con nuestra conversación (por cualquier ID), refrescamos
          if (newMsg.conversation_id === conversationId) {
             console.log("[REALTIME] Cambio detectado por ID");
             fetchMessages();
             return;
          }

          // Respaldo: Si no coincide el ID, puede ser que el webhook mandó el session_id
          // Podríamos hacer un fetch adicional aquí, pero para velocidad simplemente refrescamos
          // si detectamos actividad reciente en la tabla de nuestra conversación
          fetchMessages();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
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

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
  const [resolvedUuid, setResolvedUuid] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // 1. Efecto para normalizar el ID: Asegurarnos de tener el UUID real
  useEffect(() => {
    async function resolveId() {
      if (!conversationId) return;
      
      // Si ya parece un UUID, lo usamos directamente
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isUuid) {
        setResolvedUuid(conversationId);
        return;
      }

      // Si es un session_id (texto), buscamos su UUID correspondiente
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("conversations")
          .select("id")
          .eq("session_id", conversationId)
          .maybeSingle();
        
        if (data?.id) setResolvedUuid(data.id);
      } catch (err) {
        console.error("Error resolviendo UUID:", err);
      }
    }
    resolveId();
  }, [conversationId]);

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
    // Escuchamos solo si tenemos el UUID resuelto
    const targetId = resolvedUuid;
    if (!targetId || !isActive) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel(`chat-v3-${targetId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs",
          filter: `conversation_id=eq.${targetId}`
        },
        (payload) => {
           console.log("[REALTIME] ¡Mensaje recibido via UUID!", payload.new);
           fetchMessages();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedUuid, isActive, fetchMessages]);

  return {
    messages,
    isMessagesLoading: isLoading,
    isConnected, // Añadido para diagnóstico
    refresh: fetchMessages,
  };
}

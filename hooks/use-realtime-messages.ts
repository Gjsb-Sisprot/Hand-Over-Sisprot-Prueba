"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MCPChatMessage } from "@/types/mcp";
import { getChatHistory } from "@/lib/actions/conversations";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeMessagesOptions {
    sessionId: string | null;
    initialMessages?: MCPChatMessage[];
    pollingInterval?: number;
    isActive?: boolean;
}

export function useRealtimeMessages({
  sessionId,
  initialMessages = [],
  pollingInterval = 30000,
  isActive = true,
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<MCPChatMessage[]>(initialMessages);
  const messagesCountRef = useRef(initialMessages.length);
  const isPollingRef = useRef(false);

  useEffect(() => {
    setMessages(initialMessages);
    messagesCountRef.current = initialMessages.length;
  }, [initialMessages]);

  const fetchMessages = useCallback(async () => {
    if (!sessionId || isPollingRef.current) return;

    isPollingRef.current = true;
    try {
      const newMessages = await getChatHistory(sessionId);

      if (newMessages.length !== messagesCountRef.current) {
        setMessages(newMessages);
        messagesCountRef.current = newMessages.length;
      }
    } catch (err) {
    } finally {
      isPollingRef.current = false;
    }
  }, [sessionId]);

  // Suscripción de tiempo real a la tabla chat_logs
  useEffect(() => {
    if (!sessionId || !isActive) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel(`rt-messages-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs"
        },
        async (payload) => {
          // Recargamos mensajes cuando hay uno nuevo
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isActive, fetchMessages]);

  useEffect(() => {
    if (!sessionId || !isActive) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [sessionId, isActive, pollingInterval, fetchMessages]);

  return {
    messages,
    refresh: fetchMessages,
  };
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MCPChatMessage } from "@/types/mcp";
import { getChatHistory } from "@/lib/actions/conversations";

interface UseRealtimeMessagesOptions {
    sessionId: string | null;
    initialMessages?: MCPChatMessage[];
    pollingInterval?: number;
    isActive?: boolean;
}

export function useRealtimeMessages({
  sessionId,
  initialMessages = [],
  pollingInterval = 5000,
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

      if (newMessages.length > messagesCountRef.current) {
        setMessages(newMessages);
        messagesCountRef.current = newMessages.length;
      }
    } catch (err) {
    } finally {
      isPollingRef.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !isActive) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [sessionId, isActive, pollingInterval, fetchMessages]);

  useEffect(() => {
    if (!sessionId || !isActive) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/mcp/conversations/events`);
      const handler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.sessionId === sessionId) {
            fetchMessages();
          }
        } catch {
        }
      };
      es.addEventListener("status_changed", handler);
      es.addEventListener("new_message", handler);
      es.onerror = () => { };
    } catch {
    }
    return () => { es?.close(); };
  }, [sessionId, isActive, fetchMessages]);

  return {
    messages,
    refresh: fetchMessages,
  };
}

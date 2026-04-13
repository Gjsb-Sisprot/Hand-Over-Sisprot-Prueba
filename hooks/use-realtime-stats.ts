"use client";

import { useEffect, useState, useCallback } from "react";

interface ConversationStats {
  active: number;
  waitingAgent: number;
  handedOver: number;
  closed: number;
  total: number;
}

export function useRealtimeStats(initialStats: ConversationStats, pollingInterval = 5000) {
  const [stats, setStats] = useState<ConversationStats>(initialStats);
  const [isConnected, setIsConnected] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch("/api/stats");

      if (!response.ok) {
        throw new Error("Error fetching stats");
      }

      const data = await response.json();
      setStats(data);
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, pollingInterval);
    return () => clearInterval(interval);
  }, [pollingInterval, refreshStats]);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  return {
    stats,
    isConnected,
    refresh: refreshStats,
  };
}

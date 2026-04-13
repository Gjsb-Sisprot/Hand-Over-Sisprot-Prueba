"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/date-utils";
import { useRealtimeStats } from "@/hooks/use-realtime-stats";
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations";
import {
  AlertCircle,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  Wifi,
} from "lucide-react";
import { Agent } from "@/types/database";
import { MCPConversation } from "@/types/mcp";

interface DashboardStatsProps {
  agent: Agent | null;
  stats: {
    active: number;
    waitingAgent: number;
    handedOver: number;
    closed: number;
    total: number;
  };
  pendingConversations: MCPConversation[];
}

export function DashboardStats({
  agent,
  stats: initialStats,
  pendingConversations: initialConversations,
}: DashboardStatsProps) {
  const { stats, isConnected: statsConnected } = useRealtimeStats(initialStats);
  const { conversations: pendingConversations, isConnected: convsConnected } =
    useRealtimeConversations({ initialData: initialConversations });

  const isConnected = statsConnected && convsConnected;

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hola, {agent?.name?.split(" ")[0] || "Agente"} 👋
          </h1>
          <p className="text-muted-foreground">
            Este es el resumen de conversaciones de hoy
          </p>
        </div>

        {}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          <Wifi className={`h-3.5 w-3.5 ${isConnected ? "" : "animate-pulse"}`} />
          {isConnected ? "Actualización en vivo" : "Conectando..."}
        </div>
      </div>

      {}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-500/20 bg-green-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidas por IA</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Conversaciones activas con el bot</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esperando Agente</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitingAgent}</div>
            <p className="text-xs text-muted-foreground">Necesitan intervención humana</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Atención</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.handedOver}</div>
            <p className="text-xs text-muted-foreground">Atendidas por especialistas</p>
          </CardContent>
        </Card>
      </div>

      {}
      {stats.waitingAgent > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Conversaciones Pendientes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Estas conversaciones necesitan atención
              </p>
            </div>
            <Link href="/dashboard/conversations">
              <Button variant="outline" size="sm" className="gap-2">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingConversations
                .filter((c) => c.status === "active" || c.status === "waiting_specialist")
                .slice(0, 3)
                .map((conv) => {
                  return (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {conv.client.name || "Sin nombre"}
                          </span>
                          {conv.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {conv.summary || "Sin resumen disponible"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {conv.timestamps.escalatedAt
                            ? formatDistanceToNow(new Date(conv.timestamps.escalatedAt))
                            : "Recién escalada"}
                        </div>
                      </div>
                      <Link href="/dashboard/conversations">
                        <Button size="sm">Atender</Button>
                      </Link>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {}
      {stats.waitingAgent === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">¡Todo al día!</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              No hay conversaciones pendientes de atención. Las nuevas
              escalaciones aparecerán aquí automáticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

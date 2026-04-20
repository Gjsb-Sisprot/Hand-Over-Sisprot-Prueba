"use client";

import { MCPConversation } from "../../types/mcp";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { formatDistanceToNow } from "../../lib/date-utils";
import {
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Timer,
  ArrowRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface ConversationCardProps {
  conversation: MCPConversation;
  onClick?: () => void;
  onTakeover?: () => void;
  isSelected?: boolean;
}

export function ConversationCard({
  conversation,
  onClick,
  onTakeover,
  isSelected,
}: ConversationCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500 gap-1 text-[10px] h-5">
            IA
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="gap-1 text-[10px] h-5">
            Pausada
          </Badge>
        );
      case "waiting_specialist":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px] h-5 animate-pulse">
            <AlertCircle className="h-3 w-3" />
            Esperando
          </Badge>
        );
      case "handed_over":
        return (
          <Badge variant="default" className="bg-blue-500 gap-1 text-[10px] h-5">
            <User className="h-3 w-3" />
            Agente
          </Badge>
        );
      case "closed":
        if (conversation.closedBy === "system") {
          return (
            <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 border-orange-200 text-[10px] h-5">
              <Timer className="h-3 w-3" />
              Auto
            </Badge>
          );
        }
        return <Badge variant="secondary" className="text-[10px] h-5">Cerrada</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] h-5">{status}</Badge>;
    }
  };

  const getUrgentBadge = (isUrgent?: boolean) => {
    if (!isUrgent) return null;
    return (
      <Badge variant="outline" className="border-red-500 text-red-500 text-[10px] h-5">
        Urgente
      </Badge>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const metadata = conversation.metadata as { escalationReason?: string } | null;
  const escalationReason = metadata?.escalationReason;
  const client = conversation.client ?? { name: null, identification: null, contract: null, email: null, phone: null };
  const timestamps = conversation.timestamps ?? { createdAt: null, updatedAt: null, escalatedAt: null, closedAt: null };

  return (
    <div
      className={cn(
        "cursor-pointer transition-all hover:bg-muted/30 group relative flex items-center gap-3 py-3 px-4 border-b border-border/40",
        isSelected && "bg-primary/[0.03] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary"
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10 shrink-0 ring-offset-background transition-transform group-hover:scale-105">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
          {getInitials(client.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-semibold text-sm truncate transition-colors",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {client.name || "Cliente Anónimo"}
          </h3>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {timestamps.escalatedAt
              ? formatDistanceToNow(new Date(timestamps.escalatedAt))
              : timestamps.createdAt 
                ? formatDistanceToNow(new Date(timestamps.createdAt))
                : "Ahora"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground line-clamp-1 italic flex-1">
            {conversation.summary ? `"${conversation.summary}"` : "Sin resumen"}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {getUrgentBadge(conversation.isUrgent)}
            {getStatusBadge(conversation.status)}
            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
              {client.contract || "S/N"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

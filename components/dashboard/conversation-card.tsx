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
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-[9px] font-black uppercase px-1.5 h-4">
            Susana
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1 text-[9px] font-black uppercase px-1.5 h-4">
            Pausa
          </Badge>
        );
      case "waiting_specialist":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-[9px] font-black uppercase px-1.5 h-4 animate-pulse">
            <AlertCircle className="h-2.5 w-2.5" />
            Espera
          </Badge>
        );
      case "handed_over":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-[9px] font-black uppercase px-1.5 h-4">
            <User className="h-2.5 w-2.5" />
            Agente
          </Badge>
        );
      case "closed":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent text-[9px] font-black uppercase px-1.5 h-4">Cerrada</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 h-4">{status}</Badge>;
    }
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

  const client = conversation.client ?? { name: null, identification: null, contract: null, email: null, phone: null };
  const timestamps = conversation.timestamps ?? { createdAt: null, updatedAt: null, escalatedAt: null, closedAt: null };

  return (
    <div
      className={cn(
        "cursor-pointer transition-all duration-300 group relative flex items-center gap-4 py-4 pl-4 pr-8 border-b border-border/40 hover:bg-muted/30",
        isSelected && "bg-primary/[0.04] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary shadow-inner"
      )}
      onClick={onClick}
    >
      {/* Avatar con indicador de estado */}
      <div className="relative shrink-0">
        <Avatar className={cn(
            "h-12 w-12 ring-2 ring-offset-2 ring-offset-background transition-all duration-300 group-hover:scale-105 shadow-md",
            isSelected ? "ring-primary/40" : "ring-transparent"
        )}>
          <AvatarFallback className={cn(
              "text-xs font-black uppercase tracking-tighter",
              isSelected ? "bg-primary text-white" : "bg-primary/10 text-primary"
          )}>
            {getInitials(client.name)}
          </AvatarFallback>
        </Avatar>
        {conversation.status === "active" && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn(
            "text-[13px] font-black uppercase tracking-tight truncate transition-colors duration-300 flex-1",
            isSelected ? "text-primary" : "text-foreground group-hover:text-primary/80"
          )}>
            {client.name || "CLIENTE ANÓNIMO"}
          </h3>
          <span className="text-[9px] font-black text-muted-foreground/50 whitespace-nowrap shrink-0 uppercase tracking-[0.15em] ml-2">
            {timestamps.escalatedAt
              ? formatDistanceToNow(new Date(timestamps.escalatedAt))
              : timestamps.createdAt 
                ? formatDistanceToNow(new Date(timestamps.createdAt))
                : "Ahorita"}
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground line-clamp-1 italic leading-tight opacity-70 group-hover:opacity-100 transition-opacity pr-4">
            {conversation.summary ? `"${conversation.summary}"` : "Sin resumen de conversación..."}
        </p>

        <div className="flex items-center justify-between mt-1 gap-4">
          <div className="flex items-center gap-1.5 overflow-hidden shrink-0">
             {getStatusBadge(conversation.status)}
             {conversation.isUrgent && (
               <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-black uppercase px-1 h-3.5">
                 Urgente
               </Badge>
             )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 px-2 py-0.5 rounded-md border border-border/30 ml-auto">
            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Contrato:</span>
            <span className="text-[10px] font-black text-foreground/80 tabular-nums">{client.contract || "S/N"}</span>
          </div>
        </div>
      </div>
      
      {isSelected && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-20 transition-all group-hover:opacity-40 translate-x-1 group-hover:translate-x-0">
              <ArrowRight className="h-4 w-4 text-primary" />
          </div>
      )}
    </div>
  );
}

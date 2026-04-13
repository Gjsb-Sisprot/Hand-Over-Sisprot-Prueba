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
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group overflow-hidden",
        isSelected && "border-primary shadow-md bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate max-w-[150px]">
                {client.name || "Cliente Anónimo"}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {client.identification || "Sin ID"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {getStatusBadge(conversation.status)}
            {getUrgentBadge(conversation.isUrgent)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3">
        {conversation.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{conversation.summary}"
          </p>
        )}

        {escalationReason && (
          <div className="flex items-start gap-2 text-[10px] bg-red-50 text-red-700 p-2 rounded-md border border-red-100">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{escalationReason}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {timestamps.escalatedAt
                ? formatDistanceToNow(new Date(timestamps.escalatedAt))
                : timestamps.createdAt 
                  ? formatDistanceToNow(new Date(timestamps.createdAt))
                  : "Reciente"}
            </span>
          </div>
          
          {(conversation.status === "waiting_specialist" || conversation.status === "active") && onTakeover ? (
            <Button 
              size="sm" 
              className="h-7 px-2 text-[10px] bg-primary hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                onTakeover();
              }}
            >
              Tomar
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              {client.contract || "S/N"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { MCPConversation } from "@/types/mcp";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "@/lib/date-utils";
import {
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationCardProps {
  conversation: MCPConversation;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ConversationCard({
  conversation,
  onClick,
  isSelected,
}: ConversationCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500 gap-1">
            IA
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="gap-1">
            Pausada
          </Badge>
        );
      case "waiting_specialist":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Esperando Agente
          </Badge>
        );
      case "handed_over":
        return (
          <Badge variant="default" className="bg-blue-500 gap-1">
            <User className="h-3 w-3" />
            En Atención
          </Badge>
        );
      case "closed":
        if (conversation.closedBy === "system") {
          return (
            <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 border-orange-200">
              <Timer className="h-3 w-3" />
              Inactividad
            </Badge>
          );
        }
        return <Badge variant="secondary">Cerrada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUrgentBadge = (isUrgent?: boolean) => {
    if (!isUrgent) return null;
    return (
      <Badge variant="outline" className="border-red-500 text-red-500">
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
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isSelected && "border-primary shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {client.name || "Sin nombre"}
              </p>
              <p className="text-xs text-muted-foreground">
                {client.identification || "Sin identificación"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(conversation.status)}
            {getUrgentBadge(conversation.isUrgent)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {}
        {conversation.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {conversation.summary}
          </p>
        )}

        {}
        {escalationReason && (
          <div className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded-md">
            <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{escalationReason}</span>
          </div>
        )}

        {}
        {conversation.glpiTicketId && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Ticket GLPI #{conversation.glpiTicketId}</span>
          </div>
        )}

        {}
        {conversation.status === "handed_over" && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {client.phone && (
              <a
                href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-green-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </a>
            )}
          </div>
        )}

        {}
        {conversation.status === "waiting_specialist" && (
          <div className="text-xs text-muted-foreground">
            <p>Haz clic para tomar esta conversación y acceder a los datos de contacto</p>
          </div>
        )}

        {}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {timestamps.escalatedAt
                ? `Escalada ${formatDistanceToNow(new Date(timestamps.escalatedAt))}`
                : "No escalada"}
            </span>
          </div>
          {client.contract && (
            <span className="text-xs text-muted-foreground">
              {client.contract}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

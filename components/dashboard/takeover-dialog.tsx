"use client";

import { useState } from "react";
import { MCPConversation } from "@/types/mcp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, AlertCircle, FileText, User, Phone, Mail, MessageSquare } from "lucide-react";

interface TakeoverDialogProps {
  conversation: MCPConversation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agentName?: string;
}

export function TakeoverDialog({
  conversation,
  isOpen,
  onClose,
  onConfirm,
  agentName,
}: TakeoverDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!conversation) return null;

  const metadata = conversation.metadata as { escalationReason?: string } | null;
  const escalationReason = metadata?.escalationReason;
  const client = conversation.client ?? { name: null, identification: null, contract: null, email: null, phone: null };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Confirmar Toma de Conversación
          </DialogTitle>
          <DialogDescription>
            Al tomar esta conversación, serás responsable de contactar al cliente
            y resolver su solicitud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">
                {client.name || "Sin nombre"}
              </p>
              <p className="text-sm text-muted-foreground">
                {client.identification || "Sin identificación"}
              </p>
              {client.contract && (
                <p className="text-xs text-muted-foreground">
                  Contrato: {client.contract}
                </p>
              )}
            </div>
            {conversation.isUrgent && (
              <Badge variant="destructive">Urgente</Badge>
            )}
          </div>

          {}
          {escalationReason && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <FileText className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Motivo de escalación:
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {escalationReason}
                </p>
              </div>
            </div>
          )}

          {}
          {conversation.summary && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {conversation.summary}
              </p>
            </div>
          )}

          {}
          <div className="text-sm text-center text-muted-foreground">
            Esta conversación quedará asignada a:{" "}
            <span className="font-medium text-foreground">{agentName}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tomando...
              </>
            ) : (
              "Confirmar y Tomar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

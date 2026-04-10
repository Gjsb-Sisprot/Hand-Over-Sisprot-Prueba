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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Pause, TicketCheck } from "lucide-react";

const TICKET_TYPE_OPTIONS = [
  { value: "", label: "— Selecciona una categoría —" },
  { value: "1",  label: "ONU en Rojo (Urgente)" },
  { value: "7",  label: "Sin Internet (Urgente)" },
  { value: "2",  label: "Intermitencia / Internet Lento" },
  { value: "54", label: "Caída del Servicio (Urgente)" },
  { value: "41", label: "Última Milla – Falla desconocida" },
  { value: "39", label: "Potencia Baja/Elevada en ONU" },
  { value: "49", label: "Falla por Potencia (ONU Rojo)" },
  { value: "50", label: "Fibra Drop Partida" },
  { value: "51", label: "ONU Dañada" },
  { value: "52", label: "ONU Desconfigurada" },
  { value: "55", label: "Daños en Cableado Externo" },
  { value: "3",  label: "Configuración de Equipos" },
  { value: "13", label: "Cancelación de Servicio (Urgente)" },
  { value: "16", label: "Reactivación de Servicio (Urgente)" },
  { value: "17", label: "Reclamo Administrativo (Urgente)" },
  { value: "12", label: "Cambio de Plan" },
  { value: "11", label: "Cambio de Ciclo" },
  { value: "9",  label: "Cambio de Titular" },
  { value: "8",  label: "Cambio de Dirección" },
  { value: "28", label: "Reporte de Pago (Urgente)" },
  { value: "18", label: "Consulta de Facturación (Urgente)" },
  { value: "27", label: "Reclamo por Facturación" },
  { value: "26", label: "Devolución" },
  { value: "21", label: "Facturas Pendientes" },
  { value: "25", label: "Solicitud Factura / Nota de Cobro" },
  { value: "83", label: "Cliente Molesto (Urgente)" },
  { value: "53", label: "Atención Ineficiente al Cliente" },
  { value: "85", label: "Sin Respuesta del Cliente" },
  { value: "29", label: "Estado de la Visita" },
  { value: "32", label: "Reagendamiento de Visita" },
];

interface PauseDialogProps {
  conversation: MCPConversation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    reason: string,
    options: {
      createTicket: boolean;
      ticketTypeId?: number;
      ticketTypeName?: string;
      ticketSummary?: string;
    }
  ) => Promise<void>;
}

export function PauseDialog({
  conversation,
  isOpen,
  onClose,
  onConfirm,
}: PauseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");

  if (!conversation) return null;

  const client = conversation.client ?? {
    name: null,
    identification: null,
    contract: null,
    email: null,
    phone: null,
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

  const handleConfirm = async () => {
    if (!reason.trim() || ticketTypeId === "") return;
    const selectedType = TICKET_TYPE_OPTIONS.find((opt) => opt.value === ticketTypeId);
    setIsLoading(true);
    try {
      await onConfirm(reason.trim(), {
        createTicket: true,
        ticketTypeId: ticketTypeId ? parseInt(ticketTypeId, 10) : undefined,
        ticketTypeName: selectedType?.label,
        ticketSummary: reason.trim(),
      });
      setReason("");
      setTicketTypeId("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setTicketTypeId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-yellow-500" />
            Pausar Conversación
          </DialogTitle>
          <DialogDescription>
            Al pausar, la conversación quedará en espera. Se creará un ticket
            GLPI para seguimiento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {client.name || "Sin nombre"}
              </p>
              <p className="text-xs text-muted-foreground">
                {client.identification || "Sin identificación"}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {conversation.status === "handed_over"
                ? "En atención"
                : conversation.status}
            </Badge>
          </div>

          {}
          <div className="space-y-2">
            <Label htmlFor="pause-ticket-type">
              Tipo de Ticket <span className="text-destructive">*</span>
            </Label>
            <select
              id="pause-ticket-type"
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TICKET_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Requerido para crear el ticket con categoría y prioridad en GLPI
            </p>
          </div>

          {}
          <div className="space-y-2">
            <Label htmlFor="pause-reason">
              Razón de la pausa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pause-reason"
              placeholder="Ej: Se requiere visita técnica, esperando verificación..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && reason.trim()) handleConfirm();
              }}
            />
          </div>

          {}
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TicketCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Se creará ticket GLPI
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Registra un ticket con datos del cliente y resumen para seguimiento
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim() || ticketTypeId === ""}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pausando...
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar Conversación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

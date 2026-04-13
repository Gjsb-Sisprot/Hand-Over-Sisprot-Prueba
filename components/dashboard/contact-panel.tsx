"use client";

import { useState } from "react";
import { MCPConversation, MCPChatMessage } from "../../types/mcp";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "../ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { 
  Phone, 
  Mail, 
  User, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  Bot, 
  Pause,
  MessageCircle,
  Clock,
  Building,
  IdCard,
  History,
  ExternalLink,
  CreditCard,
  SendHorizontal
} from "lucide-react";
import { cn } from "../../lib/utils";
import ReactMarkdown from "react-markdown";
import { Input } from "../ui/input";
import { sendMessage } from "@/lib/actions/conversations";
import { toast } from "sonner";
import { formatDateTime, formatTime } from "@/lib/date-utils";

interface ContactPanelProps {
  conversation: MCPConversation;
  messages: MCPChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onCloseConversation: (conversationId: string) => Promise<void>;
  onPauseConversation?: (conversationId: string) => Promise<void>;
}

export function ContactPanel({
  conversation,
  messages,
  isOpen,
  onClose,
  onCloseConversation,
  onPauseConversation
}: ContactPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const client = conversation.client ?? {
    name: null,
    identification: null,
    contract: null,
    email: null,
    phone: null,
  };

  const timestamps = conversation.timestamps ?? {
    createdAt: null,
    updatedAt: null,
    escalatedAt: null,
    closedAt: null,
    handedOverAt: null,
  };

  const metadata = (conversation.metadata || {}) as {
    escalationReason?: string;
  };

  const escalationReason = metadata.escalationReason;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const result = await sendMessage(conversation.sessionId, newMessage);
      if (result.success) {
        setNewMessage("");
      } else {
        toast.error(result.error || "Error al enviar mensaje");
      }
    } catch (error) {
      toast.error("Error inesperado al enviar mensaje");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary uppercase text-xl font-bold">
                {client.name?.[0] || <User />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{client.name || "Cliente sin nombre"}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                {conversation.status === "active" && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-2 py-0">
                    <Bot className="h-3 w-3 mr-1" />
                    Atendida por IA
                  </Badge>
                )}
                {conversation.status === "waiting_specialist" && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 px-2 py-0">
                    <Clock className="h-3 w-3 mr-1" />
                    Esperando Especialista
                  </Badge>
                )}
                {conversation.status === "handed_over" && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 px-2 py-0">
                    <User className="h-3 w-3 mr-1" />
                    En atención humana
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground mr-auto">
                  ID: {conversation.sessionId}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-primary/5 hover:bg-primary/10 border-primary/20">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Contactar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <a 
                        href={`https://wa.me/${client.phone?.replace(/\D/g, "")}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <span>WhatsApp</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a 
                        href={`https://payfast.sisprot.com/?search=${client.contract || client.identification}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span>Pay Fast</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Información del Cliente */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3 border-b bg-muted/30 py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-y-4 gap-x-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Identificación</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    {client.identification || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Contrato</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {client.contract || "N/A"}
                  </p>
                </div>
                {timestamps.escalatedAt && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Escalada</p>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(new Date(timestamps.escalatedAt))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Motivo de Escalado (si existe) */}
            {escalationReason && (
              <Card className="md:col-span-2 border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2 border-b border-orange-100 py-2">
                  <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Motivo de Escalado
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <p className="text-sm">{escalationReason}</p>
                </CardContent>
              </Card>
            )}

            {/* Resumen e Historial Rápido */}
            {(conversation.summary || messages.length > 0) && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3 border-b bg-muted/30 py-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Resumen y Transcripción
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {conversation.summary && (
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                      <p className="text-sm font-medium leading-relaxed">{conversation.summary}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                      <History className="h-3 w-3" />
                      Historial completo:
                    </p>
                    {messages.length === 0 ? (
                      <div className="py-6 text-center border-2 border-dashed rounded-lg bg-muted/20">
                        <p className="text-xs text-muted-foreground italic">Cargando mensajes o sin historial registrado...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((m, idx) => (
                          <div 
                            key={m.id || idx} 
                            className={cn(
                              "text-sm border-l-2 pl-3 py-2 rounded-r-md transition-all",
                              m.role === "user" 
                                ? "border-primary/40 bg-primary/5" 
                                : "border-foreground/20 bg-muted/40"
                            )}
                          >
                            <p className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase mb-1">
                              {m.role === "user" ? (
                                <>
                                  <User className="h-3 w-3" />
                                  Cliente
                                </>
                              ) : (
                                <>
                                  <Bot className="h-3 w-3" />
                                  IA Sisprot
                                </>
                              )}
                            </p>
                            <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer con acciones permanentes */}
        <div className="p-4 border-t bg-muted/30 shrink-0">
          <div className="flex flex-col gap-4">
            {/* Área de chat activa si el agente tiene el control */}
            {conversation.status === "handed_over" && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Escribe un mensaje al cliente..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                />
                <Button 
                  type="submit" 
                  disabled={isSending || !newMessage.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </form>
            )}

            {/* Botones de acción de la conversación */}
            <div className="flex gap-3 justify-end items-center">
              <span className="text-xs text-muted-foreground mr-auto italic">
                ¿Cliente atendido satisfactoriamente?
              </span>
              
              {onPauseConversation && conversation.status !== "paused" && (
                <Button 
                  variant="outline" 
                  onClick={() => onPauseConversation(conversation.sessionId)}
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </Button>
              )}
              
              <Button 
                variant="default"
                onClick={() => onCloseConversation(conversation.sessionId)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Cerrar Caso
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

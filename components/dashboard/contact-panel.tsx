"use client";

import { useState } from "react";
import { MCPConversation, MCPChatMessage } from "@/types/mcp";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatTime } from "@/lib/date-utils";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  User,
  FileText,
  MessageSquare,
  CheckCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Clock,
  Building,
  IdCard,
  Bot,
  Pause,
  AlertCircle,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/lib/actions/conversations";

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
  onPauseConversation,
}: ContactPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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

  const metadata = conversation.metadata as { escalationReason?: string } | null;
  const escalationReason = metadata?.escalationReason;
  const client = conversation.client ?? { name: null, identification: null, contract: null, email: null, phone: null };
  const timestamps = conversation.timestamps ?? { createdAt: null, updatedAt: null, escalatedAt: null, closedAt: null, handedOverAt: null };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const getWhatsAppMessage = () => {
    const clientName = client.name || "estimado cliente";
    const contract = client.contract ? ` (Contrato: ${client.contract})` : "";

    const message = `Hola ${clientName}${contract}, soy ${conversation.agent?.name || "un agente"} de SISPROT. Me comunico con usted en respuesta a su solicitud reciente. ¿En qué puedo ayudarle?`;

    return encodeURIComponent(message);
  };

  const getWhatsAppLink = () => {
    const cleanPhone = client.phone?.replace(/[^0-9]/g, "") || "";
    const message = getWhatsAppMessage();
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const getEmailLink = () => {
    const clientName = client.name || "Estimado cliente";
    const contract = client.contract ? ` - Contrato: ${client.contract}` : "";
    const subject = encodeURIComponent(`SISPROT - Seguimiento a su solicitud${contract}`);

    const body = encodeURIComponent(
      `Estimado/a ${clientName},\n\n` +
      `Me comunico con usted en respuesta a su solicitud reciente.\n\n` +
      `${escalationReason ? `Motivo de su consulta: ${escalationReason}\n\n` : ""}` +
      `Quedamos atentos a su respuesta para poder asistirle.\n\n` +
      `Saludos cordiales,\n` +
      `${conversation.agent?.name || "Equipo de Soporte"}\n` +
      `SISPROT`
    );

    return `mailto:${client.email}?subject=${subject}&body=${body}`;
  };

  const handleCloseConversation = async () => {
    try {
      await onCloseConversation(conversation.sessionId);
    } catch {
      toast.error("Error al cerrar la conversación");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">
                {client.name || "Sin nombre"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                {conversation.status === "closed" && (
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {conversation.closedBy === "system" ? "Cerrada por inactividad" : "Cerrada"}
                  </Badge>
                )}
                {conversation.status === "active" && (
                  <Badge variant="default" className="bg-green-500">
                    <Bot className="h-3 w-3 mr-1" />
                    Atendida por IA
                  </Badge>
                )}
                {conversation.status === "paused" && (
                  <Badge variant="secondary">
                    <Pause className="h-3 w-3 mr-1" />
                    Pausada
                  </Badge>
                )}
                {conversation.status === "waiting_specialist" && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Esperando Agente
                  </Badge>
                )}
                {conversation.status === "handed_over" && (
                  <>
                    <Badge variant="default" className="bg-blue-500">
                      <User className="h-3 w-3 mr-1" />
                      Atendida por Agente
                    </Badge>
                    {conversation.agent?.name && (
                      <span className="text-xs">
                        por {conversation.agent.name}
                      </span>
                    )}
                  </>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contactar Cliente
                </CardTitle>
                <CardDescription>
                  Selecciona el método de contacto preferido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {}
                {client.phone && (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.phone}</p>
                    </div>
                    {}
                  </div>
                )}

                {}
                {client.email && (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.email}</p>
                    </div>
                    {}
                  </div>
                )}
              </CardContent>
            </Card>

            {}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <IdCard className="h-5 w-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {client.identification && (
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Identificación</p>
                        <p className="font-medium">{client.identification}</p>
                      </div>
                    </div>
                  )}
                  {client.contract && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contrato</p>
                        <p className="font-medium">{client.contract}</p>
                      </div>
                    </div>
                  )}
                  {timestamps.escalatedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Escalada</p>
                        <p className="font-medium">
                          {formatDateTime(new Date(timestamps.escalatedAt))}
                        </p>
                      </div>
                    </div>
                  )}
                  {timestamps.handedOverAt && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tomada</p>
                        <p className="font-medium">
                          {formatDateTime(new Date(timestamps.handedOverAt))}
                        </p>
                      </div>
                    </div>
                  )}
                  {conversation.glpiTicketId && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ticket GLPI</p>
                        <p className="font-medium">#{conversation.glpiTicketId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {}
            {escalationReason && (
              <Card className="border-yellow-200 dark:border-yellow-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <FileText className="h-5 w-5" />
                    Motivo de Escalación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{escalationReason}</p>
                </CardContent>
              </Card>
            )}

            {/* Resumen e Historial Rápido */}
            {(conversation.summary || messages.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Resumen de la Conversación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {conversation.summary && (
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                      <p className="text-sm font-medium">{conversation.summary}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">Historial completo:</p>
                    {messages.length === 0 ? (
                      <div className="py-4 text-center border-2 border-dashed rounded-lg">
                        <p className="text-xs text-muted-foreground italic">Cargando mensajes o sin historial...</p>
                      </div>
                    ) : (
                      messages.map((m, idx) => (
                        <div key={m.id || idx} className="text-sm border-l-2 border-primary/30 pl-3 py-1 bg-background/50 rounded-r-md">
                          <p className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase">
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
                          <p className="text-muted-foreground leading-relaxed text-xs">
                            {m.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {}
            {messages.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Historial de Chat ({messages.length} mensajes)
                  </CardTitle>
                  <CardDescription>
                    Conversación entre el cliente y la IA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {messages.map((message, index) => (
                      <MessageBubble key={message.id || `msg-${index}`} message={message} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {}
        {conversation.status !== "closed" && (
          <div className="p-4 border-t bg-muted/30 shrink-0 space-y-4">
            {conversation.status === "handed_over" && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe una respuesta interna o al cliente..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  {isSending ? "Enviando..." : "Enviar"}
                </Button>
              </form>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                ¿Cliente atendido satisfactoriamente?
              </p>
              <div className="flex gap-2">
                {onPauseConversation && conversation.status !== "paused" && conversation.status !== "handed_over" && (
                  <Button
                    variant="outline"
                    className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                    onClick={() => onPauseConversation(conversation.sessionId)}
                  >
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                )}
                {(conversation.status === "paused" || conversation.status === "handed_over") && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleCloseConversation}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Cerrar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({ message }: { message: MCPChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const formatContent = (content: string) => {
    if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap font-mono p-1.5 bg-black/5 rounded border border-black/10 mt-1 max-w-full">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-1 w-full">
        <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 h-5 bg-muted/50 text-muted-foreground border-dashed">
          {formatContent(message.content)}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted text-muted-foreground rounded-tl-none border border-border/50"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap wrap-break-word">{formatContent(message.content)}</div>
        ) : (
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:underline [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_h1]:my-2 [&_h2]:my-1.5 [&_h3]:my-1">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                  >
                    {children}
                  </a>
                ),
                p: ({ children }) => <p className="my-1">{children}</p>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <div
          className={cn(
            "text-[10px] mt-1 flex justify-end opacity-70",
            isUser ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {formatTime(new Date(message.createdAt))}
        </div>
      </div>
    </div>
  );
}

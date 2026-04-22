"use client";

import { useState } from "react";
import { MCPConversation } from "@/types/mcp";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, 
  User, 
  SendHorizontal, 
  MoreVertical,
  Phone,
  Video,
  Loader2,
  MessageCircle,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/lib/actions/conversations";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDashboardMessages } from "@/hooks";

interface ChatWindowProps {
  conversation: MCPConversation;
  onTakeControl?: () => Promise<void>;
}

export function ChatWindow({ conversation, onTakeControl }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTakingControl, setIsTakingControl] = useState(false);
  const [sendMode, setSendMode] = useState<"whatsapp" | "bridge">("whatsapp");

  // El ChatWindow ahora es el dueño de sus mensajes y su tiempo real
  const { messages, isMessagesLoading, refresh } = useDashboardMessages({ 
    conversationId: conversation.id,
    isActive: true 
  });

  const handleTakeControl = async () => {
    if (!onTakeControl || isTakingControl) return;
    setIsTakingControl(true);
    try {
      await onTakeControl();
    } finally {
      setIsTakingControl(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const result = await sendMessage(conversation.id, newMessage, sendMode) as any;
      if (result.success) {
        setNewMessage("");
        await refresh(); // Forzar actualización del historial
        if (result.warning) toast.warning(result.warning);
      } else {
        toast.error(result.error || "Error al enviar mensaje");
      }
    } catch (error) {
      toast.error("Error inesperado al enviar mensaje");
    } finally {
      setIsSending(false);
    }
  };

  const statusLabel = conversation.status === "handed_over" 
    ? "🤝 Puente Activo" 
    : `🤖 IA: ${conversation.status?.toUpperCase() || 'BUSY'}`;

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-background overflow-hidden animate-in fade-in duration-500">
      {/* Header compactado */}
      <header className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {conversation.client?.name?.[0] || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{conversation.client?.name || "Cliente"}</h3>
              <Badge variant="outline" className={cn(
                "text-[10px] px-1.5 py-0 h-4 border-primary/20",
                conversation.status === "handed_over" ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500 animate-pulse"
              )}>
                {statusLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">En línea</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
            <MoreVertical className="h-4 w-4" />
          </Button>
          {conversation.status !== "handed_over" && conversation.status !== "closed" && (
            <Button 
              onClick={handleTakeControl}
              disabled={isTakingControl}
              className="ml-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 h-9 animate-in fade-in zoom-in duration-300"
            >
              {isTakingControl ? "Tomando..." : "TOMAR CONTROL"}
            </Button>
          )}
        </div>
      </header>

      {/* Messages con scroll interno bloqueado */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-muted/5">
        <ScrollArea className="h-full w-full">
        <div className="px-4 py-6 space-y-6 max-w-5xl mx-auto">
          {isMessagesLoading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="h-10 w-10 text-primary animate-spin relative" />
              </div>
              <p className="text-sm font-medium">Reformulando historial de Supabase...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-40">
              <div className="p-4 rounded-full bg-muted">
                <Bot className="h-8 w-8" />
              </div>
              <p className="text-sm">Sin historial previo. Esperando mensajes...</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isAI = m.role === "assistant" || m.role === "model";
              const isAgent = m.role === "agent";
              
              return (
                <div 
                  key={m.id || idx} 
                  className={cn(
                    "flex flex-col max-w-[80%] gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200",
                    (isAI || isAgent) ? "items-end ml-auto" : "items-start"
                  )}
                >
                  <div 
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md",
                      (isAI || isAgent) 
                        ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                        : "bg-card text-foreground rounded-tl-none border border-border/60"
                    )}
                  >
                    {m.content}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 px-1",
                    (isAI || isAgent) ? "flex-row-reverse" : "flex-row"
                  )}>
                    <span className="text-[10px] font-bold text-primary/70 uppercase">
                      {isAI ? "Susana" : isAgent ? (m.authorName || "Agente") : "Cliente"}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 font-medium">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Reciente"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </ScrollArea>
      </div>

      {/* Input compacto */}
      <footer className="p-3 border-t border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="max-w-5xl mx-auto mb-3 flex items-center gap-2">
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/40 backdrop-blur-sm self-start shadow-inner">
                <Button
                    type="button"
                    variant={sendMode === "whatsapp" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSendMode("whatsapp")}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[10px] font-bold transition-all gap-1.5 uppercase tracking-wider",
                        sendMode === "whatsapp" ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20" : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    <MessageCircle className="h-3 w-3" />
                    Whatsapp
                </Button>
                <Button
                    type="button"
                    variant={sendMode === "bridge" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSendMode("bridge")}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[10px] font-bold transition-all gap-1.5 uppercase tracking-wider",
                        sendMode === "bridge" ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    <Globe className="h-3 w-3" />
                    PY FAST
                </Button>
            </div>
            
            {sendMode === "whatsapp" && conversation.client?.phone && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/30 px-2 py-0.5 rounded-md border border-border/20">
                        Destino: {conversation.client.phone}
                    </span>
                </div>
            )}
            
            {sendMode === "whatsapp" && !conversation.client?.phone && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/5 px-2 py-0.5 rounded-md border border-red-500/10">
                        ⚠ Sin teléfono configurado
                    </span>
                </div>
            )}
        </div>

        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto relative group">
          <Input
            placeholder={sendMode === "whatsapp" ? "Escribe por WhatsApp..." : "Escribe por el canal web..."}
            className="h-12 pl-6 pr-14 bg-background border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all shadow-sm group-hover:shadow-md"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
          />
          <Button 
            type="submit" 
            disabled={isSending || !newMessage.trim() || (sendMode === "whatsapp" && !conversation.client?.phone)}
            size="icon"
            className={cn(
                "absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg",
                sendMode === "whatsapp" 
                    ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" 
                    : "bg-primary hover:bg-primary/90 shadow-primary/20"
            )}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex items-center justify-center gap-4 mt-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-40">
              Shift + Enter para nueva línea • Canal actual: <span className="text-primary font-black">{sendMode === "whatsapp" ? "WhatsApp" : "Web Bridge"}</span>
            </p>
        </div>
      </footer>
    </div>
  );
}

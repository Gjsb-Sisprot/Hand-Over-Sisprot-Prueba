"use client";

import { useState } from "react";
import { MCPConversation, MCPChatMessage } from "@/types/mcp";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, 
  User, 
  SendHorizontal, 
  MoreVertical,
  Phone,
  Video,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/lib/actions/conversations";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatWindowProps {
  conversation: MCPConversation;
  messages: MCPChatMessage[];
  onTakeControl?: () => Promise<void>;
  isLoading?: boolean;
}

export function ChatWindow({ conversation, messages, onTakeControl, isLoading }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTakingControl, setIsTakingControl] = useState(false);

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
      const result = await sendMessage(conversation.sessionId, newMessage) as { success: boolean, error?: string, warning?: string };
      if (result.success) {
        setNewMessage("");
        if (result.warning) {
          toast.warning(result.warning);
        }
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
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="h-[72px] border-b border-border px-6 flex items-center justify-between shrink-0 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.client?.name?.[0] || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{conversation.client?.name || "Cliente"}</h3>
              <Badge variant="outline" className={cn(
                "text-[9px] px-1.5 py-0 h-4 border-primary/20",
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
          <Button className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-9">
            Resolver
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="h-10 w-10 text-primary animate-spin relative" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Recuperando historial unificado...</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Buscando sesiones previas</p>
              </div>
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
              const isUser = m.role === "user";
              
              // Determinar el nombre a mostrar
              let displayAuthor = "Cliente";
              if (isAI) displayAuthor = "Susana (IA)";
              if (isAgent) displayAuthor = m.authorName || "Agente";
              if (isUser) displayAuthor = conversation.client?.name || "Cliente";

              return (
                <div 
                  key={m.id || idx} 
                  className={cn(
                    "flex flex-col max-w-[85%] gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    (isAI || isAgent) ? "items-end ml-auto" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5 px-1">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter",
                      (isAI || isAgent) ? "text-primary text-right" : "text-muted-foreground"
                    )}>
                      {displayAuthor}
                    </span>
                  </div>
                  <div 
                    className={cn(
                      "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md",
                      isAI 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : isAgent
                        ? "bg-orange-600 text-white rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border border-border/50"
                    )}
                  >
                    {m.content}
                  </div>
                  <div className="flex items-center gap-1.5 px-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground/60 font-medium">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Reciente"}
                    </span>
                    {isAgent && <span className="h-1 w-1 rounded-full bg-orange-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <footer className="p-6 bg-background/80 backdrop-blur-sm border-t border-border shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
          <Input
            placeholder="Escribe tu mensaje aquí..."
            className="h-14 pl-6 pr-16 bg-card border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all shadow-sm group-hover:shadow-md"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
          />
          <Button 
            type="submit" 
            disabled={isSending || !newMessage.trim()}
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest font-bold">
          Shift + Enter para nueva línea • Inicia con / para respuestas rápidas
        </p>
      </footer>
    </div>
  );
}

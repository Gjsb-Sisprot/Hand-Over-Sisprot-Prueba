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
  Video
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
}

export function ChatWindow({ conversation, messages }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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
            <h3 className="text-sm font-semibold">{conversation.client?.name || "Cliente"}</h3>
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
          <Button className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-9">
            Resolver
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-40">
              <div className="p-4 rounded-full bg-muted">
                <Bot className="h-8 w-8" />
              </div>
              <p className="text-sm">Esperando nuevos mensajes...</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isAI = m.role !== "user";
              return (
                <div 
                  key={m.id || idx} 
                  className={cn(
                    "flex flex-col max-w-[80%] gap-1",
                    isAI ? "items-end ml-auto" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {!isAI && <span className="text-[10px] font-bold text-muted-foreground uppercase">{conversation.client?.name}</span>}
                    {isAI && <span className="text-[10px] font-bold text-primary uppercase">Susana (SGF)</span>}
                  </div>
                  <div 
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                      isAI 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border border-border/50"
                    )}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
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

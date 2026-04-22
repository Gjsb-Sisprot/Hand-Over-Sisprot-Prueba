"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPayFastConversation, sendPayFastBridgeMessage } from "@/lib/actions/conversations";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface PayFastBridgeChatProps {
  identification: string;
  clientName: string;
  onClose: () => void;
}

export function PayFastBridgeChat({ identification, clientName, onClose }: PayFastBridgeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const res = await getPayFastConversation(identification);
      if (res.success && res.conversation) {
        setConversationId(res.conversation.id);
        setStatus(res.conversation.status);
        loadHistory(res.conversation.id);
        subscribeToMessages(res.conversation.id);
      }
    }
    init();
  }, [identification]);

  const loadHistory = async (convId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_logs")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    
    if (data) setMessages((data as any[]).map((msg: any) => ({ 
      id: String(msg.id),
      role: msg.role || "",
      content: msg.content || "",
      created_at: msg.created_at || new Date().toISOString()
    })) as Message[]);
  };

  const subscribeToMessages = (convId: string) => {
    const supabase = createClient();
    const channel = supabase
      .channel(`payfast-chat-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_logs",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [...prev, { 
            id: String(newMsg.id),
            role: newMsg.role || "",
            content: newMsg.content || "",
            created_at: newMsg.created_at || new Date().toISOString()
          } as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    setIsLoading(true);
    const res = await sendPayFastBridgeMessage(conversationId, input);
    if (res.success) {
      setInput("");
      // Si el estado no era handed_over, lo actualizamos localmente
      if (status !== "handed_over") {
        setStatus("handed_over");
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[500px] w-[400px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-sidebar text-sidebar-foreground p-4 flex justify-between items-center border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-lg shadow-primary/20">
            SGF
          </div>
          <div>
            <h3 className="text-sm font-bold truncate max-w-[150px]">{clientName}</h3>
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold">
              {status === "handed_over" ? "🤝 Puente Activo" : `🤖 IA: ${status}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status !== "handed_over" && status !== "closed" && (
            <Button 
              size="sm" 
              variant="default" 
              onClick={async () => {
                if (!conversationId) return;
                setIsLoading(true);
                const res = await sendPayFastBridgeMessage(conversationId, "--- Agente ha tomado el control del puente ---");
                if (res.success) setStatus("handed_over");
                setIsLoading(false);
              }}
              className="h-7 px-2 text-[10px] font-bold"
            >
              TOMAR CONTROL
            </Button>
          )}
          <button onClick={onClose} className="hover:bg-muted p-1 rounded-full transition-colors ml-1">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
        {messages.length === 0 ? (
          <div className="text-center py-10 opacity-40">
            <p className="text-sm">No hay mensajes en esta sesión de Pay-Fast</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.role === "model";
            const isUser = msg.role === "user";
            
            if (msg.role === "system") return null;

            return (
              <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                  isAgent 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted text-foreground rounded-tl-none border border-border/50"
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <span className={`text-[9px] mt-1 block opacity-60 uppercase font-bold`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Mensaje para el cliente..."
            className="rounded-xl border-border/50 bg-background"
            disabled={!conversationId}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || !conversationId || isLoading}
            className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

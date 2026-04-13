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
    
    if (data) setMessages(data.map(msg => ({ ...msg, id: String(msg.id) })) as Message[]);
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
          setMessages((prev) => [...prev, { ...newMsg, id: String(newMsg.id) } as Message]);
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
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[500px] w-[400px] bg-white border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-black text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            SF
          </div>
          <div>
            <h3 className="text-sm font-bold truncate max-w-[200px]">{clientName}</h3>
            <p className="text-[10px] text-blue-300 uppercase tracking-wider">Puente Pay-Fast • {status}</p>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No hay mensajes en esta sesión de Pay-Fast</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.role === "model";
            const isUser = msg.role === "user";
            
            if (msg.role === "system") return null;

            return (
              <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  isAgent 
                    ? "bg-black text-white rounded-tr-none" 
                    : "bg-white border text-gray-800 rounded-tl-none shadow-sm"
                }`}>
                  <p>{msg.content}</p>
                  <span className={`text-[10px] mt-1 block ${isAgent ? "text-gray-400" : "text-gray-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Mensaje para el cliente..."
            className="rounded-xl border-gray-200"
            disabled={!conversationId}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || !conversationId || isLoading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

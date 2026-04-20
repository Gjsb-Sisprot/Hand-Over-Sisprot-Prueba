"use client";

import { useState } from "react";
import { MCPConversation, MCPChatMessage } from "../../types/mcp";
import { 
  getConversations, 
  takeoverConversation, 
  getChatHistory,
  closeConversation,
  pauseConversation
} from "../../lib/actions/conversations";
import { ConversationCard } from "./conversation-card";
import { ContactPanel } from "./contact-panel";
import { TakeoverDialog } from "./takeover-dialog";
import { CloseDialog } from "./close-dialog";
import { PauseDialog } from "./pause-dialog";
import { toast } from "sonner";
import { useRealtimeMessages } from "../../hooks/use-realtime-messages";
import { useRealtimeConversations } from "../../hooks/use-realtime-conversations";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Loader2, Inbox, Clock, CheckCircle2, Search, MessageSquareX, Bot, User } from "lucide-react";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

interface ConversationListProps {
  initialConversations: MCPConversation[];
  agent: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

type TabType = "escalated" | "active" | "mine" | "paused";

import { ChatWindow } from "./chat-window";
import { ClientDetailPanel } from "./client-detail-panel";
import { sendPayFastBridgeMessage } from "../../lib/actions/conversations";

export function ConversationList({ 
  initialConversations,
  agent 
}: ConversationListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("escalated");
  const [activeConversation, setActiveConversation] = useState<MCPConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<MCPChatMessage[]>([]);
  const [conversationToTake, setConversationToTake] = useState<MCPConversation | null>(null);
  const [conversationToClose, setConversationToClose] = useState<MCPConversation | null>(null);
  const [conversationToPause, setConversationToPause] = useState<MCPConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { 
    conversations, 
    isLoading, 
    refresh, 
    optimisticUpdate 
  } = useRealtimeConversations({
    initialData: initialConversations
  });

  const { messages: realtimeMessages } = useRealtimeMessages({
    sessionId: activeConversation?.sessionId || null,
    initialMessages: chatMessages,
    isActive: !!activeConversation
  });

  const handleConversationClick = async (
    conversation: MCPConversation
  ) => {
    if (activeConversation?.sessionId === conversation.sessionId) {
      return;
    }

    setIsLoadingHistory(true);
    try {
      const messages = await getChatHistory(conversation.sessionId);
      setChatMessages(messages);
      setActiveConversation(conversation);
    } catch (error) {
      toast.error("Error al cargar el historial");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleConfirmTakeover = async () => {
    if (!conversationToTake) return;

    optimisticUpdate(conversationToTake.sessionId, {
      status: "handed_over",
      agent: {
        email: agent?.email || "",
        name: agent?.name || "",
        takenAt: new Date().toISOString(),
      },
    });

    setIsLoadingHistory(true);
    try {
      const messages = await getChatHistory(conversationToTake.sessionId);
      const transcript = messages
        .map((m) => `${m.role === "user" ? "Cliente" : "IA"}: ${m.content}`)
        .join("\n");

      const metadata = (conversationToTake.metadata || {}) as {
        escalationReason?: string;
      };
      
      const baseSummary = conversationToTake.summary || metadata.escalationReason || "Sin resumen";
      const fullSummary = `${baseSummary}\n\n--- TRANSCRIPCIÓN ---\n${transcript}`.trim();

      const result = await takeoverConversation(conversationToTake.sessionId, {
        createTicket: true,
        reason: metadata.escalationReason,
        ticketSummary: fullSummary,
      });

      if (result.error) {
        toast.error(result.error);
        refresh();
        return;
      }

      if (result.glpiTicketId) {
        optimisticUpdate(conversationToTake.sessionId, { glpiTicketId: result.glpiTicketId });
      }

      setChatMessages(messages);

      const updatedConversation: MCPConversation = {
        ...conversationToTake,
        status: "handed_over",
        glpiTicketId: result.glpiTicketId || conversationToTake.glpiTicketId,
        agent: {
          email: agent?.email || "",
          name: agent?.name || "",
          takenAt: new Date().toISOString(),
        },
        timestamps: {
          ...conversationToTake.timestamps,
          handedOverAt: new Date().toISOString(),
        },
      };

      setConversationToTake(null);
      setActiveConversation(updatedConversation);

      toast.success("¡Conversación tomada! Ya puedes contactar al cliente.");
    } catch (error) {
      toast.error("Error al procesar el traspaso");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCloseConversation = async (
    conversationId: string,
    resolution: string,
    options?: {
      createTicket?: boolean;
      ticketTypeId?: number;
      ticketTypeName?: string;
      ticketSummary?: string;
    }
  ) => {
    optimisticUpdate(conversationId, {
      status: "closed",
      closedBy: "agent",
    });

    setActiveConversation(null);
    setConversationToClose(null);
    toast.success("Conversación cerrada exitosamente");

    const currentMessages = await getChatHistory(conversationId);
    const transcript = currentMessages
      .map((m) => `${m.role === "user" ? "Cliente" : "IA"}: ${m.content}`)
      .join("\n");
    
    const fullSummary = `${resolution}\n\n--- TRANSCRIPCIÓN ---\n${transcript}`.trim();

    const result = await closeConversation(conversationId, resolution, {
      closedBy: "agent",
      createTicket: options?.createTicket ?? true,
      ticketTypeId: options?.ticketTypeId,
      ticketTypeName: options?.ticketTypeName,
      ticketSummary: fullSummary,
    });

    if (result.error) {
      toast.error(result.error);
      refresh();
    }
  };

  const handlePauseConversation = async (
    conversationId: string,
    reason: string,
    options?: {
      createTicket?: boolean;
      ticketTypeId?: number;
      ticketTypeName?: string;
      ticketSummary?: string;
    }
  ) => {
    optimisticUpdate(conversationId, { status: "paused" });

    setActiveConversation(null);
    setConversationToPause(null);
    toast.success("Conversación pausada exitosamente");

    const currentMessages = await getChatHistory(conversationId);
    const transcript = currentMessages
      .map((m) => `${m.role === "user" ? "Cliente" : "IA"}: ${m.content}`)
      .join("\n");
      
    const fullSummary = `${reason}\n\n--- TRANSCRIPCIÓN ---\n${transcript}`.trim();

    const result = await pauseConversation(conversationId, reason, {
      createTicket: options?.createTicket ?? true,
      ticketTypeId: options?.ticketTypeId,
      ticketTypeName: options?.ticketTypeName,
      ticketSummary: fullSummary,
    });

    if (result.error) {
      toast.error(result.error);
      refresh();
    }
  };

  const handleBridgeTakeover = async (conv: MCPConversation) => {
    const res = await sendPayFastBridgeMessage(conv.id, "--- Agente ha tomado el control del puente desde el Dashboard ---");
    if (res.success) {
      optimisticUpdate(conv.sessionId, { status: "handed_over" });
      setActiveConversation({ ...conv, status: "handed_over" });
      toast.success("Control del puente tomado exitosamente");
    } else {
      toast.error(res.error || "Error al tomar control del puente");
    }
  };

  const filteredConversations = conversations.filter(c => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.client?.name?.toLowerCase().includes(searchLower) ||
      c.client?.identification?.toLowerCase().includes(searchLower) ||
      c.client?.contract?.toLowerCase().includes(searchLower) ||
      c.sessionId.toLowerCase().includes(searchLower)
    );
  });

  const waitingEscalation = filteredConversations.filter(c => c.status === "waiting_specialist");
  const activeIA = filteredConversations.filter(c => c.status === "active");
  const inAttendence = filteredConversations.filter(c => c.status === "handed_over");
  const paused = filteredConversations.filter(c => c.status === "paused");

  const renderTabTrigger = (id: TabType, label: string, icon: React.ReactNode, count: number) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
        activeTab === id 
          ? "border-primary text-primary bg-primary/5 shadow-[inset_0_-2px_0_0_rgba(var(--primary),1)]" 
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <Badge 
          variant={id === "escalated" ? "destructive" : "secondary"} 
          className={cn("ml-1 h-4 min-w-[18px] justify-center px-1 text-[9px] rounded-full", id === "escalated" && "animate-pulse")}
        >
          {count}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="flex w-full h-full overflow-hidden bg-background">
      {/* Columna 1: Lista de Conversaciones (Sidebar Secundario) */}
      <div className="w-[350px] flex flex-col border-r border-border shrink-0 bg-card/10">
        <header className="p-6 border-b border-border space-y-4 shrink-0 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">Conversaciones</h2>
            <Badge variant="secondary" className="font-mono text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
              {conversations.length}
            </Badge>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por cliente o contrato..."
              className="pl-9 h-10 text-xs bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="flex border-b border-border bg-card/20 overflow-x-auto no-scrollbar shrink-0">
          {renderTabTrigger("escalated", "Esperando", <Inbox className="h-3.5 w-3.5" />, waitingEscalation.length)}
          {renderTabTrigger("mine", "En uso", <User className="h-3.5 w-3.5" />, inAttendence.length)}
          {renderTabTrigger("active", "Susana", <Bot className="h-3.5 w-3.5" />, activeIA.length)}
          {renderTabTrigger("paused", "Pausa", <MessageSquareX className="h-3.5 w-3.5" />, paused.length)}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-0">
            {activeTab === "escalated" && (
              <div>
                {waitingEscalation.length === 0 
                  ? <EmptyState title="Cero esperas" icon={<Inbox className="h-8 w-8 text-muted-foreground/20" />} description="No hay casos escalados." /> 
                  : waitingEscalation.map(c => (
                    <ConversationCard 
                      key={c.sessionId} 
                      conversation={c} 
                      onClick={() => handleConversationClick(c)} 
                      onTakeover={() => setConversationToTake(c)}
                      isSelected={activeConversation?.sessionId === c.sessionId}
                    />
                  ))}
              </div>
            )}

            {activeTab === "active" && (
              <div>
                {activeIA.length === 0 
                  ? <EmptyState title="Inactividad" icon={<Bot className="h-8 w-8 text-muted-foreground/20" />} description="Susana no está atendiendo a nadie." /> 
                  : activeIA.map(c => (
                    <ConversationCard 
                      key={c.sessionId} 
                      conversation={c} 
                      onClick={() => handleConversationClick(c)} 
                      onTakeover={() => setConversationToTake(c)}
                      isSelected={activeConversation?.sessionId === c.sessionId}
                    />
                  ))}
              </div>
            )}

            {activeTab === "mine" && (
              <div>
                {inAttendence.length === 0 
                  ? <EmptyState title="Sin atenciones" icon={<User className="h-8 w-8 text-muted-foreground/20" />} description="Toma un caso para comenzar." /> 
                  : inAttendence.map(c => (
                    <ConversationCard 
                      key={c.sessionId} 
                      conversation={c} 
                      onClick={() => handleConversationClick(c)} 
                      isSelected={activeConversation?.sessionId === c.sessionId}
                    />
                  ))}
              </div>
            )}

            {activeTab === "paused" && (
              <div>
                {paused.length === 0 
                  ? <EmptyState title="Sin pendientes" icon={<MessageSquareX className="h-8 w-8 text-muted-foreground/20" />} description="No hay casos guardados." /> 
                  : paused.map(c => (
                    <ConversationCard 
                      key={c.sessionId} 
                      conversation={c} 
                      onClick={() => handleConversationClick(c)} 
                      onTakeover={() => setConversationToTake(c)}
                      isSelected={activeConversation?.sessionId === c.sessionId}
                    />
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Columna 2: Área de Chat (Centro) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden bg-background">
        {activeConversation ? (
          <ChatWindow 
            conversation={activeConversation} 
            messages={realtimeMessages}
            onTakeControl={() => handleBridgeTakeover(activeConversation)}
            isLoading={isLoadingHistory}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
            <div className="p-8 rounded-full bg-muted shadow-inner">
              <MessageSquareX className="h-16 w-16" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-widest">Sin Selección</h3>
            <p className="max-w-xs text-center text-sm">Escoge una conversación de la izquierda para ver los detalles y responder.</p>
          </div>
        )}
      </div>

      {/* Columna 3: Detalles del Cliente (Derecha) */}
      {activeConversation && (
        <ClientDetailPanel
          conversation={activeConversation}
          onCloseConversation={() => setConversationToClose(activeConversation)}
          onPauseConversation={() => setConversationToPause(activeConversation)}
        />
      )}


      {conversationToTake && (
        <TakeoverDialog
          isOpen={!!conversationToTake}
          onClose={() => setConversationToTake(null)}
          onConfirm={handleConfirmTakeover}
          conversation={conversationToTake}
          agentName={agent?.name || undefined}
        />
      )}

      {conversationToClose && (
        <CloseDialog
          isOpen={!!conversationToClose}
          onClose={() => setConversationToClose(null)}
          onConfirm={(res, opts) => handleCloseConversation(conversationToClose.sessionId, res, opts)}
          conversation={conversationToClose}
        />
      )}

      {conversationToPause && (
        <PauseDialog
          isOpen={!!conversationToPause}
          onClose={() => setConversationToPause(null)}
          onConfirm={(reason, opts) => handlePauseConversation(conversationToPause.sessionId, reason, opts)}
          conversation={conversationToPause}
        />
      )}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-2xl bg-muted/5 border-border/50">
      {icon}
      <h3 className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <p className="mt-1 text-[10px] text-muted-foreground/60">{description}</p>
    </div>
  );
}


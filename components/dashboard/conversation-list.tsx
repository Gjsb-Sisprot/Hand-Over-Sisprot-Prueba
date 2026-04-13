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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Loader2, Inbox, Clock, CheckCircle2, Search, MessageSquareX } from "lucide-react";
import { Input } from "../ui/input";

interface ConversationListProps {
  initialConversations: MCPConversation[];
  agent?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export function ConversationList({ 
  initialConversations,
  agent 
}: ConversationListProps) {
  const [activeConversation, setActiveConversation] = useState<MCPConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<MCPChatMessage[]>([]);
  const [conversationToTake, setConversationToTake] = useState<MCPConversation | null>(null);
  const [conversationToClose, setConversationToClose] = useState<MCPConversation | null>(null);
  const [conversationToPause, setConversationToPause] = useState<MCPConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { 
    conversations, 
    isLoading, 
    refresh, 
    optimisticUpdate 
  } = useRealtimeConversations({
    initialConversations
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

    const messages = await getChatHistory(conversation.sessionId);
    setChatMessages(messages);
    setActiveConversation(conversation);
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

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Panel de Conversaciones</h2>
          <Badge variant="outline" className="font-mono">
            {conversations.length} total
          </Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, ID o contrato..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="escalated" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 border-b bg-muted/20">
          <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-6">
            <TabsTrigger value="escalated" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
              <Inbox className="h-4 w-4 mr-2" />
              Esperando
              {waitingEscalation.length > 0 && <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center">{waitingEscalation.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="active" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
              <Clock className="h-4 w-4 mr-2" />
              IA Activa
              {activeIA.length > 0 && <Badge variant="secondary" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center">{activeIA.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="mine" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
              <User className="h-4 w-4 mr-2" />
              En atención
              {inAttendence.length > 0 && <Badge variant="default" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center bg-blue-600">{inAttendence.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="paused" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">
              <MessageSquareX className="h-4 w-4 mr-2" />
              Pausadas
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="escalated" className="m-0 space-y-4">
              {waitingEscalation.length === 0 ? <EmptyState icon={<Inbox className="h-12 w-12 text-muted-foreground/30" />} title="No hay mensajes esperando" description="Las conversaciones escaladas aparecerán aquí." /> : waitingEscalation.map(c => <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />)}
            </TabsContent>
            <TabsContent value="active" className="m-0 space-y-4">
              {activeIA.length === 0 ? <EmptyState icon={<Bot className="h-12 w-12 text-muted-foreground/30" />} title="No hay IA activa" description="Las conversaciones siendo atendidas por Susana aparecerán aquí." /> : activeIA.map(c => <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />)}
            </TabsContent>
            <TabsContent value="mine" className="m-0 space-y-4">
              {inAttendence.length === 0 ? <EmptyState icon={<User className="h-12 w-12 text-muted-foreground/30" />} title="No tienes atenciones activas" description="Las conversaciones que tomes aparecerán aquí." /> : inAttendence.map(c => <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />)}
            </TabsContent>
            <TabsContent value="paused" className="m-0 space-y-4">
              {paused.length === 0 ? <EmptyState icon={<MessageSquareX className="h-12 w-12 text-muted-foreground/30" />} title="No hay pausas" description="Aquí verás los casos que quedaron pendientes." /> : paused.map(c => <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />)}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {activeConversation && (
        <ContactPanel
          conversation={activeConversation}
          messages={realtimeMessages}
          isOpen={!!activeConversation}
          onClose={() => setActiveConversation(null)}
          onCloseConversation={(id) => {
            setConversationToClose(activeConversation);
            return Promise.resolve();
          }}
          onPauseConversation={(id) => {
            setConversationToPause(activeConversation);
            return Promise.resolve();
          }}
        />
      )}

      {conversationToTake && (
        <TakeoverDialog
          isOpen={!!conversationToTake}
          onClose={() => setConversationToTake(null)}
          onConfirm={handleConfirmTakeover}
          conversation={conversationToTake}
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
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/10">
      {icon}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-[250px]">{description}</p>
    </div>
  );
}

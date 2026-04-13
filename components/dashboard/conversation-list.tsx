"use client";

import { useState, useMemo, useTransition, useCallback, useEffect } from "react";
import { Agent } from "@/types/database";
import { MCPConversation, MCPChatMessage } from "@/types/mcp";
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { ConversationCard } from "./conversation-card";"use client";

import { useState } from "react";
import { MCPConversation, MCPChatMessage } from "@/types/mcp";
import { 
  getConversations, 
  takeoverConversation, 
  getChatHistory,
  closeConversation,
  pauseConversation
} from "@/lib/actions/conversations";
import { ConversationCard } from "./conversation-card";
import { ContactPanel } from "./contact-panel";
import { TakeoverConfirmDialog } from "./takeover-confirm-dialog";
import { CloseDialog } from "./close-dialog";
import { PauseDialog } from "./pause-dialog";
import { toast } from "sonner";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Inbox, Clock, CheckCircle2, Search, MessageSquareX } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    // Si ya está activa, no hacemos nada más que abrir el panel
    if (activeConversation?.sessionId === conversation.sessionId) {
      return;
    }

    const messages = await getChatHistory(conversation.sessionId);
    setChatMessages(messages);
    setActiveConversation(conversation);
  };

  const handleConfirmTakeover = async () => {
    if (!conversationToTake) return;

    // Actualización optimista
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

  // Filtrado de conversaciones por búsqueda
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
            <TabsTrigger 
              value="escalated" 
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
            >
              <Inbox className="h-4 w-4 mr-2" />
              Esperando
              {waitingEscalation.length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center">
                  {waitingEscalation.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="active" 
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
            >
              <Clock className="h-4 w-4 mr-2" />
              IA Activa
              {activeIA.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center">
                  {activeIA.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="mine" 
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
            >
              <User className="h-4 w-4 mr-2" />
              En atención
              {inAttendence.length > 0 && (
                <Badge variant="default" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center bg-blue-600">
                  {inAttendence.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="paused" 
              className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
            >
              <MessageSquareX className="h-4 w-4 mr-2" />
              Pausadas
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="escalated" className="m-0 space-y-4">
              {waitingEscalation.length === 0 ? (
                <EmptyState icon={<Inbox className="h-12 w-12 text-muted-foreground/30" />} title="No hay mensajes esperando" description="Las conversaciones escaladas aparecerán aquí." />
              ) : (
                waitingEscalation.map(c => (
                  <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="m-0 space-y-4">
              {activeIA.length === 0 ? (
                <EmptyState icon={<Bot className="h-12 w-12 text-muted-foreground/30" />} title="No hay IA activa" description="Las conversaciones siendo atendidas por Susana aparecerán aquí." />
              ) : (
                activeIA.map(c => (
                  <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />
                ))
              )}
            </TabsContent>

            <TabsContent value="mine" className="m-0 space-y-4">
              {inAttendence.length === 0 ? (
                <EmptyState icon={<User className="h-12 w-12 text-muted-foreground/30" />} title="No tienes atenciones activas" description="Las conversaciones que tomes aparecerán aquí." />
              ) : (
                inAttendence.map(c => (
                  <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />
                ))
              )}
            </TabsContent>

            <TabsContent value="paused" className="m-0 space-y-4">
              {paused.length === 0 ? (
                <EmptyState icon={<MessageSquareX className="h-12 w-12 text-muted-foreground/30" />} title="No hay pausas" description="Aquí verás los casos que quedaron pendientes." />
              ) : (
                paused.map(c => (
                  <ConversationCard key={c.sessionId} conversation={c} onClick={() => handleConversationClick(c)} onTakeover={() => setConversationToTake(c)} />
                ))
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Diálogos y Paneles */}
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
        <TakeoverConfirmDialog
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

import { TakeoverDialog } from "./takeover-dialog";
import { PauseDialog } from "./pause-dialog";
import { CloseDialog } from "./close-dialog";
import { ContactPanel } from "./contact-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  takeoverConversation,
  pauseConversation,
  closeConversation,
  getChatHistory,
} from "@/lib/actions/conversations";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  AlertCircle,
  User,
  CheckCircle,
  Wifi,
  WifiOff,
  MessageSquare,
  Pause,
} from "lucide-react";

type FilterStatus = "all" | "active" | "waiting_specialist" | "handed_over" | "paused" | "closed" | "my_conversations";

function getStatusFilter(filter: FilterStatus): string | string[] | undefined {
  switch (filter) {
    case "all":
      return undefined;
    case "active":
      return "active";
    case "waiting_specialist":
      return "waiting_specialist";
    case "handed_over":
      return "handed_over";
    case "paused":
      return "paused";
    case "closed":
      return "closed";
    case "my_conversations":
      return undefined;
    default:
      return undefined;
  }
}

interface ConversationListProps {
  initialConversations: MCPConversation[];
  agent: Agent | null;
}

export function ConversationList({
  initialConversations,
  agent,
}: ConversationListProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const handleNewConversation = useCallback((conv: MCPConversation) => {
    if (conv.status === "waiting_specialist") {
      toast.info(`Nueva conversación de ${conv.client?.name || "Cliente"}`, {
        description: (conv.metadata as { escalationReason?: string })?.escalationReason || "Esperando agente",
      });
    }
  }, []);

  const handleConversationUpdated = useCallback((conv: MCPConversation) => {
    if (conv.status === "waiting_specialist" && !conv.agent) {
      toast.info(`Conversación actualizada: ${conv.client?.name || "Cliente"}`);
    }
  }, []);

  const { conversations, pagination, isConnected, isLoading, refresh, optimisticUpdate, removeFromList } = useRealtimeConversations({
    initialData: initialConversations,
    status: getStatusFilter(filterStatus),
    agentEmail: filterStatus === "my_conversations" ? agent?.email : undefined,
    includeAll: filterStatus === "all" || filterStatus === "closed" || filterStatus === "paused" || filterStatus === "my_conversations",
    onNewConversation: handleNewConversation,
    onConversationUpdated: handleConversationUpdated,
  });

  const [conversationToTake, setConversationToTake] =
    useState<MCPConversation | null>(null);
  const [conversationToPause, setConversationToPause] =
    useState<MCPConversation | null>(null);
  const [conversationToClose, setConversationToClose] =
    useState<MCPConversation | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<MCPConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<MCPChatMessage[]>([]);

  const { messages: realtimeMessages } = useRealtimeMessages({
    sessionId: activeConversation?.sessionId || null,
    initialMessages: chatMessages,
    pollingInterval: 5000,
    isActive: !!activeConversation,
  });

  useEffect(() => {
    if (!activeConversation?.sessionId) return;
    const fresh = conversations.find(c => c.sessionId === activeConversation.sessionId);
    if (fresh) {
      setActiveConversation(prev => {
        if (!prev) return fresh;
        if (JSON.stringify(prev) !== JSON.stringify(fresh)) return fresh;
        return prev;
      });
    }
  }, [conversations, activeConversation?.sessionId]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      return (
        conv.client?.name?.toLowerCase().includes(query) ||
        conv.client?.identification?.toLowerCase().includes(query) ||
        conv.client?.contract?.toLowerCase().includes(query) ||
        conv.client?.email?.toLowerCase().includes(query) ||
        conv.client?.phone?.includes(query) ||
        conv.summary?.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  const handleRefresh = () => {
    startTransition(() => {
      refresh();
      toast.success("Lista actualizada");
    });
  };

  const handleConversationClick = async (
    conversation: MCPConversation
  ) => {
    if (conversation.status === "waiting_specialist") {
      setConversationToTake(conversation);
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula, contrato, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
              isConnected
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}
            title={isConnected ? "Conectado en tiempo real" : "Conectando..."}
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isConnected ? "En vivo" : "Conectando"}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            disabled={isLoading}
          >
            Todas
            {filterStatus === "all" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-2">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("active")}
            className="gap-1"
            disabled={isLoading}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Con IA
            {filterStatus === "active" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-1">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterStatus === "waiting_specialist" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("waiting_specialist")}
            className="gap-1"
            disabled={isLoading}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Pendientes
            {filterStatus === "waiting_specialist" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-1">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterStatus === "handed_over" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("handed_over")}
            className="gap-1"
            disabled={isLoading}
          >
            <User className="h-3.5 w-3.5" />
            En Atención
            {filterStatus === "handed_over" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-1">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterStatus === "paused" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("paused")}
            className="gap-1"
            disabled={isLoading}
          >
            <Pause className="h-3.5 w-3.5" />
            Pausadas
            {filterStatus === "paused" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-1">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterStatus === "closed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("closed")}
            className="gap-1"
            disabled={isLoading}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Cerradas
            {filterStatus === "closed" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-1">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterStatus === "my_conversations" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("my_conversations")}
            className="gap-1"
            disabled={isLoading}
          >
            <User className="h-3.5 w-3.5" />
            Mis Conversaciones
            {filterStatus === "my_conversations" && pagination && !isLoading && (
              <Badge variant="secondary" className="ml-1">
                {pagination.totalItems}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {}
      <ScrollArea className="flex-1">
        <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
              <p className="text-lg font-medium">Cargando conversaciones...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay conversaciones</p>
              <p className="text-sm">
                {searchQuery
                  ? "No se encontraron resultados para tu búsqueda"
                  : "No hay conversaciones en este estado"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id || conversation.sessionId}
                conversation={conversation}
                onClick={() => handleConversationClick(conversation)}
                isSelected={activeConversation?.id === conversation.id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {}
      <TakeoverDialog
        conversation={conversationToTake}
        isOpen={!!conversationToTake}
        onClose={() => setConversationToTake(null)}
        onConfirm={handleConfirmTakeover}
        agentName={agent?.name || "Agente"}
      />

      <PauseDialog
        conversation={conversationToPause}
        isOpen={!!conversationToPause}
        onClose={() => setConversationToPause(null)}
        onConfirm={async (reason, options) => {
          if (!conversationToPause) return;
          await handlePauseConversation(
            conversationToPause.sessionId,
            reason,
            options
          );
        }}
      />

      <CloseDialog
        conversation={conversationToClose}
        isOpen={!!conversationToClose}
        onClose={() => setConversationToClose(null)}
        onConfirm={async (resolution, options) => {
          if (!conversationToClose) return;
          await handleCloseConversation(
            conversationToClose.sessionId,
            resolution,
            options
          );
        }}
      />

      {activeConversation && (
        <ContactPanel
          conversation={activeConversation}
          messages={realtimeMessages}
          isOpen={!!activeConversation}
          onClose={() => setActiveConversation(null)}
          onCloseConversation={async (id) => {
            setConversationToClose(activeConversation);
          }}
          onPauseConversation={async (id) => {
            setConversationToPause(activeConversation);
          }}
        />
      )}
    </div>
  );
}

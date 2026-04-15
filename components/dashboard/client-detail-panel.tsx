"use client";

import { MCPConversation } from "@/types/mcp";
import { 
  User, 
  IdCard, 
  Building, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  CreditCard,
  History,
  CheckCircle,
  Pause,
  ChevronRight,
  Mail,
  Phone
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/date-utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ClientDetailPanelProps {
  conversation: MCPConversation;
  onCloseConversation: (id: string) => void;
  onPauseConversation: (id: string) => void;
  onShowPayFast: () => void;
}

export function ClientDetailPanel({
  conversation,
  onCloseConversation,
  onPauseConversation,
  onShowPayFast
}: ClientDetailPanelProps) {
  const client = conversation.client ?? {};
  
  return (
    <div className="w-[380px] h-full flex flex-col bg-card/30 border-l border-border shrink-0 overflow-y-auto custom-scrollbar">
      {/* Client Identity */}
      <div className="p-8 flex flex-col items-center text-center space-y-4">
        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold uppercase">
            {client.name?.[0] || <User className="h-12 w-12" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{client.name || "Cliente sin nombre"}</h2>
          <p className="text-sm text-muted-foreground">Cliente Residencial</p>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border hover:border-primary hover:text-primary transition-all shadow-sm">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border hover:border-primary hover:text-primary transition-all shadow-sm">
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border hover:border-primary hover:text-primary transition-all shadow-sm">
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Main Actions */}
      <div className="p-6 grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2 border-orange-500/20 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10 hover:border-orange-500/40"
          onClick={() => onPauseConversation(conversation.sessionId)}
        >
          <Pause className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Pausar</span>
        </Button>
        <Button 
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 border-green-500/20 bg-green-500/5 text-green-600 hover:bg-green-500/10 hover:border-green-500/40"
          onClick={() => onCloseConversation(conversation.sessionId)}
        >
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Cerrar</span>
        </Button>
      </div>

      <Separator className="bg-border/50" />

      {/* Accordion Details */}
      <Accordion type="multiple" defaultValue={["contact", "conversation"]} className="px-6 pb-20">
        <AccordionItem value="contact" className="border-border/50">
          <AccordionTrigger className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:no-underline">
            Datos de Contacto
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <DetailItem icon={IdCard} label="Identificación" value={client.identification || "N/A"} />
            <DetailItem icon={Building} label="Contrato" value={client.contract || "N/A"} />
            <DetailItem icon={Phone} label="Móvil" value={client.phone || "N/A"} isLink href={`https://wa.me/${client.phone?.replace(/\D/g, "")}`} />
            <DetailItem icon={Mail} label="Email" value={client.email || "N/A"} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="conversation" className="border-border/50">
          <AccordionTrigger className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:no-underline">
            Información del Caso
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <DetailItem icon={History} label="Conversación ID" value={conversation.sessionId} />
            <DetailItem icon={Clock} label="Iniciada" value={conversation.timestamps?.createdAt ? formatDateTime(new Date(conversation.timestamps.createdAt)) : "N/A"} />
            {conversation.timestamps?.escalatedAt && (
               <DetailItem icon={Clock} label="Escalada" value={formatDateTime(new Date(conversation.timestamps.escalatedAt))} />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="actions" className="border-border/50">
          <AccordionTrigger className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:no-underline">
            Herramientas Externas
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            <ToolLink icon={CreditCard} label="PayFast Bridge" onClick={onShowPayFast} />
            <ToolLink 
              icon={ExternalLink} 
              label="Portal PayFast" 
              href={`https://payfast.sisprot.com/?search=${client.contract || client.identification}`} 
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, isLink, href }: { icon: any, label: string, value: string, isLink?: boolean, href?: string }) {
  const content = (
    <div className="flex items-center gap-3 group">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">{label}</p>
        <p className="text-sm font-medium leading-none">{value}</p>
      </div>
      {isLink && <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />}
    </div>
  );

  return isLink ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:no-underline translate-x-0 hover:translate-x-1 transition-transform">
      {content}
    </a>
  ) : content;
}

function ToolLink({ icon: Icon, label, onClick, href }: { icon: any, label: string, onClick?: () => void, href?: string }) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-primary/5 hover:border-primary/20 transition-all group">
      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold">{label}</span>
      <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:no-underline">
      {content}
    </a>
  ) : (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

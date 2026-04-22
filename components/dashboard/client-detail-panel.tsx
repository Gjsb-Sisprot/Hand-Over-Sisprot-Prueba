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


import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientDetailPanelProps {
  conversation: MCPConversation;
  onCloseConversation: (id: string) => void;
  onPauseConversation: (id: string, isEscalation?: boolean) => void;
}

export function ClientDetailPanel({
  conversation,
  onCloseConversation,
  onPauseConversation
}: ClientDetailPanelProps) {
  const client = conversation.client ?? {};
  
  return (
    <div className="w-[340px] h-full max-h-full flex flex-col bg-card/30 border-l border-border shrink-0 overflow-hidden">
      <ScrollArea className="flex-1 w-full h-full">
      {/* Client Identity compactado */}
      <div className="p-4 flex flex-col items-center text-center space-y-3">
        <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold uppercase">
            {client.name?.[0] || <User className="h-12 w-12" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{client.name || "Cliente sin nombre"}</h2>
          <p className="text-sm text-muted-foreground">Cliente Residencial</p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full px-2 mt-2">
          <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10 flex flex-col items-center justify-center space-y-1">
             <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Racha</p>
             <div className="flex gap-0.5">
               {[1, 2, 3, 4].map(i => <div key={i} className="h-2 w-2 rounded-full bg-primary" />)}
               {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-2 w-2 rounded-full bg-primary/20" />)}
             </div>
             <p className="text-[10px] font-bold text-primary">4/12 meses</p>
          </div>
          
          <div className="bg-green-500/5 rounded-2xl p-3 border border-green-500/10 flex flex-col items-center justify-center space-y-1">
             <p className="text-[8px] font-black uppercase tracking-widest text-green-600/60">Estatus Pago</p>
             <p className="text-lg font-black text-green-600">+5</p>
          </div>

          <div className="bg-orange-500/5 rounded-2xl p-3 border border-orange-500/10 flex flex-col items-center justify-center space-y-1">
             <p className="text-[8px] font-black uppercase tracking-widest text-orange-600/60">Promedio Pago</p>
             <p className="text-xs font-bold text-orange-700">Día 10</p>
          </div>

          <div className="bg-blue-500/5 rounded-2xl p-3 border border-blue-500/10 flex flex-col items-center justify-center space-y-1">
             <p className="text-[8px] font-black uppercase tracking-widest text-blue-600/60">Ciclo</p>
             <p className="text-xs font-bold text-blue-700">Día 15</p>
          </div>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Main Actions compactados */}
      <div className="p-4 grid grid-cols-1 gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="h-auto py-2 flex flex-col gap-1 border-blue-500/20 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 hover:border-blue-500/40"
            onClick={() => onPauseConversation(conversation.sessionId)}
          >
            <Pause className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Pausar</span>
          </Button>
          <Button 
            variant="outline"
            className="h-auto py-2 flex flex-col gap-1 border-green-500/20 bg-green-500/5 text-green-600 hover:bg-green-500/10 hover:border-green-500/40"
            onClick={() => onCloseConversation(conversation.sessionId)}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Cerrar</span>
          </Button>
        </div>
        <Button 
          variant="outline" 
          className="h-auto py-2 flex flex-col gap-0.5 border-orange-500/20 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10 hover:border-orange-500/40 w-full"
          onClick={() => onPauseConversation(conversation.sessionId, true)}
        >
          <History className="h-3.5 w-3.5" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em]">Escalamiento GLPI</span>
        </Button>
      </div>

      <Separator className="bg-border/50" />

      {/* Details Sections compactados */}
      <div className="px-4 pb-6 space-y-5 mt-4">
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Datos de Contacto</h3>
          <div className="space-y-3 pt-1">
            <DetailItem icon={IdCard} label="Identificación" value={client.identification || "12339072"} />
            <DetailItem icon={Building} label="Contrato" value={client.contract || "4929"} />
            <DetailItem icon={Phone} label="Móvil" value={client.phone || "N/A"} />
            <DetailItem icon={Mail} label="Email" value={client.email || "N/A"} />
          </div>
        </section>

        <Separator className="bg-border/30" />

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Información del Caso</h3>
          <div className="space-y-3 pt-1">
            <DetailItem icon={History} label="Conversación ID" value={conversation.sessionId} />
            <DetailItem icon={Clock} label="Iniciada" value={conversation.timestamps?.createdAt ? formatDateTime(new Date(conversation.timestamps.createdAt)) : "N/A"} />
          </div>
        </section>

        <Separator className="bg-border/30" />

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Contratos Asociados</h3>
          <div className="space-y-3">
            {(conversation.metadata as any)?.allContracts && (conversation.metadata as any).allContracts.length > 0 ? (
              (conversation.metadata as any).allContracts.map((contract: any) => (
                <div 
                  key={contract.contractId} 
                  className={`p-3 rounded-xl border transition-all ${
                    contract.contractId.toString() === client.contract?.toString() 
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                      : "bg-muted/10 border-border/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className={`h-3.5 w-3.5 ${contract.contractId.toString() === client.contract?.toString() ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-bold">#{contract.contractId}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] px-1.5 py-0 border-none uppercase ${
                        contract.isActive 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {contract.statusName || contract.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground opacity-70 font-semibold uppercase text-[8px]">Plan</p>
                      <p className="font-medium truncate">{contract.planName || "N/A"}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-muted-foreground opacity-70 font-semibold uppercase text-[8px]">Deuda</p>
                      <p className={`font-bold ${contract.hasDebt ? "text-orange-600" : "text-green-600"}`}>
                        ${contract.debt}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-1.5 opacity-60">
                    <Building className="h-3 w-3" />
                    <span className="text-[10px] truncate">{contract.sector || "N/A"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs">No hay información de otros contratos</p>
              </div>
            )}
          </div>
        </section>

        <Separator className="bg-border/30" />

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Herramientas Externas</h3>
          <div className="space-y-2 pt-1">
            <ToolLink 
              icon={ExternalLink} 
              label="Portal PayFast" 
              href={`https://payfast.sisprot.com/?search=${client.contract || client.identification}`} 
            />
          </div>
        </section>
      </div>
      </ScrollArea>
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

"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getVisitByTicketId, updateVisit, SupportVisit } from "@/lib/actions/visits";
import { XCircle, Calendar, Clock, User, AlertTriangle, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";
import { toast } from "sonner";

function CancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketId = searchParams.get("ticket");
  
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [visit, setVisit] = useState<SupportVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    async function loadVisit() {
      if (!ticketId) {
        setError("No se proporcionó un número de ticket válido.");
        setLoading(false);
        return;
      }

      try {
        const visitData = await getVisitByTicketId(ticketId);
        
        if (!visitData) {
          setError("No pudimos encontrar una visita asociada a este ticket.");
          setLoading(false);
          return;
        }

        setVisit(visitData);
        
        if (visitData.status === 'cancelled') {
          setIsCancelled(true);
        }
      } catch (err: any) {
        setError(err.message || "Ocurrió un error al cargar la visita.");
      } finally {
        setLoading(false);
      }
    }

    loadVisit();
  }, [ticketId]);

  const handleCancel = async () => {
    if (!visit) return;

    setCancelling(true);
    try {
      const { error: updateError } = await updateVisit(visit.id, { status: 'cancelled' });
      
      if (updateError) {
        throw new Error(updateError);
      }

      setIsCancelled(true);
      toast.success("Visita cancelada correctamente");
    } catch (err: any) {
      toast.error(err.message || "No se pudo cancelar la visita.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Cargando detalles de tu visita...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-6">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">¡Ups! Algo salió mal</h1>
        <p className="text-muted-foreground max-w-md mb-8">{error}</p>
        <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl">
          Volver al Inicio
        </Button>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <div className="inline-flex items-center justify-center p-4 bg-destructive/10 rounded-full mb-8 animate-in zoom-in duration-500">
            <XCircle className="h-20 w-20 text-destructive" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">Visita Cancelada</h1>
          <p className="text-lg text-muted-foreground mb-10">
            La visita técnica para el ticket <span className="font-bold text-foreground">#{ticketId}</span> ha sido cancelada correctamente.
          </p>
          <Button 
            onClick={() => router.push('/')} 
            variant="outline" 
            className="h-14 px-8 rounded-2xl text-lg font-bold border-2 hover:bg-muted"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-b from-background to-destructive/5">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-3 text-destructive italic uppercase">¿Cancelar Visita?</h1>
          <p className="text-lg text-muted-foreground">
            Lamentamos que no puedas recibirnos, <span className="font-bold text-foreground">{visit?.client_name}</span>.
          </p>
        </div>

        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[3rem] bg-card overflow-hidden">
          <CardContent className="p-8 md:p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-5 p-5 bg-muted/30 rounded-[2rem]">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fecha Agendada</p>
                  <p className="text-xl font-bold">
                    {visit && format(parseISO(visit.visit_date), "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 bg-muted/30 rounded-[2rem]">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Bloque Horario</p>
                  <p className="text-xl font-bold">
                    {visit && format(parseISO(visit.visit_date), "hh:mm aa")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 bg-muted/30 rounded-[2rem]">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Especialistas</p>
                  <p className="text-xl font-bold">
                    {visit?.technicians?.name || "Técnico por asignar"}
                    {visit?.technician_2?.name && ` y ${visit.technician_2.name}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <div className="p-6 bg-destructive/5 border border-destructive/10 rounded-3xl">
                <p className="text-sm font-medium text-destructive-foreground/80 leading-relaxed text-center italic">
                  &quot;Al cancelar esta visita, el técnico asignado será liberado para atender otras solicitudes. Si necesitas soporte más adelante, deberás generar un nuevo ticket.&quot;
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleCancel}
                  disabled={cancelling}
                  variant="destructive"
                  className="w-full h-20 rounded-[2rem] text-xl font-black shadow-2xl shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  {cancelling ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>CONFIRMAR CANCELACIÓN <Trash2 className="ml-3 h-6 w-6" /></>
                  )}
                </Button>
                
                <Button 
                  onClick={() => router.back()}
                  variant="ghost"
                  className="h-14 rounded-2xl text-muted-foreground font-bold hover:bg-transparent hover:text-foreground"
                >
                  Mantener mi visita agendada
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-12 text-sm text-muted-foreground">
          ¿Prefieres otro horario? <a href={`/reagendar?ticket=${ticketId}`} className="text-primary font-bold hover:underline">Reagendar visita</a>
        </p>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}

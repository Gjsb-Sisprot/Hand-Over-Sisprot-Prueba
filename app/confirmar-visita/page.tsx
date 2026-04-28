"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getVisitByTicketId, updateVisit, SupportVisit } from "@/lib/actions/visits";
import { CheckCircle2, Calendar, Clock, User, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticket");
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState<SupportVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    async function loadAndConfirm() {
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

        // Si ya está confirmada, solo mostramos el éxito
        if (visitData.status === 'confirmed') {
          setConfirmed(true);
          setLoading(false);
          return;
        }

        // Actualizamos a confirmado
        const { error: updateError } = await updateVisit(visitData.id, { status: 'confirmed' });
        
        if (updateError) {
          throw new Error(updateError);
        }

        setConfirmed(true);
      } catch (err: any) {
        setError(err.message || "Ocurrió un error al confirmar tu visita.");
      } finally {
        setLoading(false);
      }
    }

    loadAndConfirm();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Confirmando tu agenda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-6">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">¡Ups! Algo salió mal</h1>
        <p className="text-muted-foreground max-w-md mb-8">{error}</p>
        <Button onClick={() => window.location.href = '/'} variant="outline" className="rounded-xl">
          Volver al Inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-6 animate-bounce">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">¡Visita Confirmada!</h1>
          <p className="text-lg text-muted-foreground">
            Hola <span className="font-bold text-foreground">{visit?.client_name}</span>, hemos confirmado tu cita técnica exitosamente.
          </p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-card/50 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Fecha
                </p>
                <p className="text-lg font-semibold">
                  {visit && format(parseISO(visit.visit_date), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Hora Estimada
                </p>
                <p className="text-lg font-semibold">
                  {visit && format(parseISO(visit.visit_date), "hh:mm aa")}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl">
                <div className="bg-primary/10 p-3 rounded-xl text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Especialista Asignado</p>
                  <p className="font-bold text-lg">{visit?.technicians?.name || "Técnico por asignar"}</p>
                </div>
              </div>
            </div>

            <div className="bg-primary p-6 rounded-3xl text-primary-foreground shadow-lg shadow-primary/30">
              <p className="text-center text-sm font-medium opacity-90 italic">
                &quot;Nuestro equipo llegará a tu domicilio en el bloque horario indicado. Por favor, asegúrate de que haya una persona mayor de edad presente.&quot;
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-12 text-sm text-muted-foreground">
          ¿Necesitas cambiar la fecha? <a href={`/reagendar?ticket=${ticketId}`} className="text-primary font-bold hover:underline">Reagendar aquí</a>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}

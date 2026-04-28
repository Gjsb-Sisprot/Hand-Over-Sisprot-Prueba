"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getVisitByTicketId, updateVisit, SupportVisit } from "@/lib/actions/visits";
import { Calendar, Clock, AlertCircle, Loader2, ArrowRight, Save, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";
import { toast } from "sonner";

function RescheduleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketId = searchParams.get("ticket");
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [visit, setVisit] = useState<SupportVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

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
          setError("No pudimos encontrar la visita que deseas reagendar.");
          return;
        }
        setVisit(visitData);
        
        // Pre-poblar con la fecha actual si existe
        if (visitData.visit_date) {
          setNewDate(visitData.visit_date.split('T')[0]);
          setNewTime(visitData.visit_date.split('T')[1]?.substring(0, 5) || "12:00");
        }
      } catch (err: any) {
        setError("Ocurrió un error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }

    loadVisit();
  }, [ticketId]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;

    setUpdating(true);
    try {
      const updatedISO = `${newDate}T${newTime}:00.000Z`;
      
      const { error: updateError } = await updateVisit(visit.id, { 
        visit_date: updatedISO,
        status: 'rescheduled'
      });

      if (updateError) throw new Error(updateError);

      toast.success("Cita reagendada correctamente");
      router.push(`/confirmar-visita?ticket=${ticketId}`);
    } catch (err: any) {
      toast.error(err.message || "Error al reagendar");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Cargando tu agenda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold mb-2">Error al cargar</h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Button onClick={() => window.location.href = '/'} variant="outline">Volver</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 italic text-primary">Reagendar Visita</h1>
          <p className="text-muted-foreground">Elige el momento que mejor te convenga.</p>
        </div>

        <div className="space-y-6">
          {/* Cita Actual */}
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5 rounded-[2rem]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <History className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Cita Actual</p>
                  <p className="font-bold text-sm">
                    {visit && format(parseISO(visit.visit_date), "EEEE d 'de' MMMM, hh:mm aa", { locale: es })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de Reagendamiento */}
          <Card className="border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden">
            <CardHeader className="pt-10 pb-2 px-10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                Nueva Fecha y Hora
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-6">
              <form onSubmit={handleReschedule} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="pl-12 h-14 rounded-2xl bg-muted/30 border-none text-lg font-medium focus-visible:ring-primary/20"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Hora</Label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                      <Input
                        type="time"
                        required
                        className="pl-12 h-14 rounded-2xl bg-muted/30 border-none text-lg font-medium focus-visible:ring-primary/20"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full h-16 rounded-2xl bg-primary text-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                    disabled={updating}
                  >
                    {updating ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>Confirmar Cambio <ArrowRight className="ml-2 h-6 w-6" /></>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="h-12 text-muted-foreground font-bold"
                    onClick={() => router.back()}
                    disabled={updating}
                  >
                    Cancelar y mantener cita actual
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            <strong>Importante:</strong> Al reagendar, liberaremos tu espacio anterior para otros clientes. El nuevo horario está sujeto a la disponibilidad del técnico asignado.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    }>
      <RescheduleContent />
    </Suspense>
  );
}

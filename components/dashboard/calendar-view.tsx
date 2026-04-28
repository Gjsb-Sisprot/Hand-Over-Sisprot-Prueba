"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Filter,
  MoreVertical
} from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO
} from "date-fns";
import { es } from "date-fns/locale/es";
import { cn } from "@/lib/utils";
import { SupportVisit, Technician, getVisits } from "@/lib/actions/visits";
import { VisitDialog } from "./visit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface CalendarViewProps {
  technicians: Technician[];
}

export function CalendarView({ technicians }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visits, setVisits] = useState<SupportVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [currentCategory, setCurrentCategory] = useState<'support' | 'administration'>('support');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<SupportVisit | undefined>(undefined);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const start = startOfWeek(startOfMonth(currentMonth)).toISOString();
    const end = endOfWeek(endOfMonth(currentMonth)).toISOString();
    const data = await getVisits(start, end, currentCategory);
    setVisits(data);
    setLoading(false);
  }, [currentMonth, currentCategory]);

  useEffect(() => {
    fetchVisits();
  }, [currentMonth, fetchVisits]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("support_visits_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_visits"
        },
        () => {
          fetchVisits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVisits]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6 bg-card/40 backdrop-blur-sm p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-8 w-8 hover:bg-background rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="h-8 px-3 hover:bg-background rounded-lg text-xs font-medium"
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-8 w-8 hover:bg-background rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl mr-2">
            <Button
              variant={currentCategory === 'support' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCurrentCategory('support')}
              className={cn(
                "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                currentCategory === 'support' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
              )}
            >
              Soporte
            </Button>
            <Button
              variant={currentCategory === 'administration' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCurrentCategory('administration')}
              className={cn(
                "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                currentCategory === 'administration' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
              )}
            >
              Administración
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/40">
            <Filter className="h-4 w-4 ml-2 text-muted-foreground" />
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="bg-transparent border-none text-sm focus:ring-0 pr-8 py-1 rounded-lg"
            >
              <option value="all">Todos los técnicos</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <Button 
            onClick={() => {
              setSelectedVisit(undefined);
              setIsDialogOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            {currentCategory === 'support' ? 'Agendar Soporte' : 'Nueva Tarea Admin'}
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    return (
      <div className="grid grid-cols-7 gap-[1px] bg-border/40 border border-border/40 rounded-2xl overflow-hidden shadow-2xl">
        {calendarDays.map((d, i) => {
          const dayVisits = visits.filter(v => 
            isSameDay(parseISO(v.visit_date), d) && 
            (selectedTechnician === "all" || v.technician_id === selectedTechnician)
          );

          return (
            <div
              key={i}
              className={cn(
                "min-h-[140px] p-2 transition-colors relative group bg-card/60 hover:bg-card/80 backdrop-blur-sm",
                !isSameMonth(d, monthStart) && "bg-muted/10 text-muted-foreground/30",
                isSameDay(d, new Date()) && "bg-primary/5"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-sm font-semibold h-7 w-7 flex items-center justify-center rounded-lg transition-all",
                  isSameDay(d, new Date()) ? "bg-primary text-primary-foreground shadow-md" : "text-foreground/70"
                )}>
                  {format(d, "d")}
                </span>
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                {dayVisits.map((visit) => (
                  <div
                    key={visit.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVisit(visit);
                      setIsDialogOpen(true);
                    }}
                    className={cn(
                      "text-[10px] p-1.5 rounded-lg border cursor-pointer border-l-4 transition-all hover:scale-[1.02] active:scale-95 shadow-sm",
                      visit.status === 'completed' && "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400 border-l-green-500",
                      visit.status === 'cancelled' && "bg-destructive/10 border-destructive/50 text-destructive border-l-destructive",
                      visit.status === 'scheduled' && "bg-primary/10 border-primary/50 text-primary border-l-primary",
                      visit.status === 'in_progress' && "bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400 border-l-amber-500",
                      visit.status === 'confirmed' && "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 border-l-emerald-500",
                      visit.status === 'rescheduled' && "bg-violet-500/10 border-violet-500/50 text-violet-700 dark:text-violet-400 border-l-violet-500"
                    )}
                  >
                    <div className="font-bold truncate">{visit.client_name}</div>
                    <div className="flex items-center gap-1 opacity-80 truncate">
                      <Clock className="h-2 w-2" />
                      {format(parseISO(visit.visit_date), "HH:mm")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-2">
      {renderHeader()}
      <div className="flex-1 overflow-visible">
        {renderDays()}
        {loading ? (
          <div className="h-full min-h-[400px] flex items-center justify-center bg-card/20 rounded-2xl border border-dashed border-border/50">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground font-medium">Cargando cronograma...</span>
            </div>
          </div>
        ) : (
          renderCells()
        )}
      </div>

      <VisitDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchVisits}
        technicians={technicians}
        initialData={selectedVisit}
        defaultCategory={currentCategory}
      />
    </div>
  );
}

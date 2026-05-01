"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Filter,
  MoreVertical,
  Menu,
  X,
  Inbox,
  AlertCircle,
  FileText,
  MapPin,
  ChevronDown
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
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CalendarViewProps {
  technicians: Technician[];
}

export function CalendarView({ technicians }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [isMobile, setIsMobile] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [visits, setVisits] = useState<SupportVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [currentCategory, setCurrentCategory] = useState<'support' | 'administration'>('support');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<SupportVisit | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setViewMode('agenda');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const start = startOfWeek(startOfMonth(currentMonth)).toISOString();
    const end = endOfWeek(endOfMonth(currentMonth)).toISOString();
    const teamFilter = selectedTeam === "all" ? undefined : selectedTeam as 'Equipo A' | 'Equipo B';
    const data = await getVisits(start, end, currentCategory, teamFilter);
    setVisits(data);
    setLoading(false);
  }, [currentMonth, currentCategory, selectedTeam]);

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

  const selectedDayVisits = useMemo(() => {
    return visits.filter(v =>
      isSameDay(parseISO(v.visit_date), selectedDay) &&
      (selectedTechnician === "all" || v.technician_id === selectedTechnician)
    );
  }, [visits, selectedDay, selectedTechnician]);

  const handleDownloadPDF = () => {
    const toastId = toast.loading('Generando reporte de visitas...');
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`Reporte de Visitas - ${format(currentMonth, "MMMM yyyy", { locale: es }).toUpperCase()}`, 105, 15, { align: 'center' });

      const tableData = visits.map(v => [
        format(parseISO(v.visit_date), "dd/MM HH:mm"),
        v.client_name || "N/A",
        v.category === 'support' ? 'Soporte' : 'Admin',
        v.status || "N/A",
        v.technicians?.name || "Sin asignar"
      ]);

      autoTable(doc, {
        head: [['Fecha', 'Cliente', 'Tipo', 'Estado', 'Técnico']],
        body: tableData,
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.save(`Reporte_Visitas_${format(currentMonth, "MMMM_yyyy")}.pdf`);
      toast.success('PDF generado con éxito', { id: toastId });
    } catch (e) {
      toast.error('Error al generar PDF', { id: toastId });
    }
  };

  const renderHeader = () => {
    return (
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/40 px-3 md:px-4 py-3 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm rounded-t-3xl">
        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-2 md:gap-4">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 md:px-4 text-[10px] md:text-xs font-black uppercase min-w-[100px] md:min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setCurrentCategory('support')}
              className={cn(
                "px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all",
                currentCategory === 'support' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Soporte
            </button>
            <button
              onClick={() => setCurrentCategory('administration')}
              className={cn(
                "px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all",
                currentCategory === 'administration' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Admin
            </button>
          </div>

          {isMobile && (
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
                <button
                onClick={() => setViewMode('grid')}
                className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                )}
                >
                <CalendarIcon className="w-4 h-4" />
                </button>
                <button
                onClick={() => setViewMode('agenda')}
                className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'agenda' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                )}
                >
                <Clock className="w-4 h-4" />
                </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between w-full lg:w-auto gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/40">
            <Filter className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 pr-8 py-1 rounded-lg"
            >
              <option value="all">Equipos</option>
              <option value="Equipo A">Equipo A</option>
              <option value="Equipo B">Equipo B</option>
            </select>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/40">
            <User className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 pr-8 py-1 rounded-lg"
            >
              <option value="all">Técnicos</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all text-[10px] md:text-xs"
            >
                <FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PDF</span>
            </button>

            <button
                onClick={() => {
                setSelectedVisit(undefined);
                setIsDialogOpen(true);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-[10px] md:text-xs"
            >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{currentCategory === 'support' ? 'Agendar' : 'Nueva'}</span>
                <span className="sm:hidden">{currentCategory === 'support' ? 'Agendar' : 'Tarea'}</span>
            </button>
          </div>
        </div>
      </header>
    );
  };

  const renderDailyPlan = () => (
    <div className="flex flex-col h-full bg-white transition-all duration-300">
        <div className="p-6 border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Planificación Diaria</h2>
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                {selectedDayVisits.length}
                </Badge>
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">
                {format(selectedDay, "EEEE d", { locale: es })}
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                {format(selectedDay, "MMMM yyyy", { locale: es })}
            </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {selectedDayVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6 opacity-40">
                <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-[10px] font-black text-muted-foreground uppercase">Sin citas para este día</p>
            </div>
        ) : (
            selectedDayVisits.map((visit) => (
            <button
                key={visit.id}
                onClick={() => {
                setSelectedVisit(visit);
                setIsDialogOpen(true);
                }}
                className="w-full text-left p-4 rounded-2xl bg-white border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group shadow-sm"
            >
                <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">
                    {visit.category === 'support' ? 'Soporte' : 'Administración'}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                    {format(parseISO(visit.visit_date), "HH:mm")}
                </span>
                </div>
                <h4 className="text-sm font-black text-foreground uppercase truncate mb-1">
                {visit.client_name}
                </h4>
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <User className="w-3 h-3" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">
                    {visit.technicians?.name || 'Sin asignar'}
                </p>
                </div>
            </button>
            ))
        )}
        </div>
    </div>
  );

  const renderAgenda = () => {
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
             <div className="p-4 border-b border-border/40 bg-primary/5">
                <h2 className="text-[10px] font-black text-primary uppercase tracking-widest">Resumen Mensual</h2>
                <p className="text-lg font-black uppercase tracking-tighter">{format(currentMonth, "MMMM yyyy", { locale: es })}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {daysInMonth.map((day, idx) => {
                    const dayVisits = visits.filter(v => 
                        isSameDay(parseISO(v.visit_date), day) && 
                        (selectedTechnician === "all" || v.technician_id === selectedTechnician)
                    );

                    if (dayVisits.length === 0 && !isSameDay(day, new Date())) return null;

                    return (
                        <div key={idx} className={cn(
                            "p-4 rounded-2xl border transition-all",
                            isSameDay(day, new Date()) ? "bg-primary/5 border-primary/20 shadow-md" : "bg-white border-border/40 shadow-sm"
                        )}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                                        isSameDay(day, new Date()) ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-foreground/80">
                                            {format(day, "EEEE", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="font-bold text-[9px] uppercase px-1.5 h-5">
                                    {dayVisits.length} {dayVisits.length === 1 ? 'Visita' : 'Visitas'}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                {dayVisits.map(visit => (
                                    <button
                                        key={visit.id}
                                        onClick={() => {
                                            setSelectedVisit(visit);
                                            setIsDialogOpen(true);
                                        }}
                                        className="w-full text-left p-3 rounded-xl bg-muted/30 border-l-4 border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{format(parseISO(visit.visit_date), "HH:mm")}</span>
                                            </div>
                                            <p className="text-xs font-black uppercase truncate text-foreground/90">{visit.client_name}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fafafa] rounded-3xl shadow-xl border border-border/40 overflow-hidden">
      {renderHeader()}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) or Agenda (Mobile) */}
        {((!isMobile && isSidebarOpen) || (isMobile && viewMode === 'agenda')) && (
          <aside className="w-full lg:w-80 border-r border-border/40 bg-white flex flex-col transition-all duration-300 shrink-0">
            {isMobile && viewMode === 'agenda' ? renderAgenda() : renderDailyPlan()}
          </aside>
        )}

        {/* Main Grid (Hidden on mobile if agenda is active) */}
        <div className={cn(
           "flex-1 flex flex-col bg-white/40 overflow-hidden",
           isMobile && viewMode === 'agenda' && "hidden"
        )}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border/40 bg-white">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <div key={day} className="py-3 text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 gap-px bg-border/40">
              {calendarDays.map((day, i) => {
                const dayVisits = visits.filter(v =>
                  isSameDay(parseISO(v.visit_date), day) &&
                  (selectedTechnician === "all" || v.technician_id === selectedTechnician)
                );
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, monthStart);

                return (
                  <div
                    key={i}
                    onClick={() => {
                        setSelectedDay(day);
                        if (isMobile) setViewMode('agenda'); // Opcional: auto-scroll to agenda
                    }}
                    className={cn(
                      "min-h-[120px] p-2 bg-white transition-all cursor-pointer relative group",
                      !isCurrentMonth && "bg-muted/10 opacity-30",
                      isSelected && "ring-2 ring-primary ring-inset z-10 bg-primary/5",
                      isToday && !isSelected && "bg-blue-50/30"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-xs font-black h-6 w-6 flex items-center justify-center rounded-lg transition-all",
                        isToday ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground/80 group-hover:text-primary"
                      )}>
                        {format(day, "d")}
                      </span>
                      {dayVisits.length > 0 && (
                        <div className="flex -space-x-1 overflow-hidden">
                          {dayVisits.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-white" />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayVisits.slice(0, 2).map((visit) => (
                        <div
                          key={visit.id}
                          className="px-2 py-1 rounded-md bg-muted/50 border-l-2 border-primary text-[9px] font-bold text-muted-foreground truncate"
                        >
                          {visit.client_name}
                        </div>
                      ))}
                      {dayVisits.length > 2 && (
                        <div className="text-[8px] font-black text-primary uppercase ml-2">
                          + {dayVisits.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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

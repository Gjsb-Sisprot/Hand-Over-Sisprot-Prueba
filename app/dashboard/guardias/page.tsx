"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Save, Plus, Trash2, CalendarDays, Headphones, MapPin, 
  AlertCircle, Clock, ChevronDown, ChevronUp, Users, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  History, X, Check, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// --- Helper Components ---

function MultiSelect({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: {id: string, name: string}[]; 
  placeholder: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedNames = value ? value.split(" / ").filter(Boolean) : [];

  const toggleName = (name: string) => {
    let newNames = [...selectedNames];
    if (newNames.includes(name)) {
      newNames = newNames.filter(n => n !== name);
    } else {
      newNames.push(name);
    }
    onChange(newNames.join(" / "));
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full text-sm font-medium border-2 border-transparent hover:border-border rounded-xl p-2.5 outline-none transition-all shadow-sm flex flex-wrap gap-1 min-h-[44px] cursor-pointer items-center bg-background",
          isOpen && "border-primary ring-4 ring-primary/10",
          className
        )}
      >
        {selectedNames.length === 0 ? (
          <span className="text-muted-foreground/40 font-normal flex items-center gap-2"><Users className="w-4 h-4"/> {placeholder}</span>
        ) : (
          selectedNames.map(name => (
            <span key={name} className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-primary/20 flex items-center">
              {name}
            </span>
          ))
        )}
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto p-1 backdrop-blur-xl">
          <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          {options.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No hay agentes disponibles</div>
          ) : (
            options.map(opt => (
              <div 
                key={opt.id}
                onClick={(e) => { e.stopPropagation(); toggleName(opt.name); }}
                className="flex items-center gap-3 p-2.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                  selectedNames.includes(opt.name) ? "bg-primary border-primary text-primary-foreground" : "border-border/60"
                )}>
                  {selectedNames.includes(opt.name) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={cn("text-sm", selectedNames.includes(opt.name) && "font-bold text-primary")}>{opt.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function GuardiasPage() {
  const [data, setData] = useState<any[]>([]);
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Navigation
  const [currentMonth, setCurrentMonth] = useState(4); // Mayo
  const [currentYear, setCurrentYear] = useState(2026);
  
  // Selection
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resGuardias, resAgents] = await Promise.all([
          fetch('/api/guardias').then(res => res.json()),
          createClient().from('agents').select('id, name').order('name')
        ]);
        
        const initializedData = resGuardias.map((item: any) => ({
          ...item,
          month: item.month ?? 4,
          year: item.year ?? 2026,
          startDay: item.startDay ?? 1,
          endDay: item.endDay ?? 7
        }));

        setData(initializedData);
        
        let fetchedAgents = resAgents.data || [];
        // Asegurar que Henyerbeth esté en la lista aunque falte en Supabase
        if (!fetchedAgents.find((a: any) => a.name.includes("HENYERBETH ARRIECHE"))) {
          fetchedAgents.push({ id: 'missing-henyerbeth', name: 'HENYERBETH ARRIECHE' });
        }
        setAgents(fetchedAgents);
      } catch (e) {
        toast.error("Error cargando los datos");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/guardias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success("Horarios guardados correctamente");
      } else {
        toast.error("Hubo un error al guardar");
      }
    } catch (e) {
      toast.error("Error de conexión al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setData(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      item: data.length + 1,
      month: currentMonth,
      year: currentYear,
      weekDaysText: "NUEVA SEMANA",
      weekCallCenterPerson: "",
      weekSoportePerson: "",
      isSpecial: false,
      weekendCallCenterPerson: "",
      weekendMonitoreoPerson: "",
      weekendSoportePerson: "",
      weekendAgenciaPerson: "",
      fechaText: "",
      specialTitle: "",
      startDay: 1,
      endDay: 7
    };
    setData([newItem, ...data]);
    setSelectedWeekId(newItem.id);
    setIsDrawerOpen(true);
  };

  const removeItem = (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta semana de guardia?")) return;
    setData(data.filter(item => item.id !== id));
    if (selectedWeekId === id) {
      setSelectedWeekId(null);
      setIsDrawerOpen(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => item.month === currentMonth && item.year === currentYear);
  }, [data, currentMonth, currentYear]);

  // --- Calendar Logic ---

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    let startingDay = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    // Convert to 0 (Mon) to 6 (Sun)
    startingDay = startingDay === 0 ? 6 : startingDay - 1;

    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: 'prev', fullDate: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: 'current', fullDate: new Date(currentYear, currentMonth, i) });
    }

    // Next month days
    const totalCells = 42; // 6 rows
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: 'next', fullDate: new Date(currentYear, currentMonth + 1, i) });
    }

    return days;
  }, [currentMonth, currentYear]);

  const getWeekForDay = (day: number, monthType: string) => {
    if (monthType !== 'current') return null;
    // This is a simplified mapping. Ideally we use proper Date ranges.
    // For now, we search for a week that "might" cover this day based on index or text.
    // Let's assume each record in filteredData covers a range.
    // For the sake of the visual, we'll map week 1 to days 1-7, week 2 to 8-14, etc.
    // Or better: show markers for all weeks that have data for this month.
    return filteredData.find(w => {
       // logic: if it's the Nth week of the month data
       const weekIdx = filteredData.indexOf(w);
       const start = weekIdx * 7 + 1;
       const end = start + 6;
       return day >= start && day <= end;
    });
  };

  const selectedWeek = useMemo(() => {
    return data.find(w => w.id === selectedWeekId) || null;
  }, [data, selectedWeekId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-muted-foreground font-medium">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#fdfaf6] overflow-hidden relative font-outfit">
      
      {/* --- Left Side: Calendar Grid --- */}
      <div className={cn(
        "flex-1 flex flex-col h-full transition-all duration-500 ease-in-out p-4 md:p-8",
        isDrawerOpen ? "md:mr-[400px] lg:mr-[450px]" : "mr-0"
      )}>
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
          <div className="flex flex-col items-start">
             <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-primary/10 rounded-2xl">
                  <CalendarIcon className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground/90 uppercase">
                  {MONTHS[currentMonth]} <span className="text-primary/40 ml-1">{currentYear}</span>
                </h1>
             </div>
             <p className="text-muted-foreground text-sm font-medium pl-14">Planificación de guardias y horarios especiales</p>
          </div>

          <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shadow-sm">
             <button 
               onClick={() => {
                 if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(v => v-1); }
                 else { setCurrentMonth(v => v-1); }
               }}
               className="p-3 hover:bg-primary/5 rounded-xl transition-all text-primary/60 hover:text-primary active:scale-95"
             >
               <ChevronLeft className="w-6 h-6" />
             </button>
             
             <div className="h-8 w-[1px] bg-border/40"></div>
             
             <button 
               onClick={() => {
                 if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(v => v+1); }
                 else { setCurrentMonth(v => v+1); }
               }}
               className="p-3 hover:bg-primary/5 rounded-xl transition-all text-primary/60 hover:text-primary active:scale-95"
             >
               <ChevronRight className="w-6 h-6" />
             </button>

             <div className="h-8 w-[1px] bg-border/40"></div>

             <button 
               onClick={addItem}
               className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all text-sm"
             >
               <Plus className="w-4 h-4" /> Nueva Semana
             </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-[2rem] border border-border/60 shadow-2xl overflow-hidden flex flex-col group/calendar">
          {/* Days labels */}
          <div className="grid grid-cols-7 border-b border-border/40 bg-muted/5">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-4 text-center text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-r border-border/20 last:border-0">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 flex-1">
            {calendarDays.map((dateObj, i) => {
              const week = getWeekForDay(dateObj.day, dateObj.month);
              const isSelected = week && selectedWeekId === week.id;

              return (
                <div 
                  key={i}
                  onClick={() => {
                    if (week) {
                      setSelectedWeekId(week.id);
                      setIsDrawerOpen(true);
                    }
                  }}
                  className={cn(
                    "relative border-r border-b border-border/20 p-2 md:p-3 transition-all cursor-default overflow-hidden group/cell",
                    dateObj.month !== 'current' ? "bg-muted/5 opacity-30" : "bg-transparent",
                    week && "cursor-pointer hover:bg-primary/[0.03]",
                    isSelected && "bg-primary/[0.05] ring-2 ring-primary/20 ring-inset",
                    (i+1) % 7 === 0 && "border-r-0"
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold block mb-1 transition-colors",
                    dateObj.month === 'current' ? "text-foreground/70" : "text-muted-foreground/30",
                    isSelected && "text-primary"
                  )}>
                    {dateObj.day}
                  </span>

                  {week && (
                    <div className="space-y-1 mt-2">
                       <div className={cn(
                         "h-1.5 w-full rounded-full transition-all",
                         week.isSpecial ? "bg-red-500" : "bg-primary/40",
                         isSelected && "h-2"
                       )} />
                       <div className="hidden md:block">
                          <p className="text-[9px] font-bold text-foreground/50 truncate uppercase tracking-tighter">
                            {week.isSpecial ? "FERIADO" : "GUARDIA"}
                          </p>
                          <p className="text-[8px] text-muted-foreground truncate leading-tight">
                            {week.weekSoportePerson?.split(" / ")[0] || "No asig."}
                          </p>
                       </div>
                    </div>
                  )}

                  {/* Visual Decoration for empty days */}
                  {!week && dateObj.month === 'current' && (
                    <div className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center">
                       <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary/20 flex items-center justify-center text-primary/30">
                          <Plus className="w-4 h-4" />
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-4">
           <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mr-auto bg-white/80 p-3 rounded-2xl border border-border/40">
              <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 bg-primary/40 rounded-full"></div>
                 <span>Guardia Normal</span>
              </div>
              <div className="w-[1px] h-4 bg-border/40 mx-2"></div>
              <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                 <span>Feriado</span>
              </div>
           </div>

           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="flex items-center gap-3 px-8 py-4 bg-foreground text-background font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 group"
           >
             {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
             GUARDAR CAMBIOS
           </button>
        </div>
      </div>

      {/* --- Right Side: The "Leaf" / Assignment Drawer --- */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full md:w-[400px] lg:w-[450px] bg-white shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.1)] z-50 transform transition-all duration-700 ease-out border-l border-border/30",
        isDrawerOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Drawer Handle/Toggle for mobile */}
        <button 
          onClick={() => setIsDrawerOpen(false)}
          className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-24 bg-white border border-r-0 border-border/30 rounded-l-3xl flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shadow-[-10px_0_20px_rgba(0,0,0,0.05)] md:flex hidden"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        {selectedWeek ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Drawer Header */}
            <div className={cn(
              "p-8 border-b border-border/40 sticky top-0 bg-white/80 backdrop-blur-md z-10",
              selectedWeek.isSpecial ? "bg-red-50/50" : "bg-primary/5"
            )}>
              <div className="flex justify-between items-start mb-6">
                 <div className="space-y-1">
                    <span className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                      selectedWeek.isSpecial ? "bg-red-500 text-white" : "bg-primary text-white"
                    )}>
                      Ref. {selectedWeek.item}
                    </span>
                    <h2 className="text-2xl font-black text-foreground pt-2">
                       Asignación de Personal
                    </h2>
                 </div>
                 <button 
                   onClick={() => setIsDrawerOpen(false)}
                   className="p-2 hover:bg-muted rounded-full transition-colors"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-1">Título Visual</label>
                    <input 
                      className="w-full bg-white border-2 border-border/40 focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm transition-all"
                      value={selectedWeek.weekDaysText}
                      onChange={e => updateItem(selectedWeek.id, 'weekDaysText', e.target.value)}
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-1">Fecha Rango</label>
                    <input 
                      className="w-full bg-white border-2 border-border/40 focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm transition-all"
                      value={selectedWeek.fechaText}
                      onChange={e => updateItem(selectedWeek.id, 'fechaText', e.target.value)}
                    />
                 </div>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-8 space-y-8 pb-32">
              
              {/* Special Toggle */}
              <div className={cn(
                "p-5 rounded-2xl border-2 transition-all flex items-center justify-between",
                selectedWeek.isSpecial ? "bg-red-500/5 border-red-500/20" : "bg-muted/5 border-border/40"
              )}>
                <div className="flex items-center gap-4">
                   <div className={cn(
                     "p-3 rounded-xl",
                     selectedWeek.isSpecial ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                   )}>
                      <AlertCircle className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="font-black text-sm uppercase">Día Feriado / Especial</p>
                      <p className="text-xs text-muted-foreground">Activa para horarios especiales</p>
                   </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedWeek.isSpecial} 
                    onChange={() => updateItem(selectedWeek.id, 'isSpecial', !selectedWeek.isSpecial)}
                    className="sr-only peer" 
                  />
                  <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              {selectedWeek.isSpecial && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <History className="w-3 h-3" /> Nombre de la Festividad
                  </label>
                  <input 
                    className="w-full bg-red-50 border-2 border-red-200 focus:border-red-500 rounded-xl px-4 py-3 outline-none font-bold text-sm text-red-900 transition-all placeholder:text-red-300"
                    placeholder="Ej: Día del Trabajador"
                    value={selectedWeek.specialTitle}
                    onChange={e => updateItem(selectedWeek.id, 'specialTitle', e.target.value)}
                  />
                </div>
              )}

              {/* Assignment Sections */}
              <div className="space-y-10">
                
                {/* Section 1 */}
                <div className="space-y-4">
                  <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-blue-600">
                    <div className="p-1.5 bg-blue-50 rounded-lg"><Headphones className="w-4 h-4" /></div>
                    Call Center & Monitoreo
                  </h3>
                  <div className="space-y-6 pl-2 border-l-2 border-blue-100">
                    {!selectedWeek.isSpecial && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">Lunes a Viernes</p>
                        <MultiSelect 
                          value={selectedWeek.weekCallCenterPerson} 
                          onChange={v => updateItem(selectedWeek.id, 'weekCallCenterPerson', v)} 
                          options={agents} placeholder="Seleccionar agentes..." 
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                        {selectedWeek.isSpecial ? "Personal de Guardia" : "Sábado y Domingo"}
                      </p>
                      <MultiSelect 
                        value={selectedWeek.isSpecial ? selectedWeek.specialCallCenter : selectedWeek.weekendCallCenterPerson} 
                        onChange={v => updateItem(selectedWeek.id, selectedWeek.isSpecial ? 'specialCallCenter' : 'weekendCallCenterPerson', v)} 
                        options={agents} placeholder="Seleccionar agentes..." 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-4">
                  <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-amber-600">
                    <div className="p-1.5 bg-amber-50 rounded-lg">🛠️</div>
                    Soporte Técnico
                  </h3>
                  <div className="space-y-6 pl-2 border-l-2 border-amber-100">
                    {!selectedWeek.isSpecial && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">Lunes a Viernes</p>
                        <MultiSelect 
                          value={selectedWeek.weekSoportePerson} 
                          onChange={v => updateItem(selectedWeek.id, 'weekSoportePerson', v)} 
                          options={agents} placeholder="Seleccionar agentes..." 
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">Fin de Semana / Feriado</p>
                      <MultiSelect 
                        value={selectedWeek.isSpecial ? selectedWeek.specialSoporte : selectedWeek.weekendSoportePerson} 
                        onChange={v => updateItem(selectedWeek.id, selectedWeek.isSpecial ? 'specialSoporte' : 'weekendSoportePerson', v)} 
                        options={agents} placeholder="Seleccionar agentes..." 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-4">
                  <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-green-600">
                    <div className="p-1.5 bg-green-50 rounded-lg"><MapPin className="w-4 h-4" /></div>
                    Agencia & Admin
                  </h3>
                  <div className="space-y-6 pl-2 border-l-2 border-green-100">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">S-D / Festivo</p>
                      <MultiSelect 
                        value={selectedWeek.isSpecial ? selectedWeek.specialAgencia : selectedWeek.weekendAgenciaPerson} 
                        onChange={v => updateItem(selectedWeek.id, selectedWeek.isSpecial ? 'specialAgencia' : 'weekendAgenciaPerson', v)} 
                        options={[{id: 'cerrado', name: 'CERRADO'}, ...agents]} placeholder="Estado de agencia..." 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-10 border-t border-border/40">
                 <button 
                   onClick={() => removeItem(selectedWeek.id)}
                   className="w-full flex items-center justify-center gap-3 p-4 border-2 border-destructive/20 text-destructive font-black text-xs rounded-2xl hover:bg-destructive hover:text-white transition-all uppercase tracking-widest"
                 >
                   <Trash2 className="w-4 h-4" /> Eliminar Registro
                 </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
             <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                <CalendarIcon className="w-10 h-10 text-muted-foreground/30" />
             </div>
             <h3 className="text-xl font-black text-foreground/80 mb-2 uppercase">Selecciona una Semana</h3>
             <p className="text-sm text-muted-foreground font-medium">Toca un día asignado en el calendario para editar el personal de guardia.</p>
          </div>
        )}
      </div>

      {/* Backdrop for mobile */}
      {isDrawerOpen && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[40] md:hidden"
        />
      )}

    </div>
  );
}

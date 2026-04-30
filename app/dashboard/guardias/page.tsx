"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, CalendarDays, Headphones, MapPin, AlertCircle, Clock, Info, ChevronDown, ChevronUp, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

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
            <span key={name} className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md text-xs font-bold border border-primary/20 flex items-center">
              {name}
            </span>
          ))
        )}
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-1 backdrop-blur-xl">
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

export default function GuardiasPage() {
  const [data, setData] = useState<any[]>([]);
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resGuardias, resAgents] = await Promise.all([
          fetch('/api/guardias').then(res => res.json()),
          createClient().from('agents').select('id, name').order('name')
        ]);
        
        setData(resGuardias);
        if (resAgents.data) {
          setAgents(resAgents.data);
        }
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

  const updateItem = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const addItem = () => {
    setData([{
      id: Date.now().toString(),
      item: data.length + 1,
      weekDaysText: "",
      weekCallCenterPerson: "",
      weekSoportePerson: "",
      isSpecial: false,
      weekendCallCenterPerson: "",
      weekendMonitoreoPerson: "",
      weekendSoportePerson: "",
      weekendAgenciaPerson: "",
      fechaText: "",
      specialTitle: ""
    }, ...data]);
    setExpandedIndex(0); // Expand the newly added item
  };

  const removeItem = (index: number) => {
    if (!confirm("¿Estás seguro de eliminar esta semana de guardia?")) return;
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  const toggleSpecial = (index: number) => {
    const newData = [...data];
    newData[index].isSpecial = !newData[index].isSpecial;
    setData(newData);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-muted-foreground font-medium">Sincronizando panel de guardias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/95 overflow-y-auto">
      <div className="px-4 py-6 md:p-8 border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CalendarDays className="w-6 h-6 md:w-8 md:h-8 text-primary" /> 
            </div>
            Gestión de Guardias
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 flex items-center gap-2">
            <Info className="w-4 h-4 hidden sm:block" />
            Haz clic en una semana para desplegar y asignar al personal de guardia.
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button 
            onClick={addItem} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground font-semibold text-sm rounded-xl hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Agregar Semana
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>
      </div>
      
      <div className="p-4 md:p-8 max-w-[1000px] mx-auto w-full">
        <div className="flex flex-col gap-4">
          {data.map((row, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div 
                key={row.id} 
                className={cn(
                  "group bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden flex flex-col border-2 transition-all hover:shadow-md",
                  row.isSpecial ? "border-red-500/30" : "border-border/50 hover:border-primary/30",
                  isExpanded && "shadow-xl ring-4 ring-primary/5 border-primary/50 my-2"
                )}
              >
                {/* Header / Resumen (Clicable para expandir) */}
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className={cn(
                    "p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors",
                    row.isSpecial ? "bg-red-500/5 hover:bg-red-500/10" : "bg-muted/10 hover:bg-muted/30"
                  )}
                >
                  <div className="flex-1 w-full space-y-1">
                     <div className="flex items-center gap-3">
                       <span className={cn(
                         "text-xs font-black px-2 py-1 rounded-md shrink-0 uppercase tracking-wider",
                         row.isSpecial ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
                       )}>
                         Semana {data.length - idx}
                       </span>
                       <div className="font-bold text-lg text-foreground flex-1 truncate">
                          {row.weekDaysText || "Nueva Semana (Sin título)"}
                       </div>
                     </div>
                     <div className="flex items-center gap-2 text-muted-foreground text-sm pl-1">
                       <Clock className="w-4 h-4 shrink-0" />
                       <span>{row.fechaText || "Sin fechas especificadas"}</span>
                       {row.isSpecial && row.specialTitle && (
                         <>
                           <span className="mx-2 text-red-500/40">•</span>
                           <span className="text-red-600 dark:text-red-400 font-semibold truncate">{row.specialTitle}</span>
                         </>
                       )}
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 rounded-xl transition-colors">
                       <input 
                         type="checkbox" 
                         checked={row.isSpecial} 
                         onChange={() => toggleSpecial(idx)} 
                         className="peer sr-only" 
                       />
                       <div className="relative w-9 h-5 bg-muted rounded-full peer-checked:bg-red-500 transition-colors">
                         <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                       </div>
                       <span className={cn("text-sm font-bold", row.isSpecial ? "text-red-600" : "text-muted-foreground")}>Feriado</span>
                     </label>
                     <button 
                       onClick={() => removeItem(idx)} 
                       title="Eliminar semana" 
                       className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-2 transition-all"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                     <div className="w-[1px] h-6 bg-border mx-1"></div>
                     <button className="text-muted-foreground hover:text-foreground p-2 rounded-lg bg-background border border-border/50">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                     </button>
                  </div>
                </div>

                {/* Contenido Expandido */}
                {isExpanded && (
                  <div className="border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
                    {/* Campos de Título */}
                    <div className="p-4 md:p-6 bg-background flex flex-col gap-4 border-b border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Título de la Semana</label>
                          <input 
                            className="w-full text-base font-bold bg-background border-2 border-border/50 hover:border-border focus:border-primary rounded-xl p-3 outline-none transition-all placeholder-muted-foreground/40" 
                            value={row.weekDaysText} 
                            onChange={e => updateItem(idx, 'weekDaysText', e.target.value)} 
                            placeholder="Ej: SEMANA DEL 04 AL 08/05" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Fecha de Fin de Semana</label>
                          <input 
                            className="w-full text-base font-medium bg-background border-2 border-border/50 hover:border-border focus:border-primary rounded-xl p-3 outline-none transition-all placeholder-muted-foreground/40" 
                            value={row.fechaText} 
                            onChange={e => updateItem(idx, 'fechaText', e.target.value)} 
                            placeholder="Ej: SÁBADO Y DOMINGO 9-10/05" 
                          />
                        </div>
                      </div>
                      
                      {row.isSpecial && (
                        <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                          <label className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5"/> Nombre del Feriado</label>
                          <input 
                            className="w-full text-base font-bold bg-white dark:bg-background border-2 border-red-500/30 focus:border-red-500 rounded-xl p-3 outline-none transition-all placeholder-red-700/30 text-red-700 dark:text-red-400" 
                            value={row.specialTitle || ""} 
                            onChange={e => updateItem(idx, 'specialTitle', e.target.value)} 
                            placeholder="Ej: VIERNES 1° DE MAYO DÍA DEL TRABAJADOR" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Asignaciones con Dropdowns */}
                    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-b from-transparent to-muted/10">
                      
                      {/* CC & Monitoreo */}
                      <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400 pb-2 border-b border-border/50">
                          <div className="p-1.5 bg-blue-500/10 rounded-lg"><Headphones className="w-4 h-4" /></div> 
                          CC & Monitoreo
                        </h3>
                        <div className="space-y-4">
                          {!row.isSpecial && (
                            <div>
                              <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1 mb-1 block">L-V Call Center</label>
                              <MultiSelect 
                                value={row.weekCallCenterPerson || ""} 
                                onChange={v => updateItem(idx, 'weekCallCenterPerson', v)} 
                                options={agents} 
                                placeholder="Seleccionar agentes..."
                                className="focus-within:border-blue-500 focus-within:ring-blue-500/10"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1 mb-1 block">{row.isSpecial ? "Feriado CC" : "S-D Call Center"}</label>
                            <MultiSelect 
                              value={row.isSpecial ? (row.specialCallCenter || "") : (row.weekendCallCenterPerson || "")} 
                              onChange={v => updateItem(idx, row.isSpecial ? 'specialCallCenter' : 'weekendCallCenterPerson', v)} 
                              options={agents} 
                              placeholder="Seleccionar agentes..."
                              className={row.isSpecial ? "bg-red-500/5 focus-within:border-red-500" : "focus-within:border-blue-500"}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1 mb-1 block">{row.isSpecial ? "Feriado Monitoreo" : "S-D Monitoreo"}</label>
                            <MultiSelect 
                              value={row.isSpecial ? (row.specialMonitoreo || "") : (row.weekendMonitoreoPerson || "")} 
                              onChange={v => updateItem(idx, row.isSpecial ? 'specialMonitoreo' : 'weekendMonitoreoPerson', v)} 
                              options={agents} 
                              placeholder="Seleccionar agentes..."
                              className={row.isSpecial ? "bg-red-500/5 focus-within:border-red-500" : "focus-within:border-blue-500"}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Soporte Técnico */}
                      <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400 pb-2 border-b border-border/50">
                          <div className="p-1.5 bg-amber-500/10 rounded-lg text-sm leading-none">🛠️</div> 
                          Soporte Técnico
                        </h3>
                        <div className="space-y-4">
                          {!row.isSpecial && (
                            <div>
                              <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1 mb-1 block">L-V Soporte</label>
                              <MultiSelect 
                                value={row.weekSoportePerson || ""} 
                                onChange={v => updateItem(idx, 'weekSoportePerson', v)} 
                                options={agents} 
                                placeholder="Seleccionar agentes..."
                                className="focus-within:border-amber-500 focus-within:ring-amber-500/10"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1 mb-1 block">{row.isSpecial ? "Feriado Soporte" : "S-D Soporte"}</label>
                            <MultiSelect 
                              value={row.isSpecial ? (row.specialSoporte || "") : (row.weekendSoportePerson || "")} 
                              onChange={v => updateItem(idx, row.isSpecial ? 'specialSoporte' : 'weekendSoportePerson', v)} 
                              options={agents} 
                              placeholder="Seleccionar agentes..."
                              className={row.isSpecial ? "bg-red-500/5 focus-within:border-red-500" : "focus-within:border-amber-500"}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Agencia / Admin */}
                      <div className="flex flex-col gap-4">
                        <h3 className="font-bold text-sm flex items-center gap-2 text-green-600 dark:text-green-400 pb-2 border-b border-border/50">
                          <div className="p-1.5 bg-green-500/10 rounded-lg"><MapPin className="w-4 h-4" /></div> 
                          Agencia / Admin
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1 mb-1 block">{row.isSpecial ? "Feriado Agencia" : "S-D Agencia Turmero"}</label>
                            {/* OJO: Para la agencia pueden escribir "CERRADO", así que permitimos selección múltiple o escribir en un input mixto. 
                                Por simplicidad usaremos el MultiSelect, asumiendo que "CERRADO" podría agregarse como usuario o podemos dejar un input normal.
                                Pero el usuario pidió elegir en una lista. Usaremos MultiSelect. */}
                            <MultiSelect 
                              value={row.isSpecial ? (row.specialAgencia || "") : (row.weekendAgenciaPerson || "")} 
                              onChange={v => updateItem(idx, row.isSpecial ? 'specialAgencia' : 'weekendAgenciaPerson', v)} 
                              options={[{id: 'cerrado', name: 'CERRADO'}, ...agents]} 
                              placeholder="Seleccionar..."
                              className={row.isSpecial ? "bg-red-500/5 focus-within:border-red-500" : "focus-within:border-green-500"}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {data.length === 0 && (
            <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer" onClick={addItem}>
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-10 h-10 text-primary/40" />
              </div>
              <p className="font-bold text-xl mb-2 text-foreground/80">No hay semanas planificadas</p>
              <p className="text-sm max-w-sm mb-6">Comienza creando una nueva hoja semanal para organizar al personal.</p>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" /> Agregar Primera Semana
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

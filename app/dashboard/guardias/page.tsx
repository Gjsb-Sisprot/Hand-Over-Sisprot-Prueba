"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, CalendarDays, Headphones, MapPin, AlertCircle, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GuardiasPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/guardias')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
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
          <p className="text-muted-foreground font-medium">Sincronizando guardias...</p>
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
            Planifica los turnos rotativos del personal.
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button 
            onClick={addItem} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground font-semibold text-sm rounded-xl hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
      
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {data.map((row, idx) => (
            <div 
              key={row.id} 
              className={cn(
                "group bg-card/80 backdrop-blur-sm rounded-3xl overflow-hidden flex flex-col border-2 transition-all hover:shadow-xl",
                row.isSpecial ? "border-red-500/30 shadow-red-500/5 hover:border-red-500/50" : "border-border/50 hover:border-primary/20"
              )}
            >
              {/* Header de la Tarjeta */}
              <div className={cn(
                "p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 transition-colors",
                row.isSpecial ? "bg-red-500/5" : "bg-muted/10 group-hover:bg-muted/30"
              )}>
                <div className="flex-1 w-full space-y-3">
                   <div className="flex items-center gap-3">
                     <span className={cn(
                       "text-xs font-black px-3 py-1.5 rounded-lg shrink-0 uppercase tracking-wider",
                       row.isSpecial ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-primary/10 text-primary"
                     )}>
                       Semana {data.length - idx}
                     </span>
                     <input 
                        className="text-lg md:text-xl font-bold bg-transparent outline-none w-full placeholder-muted-foreground/40 border-b-2 border-transparent focus:border-primary transition-colors pb-1 truncate" 
                        value={row.weekDaysText} 
                        onChange={e => updateItem(idx, 'weekDaysText', e.target.value)} 
                        placeholder="Ej: SEMANA DEL 04 AL 08/05" 
                      />
                   </div>
                   <div className="flex items-center gap-2 text-muted-foreground pl-1">
                     <Clock className="w-4 h-4 shrink-0" />
                     <input 
                        className="text-sm font-medium bg-transparent outline-none w-full placeholder-muted-foreground/30 focus:text-foreground" 
                        value={row.fechaText} 
                        onChange={e => updateItem(idx, 'fechaText', e.target.value)} 
                        placeholder="Ej: SÁBADO Y DOMINGO 9-10/05" 
                      />
                   </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto bg-background/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md">
                   <label className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/50 rounded-xl transition-colors">
                     <div className="relative flex items-center justify-center">
                       <input 
                         type="checkbox" 
                         checked={row.isSpecial} 
                         onChange={() => toggleSpecial(idx)} 
                         className="peer sr-only" 
                       />
                       <div className="w-10 h-5 bg-muted rounded-full peer-checked:bg-red-500 transition-colors"></div>
                       <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
                     </div>
                     <span className={cn(
                       "text-sm font-bold select-none",
                       row.isSpecial ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                     )}>Feriado</span>
                   </label>
                   <div className="w-[1px] h-6 bg-border"></div>
                   <button 
                     onClick={() => removeItem(idx)} 
                     title="Eliminar semana" 
                     className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl p-2.5 transition-all"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {/* Título de Feriado */}
              {row.isSpecial && (
                 <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
                   <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                   <input 
                      className="w-full bg-transparent outline-none font-bold text-sm md:text-base text-red-700 dark:text-red-400 placeholder-red-700/40" 
                      value={row.specialTitle || ""} 
                      onChange={e => updateItem(idx, 'specialTitle', e.target.value)} 
                      placeholder="Escribe el nombre del feriado (Ej: VIERNES 1° DE MAYO DÍA DEL TRABAJADOR)" 
                    />
                 </div>
              )}

              {/* Secciones de Departamentos */}
              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1 bg-gradient-to-b from-transparent to-muted/10">
                 
                 {/* CC & Monitoreo */}
                 <div className="flex flex-col gap-3 group/section">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400 pb-2 border-b border-border/50">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg"><Headphones className="w-4 h-4" /></div> 
                      CC & Monitoreo
                    </h3>
                    <div className="space-y-4 pt-1">
                       {!row.isSpecial && (
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1">L-V Call Center</label>
                           <input 
                             className="w-full text-sm font-medium bg-background border-2 border-transparent hover:border-border focus:border-blue-500 rounded-xl p-2.5 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm placeholder-muted-foreground/30" 
                             value={row.weekCallCenterPerson || ""} 
                             onChange={e => updateItem(idx, 'weekCallCenterPerson', e.target.value)} 
                             placeholder="Ej: MARTHA PINTO" 
                           />
                         </div>
                       )}
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1">{row.isSpecial ? "Feriado CC" : "S-D Call Center"}</label>
                           <input 
                             className={cn(
                               "w-full text-sm font-medium border-2 border-transparent rounded-xl p-2.5 outline-none focus:ring-4 transition-all shadow-sm placeholder-muted-foreground/30",
                               row.isSpecial ? "bg-red-500/5 hover:border-red-500/30 focus:border-red-500 focus:ring-red-500/10" : "bg-background hover:border-border focus:border-blue-500 focus:ring-blue-500/10"
                             )}
                             value={row.isSpecial ? (row.specialCallCenter || "") : (row.weekendCallCenterPerson || "")} 
                             onChange={(e) => updateItem(idx, row.isSpecial ? 'specialCallCenter' : 'weekendCallCenterPerson', e.target.value)} 
                             placeholder="Asignar personal..." 
                           />
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1">{row.isSpecial ? "Feriado Monitoreo" : "S-D Monitoreo"}</label>
                           <input 
                             className={cn(
                               "w-full text-sm font-medium border-2 border-transparent rounded-xl p-2.5 outline-none focus:ring-4 transition-all shadow-sm placeholder-muted-foreground/30",
                               row.isSpecial ? "bg-red-500/5 hover:border-red-500/30 focus:border-red-500 focus:ring-red-500/10" : "bg-background hover:border-border focus:border-blue-500 focus:ring-blue-500/10"
                             )}
                             value={row.isSpecial ? (row.specialMonitoreo || "") : (row.weekendMonitoreoPerson || "")} 
                             onChange={(e) => updateItem(idx, row.isSpecial ? 'specialMonitoreo' : 'weekendMonitoreoPerson', e.target.value)} 
                             placeholder="Asignar personal..." 
                           />
                       </div>
                    </div>
                 </div>

                 {/* Soporte Técnico */}
                 <div className="flex flex-col gap-3 group/section">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400 pb-2 border-b border-border/50">
                      <div className="p-1.5 bg-amber-500/10 rounded-lg text-sm leading-none">🛠️</div> 
                      Soporte Técnico
                    </h3>
                    <div className="space-y-4 pt-1">
                       {!row.isSpecial && (
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1">L-V Soporte</label>
                           <input 
                             className="w-full text-sm font-medium bg-background border-2 border-transparent hover:border-border focus:border-amber-500 rounded-xl p-2.5 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm placeholder-muted-foreground/30" 
                             value={row.weekSoportePerson || ""} 
                             onChange={e => updateItem(idx, 'weekSoportePerson', e.target.value)} 
                             placeholder="Ej: JONATHAN / KELVIN" 
                           />
                         </div>
                       )}
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1">{row.isSpecial ? "Feriado Soporte" : "S-D Soporte"}</label>
                           <textarea 
                             rows={2} 
                             className={cn(
                               "w-full text-sm font-medium border-2 border-transparent rounded-xl p-2.5 outline-none focus:ring-4 transition-all shadow-sm placeholder-muted-foreground/30 resize-none",
                               row.isSpecial ? "bg-red-500/5 hover:border-red-500/30 focus:border-red-500 focus:ring-red-500/10" : "bg-background hover:border-border focus:border-amber-500 focus:ring-amber-500/10"
                             )}
                             value={row.isSpecial ? (row.specialSoporte || "") : (row.weekendSoportePerson || "")} 
                             onChange={(e) => updateItem(idx, row.isSpecial ? 'specialSoporte' : 'weekendSoportePerson', e.target.value)} 
                             placeholder="Asignar personal..." 
                           />
                       </div>
                    </div>
                 </div>

                 {/* Agencia / Admin */}
                 <div className="flex flex-col gap-3 group/section">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-green-600 dark:text-green-400 pb-2 border-b border-border/50">
                      <div className="p-1.5 bg-green-500/10 rounded-lg"><MapPin className="w-4 h-4" /></div> 
                      Agencia / Admin
                    </h3>
                    <div className="space-y-4 pt-1">
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest pl-1">{row.isSpecial ? "Feriado Agencia" : "S-D Agencia Turmero"}</label>
                           <input 
                             className={cn(
                               "w-full text-sm font-medium border-2 border-transparent rounded-xl p-2.5 outline-none focus:ring-4 transition-all shadow-sm placeholder-muted-foreground/30",
                               row.isSpecial ? "bg-red-500/5 hover:border-red-500/30 focus:border-red-500 focus:ring-red-500/10" : "bg-background hover:border-border focus:border-green-500 focus:ring-green-500/10"
                             )}
                             value={row.isSpecial ? (row.specialAgencia || "") : (row.weekendAgenciaPerson || "")} 
                             onChange={(e) => updateItem(idx, row.isSpecial ? 'specialAgencia' : 'weekendAgenciaPerson', e.target.value)} 
                             placeholder="Ej: CERRADO / YHOSSELLYN" 
                           />
                       </div>
                    </div>
                 </div>

              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer" onClick={addItem}>
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-10 h-10 text-primary/40" />
              </div>
              <p className="font-bold text-xl mb-2 text-foreground/80">No hay semanas planificadas</p>
              <p className="text-sm max-w-sm mb-6">Comienza creando una nueva semana para asignar las guardias del personal.</p>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" /> Crear Primera Semana
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

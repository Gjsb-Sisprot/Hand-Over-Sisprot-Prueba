"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, CalendarDays, Headphones, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function GuardiasPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/guardias')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/guardias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success("Guardias guardadas exitosamente");
      } else {
        toast.error("Error al guardar");
      }
    } catch (e) {
      toast.error("Error al guardar");
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const addItem = () => {
    setData([...data, {
      id: Date.now().toString(),
      item: data.length + 1,
      weekDaysText: "SEMANA DEL -- AL --",
      weekCallCenterText: "CALL CENTER 5:00 PM A 8:00 PM",
      weekCallCenterPerson: "",
      weekSoporteText: "SOPORTE TECNICO 8:00 AM A 8:00 PM",
      weekSoportePerson: "",
      isSpecial: false,
      weekendText: "CC Y MONITOREO SABADO - DOMINGO 08:00 AM A 08:00PM",
      weekendCallCenterPerson: "",
      weekendMonitoreoPerson: "",
      weekendSoportePerson: "",
      weekendAgenciaPerson: "",
      fechaText: "SABADO DOMINGO --/--"
    }]);
  };

  const removeItem = (index: number) => {
    if (!confirm("¿Eliminar esta semana?")) return;
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
        <div className="animate-pulse flex flex-col items-center">
          <CalendarDays className="w-12 h-12 text-primary/50 mb-4" />
          <p className="text-muted-foreground">Cargando guardias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-6 border-b flex justify-between items-center bg-card sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-primary" /> 
            Gestión de Guardias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Distribuye las guardias por departamento y semana.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={addItem} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-medium text-sm rounded-xl hover:bg-secondary/80 transition-colors">
            <Plus className="w-4 h-4" /> Agregar Semana
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" /> Guardar Cambios
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data.map((row, idx) => (
            <div key={row.id} className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Header / Configuración de Semana */}
              <div className={`p-5 flex justify-between items-start border-b border-border/50 ${row.isSpecial ? 'bg-red-500/5' : 'bg-muted/30'}`}>
                <div className="flex-1 mr-4 space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md">Semana {idx + 1}</span>
                     <input 
                        className="text-lg font-bold bg-transparent outline-none w-full placeholder-muted-foreground/50 focus:border-b border-primary" 
                        value={row.weekDaysText} 
                        onChange={e => updateItem(idx, 'weekDaysText', e.target.value)} 
                        placeholder="Título de la semana (Ej: SEMANA DEL 04 AL 08/05)" 
                      />
                   </div>
                   <input 
                      className="text-sm text-muted-foreground bg-transparent outline-none w-full placeholder-muted-foreground/30 focus:text-foreground" 
                      value={row.fechaText} 
                      onChange={e => updateItem(idx, 'fechaText', e.target.value)} 
                      placeholder="Fecha de Fín de Semana (Ej: SABADO DOMINGO 9-10/05)" 
                    />
                </div>
                <div className="flex items-center gap-4 bg-background p-2 rounded-xl border border-border/50 shadow-sm">
                   <label className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity">
                     <input type="checkbox" checked={row.isSpecial} onChange={() => toggleSpecial(idx)} className="rounded border-border/50 accent-primary w-4 h-4" />
                     <span className="font-semibold select-none">Día Feriado</span>
                   </label>
                   <div className="w-[1px] h-4 bg-border"></div>
                   <button onClick={() => removeItem(idx)} title="Eliminar semana" className="text-destructive hover:bg-destructive/10 rounded-md p-1 transition-colors">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {/* Título Especial para Feriados */}
              {row.isSpecial && (
                 <div className="p-3 bg-red-500/10 border-b border-border/50 border-dashed">
                   <input 
                      className="w-full bg-transparent outline-none font-bold text-center text-red-700 dark:text-red-400 placeholder-red-700/50" 
                      value={row.specialTitle || ""} 
                      onChange={e => updateItem(idx, 'specialTitle', e.target.value)} 
                      placeholder="Nombre del feriado (Ej: VIERNES 1° DE MAYO DIA DEL TRABAJADOR)" 
                    />
                 </div>
              )}

              {/* Contenido / Departamentos */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                 
                 {/* Call Center / Monitoreo */}
                 <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Headphones className="w-4 h-4" /> CC & Monitoreo
                    </h3>
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50 h-full">
                       {!row.isSpecial && (
                         <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">L-V Call Center</label>
                           <input className="w-full text-sm bg-background border border-border/50 rounded-lg p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-muted-foreground/30" value={row.weekCallCenterPerson || ""} onChange={e => updateItem(idx, 'weekCallCenterPerson', e.target.value)} placeholder="Ej: MARTHA PINTO" />
                         </div>
                       )}
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{row.isSpecial ? "Feriado CC" : "S-D Call Center"}</label>
                           <input className="w-full text-sm bg-background border border-border/50 rounded-lg p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-muted-foreground/30" value={row.isSpecial ? (row.specialCallCenter || "") : (row.weekendCallCenterPerson || "")} onChange={(e) => updateItem(idx, row.isSpecial ? 'specialCallCenter' : 'weekendCallCenterPerson', e.target.value)} placeholder="Personal Asignado" />
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{row.isSpecial ? "Feriado Monitoreo" : "S-D Monitoreo"}</label>
                           <input className="w-full text-sm bg-background border border-border/50 rounded-lg p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-muted-foreground/30" value={row.isSpecial ? (row.specialMonitoreo || "") : (row.weekendMonitoreoPerson || "")} onChange={(e) => updateItem(idx, row.isSpecial ? 'specialMonitoreo' : 'weekendMonitoreoPerson', e.target.value)} placeholder="Personal Asignado" />
                       </div>
                    </div>
                 </div>

                 {/* Soporte Técnico */}
                 <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <span className="text-[14px] leading-none">🛠️</span> Soporte Técnico
                    </h3>
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50 h-full">
                       {!row.isSpecial && (
                         <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">L-V Soporte</label>
                           <input className="w-full text-sm bg-background border border-border/50 rounded-lg p-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-muted-foreground/30" value={row.weekSoportePerson || ""} onChange={e => updateItem(idx, 'weekSoportePerson', e.target.value)} placeholder="Ej: JONATHAN / KELVIN" />
                         </div>
                       )}
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{row.isSpecial ? "Feriado Soporte" : "S-D Soporte"}</label>
                           <textarea rows={2} className="w-full text-sm bg-background border border-border/50 rounded-lg p-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-muted-foreground/30 resize-none" value={row.isSpecial ? (row.specialSoporte || "") : (row.weekendSoportePerson || "")} onChange={(e) => updateItem(idx, row.isSpecial ? 'specialSoporte' : 'weekendSoportePerson', e.target.value)} placeholder="Personal Asignado" />
                       </div>
                    </div>
                 </div>

                 {/* Administración / Agencia */}
                 <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                      <MapPin className="w-4 h-4" /> Agencia / Admin
                    </h3>
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50 h-full">
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{row.isSpecial ? "Feriado Agencia" : "S-D Agencia Turmero"}</label>
                           <input className="w-full text-sm bg-background border border-border/50 rounded-lg p-2 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-muted-foreground/30" value={row.isSpecial ? (row.specialAgencia || "") : (row.weekendAgenciaPerson || "")} onChange={(e) => updateItem(idx, row.isSpecial ? 'specialAgencia' : 'weekendAgenciaPerson', e.target.value)} placeholder="Ej: CERRADO / YHOSSELLYN" />
                       </div>
                    </div>
                 </div>

              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="col-span-full text-center p-12 text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-muted/5">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg mb-1">No hay guardias registradas</p>
              <p className="text-sm">Usa el botón &quot;Agregar Semana&quot; para comenzar a planificar los horarios.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

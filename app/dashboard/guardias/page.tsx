"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, CalendarDays } from "lucide-react";
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
          <p className="text-muted-foreground">Cargando cronograma...</p>
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
          <p className="text-sm text-muted-foreground mt-1">Reemplazo del Drive: Administra los horarios de CC, Monitoreo y Soporte Técnico.</p>
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
        <div className="overflow-x-auto border border-border/50 rounded-2xl bg-card shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-4 border-b border-border/50 text-center w-12">Item</th>
                <th className="px-4 py-4 border-b border-border/50 border-l text-center">Lunes a Viernes</th>
                <th className="px-4 py-4 border-b border-border/50 border-l text-center">Sábado / Domingo</th>
                <th className="px-4 py-4 border-b border-border/50 border-l text-center w-48">Fecha</th>
                <th className="px-4 py-4 border-b border-border/50 border-l text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={row.id} className="border-b border-border/50 group">
                  <td className="px-4 py-2 text-center font-bold text-lg align-top pt-4">
                    {idx + 1}
                  </td>
                  
                  {/* LUNES A VIERNES */}
                  <td className="p-0 border-l border-border/50 align-top">
                    <div className="flex flex-col h-full">
                      <div className="bg-green-50 dark:bg-green-950/20 p-2 text-center font-bold border-b border-border/50">
                        <input className="bg-transparent w-full text-center outline-none text-green-800 dark:text-green-300 placeholder-green-800/50" placeholder="SEMANA DEL..." value={row.weekDaysText} onChange={e => updateItem(idx, 'weekDaysText', e.target.value)} />
                      </div>
                      
                      {row.isSpecial ? (
                         <div className="p-4 flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
                           <span className="italic mb-2 text-xs">Bloque ocupado por Feriado.</span>
                           <button onClick={() => toggleSpecial(idx)} className="text-xs text-primary hover:underline">Quitar Feriado</button>
                         </div>
                      ) : (
                        <div className="flex flex-col flex-1">
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-1.5 text-center text-xs font-bold border-b border-border/50 text-blue-800 dark:text-blue-300">
                            <input className="bg-transparent w-full text-center outline-none" value={row.weekCallCenterText} onChange={e => updateItem(idx, 'weekCallCenterText', e.target.value)} />
                          </div>
                          <div className="p-3 border-b border-border/50">
                             <input className="w-full outline-none bg-transparent text-center font-medium" placeholder="Personal Call Center" value={row.weekCallCenterPerson} onChange={e => updateItem(idx, 'weekCallCenterPerson', e.target.value)} />
                          </div>
                          
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-1.5 text-center text-xs font-bold border-b border-border/50 text-blue-800 dark:text-blue-300">
                            <input className="bg-transparent w-full text-center outline-none" value={row.weekSoporteText} onChange={e => updateItem(idx, 'weekSoporteText', e.target.value)} />
                          </div>
                          <div className="p-3 flex-1 flex items-center">
                             <input className="w-full outline-none bg-transparent text-center font-medium" placeholder="Personal Soporte Técnico" value={row.weekSoportePerson} onChange={e => updateItem(idx, 'weekSoportePerson', e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* SABADO DOMINGO / SPECIAL */}
                  <td className="p-0 border-l border-border/50 align-top">
                     {row.isSpecial && (
                       <div className="flex flex-col border-b border-border/50 bg-red-50/50 dark:bg-red-950/10">
                          <div className="p-1.5 text-center text-xs font-bold bg-red-100 dark:bg-red-950/40 border-b border-border/50 text-red-800 dark:text-red-300">
                            <input className="bg-transparent w-full text-center outline-none" placeholder="Encabezado (Ej: CC Y MONITOREO...)" value={row.specialHeader || ''} onChange={e => updateItem(idx, 'specialHeader', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-3 border-b border-border/50 text-xs">
                             <div className="p-2 border-r border-border/50 font-bold flex items-center">CALL CENTER</div>
                             <div className="col-span-2 p-2"><input className="w-full bg-transparent outline-none font-medium" placeholder="Personal" value={row.specialCallCenter || ''} onChange={e => updateItem(idx, 'specialCallCenter', e.target.value)} /></div>
                          </div>
                          <div className="grid grid-cols-3 border-b border-border/50 text-xs">
                             <div className="p-2 border-r border-border/50 font-bold flex items-center">MONITOREO</div>
                             <div className="col-span-2 p-2"><input className="w-full bg-transparent outline-none font-medium" placeholder="Personal" value={row.specialMonitoreo || ''} onChange={e => updateItem(idx, 'specialMonitoreo', e.target.value)} /></div>
                          </div>
                          <div className="bg-red-100/50 dark:bg-red-950/20 p-1.5 text-center text-xs font-bold border-b border-border/50 text-red-800 dark:text-red-300">SOPORTE TÉCNICO</div>
                          <div className="p-3 border-b border-border/50 text-center text-sm">
                            <input className="w-full bg-transparent outline-none text-center font-medium" placeholder="Personal" value={row.specialSoporte || ''} onChange={e => updateItem(idx, 'specialSoporte', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-3 text-xs">
                             <div className="p-2 border-r border-border/50 font-bold flex items-center">AGENCIA TURMERO</div>
                             <div className="col-span-2 p-2"><input className="w-full bg-transparent outline-none font-medium" placeholder="Personal" value={row.specialAgencia || ''} onChange={e => updateItem(idx, 'specialAgencia', e.target.value)} /></div>
                          </div>
                       </div>
                     )}

                     <div className="flex flex-col bg-amber-50/50 dark:bg-amber-950/10">
                        <div className="p-1.5 text-center text-xs font-bold bg-amber-100 dark:bg-amber-950/40 border-b border-border/50 text-amber-900 dark:text-amber-300">
                          <input className="bg-transparent w-full text-center outline-none" value={row.weekendText} onChange={e => updateItem(idx, 'weekendText', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 border-b border-border/50 text-xs">
                           <div className="p-2 border-r border-border/50 font-bold flex items-center">CALL CENTER</div>
                           <div className="col-span-2 p-2"><input className="w-full bg-transparent outline-none font-medium" placeholder="Personal" value={row.weekendCallCenterPerson} onChange={e => updateItem(idx, 'weekendCallCenterPerson', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-border/50 text-xs">
                           <div className="p-2 border-r border-border/50 font-bold flex items-center">MONITOREO</div>
                           <div className="col-span-2 p-2"><input className="w-full bg-transparent outline-none font-medium" placeholder="Personal" value={row.weekendMonitoreoPerson} onChange={e => updateItem(idx, 'weekendMonitoreoPerson', e.target.value)} /></div>
                        </div>
                        <div className="bg-amber-100/50 dark:bg-amber-950/20 p-1.5 text-center text-xs font-bold border-b border-border/50 text-amber-900 dark:text-amber-300">SOPORTE TÉCNICO</div>
                        <div className="p-3 border-b border-border/50 text-center text-sm">
                          <input className="w-full bg-transparent outline-none text-center font-medium" placeholder="Personal" value={row.weekendSoportePerson} onChange={e => updateItem(idx, 'weekendSoportePerson', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 text-xs">
                           <div className="p-2 border-r border-border/50 font-bold flex items-center">AGENCIA TURMERO</div>
                           <div className="col-span-2 p-2"><input className="w-full bg-transparent outline-none font-medium" placeholder="Personal" value={row.weekendAgenciaPerson} onChange={e => updateItem(idx, 'weekendAgenciaPerson', e.target.value)} /></div>
                        </div>
                     </div>
                  </td>

                  {/* FECHA */}
                  <td className="p-0 border-l border-border/50 align-top text-center h-full bg-muted/5">
                    <div className="flex flex-col h-full min-h-[150px]">
                      {row.isSpecial && (
                        <div className="p-3 bg-red-100/80 dark:bg-red-950/60 border-b border-border/50 flex items-center justify-center min-h-[100px]">
                          <textarea className="bg-transparent w-full text-center outline-none font-bold resize-none text-red-900 dark:text-red-200" rows={3} placeholder="Texto Feriado" value={row.specialTitle || ''} onChange={e => updateItem(idx, 'specialTitle', e.target.value)} />
                        </div>
                      )}
                      <div className="p-4 bg-amber-100/80 dark:bg-amber-950/40 flex-1 flex flex-col items-center justify-center h-full">
                        <textarea className="bg-transparent w-full text-center outline-none font-bold resize-none text-amber-900 dark:text-amber-200" rows={2} placeholder="Fecha Sab/Dom" value={row.fechaText} onChange={e => updateItem(idx, 'fechaText', e.target.value)} />
                      </div>
                    </div>
                  </td>

                  {/* ACCIÓN */}
                  <td className="p-4 border-l border-border/50 text-center align-middle">
                    <div className="flex flex-col items-center gap-3">
                      <button onClick={() => removeItem(idx)} title="Eliminar semana" className="p-2.5 text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {!row.isSpecial && (
                        <button onClick={() => toggleSpecial(idx)} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors text-center leading-tight">
                          Añadir<br/>Feriado
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="text-center p-12 text-muted-foreground border border-dashed rounded-xl mt-4">
            No hay guardias registradas. Usa el botón "Agregar Semana" para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}

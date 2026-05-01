"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Save, Plus, Trash2, CalendarDays, Headphones, MapPin,
  AlertCircle, Clock, ChevronDown, ChevronUp, Users,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  History, X, Check, ArrowRight, Menu
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const VENEZUELA_HOLIDAYS: { [key: string]: string } = {
  "0-1": "Año Nuevo",
  "3-19": "Proclamación de la Independencia",
  "4-1": "Día del Trabajador",
  "5-24": "Batalla de Carabobo",
  "6-5": "Día de la Independencia",
  "6-24": "Natalicio del Libertador",
  "9-12": "Día de la Resistencia Indígena",
  "11-24": "Víspera de Navidad",
  "11-25": "Navidad",
  "11-31": "Fin de Año"
};

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
  options: { id: string, name: string }[];
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
          <span className="text-muted-foreground/40 font-normal flex items-center gap-2"><Users className="w-4 h-4" /> {placeholder}</span>
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
  const [agents, setAgents] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Navigation
  const [currentMonth, setCurrentMonth] = useState(4); // Mayo
  const [currentYear, setCurrentYear] = useState(2026);

  // Selection
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("Administrador");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

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

        let fetchedAgents: { id: string, name: string }[] = resAgents.data || [];
        if (!fetchedAgents.find((a: any) => a.name && a.name.includes("HENYERBETH ARRIECHE"))) {
          fetchedAgents.push({ id: 'missing-henyerbeth', name: 'HENYERBETH ARRIECHE' });
        }
        setAgents(fetchedAgents);
        
        const { data: { user } } = await createClient().auth.getUser();
        if (user?.email) setCurrentUser(user.email.split('@')[0].toUpperCase());
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

  const filteredData = useMemo(() => {
    return data.filter(item => item.month === currentMonth && item.year === currentYear);
  }, [data, currentMonth, currentYear]);

  const selectedWeek = useMemo(() => {
    return data.find(w => w.id === selectedWeekId) || null;
  }, [data, selectedWeekId]);

  const handleDownload = async () => {
    if (filteredData.length === 0) {
      toast.error("No hay datos en este mes. Pulsa 'Generar Mes' primero.");
      return;
    }

    const toastId = toast.loading('Generando cronograma premium...');

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      // Background header style
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 280, 25, 'F');

      // Intentar cargar e insertar logo
      try {
        const logoImg = new Image();
        logoImg.src = '/logo.png';
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          doc.addImage(logoImg, 'PNG', 12, 4, 16, 16);
        }
      } catch (e) {}
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("SISPROT G.F - CRONOGRAMA DE GUARDIAS", 148, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`${MONTHS[currentMonth].toUpperCase()} ${currentYear}`, 140, 22, { align: 'center' });

      // --- AGRUPACIÓN POR SEMANA ---
      const weekMap = new Map<string, any[]>();
      const monthStr = (currentMonth + 1).toString().padStart(2, '0');

      filteredData.forEach(w => {
        const d = new Date(currentYear, currentMonth, w.startDay);
        // Ajustar al lunes de esa semana
        const dayDiff = (d.getDay() + 6) % 7; 
        const monday = new Date(d);
        monday.setDate(d.getDate() - dayDiff);
        const weekKey = monday.toDateString();
        
        if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
        weekMap.get(weekKey)?.push(w);
      });

      const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => {
        const minA = Math.min(...a.map(i => i.startDay));
        const minB = Math.min(...b.map(i => i.startDay));
        return minA - minB;
      });

      const tableRows: any[] = [];

      sortedWeeks.forEach((group, idx) => {
        const itemNum = idx + 1;
        
        // Determinar límites de la semana (Lunes a Domingo)
        const firstItem = group.sort((a, b) => a.startDay - b.startDay)[0];
        const dRef = new Date(currentYear, currentMonth, firstItem.startDay);
        const diffMon = (dRef.getDay() + 6) % 7;
        const mon = new Date(dRef); mon.setDate(dRef.getDate() - diffMon);
        const sat = new Date(mon); sat.setDate(mon.getDate() + 5);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);

        const monStr = mon.getDate().toString().padStart(2, '0');
        const friStr = fri.getDate().toString().padStart(2, '0');
        const satStr = sat.getDate().toString().padStart(2, '0');
        const sunStr = sun.getDate().toString().padStart(2, '0');
        
        let leftCol = `SEMANA DEL ${monStr} AL ${friStr}/${monthStr}\n`;
        let rightCol = `CC Y MONITOREO SÁBADO ${satStr} Y DOMINGO ${sunStr}/${monthStr}\n08:00 AM A 08:00 PM\n\n`;
        let dateCol = `${monStr}-${sunStr}/${monthStr}`;

        // Separar L-V y S-D
        const lvItems = group.filter(i => {
          const d = new Date(currentYear, currentMonth, i.startDay);
          const day = (d.getDay() + 6) % 7;
          return day < 5 || (i.isSpecial && day < 5);
        });

        const sdItems = group.filter(i => {
          const d = new Date(currentYear, currentMonth, i.startDay);
          const day = (d.getDay() + 6) % 7;
          return day >= 5 || (!i.isSpecial && i.endDay >= 6);
        });

        // --- CONSTRUIR COLUMNA IZQUIERDA (L-V) ---
        const holidaysLV = lvItems.filter(i => i.isSpecial);
        const regularLV = lvItems.filter(i => !i.isSpecial);

        if (holidaysLV.length > 0) {
          // Si hay feriado, detallamos días operativos
          const hDay = holidaysLV[0].startDay;
          const hDate = new Date(currentYear, currentMonth, hDay);
          const hIdx = (hDate.getDay() + 6) % 7;

          const workdayText = hIdx === 4 ? "Lunes a Jueves" : hIdx === 0 ? "Martes a Viernes" : "Días Laborales";
          leftCol += `${workdayText}: AGENCIA ABIERTA\n`;
          
          const reg = regularLV[0] || group.find(i => i.weekCallCenterPerson);
          leftCol += `CALL CENTER: ${reg?.weekCallCenterPerson || '-'}\n`;
          leftCol += `SOPORTE TÉCNICO: ${reg?.weekSoportePerson || '-'}\n`;

          holidaysLV.forEach(h => {
            const hName = WEEKDAYS[(new Date(currentYear, currentMonth, h.startDay).getDay() + 6) % 7];
            leftCol += `\n${hName.toUpperCase()} ${h.startDay}/${monthStr}: DÍA FERIADO - AGENCIA CERRADA\n`;
            leftCol += `CC: ${h.specialCallCenter || '-'}\nMN: ${h.weekendMonitoreoPerson || '-'}\n`;
            leftCol += `SOPORTE: ${h.specialSoporte || '-'}`;
          });
        } else if (regularLV.length > 0) {
          leftCol += `Lunes a Viernes: AGENCIA ABIERTA\n`;
          leftCol += `CALL CENTER: ${regularLV[0].weekCallCenterPerson || '-'}\n`;
          let soporteHorario = regularLV[0].startDay >= 18 ? "01:00 PM A 08:00 PM" : "08:00 AM A 08:00 PM";
          leftCol += `SOPORTE TÉCNICO ${soporteHorario}: ${regularLV[0].weekSoportePerson || '-'}`;
        }

        // --- CONSTRUIR COLUMNA DERECHA (S-D) ---
        const regSD = sdItems.find(i => !i.isSpecial);
        rightCol += `CC: ${regSD?.weekendCallCenterPerson || '-'}\n`;
        rightCol += `MN: ${regSD?.weekendMonitoreoPerson || '-'}\n`;
        rightCol += `SOPORTE TÉCNICO: ${regSD?.weekendSoportePerson || '-'}\n`;
        rightCol += `AGENCIA TURMERO: ${regSD?.weekendAgenciaPerson || 'ABIERTA'}`;

        const holidaysSD = sdItems.filter(i => i.isSpecial);
        holidaysSD.forEach(h => {
          const hName = WEEKDAYS[(new Date(currentYear, currentMonth, h.startDay).getDay() + 6) % 7];
          rightCol += `\n\nFERIADO ${hName.toUpperCase()} ${h.startDay}/${monthStr}:\n`;
          rightCol += `CC: ${h.specialCallCenter || '-'}\nMN: ${h.weekendMonitoreoPerson || '-'}\n`;
          rightCol += `SOPORTE: ${h.specialSoporte || '-'}`;
        });

        tableRows.push([itemNum.toString(), leftCol, rightCol, dateCol]);
      });

      autoTable(doc, {
        startY: 30,
        head: [['ITEM', 'LUNES A VIERNES', 'SÁBADO / DOMINGO', 'FECHA']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 10, halign: 'center', fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, textColor: [15, 23, 42], lineWidth: 0.1, lineColor: [80, 80, 80] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', valign: 'middle' },
          1: { cellWidth: 100 },
          2: { cellWidth: 100 },
          3: { cellWidth: 35, halign: 'center', valign: 'middle', fontStyle: 'bold' }
        },
        didParseCell: function(data: any) {
          if (data.section === 'body') {
            if (data.column.index === 1 && data.cell.raw && String(data.cell.raw).includes('SEMANA')) {
               data.cell.styles.fillColor = [240, 250, 240];
            }
            if (data.column.index === 2 && data.cell.raw && String(data.cell.raw).includes('CC Y MONITOREO')) {
               data.cell.styles.fillColor = [255, 253, 240];
            }
            if (data.cell.raw && String(data.cell.raw).includes('FERIADO')) {
               data.cell.styles.fillColor = [255, 240, 240];
            }
          }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Sistema de Control Sisprot - Generado por: ${currentUser} - ${new Date().toLocaleString()}`, 14, finalY + 10);
      
      doc.save(`Cronograma_Guardias_${MONTHS[currentMonth]}.pdf`);
      toast.success('¡Cronograma Premium Descargado!', { id: toastId });
    } catch (error) {
      console.error('Error PDF:', error);
      toast.error('Error al generar el diseño premium.', { id: toastId });
    }
  };
  const generateFullMonth = () => {
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const newItems: any[] = [];
    
    // 1. Detectar Feriados automáticos (Venezuela)
    for (let d = 1; d <= lastDay; d++) {
      const key = `${currentMonth}-${d}`;
      if (VENEZUELA_HOLIDAYS[key]) {
        newItems.push({
          id: `holiday-${d}-${Date.now()}`,
          month: currentMonth,
          year: currentYear,
          startDay: d,
          endDay: d,
          isSpecial: true,
          specialTitle: `${WEEKDAYS[(new Date(currentYear, currentMonth, d).getDay() + 6) % 7].toUpperCase()} ${d}° DE ${MONTHS[currentMonth].toUpperCase()}: ${VENEZUELA_HOLIDAYS[key]}`,
          specialCallCenter: "GEORGINA BALADI",
          specialSoporte: "CARLOS OVALLES / ARNALDO ROJAS",
          specialAgencia: "CERRADA",
          weekendMonitoreoPerson: "HENYERBETH ARRIECHE" // Según solicitud del usuario
        });
      }
    }

    // 2. Generar Semanas basadas en LUNES a DOMINGO
    let d = 1;
    // Primera semana (puede ser corta si el mes no empieza en lunes)
    const firstDayObj = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = (firstDayObj.getDay() + 6) % 7; // 0=L, 6=D
    const daysToFirstSun = 6 - firstDayOfWeek;
    const firstEnd = Math.min(1 + daysToFirstSun, lastDay);
    
    // Solo agregar si no es solo el día 1 (que ya es feriado) o si tiene fin de semana
    if (firstEnd > 1) {
      newItems.push({
        id: `week-init-${Date.now()}`,
        month: currentMonth,
        year: currentYear,
        startDay: firstDayOfWeek === 0 ? 1 : 2, // Empezar después del feriado del 1
        endDay: firstEnd,
        isSpecial: false,
        weekCallCenterPerson: "",
        weekSoportePerson: "",
        weekendCallCenterPerson: "",
        weekendMonitoreoPerson: "",
        weekendSoportePerson: "",
        weekendAgenciaPerson: ""
      });
    }

    // Semanas completas restantes
    d = firstEnd + 1;
    while (d <= lastDay) {
      const end = Math.min(d + 6, lastDay);
      newItems.push({
        id: `week-${d}-${Date.now()}`,
        month: currentMonth,
        year: currentYear,
        startDay: d,
        endDay: end,
        isSpecial: false,
        weekCallCenterPerson: "",
        weekSoportePerson: "",
        weekendCallCenterPerson: "",
        weekendMonitoreoPerson: "",
        weekendSoportePerson: "",
        weekendAgenciaPerson: ""
      });
      d = end + 1;
    }

    setData([...newItems, ...data]);
    toast.success(`Se han generado los bloques de ${MONTHS[currentMonth]} ${currentYear} correctamente`);
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
  };

  const removeItem = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = () => {
    if (deleteModal.id) {
      setData(data.filter(item => item.id !== deleteModal.id));
      if (selectedWeekId === deleteModal.id) {
        setSelectedWeekId(null);
      }
      setDeleteModal({ isOpen: false, id: null });
      toast.success("Semana eliminada");
    }
  };

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
    <div className="min-h-screen bg-[#fafafa] text-foreground font-sans flex flex-col">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Header Premium */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/40 px-4 lg:px-8 py-3 lg:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4 lg:gap-6">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden p-2 bg-muted/50 rounded-xl hover:bg-muted transition-all"
             >
                <Menu className="w-5 h-5" />
             </button>
             <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <CalendarIcon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
             </div>
             <div>
                <h1 className="text-base lg:text-lg font-black tracking-tight text-foreground uppercase">Control de Guardias</h1>
                <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{MONTHS[currentMonth]} {currentYear}</p>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
            <button 
              onClick={() => setCurrentMonth(prev => prev === 0 ? 11 : prev - 1)}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 lg:px-4 text-[10px] lg:text-xs font-black uppercase min-w-[80px] lg:min-w-[120px] text-center">
              {MONTHS[currentMonth]}
            </span>
            <button 
              onClick={() => setCurrentMonth(prev => prev === 11 ? 0 : prev + 1)}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-2.5 bg-white text-foreground border border-border/50 font-bold rounded-xl shadow-sm hover:bg-muted active:scale-95 transition-all text-[10px] lg:text-sm whitespace-nowrap"
           >
             <Save className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4", isSaving && "animate-spin")} /> 
             <span className="hidden xs:inline">{isSaving ? 'Guardando...' : 'Guardar'}</span>
             <span className="xs:hidden">Guardar</span>
           </button>

           <button 
             onClick={generateFullMonth}
             className="flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:bg-blue-500 active:scale-95 transition-all text-[10px] lg:text-sm whitespace-nowrap"
           >
             <History className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Generar
           </button>

           <button 
             onClick={addItem}
             className="flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all text-[10px] lg:text-sm whitespace-nowrap"
           >
             <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Nueva
           </button>

           <button 
             onClick={handleDownload}
             className="flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all text-[10px] lg:text-sm whitespace-nowrap"
           >
             <History className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> PDF
           </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Timeline Sidebar */}
        <aside className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40 w-80 lg:w-96 border-r border-border/40 bg-white flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
           <div className="p-4 lg:p-6 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between mb-4 lg:hidden">
                 <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Planificación</h2>
                 <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-muted rounded-xl">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Cronograma Mensual</h2>
              <p className="text-[10px] font-medium text-muted-foreground/60 mt-1">Semanas y Feriados detectados.</p>
              
              {/* Mini Calendar Visualization */}
              <div className="mt-4 grid grid-cols-7 gap-1">
                 {['L','M','M','J','V','S','D'].map((d,i) => (
                   <div key={i} className="text-[8px] font-black text-center text-muted-foreground/40">{d}</div>
                 ))}
                 {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }).map((_, i) => {
                   const day = i + 1;
                   const date = new Date(currentYear, currentMonth, day);
                   const isHoliday = !!VENEZUELA_HOLIDAYS[`${currentMonth}-${day}`];
                   const hasData = filteredData.some(w => day >= w.startDay && day <= w.endDay);
                   const startOffset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
                   
                   return (
                     <div 
                       key={i} 
                       style={{ gridColumnStart: day === 1 ? startOffset + 1 : 'auto' }}
                       className={cn(
                         "h-6 rounded-md flex items-center justify-center text-[9px] font-bold border transition-all",
                         isHoliday ? "bg-red-100 border-red-200 text-red-600 shadow-sm shadow-red-100" : 
                         hasData ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/30 border-transparent text-muted-foreground/40"
                       )}
                     >
                       {day}
                     </div>
                   );
                 })}
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredData.sort((a,b) => a.startDay - b.startDay).map((week) => (
                <button
                  key={week.id}
                  onClick={() => {
                    setSelectedWeekId(week.id);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-4 lg:p-5 rounded-2xl transition-all border-2 group",
                    selectedWeekId === week.id 
                      ? "bg-primary/5 border-primary shadow-sm" 
                      : "bg-white border-transparent hover:bg-muted/50 hover:border-border/60"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                         "w-2.5 h-2.5 rounded-full",
                         week.isSpecial ? "bg-red-500 animate-pulse" : "bg-primary"
                       )} />
                       <span className="text-sm font-black text-foreground">
                         {week.isSpecial ? (week.specialTitle || `Día ${week.startDay}`) : `${week.startDay} al ${week.endDay}`}
                       </span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-tighter">Mayo 2026</span>
                       {week.isSpecial && (
                         <span className="text-[8px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-md uppercase mt-1">Feriado</span>
                       )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                       <Headphones className="w-3 h-3 text-blue-500" />
                       <p className="text-[10px] font-bold text-muted-foreground truncate uppercase">
                         {week.isSpecial ? (week.specialCallCenter || 'Sin asignar') : (week.weekCallCenterPerson || 'Sin asignar')}
                       </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                       <div className="w-3 h-3 flex items-center justify-center text-[10px]">🛠️</div>
                       <p className="text-[10px] font-bold text-muted-foreground truncate uppercase">
                         {week.isSpecial ? (week.specialSoporte || 'Sin asignar') : (week.weekSoportePerson || 'Sin asignar')}
                       </p>
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                   <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="w-8 h-8 text-muted-foreground/30" />
                   </div>
                   <p className="text-xs font-bold text-muted-foreground uppercase">No hay semanas para este mes</p>
                   <button onClick={addItem} className="text-[10px] font-black text-primary hover:underline mt-2 uppercase">Crear Primera Semana</button>
                </div>
              )}
           </div>
        </aside>

        {/* Detail View */}
        <section className="flex-1 bg-white overflow-y-auto">
          {selectedWeek ? (
              <div className="max-w-4xl mx-auto p-6 lg:p-12 pb-24 lg:pb-12">
                 <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 lg:mb-12">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            selectedWeek.isSpecial ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                          )}>
                            {selectedWeek.isSpecial ? "Planificación Especial / Feriado" : "Guardia Regular de Semana"}
                          </span>
                       </div>
                       <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase leading-[0.9]">
                         {selectedWeek.isSpecial ? (selectedWeek.specialTitle || "Día Especial") : `Semana ${selectedWeek.startDay} al ${selectedWeek.endDay}`}
                       </h2>
                       <p className="text-muted-foreground font-bold text-sm mt-3 flex items-center gap-2">
                         <Clock className="w-4 h-4" /> {MONTHS[currentMonth].toUpperCase()} {currentYear} • SISPROT G.F
                       </p>
                    </div>
                    
                    <button 
                      onClick={() => removeItem(selectedWeek.id)}
                      className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-2xl transition-all"
                      title="Eliminar esta semana"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                 </div>

                 <div className="grid grid-cols-1 gap-12">
                    {/* Special Toggle */}
                    <div className={cn(
                      "p-6 rounded-3xl border-2 transition-all flex items-center justify-between",
                      selectedWeek.isSpecial ? "bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5" : "bg-muted/5 border-border/40"
                    )}>
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center",
                          selectedWeek.isSpecial ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-black text-lg uppercase tracking-tight">Modo Feriado / Festivo</p>
                          <p className="text-sm text-muted-foreground font-medium">Habilita campos de guardia para días especiales.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-125 mr-4">
                        <input
                          type="checkbox"
                          checked={selectedWeek.isSpecial}
                          onChange={() => updateItem(selectedWeek.id, 'isSpecial', !selectedWeek.isSpecial)}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black text-red-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                           Título y Fecha del Evento
                        </label>
                        <input
                          className="w-full bg-red-50 border-2 border-red-100 focus:border-red-500 focus:bg-white rounded-2xl px-6 py-4 outline-none font-black text-xl text-red-900 transition-all placeholder:text-red-200"
                          placeholder="Ej: Miércoles 1 de Mayo: Feriado"
                          value={selectedWeek.specialTitle}
                          onChange={e => updateItem(selectedWeek.id, 'specialTitle', e.target.value)}
                        />
                        <div className="flex gap-4">
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 ml-1">Día de Inicio</p>
                              <input type="number" value={selectedWeek.startDay} onChange={e => updateItem(selectedWeek.id, 'startDay', parseInt(e.target.value))} className="w-full p-3 rounded-xl border border-border/40 font-bold" />
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 ml-1">Día Final</p>
                              <input type="number" value={selectedWeek.endDay} onChange={e => updateItem(selectedWeek.id, 'endDay', parseInt(e.target.value))} className="w-full p-3 rounded-xl border border-border/40 font-bold" />
                           </div>
                        </div>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* Role Card 1 */}
                       <div className="bg-[#fcfcfc] border border-border/40 rounded-[2rem] p-8 space-y-8 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                <Headphones className="w-6 h-6" />
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tighter">Call Center</h3>
                          </div>
                          
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">L-V (8:00 AM - 5:00 PM)</p>
                                <MultiSelect 
                                  value={selectedWeek.weekCallCenterPerson} 
                                  onChange={v => updateItem(selectedWeek.id, 'weekCallCenterPerson', v)} 
                                  options={agents} placeholder="Sin asignar" 
                                />
                             </div>
                             <div className="space-y-2">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">SÁB-DOM (8:00 AM - 8:00 PM)</p>
                                <MultiSelect 
                                  value={selectedWeek.weekendCallCenterPerson} 
                                  onChange={v => updateItem(selectedWeek.id, 'weekendCallCenterPerson', v)} 
                                  options={agents} placeholder="Sin asignar" 
                                />
                             </div>
                             {selectedWeek.isSpecial && (
                               <div className="space-y-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Guardia Feriado</p>
                                  <MultiSelect 
                                    value={selectedWeek.specialCallCenter} 
                                    onChange={v => updateItem(selectedWeek.id, 'specialCallCenter', v)} 
                                    options={agents} placeholder="Sin asignar" 
                                  />
                               </div>
                             )}
                          </div>
                       </div>

                       {/* Role Card 2 */}
                       <div className="bg-[#fcfcfc] border border-border/40 rounded-[2rem] p-8 space-y-8 hover:shadow-xl hover:shadow-amber-500/5 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl text-xl flex items-center justify-center">🛠️</div>
                             <h3 className="text-xl font-black uppercase tracking-tighter">Soporte Técnico</h3>
                          </div>
                          
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">L-V (8:00 AM - 8:00 PM)</p>
                                <MultiSelect 
                                  value={selectedWeek.weekSoportePerson} 
                                  onChange={v => updateItem(selectedWeek.id, 'weekSoportePerson', v)} 
                                  options={agents} placeholder="Sin asignar" 
                                />
                             </div>
                             <div className="space-y-2">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">SÁB-DOM (8:00 AM - 8:00 PM)</p>
                                <MultiSelect 
                                  value={selectedWeek.weekendSoportePerson} 
                                  onChange={v => updateItem(selectedWeek.id, 'weekendSoportePerson', v)} 
                                  options={agents} placeholder="Sin asignar" 
                                />
                             </div>
                             {selectedWeek.isSpecial && (
                               <div className="space-y-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Soporte Feriado</p>
                                  <MultiSelect 
                                    value={selectedWeek.specialSoporte} 
                                    onChange={v => updateItem(selectedWeek.id, 'specialSoporte', v)} 
                                    options={agents} placeholder="Sin asignar" 
                                  />
                               </div>
                             )}
                          </div>
                       </div>

                       {/* Role Card 3 */}
                       <div className="bg-[#fcfcfc] border border-border/40 rounded-[2rem] p-8 space-y-8 hover:shadow-xl hover:shadow-green-500/5 transition-all md:col-span-2">
                          <div className="flex flex-col items-center text-center gap-4">
                             <div className="p-3 bg-green-100 text-green-600 rounded-2xl w-fit"><MapPin className="w-6 h-6" /></div>
                             <h3 className="text-xl font-black uppercase tracking-tighter">Agencia & Monitoreo</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Monitoreo (S-D)</p>
                                <MultiSelect 
                                  value={selectedWeek.weekendMonitoreoPerson} 
                                  onChange={v => updateItem(selectedWeek.id, 'weekendMonitoreoPerson', v)} 
                                  options={agents} placeholder="Sin asignar" 
                                />
                             </div>
                             <div className="space-y-2">
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Agencia (S-D)</p>
                                <MultiSelect 
                                  value={selectedWeek.weekendAgenciaPerson} 
                                  onChange={v => updateItem(selectedWeek.id, 'weekendAgenciaPerson', v)} 
                                  options={[{id: 'cerrado', name: 'CERRADO'}, ...agents]} placeholder="Estado" 
                                />
                             </div>
                             {selectedWeek.isSpecial && (
                               <div className="space-y-2">
                                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Agencia Feriado</p>
                                  <MultiSelect 
                                    value={selectedWeek.specialAgencia} 
                                    onChange={v => updateItem(selectedWeek.id, 'specialAgencia', v)} 
                                    options={[{id: 'cerrado', name: 'CERRADO'}, ...agents]} placeholder="Estado" 
                                  />
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-20 text-center bg-muted/5">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-black/5">
                <CalendarIcon className="w-16 h-16 text-muted-foreground/20" />
              </div>
              <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter">Centro de Control</h3>
              <p className="text-muted-foreground font-medium max-w-sm mt-4">
                Selecciona una semana de la lista lateral para gestionar los turnos de guardia, personal y feriados.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Custom Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div 
             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
             onClick={() => setDeleteModal({ isOpen: false, id: null })}
           />
           <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative z-10 border border-border/40 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-3xl flex items-center justify-center mb-8 mx-auto">
                 <Trash2 className="w-10 h-10" />
              </div>
              
              <h3 className="text-2xl font-black text-center text-foreground uppercase tracking-tight mb-4">¿Eliminar Guardia?</h3>
              <p className="text-muted-foreground text-center font-medium mb-10">
                Esta acción eliminará permanentemente la planificación de esta semana. No podrás deshacer este cambio.
              </p>
              
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={confirmDelete}
                   className="w-full py-4 bg-destructive text-destructive-foreground font-black rounded-2xl shadow-lg shadow-destructive/20 hover:bg-destructive/90 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                 >
                   Sí, Eliminar Registro
                 </button>
                 <button 
                   onClick={() => setDeleteModal({ isOpen: false, id: null })}
                   className="w-full py-4 bg-muted/50 text-muted-foreground font-black rounded-2xl hover:bg-muted transition-all uppercase tracking-widest text-xs"
                 >
                   No, Mantener
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* Hidden Content for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="pdf-report-content" style={{ 
          width: '750px', 
          padding: '40px', 
          background: 'white', 
          fontFamily: 'Inter, sans-serif',
          color: '#1e293b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #2563eb', paddingBottom: '15px', marginBottom: '20px' }}>
             <img src="/logo.png" style={{ height: '50px' }} />
             <div style={{ textAlign: 'right' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>Cronograma de Guardias</h1>
                <p style={{ margin: 2, fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{MONTHS[currentMonth].toUpperCase()} {currentYear} • SISPROT G.F</p>
             </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #0f172a' }}>
             <thead>
                <tr style={{ background: '#f1f5f9' }}>
                   <th style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Día / Fecha</th>
                   <th style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Call Center & Monitoreo</th>
                   <th style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Soporte Técnico</th>
                   <th style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Agencia</th>
                   <th style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Horario</th>
                </tr>
             </thead>
             <tbody>
                {filteredData.sort((a,b) => a.startDay - b.startDay).map((w, idx) => {
                  const items = [];
                  if (!w.isSpecial && w.startDay <= 5) {
                    items.push(
                      <tr key={`${w.id}-lv`}>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 900, textAlign: 'center', fontSize: '11px', background: '#f8fafc' }}>
                          Lunes {w.startDay} al Viernes {Math.min(w.endDay, 5)}
                        </td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>{w.weekCallCenterPerson || '-'}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>{w.weekSoportePerson || '-'}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', textAlign: 'center' }}>-</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '9px', fontWeight: 800, color: '#64748b' }}>8:00 AM - 5:00 PM</td>
                      </tr>
                    );
                  }
                  if (w.isSpecial) {
                    items.push(
                      <tr key={`${w.id}-sp`} style={{ background: '#fee2e2' }}>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 900, textAlign: 'center', fontSize: '11px' }}>{w.specialTitle || `Feriado ${w.startDay}`}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>
                          CC: {w.specialCallCenter || '-'}<br/>MN: {w.weekendMonitoreoPerson || '-'}
                        </td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>{w.specialSoporte || '-'}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>{w.specialAgencia || '-'}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '9px', fontWeight: 900 }}>8:00 AM - 8:00 PM</td>
                      </tr>
                    );
                  }
                  if (w.endDay >= 6) {
                    items.push(
                      <tr key={`${w.id}-we`} style={{ background: '#fffbeb' }}>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 900, textAlign: 'center', fontSize: '11px' }}>Sábado {Math.max(w.startDay, 6)} y Domingo {w.endDay}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>
                          CC: {w.weekendCallCenterPerson || '-'}<br/>MN: {w.weekendMonitoreoPerson || '-'}
                        </td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>{w.weekendSoportePerson || '-'}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontWeight: 700, fontSize: '11px' }}>{w.weekendAgenciaPerson || '-'}</td>
                        <td style={{ border: '1px solid #0f172a', padding: '10px', fontSize: '9px', fontWeight: 900 }}>8:00 AM - 8:00 PM</td>
                      </tr>
                    );
                  }
                  return items;
                })}
             </tbody>
          </table>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ fontSize: '10px', color: '#94a3b8' }}>Generado por Sisprot Control System</div>
             <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ borderTop: '2px solid #0f172a', marginBottom: '5px' }}></div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>{currentUser}</p>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#64748b' }}>SUPERVISOR DE OPERACIONES</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

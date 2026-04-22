import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { getTechnicians } from "@/lib/actions/visits";

export default async function CalendarPage() {
  const technicians = await getTechnicians();

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Gestión de Soporte</h1>
                <p className="text-sidebar-foreground/60">Organiza y supervisa las visitas técnicas de soporte.</p>
              </div>
            </div>

            <Suspense fallback={<div className="h-full flex items-center justify-center">Cargando calendario...</div>}>
              <CalendarView technicians={technicians} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

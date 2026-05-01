"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Users, 
  LogOut,
  CalendarDays,
  Radio,
  LifeBuoy,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading, agent } = usePermissions();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const sidebarItems = [
    // Dashboard: Solo Supervisor
    ...(role === "supervisor" ? [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" }
    ] : []),
    
    // Conversaciones: Operador y Supervisor
    ...((role === "operador" || role === "supervisor") ? [
      { icon: MessageSquare, label: "Conversaciones", href: "/dashboard/conversations" }
    ] : []),
    
    // Gestión y Soporte (anteriormente Soporte): Todos (Agent, Operador, Supervisor)
    { icon: LifeBuoy, label: "Atención y Soporte", href: "/dashboard/calendar" },

    // Guardias y Usuarios: Solo Supervisor
    ...(role === "supervisor" ? [
      { icon: CalendarDays, label: "Guardias", href: "/dashboard/guardias" },
      { icon: Users, label: "Usuarios", href: "/dashboard/users" }
    ] : []),
  ];

  return (
    <aside className="fixed md:relative bottom-0 left-0 right-0 z-50 flex flex-row md:flex-col h-[68px] md:h-full w-full md:w-[68px] items-center justify-around md:justify-start py-2 md:py-4 bg-sidebar border-t md:border-t-0 md:border-r border-sidebar-border shrink-0">
      <div className="hidden md:flex mb-8 p-2 bg-primary/10 rounded-xl">
        <Radio className="h-6 w-6 text-primary" />
      </div>

      <nav className="flex-1 flex flex-row md:flex-col items-center justify-around md:justify-start gap-1 md:gap-4 w-full md:w-auto px-2 md:px-0">
        {!loading && sidebarItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={cn(
                "p-2 md:p-3 rounded-xl transition-all duration-200 group relative flex-1 md:flex-none flex justify-center max-w-[48px] md:max-w-none",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-5 w-5" />
              {isActive && (
                <span className="absolute bottom-[-8px] md:bottom-auto left-1/2 md:left-auto md:-right-[1px] md:top-1/2 -translate-x-1/2 md:-translate-x-0 md:-translate-y-1/2 w-6 h-[3px] md:w-[3px] md:h-6 bg-primary rounded-t-full md:rounded-l-full md:rounded-t-none" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="md:mt-auto flex flex-row md:flex-col items-center gap-1 md:gap-4 pr-2 md:pr-0">
        {/* Notificaciones (Opcional, estilo empresarial) */}
        <button className="hidden md:flex p-3 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all relative group">
          <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-sidebar" />
        </button>

        {/* Perfil del Usuario / Configuración (Estilo WhatsApp Business) */}
        <button 
          title={`Perfil: ${agent?.name || agent?.email}`}
          className="p-1 md:p-1.5 rounded-xl border-2 border-transparent hover:border-primary/20 transition-all group relative shrink-0"
        >
          <div className="relative">
            <Avatar className="h-9 w-9 md:h-10 md:w-10 ring-2 ring-offset-2 ring-offset-sidebar ring-transparent group-hover:ring-primary/40 transition-all">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] md:text-xs font-black uppercase">
                {getInitials(agent?.name)}
              </AvatarFallback>
            </Avatar>
            {/* Indicador de Estado (Online) */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 md:h-3.5 md:w-3.5 bg-green-500 rounded-full border-2 border-sidebar" />
          </div>
        </button>
        
        <button 
          title="Cerrar Sesión"
          onClick={handleLogout}
          className="p-2 md:p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all cursor-pointer flex justify-center max-w-[48px] md:max-w-none"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}


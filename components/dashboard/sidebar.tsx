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
  Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";

const WrenchEmoji = ({ className }: { className?: string }) => (
  <span className={cn("flex items-center justify-center text-lg", className)} style={{ lineHeight: 1 }}>🛠️</span>
);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = usePermissions();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebarItems = [
    // Dashboard y Conversaciones: Call Center (operador) y Supervisor
    ...(role !== "agent" ? [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: MessageSquare, label: "Conversaciones", href: "/dashboard/conversations" }
    ] : []),
    
    // Soporte (Calendario): Soporte Técnico (agent) y Supervisor. Call Center (operador) NO lo ve.
    ...(role !== "operador" ? [
      { icon: WrenchEmoji, label: "Soporte", href: "/dashboard/calendar" }
    ] : []),

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
        <button 
          title="Configuración"
          className="hidden md:flex p-3 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <Settings className="h-5 w-5" />
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


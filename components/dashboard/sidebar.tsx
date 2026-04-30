"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Users, 
  LogOut,
  CalendarDays,
  Radio,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

const WrenchEmoji = ({ className }: { className?: string }) => (
  <span className={cn("flex items-center justify-center text-lg", className)} style={{ lineHeight: 1 }}>🛠️</span>
);

export function Sidebar() {
  const pathname = usePathname();
  const { role, loading } = usePermissions();

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
      { icon: Users, label: "Usuarios", href: "#" },
      { icon: Radio, label: "En vivo", href: "#" },
      { icon: Tag, label: "Etiquetas", href: "#" }
    ] : []),
  ];

  return (
    <aside className="w-[68px] flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border h-full shrink-0">
      <div className="mb-8 p-2 bg-primary/10 rounded-xl">
        <Radio className="h-6 w-6 text-primary" />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-4">
        {!loading && sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-5 w-5" />
              {isActive && (
                <span className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-l-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <button 
          title="Configuración"
          className="p-3 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <Settings className="h-5 w-5" />
        </button>
        
        <button 
          title="Cerrar Sesión"
          className="p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}


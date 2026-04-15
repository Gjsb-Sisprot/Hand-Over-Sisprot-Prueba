"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Users, 
  Search,
  Radio,
  Tag,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "Conversaciones", href: "/dashboard/conversations" },
  { icon: Search, label: "Búsqueda", href: "#" },
  { icon: Radio, label: "En vivo", href: "#" },
  { icon: Users, label: "Contactos", href: "#" },
  { icon: Tag, label: "Etiquetas", href: "#" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[68px] flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border h-full shrink-0">
      <div className="mb-8 p-2 bg-primary/10 rounded-xl">
        <Radio className="h-6 w-6 text-primary" />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-4">
        <TooltipProvider>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.label} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
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
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="p-3 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all">
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Configuración</TooltipContent>
          </Tooltip>
          
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all">
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Cerrar Sesión</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}

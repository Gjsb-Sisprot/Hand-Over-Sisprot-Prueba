import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtenemos el rol del agente para proteger las rutas
  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = agent?.role || "agent";
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";

  // 1. Si es Soporte Técnico (agent), NO puede ver Dashboard ni Conversaciones
  if (role === "agent") {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/conversations")) {
      redirect("/dashboard/calendar"); // Redirigir a su única zona permitida
    }
  }

  // 2. Si es Call Center (admin), NO puede ver Soporte ni Guardias
  if (role === "admin") {
    if (pathname.startsWith("/dashboard/calendar") || pathname.startsWith("/dashboard/guardias")) {
      redirect("/dashboard"); // Redirigir a inicio
    }
  }

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

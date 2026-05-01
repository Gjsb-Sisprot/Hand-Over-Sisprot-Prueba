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
  const { data: agent } = (await supabase
    .from("agents")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  const role = agent?.role || "agent";
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";

  // 1. Si es Agente (agent), SOLO puede ver Gestión y Soporte
  if (role === "agent") {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/conversations") || pathname.startsWith("/dashboard/guardias") || pathname.startsWith("/dashboard/users")) {
      redirect("/dashboard/calendar"); 
    }
  }

  // 2. Si es Operador (operador), PUEDE ver Gestión y Soporte y Conversaciones. NO Guardias ni Usuarios.
  if (role === "operador") {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/guardias") || pathname.startsWith("/dashboard/users")) {
      redirect("/dashboard/conversations"); 
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden pb-[68px] md:pb-0">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

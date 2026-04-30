import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUsers } from "@/lib/actions/users";
import { UsersTable } from "@/components/dashboard/users/users-table";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: agent } = (await supabase
    .from("agents")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (agent?.role !== "supervisor") {
    redirect("/dashboard");
  }

  const users = await getUsers();

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-2">Administra los accesos y roles del personal.</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-card rounded-2xl border border-border shadow-sm p-4">
        <UsersTable initialUsers={users} />
      </div>
    </div>
  );
}

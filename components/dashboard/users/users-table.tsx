"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { updateUserRole, deleteUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Shield, User, Headphones } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Agent } from "@/types/database";

export function UsersTable({ initialUsers }: { initialUsers: Agent[] }) {
  const [users, setUsers] = useState<Agent[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(true);
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Rol actualizado correctamente");
    } else {
      toast.error("Error al actualizar el rol: " + result.error);
    }
    setEditingId(null);
    setLoading(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario? Esto no se puede deshacer.")) return;
    
    setLoading(true);
    const result = await deleteUser(userId);
    if (result.success) {
      setUsers(users.filter(u => u.id !== userId));
      toast.success("Usuario eliminado");
    } else {
      toast.error("Error al eliminar usuario: " + result.error);
    }
    setLoading(false);
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'supervisor': return <Shield className="h-4 w-4 text-primary" />;
      case 'operador': return <Headphones className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Lista de Usuarios</h2>
        <Button 
          onClick={() => toast.info("Para agregar usuarios de forma segura, el administrador debe registrarlos en la plataforma de Autenticación.")}
        >
          + Añadir Usuario
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Última Actividad</th>
              <th className="px-4 py-3 rounded-r-lg text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="px-4 py-4 font-medium flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  {user.name || "Sin nombre"}
                </td>
                <td className="px-4 py-4">{user.email}</td>
                <td className="px-4 py-4">
                  {editingId === user.id ? (
                    <Select
                      defaultValue={user.role}
                      onValueChange={(val) => handleRoleChange(user.id, val)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="operador">Operador (Call Center)</SelectItem>
                        <SelectItem value="agent">Soporte Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {user.last_active_at 
                    ? format(new Date(user.last_active_at), "dd MMM yyyy, HH:mm", { locale: es })
                    : "Nunca"}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(editingId === user.id ? null : user.id)}
                      disabled={loading}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive hover:bg-destructive/10 transition-colors" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No se encontraron usuarios en la base de datos.
          </div>
        )}
      </div>
    </div>
  );
}

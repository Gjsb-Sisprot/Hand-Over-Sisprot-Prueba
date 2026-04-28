"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createVisit, updateVisit, deleteVisit, SupportVisit, Technician } from "@/lib/actions/visits"
import { Calendar, Clock, User, FileText, CheckCircle2, Trash2 } from "lucide-react"

interface VisitDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  technicians: Technician[]
  initialData?: SupportVisit
  defaultCategory?: 'support' | 'administration'
}

export function VisitDialog({ isOpen, onClose, onSuccess, technicians, initialData, defaultCategory = 'support' }: VisitDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<SupportVisit>>({
    client_name: "",
    client_identification: "",
    contract_number: "",
    visit_date: new Date().toISOString(),
    reason: "",
    technician_id: "",
    status: "scheduled",
    category: defaultCategory
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      setFormData({
        client_name: "",
        client_identification: "",
        contract_number: "",
        visit_date: new Date().toISOString(),
        reason: "",
        technician_id: "",
        status: "scheduled",
        category: defaultCategory
      })
    }
  }, [initialData, isOpen, defaultCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (initialData?.id) {
        const { error } = await updateVisit(initialData.id, formData)
        if (error) throw new Error(error)
        toast.success("Visita actualizada correctamente")
      } else {
        const { error } = await createVisit(formData)
        if (error) throw new Error(error)
        toast.success("Visita agendada correctamente")
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la visita")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData?.id) return
    if (!confirm("¿Estás seguro de que deseas eliminar esta visita?")) return

    setLoading(true)
    try {
      const { error } = await deleteVisit(initialData.id)
      if (error) throw new Error(error)
      toast.success("Visita eliminada")
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (dateStr: string) => {
    const timeStr = formData.visit_date ? formData.visit_date.split('T')[1]?.split('.')[0] || "12:00:00" : "12:00:00"
    setFormData({ ...formData, visit_date: `${dateStr}T${timeStr}.000Z` })
  }

  const handleTimeChange = (timeStr: string) => {
    const dateStr = formData.visit_date ? formData.visit_date.split('T')[0] : new Date().toISOString().split('T')[0]
    setFormData({ ...formData, visit_date: `${dateStr}T${timeStr}:00.000Z` })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="bg-primary/5 p-6 border-b border-border/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {initialData ? "Editar Visita" : "Agendar Nueva Visita"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Cliente</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  placeholder="Nombre completo"
                  className="pl-9 bg-background/50 rounded-xl"
                  value={formData.client_name || ""}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">ID / Cédula</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  placeholder="V-12345678"
                  className="pl-9 bg-background/50 rounded-xl"
                  value={formData.client_identification || ""}
                  onChange={(e) => setFormData({ ...formData, client_identification: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Contrato (Opcional)</Label>
            <Input
              placeholder="#4929"
              className="bg-background/50 rounded-xl"
              value={formData.contract_number || ""}
              onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  required
                  className="pl-9 bg-background/50 rounded-xl"
                  value={formData.visit_date?.split('T')[0] || ""}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  required
                  className="pl-9 bg-background/50 rounded-xl"
                  value={formData.visit_date?.split('T')[1]?.substring(0, 5) || "12:00"}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Técnico Asignado</Label>
            <Select
              value={formData.technician_id || ""}
              onValueChange={(val) => setFormData({ ...formData, technician_id: val })}
            >
              <SelectTrigger className="bg-background/50 rounded-xl">
                <SelectValue placeholder="Seleccionar técnico..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.area})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Motivo de Visita</Label>
            <Input
              required
              placeholder="Ej: Revisión de Fibra Óptica"
              className="bg-background/50 rounded-xl"
              value={formData.reason || ""}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Estado</Label>
            <Select
              value={formData.status || "scheduled"}
              onValueChange={(val: any) => setFormData({ ...formData, status: val })}
            >
              <SelectTrigger className="bg-background/50 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="rescheduled">Reagendada</SelectItem>
                <SelectItem value="in_progress">En Proceso</SelectItem>
                <SelectItem value="completed">Realizada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-6">
            {initialData && (
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl px-4"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20"
              disabled={loading}
            >
              {loading ? "Procesando..." : initialData ? "Actualizar" : "Agendar Visita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

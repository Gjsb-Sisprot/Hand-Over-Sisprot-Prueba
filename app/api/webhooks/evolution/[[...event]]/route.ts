import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión 6.0 - Soporte para Catch-all (Webhook by events)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Obtener el JSON
    const payload = await request.json();
    const { event, data } = payload;
    
    if (!event || !data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Diagnostic log para ver qué está llegando
    console.log(`[WEBHOOK_EVO] Evento: ${event} | JID: ${data.key?.remoteJid}`);

    // Filtramos solo por mensajes nuevos
    if (event.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, warning: "not_upsert" });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, warning: "no_message" });

    // Contenido del mensaje (Texto puro o Caption de imagen)
    const content = 
      message.conversation || 
      message.extendedTextMessage?.text || 
      message.imageMessage?.caption || 
      "";

    const remoteJid = data.key.remoteJid;
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!remoteJid || !messageId) {
      return NextResponse.json({ success: true, warning: "missing_ids" });
    }

    // Extraer últimos 10 dígitos para match robusto del teléfono
    const cleanPhone = remoteJid.replace(/\D/g, '');
    const lastDigits = cleanPhone.slice(-10);

    // 2. Control de duplicados
    const { data: existing } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: messageId })
      .maybeSingle();

    if (existing) return NextResponse.json({ success: true, message: "duplicate" });

    // 3. Buscar conversación por teléfono
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .ilike("contact_phone", `%${lastDigits}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv || convError) {
      console.warn(`[WEBHOOK_EVO] No se encontró conversación para terminal ${lastDigits}`);
      return NextResponse.json({ success: true, error: "conv_not_found", phone: lastDigits });
    }

    // 4. Registrar en Supabase
    const { error: insertError } = await supabaseAdmin
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "(WhatsApp)" : "📷 Multimedia"),
        author_name: fromMe ? "Agente (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          messageId: String(messageId),
          timestamp: new Date().toISOString(),
          phone: cleanPhone
        }
      });

    if (insertError) {
      console.error("[WEBHOOK_EVO] Error DB:", insertError);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    // 5. Reabrir caso si el cliente escribe
    const updates: any = { updated_at: new Date().toISOString() };
    if (!fromMe && (conv.status === "closed" || conv.status === "paused")) {
      updates.status = "handed_over";
    }

    await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", conv.id);

    return NextResponse.json({ success: true, synced: true });

  } catch (err: any) {
    console.error("[WEBHOOK_EVO_CRITICAL]", err.message);
    return NextResponse.json({ error: "critical_error", details: err.message }, { status: 500 });
  }
}

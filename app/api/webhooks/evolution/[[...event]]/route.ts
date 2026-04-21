import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión 6.1 - Búsqueda de teléfono Ultra-Flexible
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { event, data } = payload;
    
    if (!event || !data) return NextResponse.json({ error: "No payload" }, { status: 400 });

    if (event.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, warning: "ignored_event" });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, warning: "no_content" });

    const content = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || "";
    const remoteJid = data.key.remoteJid;
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!remoteJid) return NextResponse.json({ error: "no_jid" }, { status: 400 });

    // Limpiar número entrante: 584241234567
    const incomingPhone = remoteJid.replace(/\D/g, '');
    // Variantes para búsqueda: completa (58424...), local (424...), y suffix (1234567)
    const localPhone = incomingPhone.length > 10 ? incomingPhone.slice(-10) : incomingPhone;
    const suffixPhone = incomingPhone.slice(-7);

    console.log(`[WEBHOOK] Intentando match para: ${incomingPhone} / ${localPhone}`);

    // 1. Control de duplicados por messageId en attachments
    const { data: existing } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: String(messageId) })
      .maybeSingle();

    if (existing) return NextResponse.json({ success: true, info: "duplicate" });

    // 2. Búsqueda de conversación (Búsqueda Híbrida)
    // Buscamos por teléfono exacto, local o los últimos 7 dígitos por si hay espacios/guiones en la DB
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status, contact_phone")
      .or(`contact_phone.ilike.%${localPhone}%,contact_phone.ilike.%${suffixPhone}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError || !conv) {
      console.warn(`[WEBHOOK] No se halló conversación para ${incomingPhone}`);
      return NextResponse.json({ 
        success: true, 
        error: "conversation_not_found", 
        detail: `Buscamos %${localPhone}% o %${suffixPhone}%`
      });
    }

    // 3. Registrar mensaje
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "(Enviado desde WhatsApp)" : "📷 Multimedia"),
        author_name: fromMe ? "Agente (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          messageId: String(messageId),
          timestamp: new Date().toISOString()
        }
      });

    if (logError) throw logError;

    // 4. Actualizar estado de la conversación
    const updates: any = { updated_at: new Date().toISOString() };
    if (!fromMe && (conv.status === "closed" || conv.status === "paused")) {
      updates.status = "handed_over";
    }

    await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", conv.id);

    return NextResponse.json({ 
      success: true, 
      synced: true, 
      matched_id: conv.id,
      matched_phone: conv.contact_phone 
    });

  } catch (err: any) {
    console.error("[WEBHOOK_ERROR]", err.message);
    return NextResponse.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}

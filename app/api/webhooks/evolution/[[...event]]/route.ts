import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión 7.1 - Diagnóstico con Bypass de tipos para despliegue rápido
 */
export async function POST(request: NextRequest) {
  let payload: any = null;
  let headers: any = {};
  
  try {
    request.headers.forEach((value, key) => { headers[key] = value; });
    payload = await request.json();
    
    // GUARDAR EN LOG DE DIAGNÓSTICO (Forzamos 'any' para evitar errores de compilación)
    await (supabaseAdmin as any).from("webhook_logs").insert({
      event_type: payload?.event || "unknown",
      payload: payload,
      headers: headers,
      status: "received"
    });

    const { event, data } = payload;
    if (!event || !data) return NextResponse.json({ success: true, info: "no_data" });

    if (event.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, warning: "not_upsert" });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, warning: "no_msg" });

    const content = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || "";
    const remoteJid = data.key.remoteJid;
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!remoteJid) return NextResponse.json({ success: true, warning: "no_jid" });

    const incomingPhone = remoteJid.replace(/\D/g, '');
    const localPhone = incomingPhone.length > 10 ? incomingPhone.slice(-10) : incomingPhone;
    const suffixPhone = incomingPhone.slice(-7);

    // 1. Duplicados
    const { data: existingMsg } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: String(messageId) })
      .maybeSingle();

    if (existingMsg) return NextResponse.json({ success: true, info: "duplicate" });

    // 2. Buscar conversación
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status, contact_phone")
      .or(`contact_phone.ilike.%${localPhone}%,contact_phone.ilike.%${suffixPhone}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError || !conv) {
      await (supabaseAdmin as any).from("webhook_logs").insert({
        event_type: "MATCH_FAILED",
        payload: { phone: incomingPhone, search: [localPhone, suffixPhone] },
        status: "conversation_not_found"
      });
      return NextResponse.json({ success: true, error: "conv_not_found" });
    }

    // 3. Insertar
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "(WhatsApp)" : "📷 Multimedia"),
        author_name: fromMe ? "Agente (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          messageId: String(messageId),
          timestamp: new Date().toISOString()
        }
      });

    if (logError) throw logError;

    // 4. Actualizar
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
    await (supabaseAdmin as any).from("webhook_logs").insert({
      event_type: "CRITICAL_ERROR",
      payload: { error: err.message },
      status: "error"
    });
    return NextResponse.json({ error: "error", message: err.message }, { status: 500 });
  }
}

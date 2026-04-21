import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión 7.0 - Diagnóstico Profundo con Logs Persistentes
 */
export async function POST(request: NextRequest) {
  let payload: any = null;
  let headers: any = {};
  
  try {
    // 1. Extraer Headers y Payload para el log de diagnóstico
    request.headers.forEach((value, key) => { headers[key] = value; });
    payload = await request.json();
    
    // GUARDAR EN LOG DE DIAGNÓSTICO (Indispensable para ver qué pasa)
    // @ts-ignore
    await supabaseAdmin.from("webhook_logs").insert({
      event_type: payload?.event || "unknown",
      payload: payload,
      headers: headers,
      status: "received"
    });

    const { event, data } = payload;
    if (!event || !data) return NextResponse.json({ success: true, info: "no_data_to_process" });

    // Solo procesamos mensajes nuevos
    if (event.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, warning: "ignored_event" });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, warning: "no_content" });

    const content = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || "";
    const remoteJid = data.key.remoteJid;
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!remoteJid) return NextResponse.json({ success: true, warning: "no_jid" });

    // Match de teléfono flexible (últimos 10 dígitos)
    const incomingPhone = remoteJid.replace(/\D/g, '');
    const localPhone = incomingPhone.length > 10 ? incomingPhone.slice(-10) : incomingPhone;
    const suffixPhone = incomingPhone.slice(-7);

    // 2. Control de duplicados
    const { data: existingMsg } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: String(messageId) })
      .maybeSingle();

    if (existingMsg) return NextResponse.json({ success: true, info: "duplicate" });

    // 3. Buscar conversación
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status, contact_phone")
      .or(`contact_phone.ilike.%${localPhone}%,contact_phone.ilike.%${suffixPhone}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError || !conv) {
      // Si no hay conversación, actualizamos el log con el error pero respondemos 200
      // @ts-ignore
      await supabaseAdmin.from("webhook_logs").insert({
        event_type: "MATCH_FAILED",
        payload: { phone: incomingPhone, search: [localPhone, suffixPhone] },
        status: "conversation_not_found"
      });
      return NextResponse.json({ success: true, error: "conv_not_found" });
    }

    // 4. Insertar mensaje en chat_logs
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

    // 5. Reabrir caso
    const updates: any = { updated_at: new Date().toISOString() };
    if (!fromMe && (conv.status === "closed" || conv.status === "paused")) {
      updates.status = "handed_over";
    }

    await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", conv.id);

    return NextResponse.json({ success: true, synced: true, matched_id: conv.id });

  } catch (err: any) {
    // Si hay un error crítico, lo grabamos en el log para saber qué fue
    // @ts-ignore
    await supabaseAdmin.from("webhook_logs").insert({
      event_type: "CRITICAL_ERROR",
      payload: { error: err.message, raw_data: payload },
      status: "error"
    });
    console.error("[WEBHOOK_DIAGNOSTIC_ERROR]", err.message);
    return NextResponse.json({ error: "diagnostic_error", message: err.message }, { status: 500 });
  }
}

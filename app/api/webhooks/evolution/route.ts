import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión 5.0 - Corrección de Syntax Error en JSON
 */
export async function POST(request: NextRequest) {
  let rawBody = "";
  try {
    // 1. Intentar obtener el JSON de forma segura
    const payload = await request.json();
    const { event, data } = payload;
    
    if (!event || !data) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    console.log(`[WEBHOOK_EVO] Event: ${event} | JID: ${data.key?.remoteJid}`);

    if (event.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, warning: "not_upsert" });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, warning: "no_message" });

    // Extraer contenido de forma segura
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

    const cleanPhone = remoteJid.replace(/\D/g, '');
    const lastDigits = cleanPhone.slice(-10); // Usamos 10 para Venezuela (424...)

    // 2. Duplicados
    const { data: existing } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: messageId })
      .maybeSingle();

    if (existing) return NextResponse.json({ success: true, info: "duplicate" });

    // 3. Buscar conversación
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .ilike("contact_phone", `%${lastDigits}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv || convError) {
      return NextResponse.json({ 
        success: true, 
        error: "conv_not_found", 
        phone: cleanPhone 
      });
    }

    // 4. Insertar con JSON seguro
    const { error: insertError } = await supabaseAdmin
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "(Enviado desde WhatsApp)" : "📷 Multimedia"),
        author_name: fromMe ? "Agente (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          messageId: String(messageId),
          timestamp: new Date().toISOString(),
          clean_phone: cleanPhone
        }
      });

    if (insertError) {
      console.error("[WEBHOOK_INSERT_ERROR]", insertError);
      return NextResponse.json({ error: "db_insert_failed", details: insertError }, { status: 500 });
    }

    // 5. Actualizar estado
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
    console.error("[WEBHOOK_JSON_ERROR]", err.message);
    return NextResponse.json({ 
      error: "json_parse_failed", 
      message: err.message 
    }, { status: 500 });
  }
}

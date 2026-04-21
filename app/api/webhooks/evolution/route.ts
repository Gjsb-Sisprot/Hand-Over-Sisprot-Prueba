import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión de Emergencia 4.0 - Diagnóstico Abierto
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { event, data } = payload;
    
    // LOG DE EMERGENCIA: Esto aparecerá en los logs de Vercel (Pestaña Logs de la función)
    console.log(`[WEBHOOK_DEBUG] Evento: ${event} | JID: ${data?.key?.remoteJid} | Texto: ${data?.message?.conversation || data?.message?.extendedTextMessage?.text}`);

    // Aceptamos cualquier variante de messages.upsert
    if (event?.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, warning: "not_upsert_event" });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, warning: "no_content" });

    const content = 
      message.conversation || 
      message.extendedTextMessage?.text || 
      message.imageMessage?.caption || 
      "";

    const remoteJid = data.key.remoteJid;
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    // Limpiamos el número para quedarnos solo con la parte numérica final (últimos 9 dígitos)
    // Esto evita problemas con prefijos internacionales
    const cleanPhone = remoteJid.replace(/\D/g, ''); // 584241234567
    const lastDigits = cleanPhone.slice(-9); // 4241234567

    // 1. Evitar duplicados (fundamental para no loopear)
    const { data: existingMsg } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: messageId })
      .maybeSingle();

    if (existingMsg) {
      return NextResponse.json({ success: true, info: "duplicate_ignored" });
    }

    // 2. Buscar conversación (Búsqueda ULTRA-FLEXIBLE)
    // Buscamos cualquier conversación donde el contact_phone CONTENGA los últimos 9 dígitos
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .ilike("contact_phone", `%${lastDigits}%`) 
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError || !conv) {
      console.warn(`[WEBHOOK_DEBUG] No se encontró conversación para ${cleanPhone} (buscando %${lastDigits})`);
      return NextResponse.json({ 
        success: true, 
        error: "conversation_not_found", 
        detail: { phone: cleanPhone, suffix: lastDigits }
      });
    }

    // 3. Insertar el mensaje
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert([{
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "Mensaje enviado desde WhatsApp" : "📸 Archivo/Otro"),
        author_name: fromMe ? "Agente (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          messageId: messageId,
          sync: true,
          from_phone: cleanPhone
        }
      }]);

    if (logError) {
      console.error("[WEBHOOK_DEBUG] Error al insertar log:", logError);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    // 4. Asegurar que la conversación esté abierta si escribe el cliente
    if (!fromMe && (conv.status === "closed" || conv.status === "paused")) {
      await supabaseAdmin
        .from("conversations")
        .update({ status: "handed_over", updated_at: new Date().toISOString() })
        .eq("id", conv.id);
    } else {
      // Siempre actualizar el "updated_at" para que suba en la lista
      await supabaseAdmin
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conv.id);
    }

    return NextResponse.json({ success: true, synced: true, conv: conv.id });

  } catch (err: any) {
    console.error("[WEBHOOK_CRITICAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

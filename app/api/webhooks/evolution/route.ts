import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '26F9D106EA66-4FE6-96EF-A6057B5131B7';

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Soporta sincronización bidireccional y reapertura de casos
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("apikey");
    if (apiKey && apiKey !== EVOLUTION_API_KEY) {
      console.warn("[WEBHOOK_EVOLUTION] API Key mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { event, data } = payload;
    
    console.log(`[WEBHOOK_EVOLUTION] Evento recibido: ${event}`);

    // Solo nos interesan los mensajes nuevos (case-insensitive)
    if (event?.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, event_ignored: event });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, empty_message: true });

    // 1. Extraer contenido de texto (Soporta múltiples tipos de mensaje de WhatsApp)
    const content = 
      message.conversation || 
      message.extendedTextMessage?.text || 
      message.imageMessage?.caption || 
      message.videoMessage?.caption || 
      message.documentMessage?.caption || 
      ""; // Si es un sticker o audio, podríamos manejarlo luego

    const remoteJid = data.key.remoteJid; // ej: 584241436934@s.whatsapp.net
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!remoteJid || !messageId) {
      return NextResponse.json({ success: true, incomplete_data: true });
    }

    // Limpiar el número para la búsqueda (solo dígitos)
    const phone = remoteJid.replace(/\D/g, '');

    console.log(`[WEBHOOK_EVOLUTION] Procesando ${fromMe ? 'saliente' : 'entrante'} - Tel: ${phone} - Msg: ${content.substring(0, 30)}`);

    // 2. Verificar duplicados (Si ya se insertó desde la UI)
    const { data: existingMsg } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: messageId })
      .maybeSingle();

    if (existingMsg) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // 3. Buscar la conversación más reciente para este número
    // Importante: contact_phone debe estar guardado sin el '+' en la BD
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status, identification")
      .eq("contact_phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      console.error("[WEBHOOK_EVOLUTION] Error buscando conversación:", convError);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }

    if (!conv) {
      console.warn(`[WEBHOOK_EVOLUTION] No se encontró conversación para el teléfono: ${phone}`);
      // Podríamos crear una conversación nueva aquí si quisiéramos
      return NextResponse.json({ success: true, no_conversation_found: phone });
    }

    // 4. Insertar el mensaje en el historial
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert([{
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "(Mensaje saliente de WhatsApp)" : "(Mensaje entrante sin texto)"),
        author_name: fromMe ? "Tú (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          remoteJid: remoteJid,
          messageId: messageId,
          external: fromMe,
          received_at: new Date().toISOString()
        }
      }]);

    if (logError) {
      console.error("[WEBHOOK_EVOLUTION] Error insertando log:", logError);
      throw logError;
    }

    // 5. Actualizar la conversación (Reabrir si estaba cerrada)
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Si escribe el cliente y estaba cerrada o pausada, reactivamos
    if (!fromMe && (conv.status === "closed" || conv.status === "paused")) {
      updates.status = "handed_over";
      console.log(`[WEBHOOK_EVOLUTION] Reabriendo caso ${conv.id} para el cliente ${conv.identification}`);
    }

    await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", conv.id);

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error("[WEBHOOK_EVOLUTION_CRITICAL]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

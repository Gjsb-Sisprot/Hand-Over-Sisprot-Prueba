import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '26F9D106EA66-4FE6-96EF-A6057B5131B7';

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Versión 3.0 - Búsqueda robusta y sincronización bidireccional
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("apikey") || request.nextUrl.searchParams.get("apikey");
    
    // Si hay una API Key configurada y no coincide, rechazamos
    if (apiKey && apiKey !== EVOLUTION_API_KEY) {
      console.error("[WEBHOOK_EVOLUTION] Unauthorized: API Key mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { event, data } = payload;
    
    console.log(`[WEBHOOK_EVOLUTION] Evento: ${event}`);

    if (event?.toLowerCase() !== "messages.upsert") {
      return NextResponse.json({ success: true, ignored_event: event });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, reason: "no_message_content" });

    // Contenido del mensaje
    const content = 
      message.conversation || 
      message.extendedTextMessage?.text || 
      message.imageMessage?.caption || 
      message.videoMessage?.caption || 
      message.documentMessage?.caption || 
      "";

    const remoteJid = data.key.remoteJid; // 584241234567@s.whatsapp.net
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!remoteJid || !messageId) {
      return NextResponse.json({ success: true, reason: "missing_ids" });
    }

    // Limpiar número: 584241234567
    const phone = remoteJid.replace(/\D/g, '');
    // Variante sin el código de país para búsqueda flexible: 4241234567
    const shortPhone = phone.length > 10 ? phone.slice(-10) : phone;

    console.log(`[WEBHOOK_EVOLUTION] Phone: ${phone} (Short: ${shortPhone}) | fromMe: ${fromMe}`);

    // 1. Evitar duplicados
    const { data: existing } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: messageId })
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, reason: "duplicate" });
    }

    // 2. Buscar conversación (Búsqueda agresiva)
    // Buscamos coincidencia exacta o que el final del número coincida
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status, identification, contact_phone")
      .or(`contact_phone.eq.${phone},contact_phone.ilike.%${shortPhone}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      console.error("[WEBHOOK_EVOLUTION] DB Search Error:", convError);
      return NextResponse.json({ error: "Database error during search" }, { status: 500 });
    }

    if (!conv) {
      console.warn(`[WEBHOOK_EVOLUTION] No se halló conversación para ${phone}`);
      return NextResponse.json({ success: true, reason: "conversation_not_found", searched: [phone, shortPhone] });
    }

    console.log(`[WEBHOOK_EVOLUTION] Match encontrado: Conv ID ${conv.id} para Cliente ${conv.identification}`);

    // 3. Insertar mensaje en chat_logs
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert([{
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content || (fromMe ? "(Enviado desde WhatsApp)" : "📷 Archivo multimedia"),
        author_name: fromMe ? "Agente (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          remoteJid: remoteJid,
          messageId: messageId,
          external: fromMe,
          timestamp: new Date().toISOString()
        }
      }]);

    if (logError) {
      console.error("[WEBHOOK_EVOLUTION] Insert Error:", logError);
      return NextResponse.json({ error: "Failed to insert message log" }, { status: 500 });
    }

    // 4. Actualizar estado y fecha
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
      conversation_id: conv.id,
      status: fromMe ? "synced_outgoing" : "received_incoming" 
    });

  } catch (error) {
    console.error("[WEBHOOK_EVOLUTION_CRITICAL]", error);
    return NextResponse.json({ error: "Critical server error" }, { status: 500 });
  }
}

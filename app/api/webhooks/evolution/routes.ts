import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '26F9D106EA66-4FE6-96EF-A6057B5131B7';

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * URL: /api/webhooks/evolution
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar API Key (Opcional pero recomendado)
    const apiKey = request.headers.get("apikey");
    if (apiKey && apiKey !== EVOLUTION_API_KEY) {
      console.warn("[WEBHOOK_EVOLUTION] API Key inválida");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { event, data } = payload;

    // Solo nos interesan los mensajes nuevos
    if (event !== "messages.upsert") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const message = data.key?.fromMe ? null : data.message;
    if (!message) return NextResponse.json({ success: true, fromMe: true });

    // Extraer contenido y número
    const content = message.conversation || message.extendedTextMessage?.text || "";
    const remoteJid = data.key.remoteJid; // ej: 584241436934@s.whatsapp.net
    const phone = remoteJid.split("@")[0];

    if (!content || !phone) {
      return NextResponse.json({ success: true, empty: true });
    }

    console.log(`[WEBHOOK_EVOLUTION] Mensaje recibido de ${phone}: ${content.substring(0, 50)}...`);

    // 2. Buscar la conversación más reciente para este número
    // Intentamos buscar por contact_phone (que ahora guardamos limpio)
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status, metadata")
      .eq("contact_phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError || !conv) {
      console.warn(`[WEBHOOK_EVOLUTION] No se encontró conversación activa para el número: ${phone}`);
      return NextResponse.json({ success: true, notFound: true });
    }

    // 3. Insertar el mensaje en chat_logs
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert({
        conversation_id: conv.id,
        role: "user",
        content: content,
        author_name: "Cliente (WhatsApp)",
        metadata: {
          via: "whatsapp",
          remoteJid: remoteJid,
          messageId: data.key.id
        }
      });

    if (logError) throw logError;

    // 4. Si la conversación estaba cerrada o pausada, la reabrimos
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (conv.status === "closed") {
      updates.status = "handed_over";
      console.log(`[WEBHOOK_EVOLUTION] Reabriendo conversación ${conv.id} para ${phone}`);
    }

    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", conv.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WEBHOOK_EVOLUTION_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

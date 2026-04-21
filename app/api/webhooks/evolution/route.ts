import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '26F9D106EA66-4FE6-96EF-A6057B5131B7';

/**
 * Webhook para recibir mensajes de Evolution API (WhatsApp)
 * Soporta sincronización bidireccional (entrantes y salientes desde el teléfono)
 * URL: /api/webhooks/evolution
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("apikey");
    if (apiKey && apiKey !== EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { event, data } = payload;

    if (event !== "messages.upsert") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const message = data.message;
    if (!message) return NextResponse.json({ success: true, empty: true });

    // Extraer contenido y número
    const content = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || "";
    const remoteJid = data.key.remoteJid;
    const phone = remoteJid.split("@")[0];
    const messageId = data.key.id;
    const fromMe = data.key.fromMe || false;

    if (!content || !phone || !messageId) {
      return NextResponse.json({ success: true, incomplete: true });
    }

    // 1. Verificar duplicados (Si ya se insertó desde la UI)
    const { data: existingMsg } = await supabaseAdmin
      .from("chat_logs")
      .select("id")
      .contains("attachments", { messageId: messageId })
      .maybeSingle();

    if (existingMsg) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // 2. Buscar la conversación más reciente para este número
    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .eq("contact_phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError || !conv) {
      return NextResponse.json({ success: true, noConversation: true });
    }

    // 3. Insertar el mensaje
    // Si fromMe es true, el rol es agent (mensaje enviado desde el teléfono físico)
    // Si fromMe es false, el rol es user (mensaje enviado por el cliente)
    const { error: logError } = await supabaseAdmin
      .from("chat_logs")
      .insert([{
        conversation_id: conv.id,
        role: fromMe ? "agent" : "user",
        content: content,
        author_name: fromMe ? "Tú (WhatsApp)" : "Cliente (WhatsApp)",
        attachments: {
          via: "whatsapp",
          remoteJid: remoteJid,
          messageId: messageId,
          external: fromMe
        }
      }]);

    if (logError) throw logError;

    // 4. Actualizar estado y fecha si es necesario
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Si viene del cliente (fromMe: false) y estaba cerrada, reabrimos
    if (!fromMe && conv.status === "closed") {
      updates.status = "handed_over";
    }

    await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", conv.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WEBHOOK_EVOLUTION_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

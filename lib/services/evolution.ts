
export interface EvolutionSendResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string;
  };
  messageTimestamp: string;
  status: string;
}

class EvolutionService {
  private baseURL = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'https://sisprot-evolution-api.x8cfq6.easypanel.host';
  private apiKey = process.env.EVOLUTION_API_KEY || '26F9D106EA66-4FE6-96EF-A6057B5131B7';
  private instanceName = 'Sisprot%20GF%20CallCenter%20Definitivo';

  async sendWhatsAppMessage(number: string, text: string): Promise<{ success: boolean; data?: EvolutionSendResponse; error?: string }> {
    try {
      // Limpiar el número: solo dígitos
      const cleanNumber = number.replace(/\D/g, '');
      
      if (!cleanNumber) {
        return { success: false, error: 'Número de teléfono inválido' };
      }

      const url = `${this.baseURL}/message/sendText/${this.instanceName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: text,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[EVOLUTION_API_ERROR]', data);
        return { success: false, error: data.message || 'Error al enviar mensaje por WhatsApp', data };
      }

      return { success: true, data };
    } catch (error) {
      console.error('[EVOLUTION_SERVICE_EXCEPTION]', error);
      return { success: false, error: 'Excepción al conectar con Evolution API' };
    }
  }
}

export const evolutionService = new EvolutionService();

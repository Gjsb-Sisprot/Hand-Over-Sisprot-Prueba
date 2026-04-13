
const GLPI_BASE_URL = process.env.GLPI_BASE_URL || 'http://137.184.87.234/glpi/apirest.php';
const GLPI_APP_TOKEN_INIT = process.env.GLPI_APP_TOKEN_INIT || 'ytIQci5MfhFE33ribqFzM40CPJyGPaeIr4sscvBp';
const GLPI_APP_TOKEN_TICKET = process.env.GLPI_APP_TOKEN_TICKET || 'RycGNOH0qetlfv0nCLgPY693WfW4nr3UR4ClvtJG';
const GLPI_AUTH_BASIC = process.env.GLPI_AUTH_BASIC || 'Basic Z2xwaTo5UVpRU0d1SGZGckJhNnk=';
const GLPI_TIMEOUT = 15000;

export const USUARIOS_GLPI: Record<string, number> = {
  "Derwing Acevedo": 17,
  "Georgina Baladi": 20,
  "Kelvin Sanchez": 11,
  "Khaloa Serrano": 10,
  "Martha Pinto": 19,
  "Sandy Rodriguez": 21,
  "Yhossellyn Perez": 22
};

export const CATEGORIAS_TI_GLPI: Record<string, { id: number, urgency: number }> = {
  "ONU Dañada": { id: 85, urgency: 5 },
  "Actualización de datos": { id: 2, urgency: 4 },
  "Prorrateos": { id: 51, urgency: 5 },
  "Cambio de correo electrónico": { id: 39, urgency: 4 },
  "Reagendamiento de visitas": { id: 52, urgency: 5 },
  "Cambio de dirección": { id: 41, urgency: 5 },
  "Registros de Pagos": { id: 63, urgency: 4 },
  "Cambio de numero de telefono": { id: 42, urgency: 5 },
  "Router Colgado": { id: 101, urgency: 3 },
  "Corrección de cédula": { id: 45, urgency: 5 },
  "Red Interna SGF": { id: 121, urgency: 4 },
  "Solicitud de Factura/Nota de Cobro": { id: 62, urgency: 3 },
  "Cambio de ciclo": { id: 8, urgency: 4 },
  "Cambio de plan": { id: 9, urgency: 5 },
  "Devoluciones": { id: 27, urgency: 5 },
  "Consultas administrativas": { id: 10, urgency: 5 },
  "Cancelación de servicio": { id: 13, urgency: 5 },
  "Reclamos por Facturacion": { id: 26, urgency: 4 },
  "Orientación al cliente": { id: 11, urgency: 4 },
  "Bandas Unificadas": { id: 72, urgency: 3 },
  "Reactivación de servicio": { id: 14, urgency: 5 },
  "Reclamos administrativos": { id: 12, urgency: 5 },
  "Reportes de Pagos": { id: 32, urgency: 5 },
  "ONU Desconfigurada": { id: 108, urgency: 5 }, // Había dos ONU Desconfigurada, uso el segundo ID
  "Administrativo": { id: 1, urgency: 5 },
  "Router 10/100": { id: 122, urgency: 3 },
  "Facturacion": { id: 5, urgency: 5 },
  "Seguimiento al Cliente": { id: 6, urgency: 5 },
  "Cambio de Firewall": { id: 78, urgency: 5 },
  "Ciclo de Facturacion": { id: 59, urgency: 5 },
  "Consulta de Condiciones Legales": { id: 68, urgency: 5 },
  "Datos Bancarios": { id: 61, urgency: 5 },
  "Facturas Pendientes": { id: 55, urgency: 5 },
  "Consulta de Estado de Cuenta": { id: 65, urgency: 5 },
  "Financiamientos": { id: 53, urgency: 2 },
  "Conf. Incorrecta de OLT": { id: 77, urgency: 5 },
  "Educacion al Cliente": { id: 69, urgency: 5 },
  "Fallas en Sisprot TV": { id: 93, urgency: 5 },
  "Saturacion de Red": { id: 125, urgency: 2 },
  "Solicitud de Contrato": { id: 67, urgency: 4 },
  "Falla de Taco de ONU": { id: 73, urgency: 4 },
  "Atencion de Ventas": { id: 40, urgency: 5 },
  "Facturas": { id: 35, urgency: 4 },
  "IP Duplicada": { id: 74, urgency: 5 },
  "Soporte Tecnico": { id: 3, urgency: 5 },
  "Ultima Milla": { id: 87, urgency: 3 },
  "Consultas de soporte": { id: 16, urgency: 3 },
  "Microfractura de Fibra": { id: 75, urgency: 5 },
  "Estado de la visita": { id: 47, urgency: 5 },
  "Ubicación de Router": { id: 123, urgency: 3 },
  "Guia para configuracion": { id: 49, urgency: 5 },
  "Potencia Baja/Elevada en ONU": { id: 76, urgency: 5 },
  "Mudanzas / Reubicaciones": { id: 54, urgency: 4 },
  "Tiempos Lentos de Respuesta": { id: 97, urgency: 4 },
  "Migración de equipos": { id: 18, urgency: 5 },
  "Prueba de velocidad": { id: 50, urgency: 3 },
  "Ultima Milla (Falla aun desconocida)": { id: 79, urgency: 4 },
  "Reclamos de soporte tecnico": { id: 20, urgency: 4 },
  "Mudanza": { id: 81, urgency: 4 },
  "Lentitud velocidad plan": { id: 25, urgency: 5 },
  "Cable ≤ CAT 5": { id: 120, urgency: 4 },
  "Falta de Seguimiento": { id: 94, urgency: 5 },
  "Reubicacion": { id: 82, urgency: 4 },
  "Exceso de Conexiones": { id: 126, urgency: 3 },
  "Atencion Ineficiente al Cliente": { id: 88, urgency: 5 },
  "Onu en rojo": { id: 19, urgency: 5 },
  "Conf. Interna de SGF": { id: 104, urgency: 5 },
  "Sin internet": { id: 22, urgency: 5 },
  "Falla por Potencia": { id: 83, urgency: 4 },
  "Caida del Servicio": { id: 89, urgency: 5 },
  "Fibra Drop Partida": { id: 84, urgency: 5 },
  "Inestabilidad en Caja": { id: 90, urgency: 4 },
  "Router falla": { id: 21, urgency: 5 },
  "Daños en Cableado Externo": { id: 91, urgency: 4 },
  "Mala Ejecucion de Operaciones": { id: 95, urgency: 4 },
  "Falla en Ultima Milla": { id: 92, urgency: 3 },
  "Configuracion de Clave": { id: 103, urgency: 3 },
  "Problemas Tecnicos Recurrentes": { id: 96, urgency: 5 },
  "Router Dañado": { id: 99, urgency: 3 },
  "Cable Desconectado": { id: 98, urgency: 2 },
  "IP Extranjera": { id: 102, urgency: 1 },
  "Adaptador de Corriente Dañado": { id: 114, urgency: 4 },
  "Router Desconfigurado": { id: 109, urgency: 4 },
  "Equipos Colgados": { id: 105, urgency: 5 },
  "Equipos Internos Dañados": { id: 106, urgency: 5 },
  "Fallo de Auditoria": { id: 112, urgency: 4 },
  "Mala Conexión en Cableado": { id: 107, urgency: 5 },
  "Recuperacion/reconexion": { id: 113, urgency: 4 },
  "Temas Administrativos - Sin Internet": { id: 110, urgency: 2 },
  "Ultima Milla - Sin internet": { id: 111, urgency: 4 },
  "Baja Calidad Audio/Video": { id: 115, urgency: 3 },
  "Bot Incompleto": { id: 46, urgency: 1 },
  "Cliente Molesto": { id: 71, urgency: 5 },
  "Desconocimiento del Cliente": { id: 70, urgency: 5 },
  "Sin Respuesta del Cliente": { id: 48, urgency: 4 },
  "Sin WiFi - Ventas": { id: 30, urgency: 5 },
  "SisprotTV - Ventas": { id: 31, urgency: 4 },
  "Con Wifi Migracion - Ventas": { id: 60, urgency: 5 },
  "Con Wifi Total - Ventas": { id: 57, urgency: 5 },
  "Cambio de proveedor - ventas": { id: 33, urgency: 5 },
  "Con Wifi Gratis - Ventas": { id: 56, urgency: 5 },
  "Con Wifi Financiado - Ventas": { id: 58, urgency: 5 },
  "SisprotTV - Soporte Tecnico": { id: 24, urgency: 5 },
  "Contenido Incompleto Sisprot TV": { id: 117, urgency: 4 },
  "Problemas en Carga de Contenido Sisprot TV": { id: 116, urgency: 5 },
  "Fallas Tras Actualizaciones - Sisprot TV": { id: 118, urgency: 5 },
  "Problemas con Pagos - Sisprot TV": { id: 119, urgency: 5 },
  "Intermitencia/Internet Lento": { id: 17, urgency: 4 },
  "Configuración de equipos": { id: 127, urgency: 4 },
  "Instalación de SisprotTV": { id: 128, urgency: 5 }
};

export interface GLPITicketInput {
  name: string;
  content: string;
  itilcategories_id?: number;
  type?: number;
  urgency?: number;
  _users_id_requester?: number;
}

export interface GLPITicketResult {
  success: boolean;
  ticketId?: number;
  message: string;
  error?: string;
}

async function initSession(): Promise<string> {
  const response = await fetch(`${GLPI_BASE_URL}/initSession`, {
    method: 'POST',
    headers: {
      'App-Token': GLPI_APP_TOKEN_INIT,
      'Authorization': GLPI_AUTH_BASIC,
    },
    signal: AbortSignal.timeout(GLPI_TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GLPI initSession failed: ${response.status} ${text}`);
  }

  const data = await response.json() as { session_token: string };
  if (!data.session_token) throw new Error('GLPI initSession: no session_token');
  return data.session_token;
}

async function killSession(sessionToken: string): Promise<void> {
  try {
    await fetch(`${GLPI_BASE_URL}/killSession`, {
      method: 'GET',
      headers: {
        'App-Token': GLPI_APP_TOKEN_TICKET,
        'Session-Token': sessionToken,
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {}
}

export async function createTicket(input: GLPITicketInput): Promise<GLPITicketResult> {
  let sessionToken: string | null = null;
  try {
    sessionToken = await initSession();

    const body = {
      input: {
        name: input.name,
        content: input.content,
        itilcategories_id: input.itilcategories_id || 1, // Administrativo por defecto
        type: input.type || 1,
        urgency: input.urgency || 5,
        _users_id_requester: input._users_id_requester || 19, // Martha Pinto por defecto
      },
    };

    const response = await fetch(`${GLPI_BASE_URL}/Ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'App-Token': GLPI_APP_TOKEN_TICKET,
        'Session-Token': sessionToken,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GLPI_TIMEOUT),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`GLPI createTicket failed: ${response.status} ${text}`);
    }

    const data = await response.json() as { id: number; message?: string };
    killSession(sessionToken).catch(() => {});

    return {
      success: true,
      ticketId: data.id,
      message: `Ticket #${data.id} creado exitosamente`,
    };
  } catch (error) {
    if (sessionToken) killSession(sessionToken).catch(() => {});
    return {
      success: false,
      message: 'Error al crear ticket en GLPI',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

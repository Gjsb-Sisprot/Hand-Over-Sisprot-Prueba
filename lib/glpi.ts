const GLPI_BASE_URL = process.env.GLPI_BASE_URL || 'http://137.184.87.234/glpi/apirest.php';
const GLPI_APP_TOKEN_INIT = process.env.GLPI_APP_TOKEN_INIT || 'ytIQci5MfhFE33ribqFzM40CPJyGPaeIr4sscvBp';
const GLPI_APP_TOKEN_TICKET = process.env.GLPI_APP_TOKEN_TICKET || 'RycGNOH0qetlfv0nCLgPY693WfW4nr3UR4ClvtJG';
const GLPI_AUTH_BASIC = process.env.GLPI_AUTH_BASIC || 'Basic Z2xwaTo5UVpRU0d1SGZGckJhNnk=';
const GLPI_TIMEOUT = 15000;
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
        itilcategories_id: input.itilcategories_id || 22,
        type: input.type || 1,
        urgency: input.urgency || 5,
        _users_id_requester: input._users_id_requester || 19,
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
    const data = await response.json() as { id: number; message: string };
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

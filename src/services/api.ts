/**
 * Cliente de API contra el backend Django (JWT / simplejwt).
 * Endpoints usados:
 *   POST /login/          { username, password } -> { access, refresh, user }
 *   GET  /user/           (Authorization: Bearer <access>) -> datos del usuario
 *   POST /logout/         { refresh }
 *   POST /token/refresh/  { refresh } -> { access }
 */
import { API_BASE_URL } from '../config';
import { getAccessToken, getRefreshToken, setAccessToken, clearSession, SessionUser } from './auth';

type ReqOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean; // adjuntar el token de acceso
};

async function request<T = any>(path: string, opts: ReqOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.detail)) ||
      (res.status === 401 ? 'Sesión expirada' : `Error ${res.status}`);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return data as T;
}

export type LoginResponse = {
  message: string;
  access: string;
  refresh: string;
  user: SessionUser;
};

export type ReporteRow = {
  asignacion_id: number | null;
  sacafranco_fila_id?: number | null;
  codigo?: string;
  cliente?: string;
  instalacion_nombre?: string;
  puesto?: string;
  puesto_tipo?: string;
  horario?: string;
  turno?: string;               // Diurno / Nocturno / Tarde / Veinticuatro
  nombre_apellidos?: string;    // "HUECA" si no hay persona
  apellidos_txt?: string;       // apellidos por separado (si el servidor ya los manda)
  nombres_txt?: string;         // nombres por separado
  estado_asistencia?: string;   // ASISTIO / FALTO / ''
  estado?: string;
  reemplazo_id?: number | null;
  reemplazo?: string;           // nombre del reemplazo (si hay)
  hueca?: boolean;
  provincia?: string;
  zona_titulo?: string;
};

export type PersonaLite = {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  tipo: string;
  is_active: boolean;
};

type ReporteResp = { results: ReporteRow[]; total: number; page: number; page_size: number; total_pages: number };

// Payload para marcar asistencia (mismo contrato que usa el web).
export type MarcarPayload = {
  estado_asistencia?: string | null;   // 'ASISTIO' | 'FALTO' | null (quitar); omitir = no tocar
  estado?: string;                     // 'TURNO'
  reemplazo_id?: number | null;
  descripcion?: string | null;
  hueca?: boolean;
  hueca_motivo?: string | null;
  row_color?: string;                  // '#fff8b3' asistió, '#ffb3b3' faltó, '' quitar
  fecha: string;                       // YYYY-MM-DD
};

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/login/', { method: 'POST', body: { username, password }, auth: false }),

  getUser: () => request<SessionUser>('/user/'),

  // Personal del día (plantilla de asistencia). fecha en formato YYYY-MM-DD.
  getReporteDia: (fecha: string) =>
    request<ReporteResp>(`/reporte-asistencia/?fecha=${encodeURIComponent(fecha)}&page_size=100000`),

  // Marcar relevo: asistencia de un puesto FIJO/HUECA (por asignación).
  marcarAsistencia: (asignacionId: number, payload: MarcarPayload) =>
    request<ReporteRow>(`/reporte-asistencia/${asignacionId}/`, { method: 'PUT', body: payload }),

  // Marcar relevo: asistencia de un SACAFRANCO (no tiene asignación; se guarda por su fila).
  marcarSacafrancoAsistencia: (filaId: number, payload: MarcarPayload) =>
    request<ReporteRow>(`/reporte-asistencia/sacafranco/${filaId}/`, { method: 'PUT', body: payload }),

  // Buscar personas para elegir un reemplazo (por nombre, apellido o cédula).
  buscarPersonas: (q: string) =>
    request<PersonaLite[]>(`/personas/?q=${encodeURIComponent(q)}`),

  logout: async () => {
    const refresh = await getRefreshToken();
    try {
      await request('/logout/', { method: 'POST', body: { refresh }, auth: false });
    } catch {
      // el logout siempre procede del lado del cliente
    }
  },

  refreshAccess: async (): Promise<string | null> => {
    const refresh = await getRefreshToken();
    if (!refresh) return null;
    try {
      const data = await request<{ access: string }>('/token/refresh/', {
        method: 'POST',
        body: { refresh },
        auth: false,
      });
      if (data?.access) {
        await setAccessToken(data.access);
        return data.access;
      }
    } catch {
      await clearSession();
    }
    return null;
  },
};

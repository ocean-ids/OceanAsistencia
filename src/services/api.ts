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

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/login/', { method: 'POST', body: { username, password }, auth: false }),

  getUser: () => request<SessionUser>('/user/'),

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

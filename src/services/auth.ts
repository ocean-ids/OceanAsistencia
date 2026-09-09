/**
 * Almacenamiento de la sesión (token JWT + datos del usuario) en el dispositivo.
 * Usa AsyncStorage. Más adelante se puede migrar a almacenamiento seguro (Keychain).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const K_ACCESS = 'oa_access';
const K_REFRESH = 'oa_refresh';
const K_USER = 'oa_user';

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  photo_url: string | null;
  cargo?: string | null;
  is_superuser: boolean;
  groups: string[];
  permissions: string[];
  modulos_ocultos?: string[];
};

export async function saveSession(access: string, refresh: string, user: SessionUser): Promise<void> {
  await AsyncStorage.multiSet([
    [K_ACCESS, access],
    [K_REFRESH, refresh],
    [K_USER, JSON.stringify(user)],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(K_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(K_REFRESH);
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const raw = await AsyncStorage.getItem(K_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function setAccessToken(access: string): Promise<void> {
  await AsyncStorage.setItem(K_ACCESS, access);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([K_ACCESS, K_REFRESH, K_USER]);
}

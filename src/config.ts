/**
 * Configuración global de la app.
 *
 * API_BASE_URL: a dónde apunta la app.
 *  - Producción (por defecto): https://fisica.oceansecurity.net/api
 *  - Local (Django en tu PC):  http://10.0.2.2:8000/api   <- 10.0.2.2 = "localhost" del PC visto desde el emulador Android
 *  - Staging: la URL que definas
 *
 * Cambia solo esta línea para apuntar a otro backend.
 */
export const API_BASE_URL = 'https://fisica.oceansecurity.net/api';

// Nombre visible de la app (para textos internos).
export const APP_NAME = 'OceanAsistencia';

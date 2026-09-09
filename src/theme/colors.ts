/**
 * Paleta OceanOS. Un solo lugar para los colores de toda la app.
 */
export const colors = {
  brand: '#0E7C86',       // teal-océano principal
  brandDark: '#0A5A62',   // variante oscura (presionado, encabezados)
  brandSoft: '#D6EEF0',   // fondo suave con tinte de marca

  bg: '#F4F6F9',          // fondo de pantallas
  surface: '#FFFFFF',     // tarjetas, inputs
  border: '#DCE3EA',      // bordes suaves

  text: '#14202B',        // texto principal
  textMuted: '#5B6B79',   // texto secundario
  textOnBrand: '#FFFFFF', // texto sobre el color de marca

  danger: '#D1453B',      // errores
  dangerSoft: '#FBE7E5',
  success: '#1A8A5C',
  warning: '#C2790C',
};

export type Colors = typeof colors;

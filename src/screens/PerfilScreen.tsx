import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const AZUL = '#0c2f5a';

function iniciales(nombre?: string, username?: string): string {
  const base = (nombre || username || '?').trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

// La foto puede venir como URL absoluta o como ruta relativa (/media/...); en ese
// caso se antepone el origen del backend (sin el /api final).
function fotoUrl(photo?: string | null): string | null {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo)) return photo;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

export default function PerfilScreen() {
  const { user, signOut } = useAuth();

  const confirmarSalir = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const foto = fotoUrl(user?.photo_url);
  const rol = user?.is_superuser ? 'Administrador' : (user?.groups?.[0] || '');

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarInit]}>
            <Text style={styles.avatarTxt}>{iniciales(user?.full_name, user?.username)}</Text>
          </View>
        )}
        <Text style={styles.nombre}>{user?.full_name || user?.username || '—'}</Text>
        {!!user?.cargo && <Text style={styles.cargo}>{user.cargo}</Text>}
      </View>

      <Text style={styles.seccion}>Datos</Text>
      <View style={styles.card}>
        <Fila label="Usuario" valor={user?.username} />
        <Fila label="Correo" valor={user?.email} ultimo={!user?.cargo && !rol} />
        {!!user?.cargo && <Fila label="Cargo" valor={user?.cargo} ultimo={!rol} />}
        {!!rol && <Fila label="Rol" valor={rol} ultimo />}
      </View>

      <TouchableOpacity style={styles.logout} onPress={confirmarSalir} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Fila({ label, valor, ultimo }: { label: string; valor?: string | null; ultimo?: boolean }) {
  return (
    <View style={[styles.fila, ultimo && styles.filaUltima]}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor} numberOfLines={1}>{valor || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f4f6f9' },
  container: { padding: 16, paddingBottom: 32 },
  header: { backgroundColor: AZUL, borderRadius: 16, padding: 22, marginBottom: 20, alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1c4a80', borderWidth: 2, borderColor: '#ffffff55' },
  avatarInit: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 30, fontWeight: '800' },
  nombre: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  cargo: { color: '#9fd0ff', fontSize: 13, marginTop: 4, fontWeight: '600' },
  seccion: { fontSize: 13, fontWeight: '700', color: '#5b6b79', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e3e8ef' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#eef1f5', gap: 12 },
  filaUltima: { borderBottomWidth: 0 },
  filaLabel: { fontSize: 14, color: '#6b7787' },
  filaValor: { fontSize: 14, fontWeight: '600', color: '#14202b', flexShrink: 1, textAlign: 'right' },
  logout: { marginTop: 22, borderWidth: 1, borderColor: '#c33a34', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#c33a34', fontWeight: '700', fontSize: 15 },
});

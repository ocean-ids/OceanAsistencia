import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const AZUL = '#0c2f5a';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaHoy(): string {
  const d = new Date()
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
/*${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}*/ 

type Opcion = { icon: string; titulo: string; desc: string; onPress: () => void };

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const nav = useNavigation<any>();

  const proximamente = (nombre: string) =>
    Alert.alert(nombre, 'Función en construcción — la agregamos en el siguiente paso.');

  const opciones: Opcion[] = [
    { icon: '📋', titulo: 'Personal del día', desc: 'Ver la plantilla y relevos', onPress: () => nav.navigate('PersonalDia') },
    { icon: '✅', titulo: 'Marcar relevo', desc: 'Confirmar asistencia del puesto', onPress: () => nav.navigate('MarcarRelevo') },
    { icon: '⚠️', titulo: 'Novedades', desc: 'Reportar una novedad', onPress: () => proximamente('Novedades') },
    { icon: '👤', titulo: 'Mi perfil', desc: 'Tus datos y sesión', onPress: () => nav.navigate('Perfil') },
  ];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hola}>Hola,</Text>
        <Text style={styles.name}>{user?.full_name || user?.username}</Text>
        {!!user?.cargo && <Text style={styles.cargo}>{user.cargo}</Text>}
        <Text style={styles.fecha}>{fechaHoy()}</Text>
      </View>

      <Text style={styles.seccion}>Menú</Text>
      <View style={styles.grid}>
        {opciones.map((op) => (
          <TouchableOpacity key={op.titulo} style={styles.opcion} onPress={op.onPress} activeOpacity={0.7}>
            <Text style={styles.opIcon}>{op.icon}</Text>
            <Text style={styles.opTitulo}>{op.titulo}</Text>
            <Text style={styles.opDesc}>{op.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f4f6f9' },
  container: { padding: 16, paddingBottom: 32 },
  header: { backgroundColor: AZUL, borderRadius: 16, padding: 20, marginBottom: 20 },
  hola: { color: '#cfd8e6', fontSize: 15 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  cargo: { color: '#9fd0ff', fontSize: 13, marginTop: 4, fontWeight: '600' },
  fecha: { color: '#cfd8e6', fontSize: 12, marginTop: 10, textTransform: 'capitalize' },
  seccion: { fontSize: 13, fontWeight: '700', color: '#5b6b79', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  opcion: {
    width: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#e3e8ef', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  opIcon: { fontSize: 30, marginBottom: 8 },
  opTitulo: { fontSize: 15, fontWeight: '700', color: '#14202b' },
  opDesc: { fontSize: 12, color: '#6b7787', marginTop: 3 },
  logout: {
    marginTop: 8, borderWidth: 1, borderColor: '#c33a34',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: '#c33a34', fontWeight: '700', fontSize: 15 },
});

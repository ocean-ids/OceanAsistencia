import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.hello}>¡Bienvenido!</Text>
        <Text style={styles.name}>{user?.full_name || user?.username}</Text>
        {!!user?.cargo && <Text style={styles.cargo}>{user.cargo}</Text>}
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  hello: { fontSize: 16, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center' },
  cargo: { fontSize: 14, color: colors.brand, marginTop: 4 },
  logout: {
    marginTop: 24, borderWidth: 1, borderColor: colors.danger,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});

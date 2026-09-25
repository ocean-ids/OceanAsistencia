import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PersonalDiaScreen from '../screens/PersonalDiaScreen';
// MarcarRelevoScreen queda en el codigo pero NO se navega: la asistencia la corrige solo
// Consola (web). El Supervisor Motorizado solo consulta (documentacion AS-IS).
import PerfilScreen from '../screens/PerfilScreen';

const AZUL = '#0c2f5a';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: AZUL },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
          <Stack.Screen name="PersonalDia" component={PersonalDiaScreen} options={{ title: 'Personal del día' }} />
          <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Mi perfil' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});

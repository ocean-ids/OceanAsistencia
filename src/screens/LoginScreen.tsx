import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image, ImageBackground, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const AZUL = '#0c2f5a';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('Por favor, ingresa usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../assets/fondo.png')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />

            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Ingresa tu usuario"
              placeholderTextColor="#9aa3b8"
              editable={!loading}
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#9aa3b8"
                editable={!loading}
              />
              <TouchableOpacity style={styles.eye} onPress={() => setShowPassword(v => !v)}>
                <Text style={styles.eyeTxt}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Iniciar Sesión</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert(
                '¿Olvidaste tu contraseña?',
                'Solicita el restablecimiento desde la web: fisica.oceansecurity.net'
              )}>
              <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,31,68,0.20)' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(250,247,247,0.95)',
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  logo: { width: '100%', height: 78, alignSelf: 'center', marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#2b3440', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#14202b',
  },
  pwdRow: { position: 'relative', justifyContent: 'center' },
  pwdInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, paddingRight: 46, fontSize: 16, color: '#14202b',
  },
  eye: { position: 'absolute', right: 6, padding: 8 },
  eyeTxt: { fontSize: 18 },
  error: { color: '#c33a34', marginTop: 14, fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: AZUL, borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 22,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: AZUL, textAlign: 'center', marginTop: 18, fontWeight: '600' },
});

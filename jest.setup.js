// AsyncStorage es un módulo nativo: en Jest no existe puente nativo, así que
// se sustituye por el mock que publica el propio paquete.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

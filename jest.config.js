module.exports = {
  preset: '@react-native/jest-preset',
  // El preset solo transforma react-native y @react-native*. Estos paquetes
  // publican ESM en lib/module, así que también necesitan pasar por Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?' +
      '|@react-navigation' +
      '|react-native-screens' +
      '|react-native-safe-area-context' +
      '|@react-native-async-storage)/)',
  ],
  // Jest concatena esto despues de los setupFiles del preset, no los reemplaza.
  setupFiles: ['<rootDir>/jest.setup.js'],
};

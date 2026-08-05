/**
 * MMKV swaps itself for an in-memory mock under Jest, but it still imports its
 * Nitro factory at module load, and Nitro asks for a native TurboModule that
 * does not exist in a test process. Stubbing the module keeps the import cheap;
 * `isTest()` means the factory is never actually called.
 */
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({}),
    box: (value) => value,
  },
}));

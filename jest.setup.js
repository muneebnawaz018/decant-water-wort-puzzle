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

/**
 * `expo-asset` reaches for native file-system modules at import, the same
 * shape as the Nitro stub above. `src/audio/sounds.ts` imports it to resolve
 * each cue to a real file before handing it to the native player, because
 * Metro serves assets over HTTP with no `Content-Type` and no audio backend
 * should be asked to guess at those. (The player itself is
 * `modules/system-sound`, whose binding is simply absent under Jest —
 * `requireOptionalNativeModule` returns null and the audio layer treats the
 * device as silent, so it needs no mock at all.)
 *
 * `localUri` is a plain string here. Nothing under test reads it; what the
 * suites assert is which cue fired under which setting.
 */
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: () => ({
      downloadAsync: () => Promise.resolve(),
      localUri: 'file:///stub.wav',
      uri: 'file:///stub.wav',
    }),
  },
}));

/**
 * Babel's entry point — Metro loads this file by name, so nothing imports it,
 * which is why knip is told to ignore it and the two plugins it names.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};

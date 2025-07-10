/** @type {import("@babel/core").ConfigFunction} */
export default (api) => {
  api.cache(true);
  return {
    plugins: ['react-native-reanimated/plugin'],
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};

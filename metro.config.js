const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Configure SVG transformer
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer"
);
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// Exclude subdirectory node_modules from being watched
config.watchFolders = [];
config.resolver.blockList = [
  /backend\/node_modules\/.*/,
  /admin-react\/node_modules\/.*/,
  /chef-react\/node_modules\/.*/,
  /driver-react\/node_modules\/.*/,
  /landing-page\/node_modules\/.*/,
];

module.exports = config;

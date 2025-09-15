const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
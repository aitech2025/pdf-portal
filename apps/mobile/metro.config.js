const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
// packages/shared lives outside apps/mobile; Metro must watch it to resolve the @shared alias.
const sharedRoot = path.resolve(projectRoot, '../../packages/shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = withNativeWind(config, { input: './global.css' });

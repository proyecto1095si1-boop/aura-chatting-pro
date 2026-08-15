const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// 1. IMPROVED RESOLUTION: Critical for tRPC v11 + pnpm + Reanimated
const nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

config.resolver.nodeModulesPaths = nodeModulesPaths;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@trpc/server": path.join(__dirname, "node_modules/@trpc/server"),
  "@trpc/client": path.join(__dirname, "node_modules/@trpc/client"),
  "@trpc/react-query": path.join(__dirname, "node_modules/@trpc/react-query"),
  "@tanstack/react-query": path.join(__dirname, "node_modules/@tanstack/react-query"),
  "semver": path.join(__dirname, "node_modules/semver"),
};

// Ensure Metro watches the semver package directory (needed for SHA-1 computation)
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, "node_modules/semver"),
];

// Custom resolver to handle deep semver sub-path imports (e.g. semver/functions/satisfies)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('semver/')) {
    const subPath = moduleName.slice('semver/'.length);
    return {
      filePath: path.resolve(__dirname, 'node_modules', 'semver', subPath + '.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 2. EXCLUSIONS: Prevent Metro from watching non-frontend folders
const defaultBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList)
    ? defaultBlockList
    : defaultBlockList
    ? [defaultBlockList]
    : []),
  new RegExp(`^${path.join(__dirname, "android").replace(/\\/g, "\\\\")}.*`),
  new RegExp(`^${path.join(__dirname, "functions").replace(/\\/g, "\\\\")}.*`),
  new RegExp(`^${path.join(__dirname, "server").replace(/\\/g, "\\\\")}.*`),
  new RegExp(`^${path.join(__dirname, "tests").replace(/\\/g, "\\\\")}.*`),
  /\.git\/.*/,
  /\.expo\/.*/,
];

// 3. MODERN FEATURES: Required for tRPC v11 and Expo 54+
config.resolver.sourceExts.push('cjs', 'mjs');
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_enableSymlinks = true;

// 4. WINDOWS + ONEDRIVE STABILITY
// - Force use of node-watcher (disable watchman)
// - Limit workers to 1 to prevent disk I/O congestion with OneDrive sync
config.maxWorkers = 1; 
config.resetCache = true;

if (config.watcher) {
  config.watcher.watchman = false;
}

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});

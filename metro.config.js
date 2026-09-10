const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Necesario para poder importar los .sql generados por drizzle-kit (ver src/db/migrations).
config.resolver.sourceExts.push('sql');

module.exports = config;

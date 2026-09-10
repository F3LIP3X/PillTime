module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Permite importar los .sql de las migraciones de Drizzle como texto inline.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};

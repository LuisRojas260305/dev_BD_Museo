// Alias de retrocompatibilidad — re-exporta desde auth.js
// @deprecated Usar require('./auth') en lugar de require('./authMiddleware')
const auth = require('./auth');
module.exports = auth;

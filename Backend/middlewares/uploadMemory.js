/**
 * Middleware Multer para subida de archivos en memoria (buffer).
 * Límite configurado a 10 MB por archivo.
 */
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

/** Middleware Multer configurado con almacenamiento en memoria. */
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

module.exports = upload;

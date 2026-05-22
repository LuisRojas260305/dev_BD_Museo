const mongoose = require('mongoose');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`Error de conexión MongoDB (intento ${retryCount + 1}):`, err.message);
    if (retryCount < MAX_RETRIES - 1) {
      console.log(`Reintentando en ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retryCount + 1);
    }
    throw err;
  }
};

const getConnectionStatus = () => mongoose.connection.readyState;

mongoose.connection.on('error', (err) => {
  console.error('Error de conexión MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado. Intentando reconectar...');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = connectDB;
module.exports.getConnectionStatus = getConnectionStatus;

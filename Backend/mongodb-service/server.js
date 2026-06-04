const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/catalog', require('./routes/catalog.routes'));

app.use(require('./middleware/errorHandler'));

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servicio MongoDB corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar el servicio:', err);
    process.exit(1);
  }
};

start();

module.exports = app;

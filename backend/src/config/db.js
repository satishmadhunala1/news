const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is not configured');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 15000,
  });

  isConnected = true;
  logger.info('MongoDB connected');
  return mongoose.connection;
}

function getConnectionState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = {
  connectDB,
  getConnectionState,
};

// config.js - Configuration settings for the application

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://rc786986:l1mu5hunSw3S3lKs@cluster0.0k6qges.mongodb.net/',
  JWT_SECRET: process.env.JWT_SECRET || 'synapaxon_jwt_secret_key',
  JWT_EXPIRE: '30d' // JWT expiration time
};
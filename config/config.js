// config.js - Configuration settings for the application

module.exports = {
  PORT: process.env.PORT || 8000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://Medionix:Medionix@cluster0.yvihs4s.mongodb.net/',
  JWT_SECRET: process.env.JWT_SECRET || 'synapaxon_jwt_secret_key',
  JWT_EXPIRE: '30d' // JWT expiration time
};
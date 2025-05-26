require('dotenv').config(); // Make sure this is at the top

module.exports = {
  PORT: process.env.PORT || 8000,
  MONGODB_URI: process.env.MONGO_URI, // Correct the name to match your .env
  JWT_SECRET: process.env.JWT_SECRET || 'synapaxon_jwt_secret_key',
  JWT_EXPIRE: '30d',

  // ✅ Add these Google OAuth values
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
};

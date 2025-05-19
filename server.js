

// server.js - Main entry point
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config/config');
const connectDB = require('./config/db');
const errorHandler = require('./utils/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const testRoutes = require('./routes/tests');

// Connect to database
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: 'https://synapaxon-frontend.onrender.com', // your frontend URL here
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // if your frontend sends cookies or auth headers
};

app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);

// Error handler middleware
app.use(errorHandler);

const PORT = config.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // For testing purposes
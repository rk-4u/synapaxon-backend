// server.js 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const connectDB = require('./config/db');
const errorHandler = require('./utils/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const testRoutes = require('./routes/tests');
const uploadRoutes = require('./routes/uploads'); 

// Connect to database
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: [
    'https://synapaxon-frontend.onrender.com', 
    'http://localhost:3000',                   
    'http://localhost:5173',                 
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/uploads', uploadRoutes); 

app.use(errorHandler);

const PORT = config.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // For testing purposes
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 9000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
  res.send('InsightFlow API is running');
});

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const datasetRoutes = require('./routes/dataset');
const adminRoutes = require('./routes/admin');
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/admin', adminRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

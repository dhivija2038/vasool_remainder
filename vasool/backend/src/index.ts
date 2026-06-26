import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './config/db';
import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import paymentRoutes from './routes/paymentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import reportRoutes from './routes/reportRoutes';
import reminderRoutes from './routes/reminderRoutes';
import settingRoutes from './routes/settingRoutes';
import dataManagementRoutes from './routes/dataManagementRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/data-management', dataManagementRoutes);

// Catch-all route
app.use((req, res) => {
  res.status(404).json({ message: 'API Route Not Found' });
});

// Initialise DB and Start Server
async function startServer() {
  try {
    console.log('Connecting to MySQL database...');
    await initDB();
    
    app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to database error:', error);
    process.exit(1);
  }
}

startServer();

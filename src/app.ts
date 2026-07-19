import * as dotenv from 'dotenv';
// Load environment variables immediately on server startup
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { prisma } from './database/prisma';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import leadRoutes from './routes/lead.routes';
import customerRoutes from './routes/customer.routes';
import dealRoutes from './routes/deal.routes';
import taskRoutes from './routes/task.routes';
import emailRoutes from './routes/email.routes';
import userRoutes from './routes/user.routes';
import aiRoutes from './routes/ai.routes'; // Import your AI router

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middlewares
app.use(cors());
app.use(express.json());

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/leads', leadRoutes);
app.use('/contacts', customerRoutes);
app.use('/deals', dealRoutes);
app.use('/tasks', taskRoutes);
app.use('/emails', emailRoutes);
app.use('/users', userRoutes);
app.use('/api/ai', aiRoutes); // Mount AI endpoints under /api/ai

// Serve static frontend files from your "public" directory
app.use(express.static(path.join(__dirname, '../public')));

// Basic Health Check Route
app.get('/api/health', async (req: Request, res: Response): Promise<any> => {
  try {
    // Query PostgreSQL using the named prisma instance to confirm connection
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check database query failed:', error);
    return res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Boot up server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL database successfully connected via Prisma.');

    app.listen(PORT, () => {
      console.log(`SalesFlow CRM is running on: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database on startup:', error);
    process.exit(1);
  }
};

startServer();
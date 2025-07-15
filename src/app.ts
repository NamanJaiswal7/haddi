import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import districtAdminRoutes from './routes/districtAdmin';
import courseRoutes from './routes/course';
import masterAdminRoutes from './routes/masterAdmin';
import districtRoutes from './routes/district';
import studentRoutes from './routes/student';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

const app = express();

// CORS configuration for development
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173',
      'http://127.0.0.1:8080',
      'https://facevalue-rej5-namanjaiswal7s-projects.vercel.app/',
      'https://facevalue-rej5-git-main-namanjaiswal7s-projects.vercel.app/',
      'https://facevalue-rej5.vercel.app/'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Define API routes here
app.use('/api/auth', authRoutes);
app.use('/api/district-admin', districtAdminRoutes);
app.use('/api/levels', courseRoutes);
app.use('/api/master-admin', masterAdminRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/student', studentRoutes);

export default app;

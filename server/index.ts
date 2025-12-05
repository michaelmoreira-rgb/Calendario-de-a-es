import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import authRoutes from './auth';
import eventRoutes from './routes/events';
import adminRoutes from './routes/admin';
import { verifyToken, checkRole, AuthRequest } from './middleware';
import { UserRole } from '../types';
import { initSocket } from './socket';

// Mock PrismaClient
const PrismaClient = class {} as any;

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Create HTTP Server
const httpServer = createServer(app);

// Initialize Socket.io
const io = initSocket(httpServer);

// Socket.io Middleware for Authentication
io.use((socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error("Server configuration error"));

  try {
    const decoded = jwt.verify(token, secret) as any;
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on('connection', (socket: any) => {
  const user = socket.data.user;
  // console.log(`User connected: ${user.userId}`);
  
  // Join room based on User ID
  socket.join(user.userId);

  // Join room based on Role (e.g., 'ADMIN' room)
  socket.join(user.role);

  socket.on('disconnect', () => {
    // console.log('User disconnected');
  });
});

// Middleware
app.use(cors() as any);
app.use(express.json() as any);
app.use(passport.initialize() as any);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);

// Protected API Routes Example
app.get(
  '/api/dashboard-stats',
  verifyToken,
  checkRole([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.COORDINATOR]),
  async (req: AuthRequest, res: any) => {
    try {
      // Mock data for dashboard
      const projects = [
        { id: '101', name: 'Website Redesign', status: 'active', budget: 15000, lastUpdated: '2023-10-25' },
        { id: '102', name: 'Mobile App Migration', status: 'on_hold', budget: 45000, lastUpdated: '2023-10-20' },
      ];
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Use httpServer.listen instead of app.listen
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
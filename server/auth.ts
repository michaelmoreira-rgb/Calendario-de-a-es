import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserRole } from '../types';
import jwt from 'jsonwebtoken';
import { getIO } from './socket';
import { addEmailJob } from './queue';

// Mock PrismaClient
const PrismaClient = class {
  user: any = { findFirst: () => {}, findUnique: () => {}, update: () => {}, create: () => {}, findMany: () => {} };
} as any;

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'missing_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing_client_secret',
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error('No email found from Google profile'));

        // 1. Try to find user by Google ID
        let user = await prisma.user.findFirst({
          where: { googleId: profile.id },
        });

        if (!user) {
          // 2. Try to find user by Email (link account)
          user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // Link existing account
            user = await prisma.user.update({
              where: { id: user.id },
              data: { 
                googleId: profile.id,
                avatar: profile.photos?.[0].value || user.avatar
              },
            });
          } else {
            // 3. Create new user
            user = await prisma.user.create({
              data: {
                name: profile.displayName,
                email: email,
                googleId: profile.id,
                avatar: profile.photos?.[0].value,
                role: UserRole.PENDING_ASSIGNMENT,
              },
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, undefined);
      }
    }
  )
);

// Routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=auth_failed` }),
  async (req: any, res) => {
    const user = req.user as any;
    
    // Notify Admins if user is Pending
    if (user.role === UserRole.PENDING_ASSIGNMENT) {
      try {
        // 1. Socket Notification
        const io = getIO();
        io.to(UserRole.ADMIN).emit('notification', {
          id: crypto.randomUUID(),
          type: 'NEW_USER_PENDING',
          message: `New user ${user.name} (${user.email}) is awaiting role assignment.`,
          timestamp: new Date().toISOString(),
          read: false,
          data: { userId: user.id }
        });

        // 2. Email Notification (to all Admins)
        const admins = await prisma.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { email: true }
        });

        for (const admin of admins) {
          if (admin.email) {
            addEmailJob(
              admin.email,
              'Action Required: New User Pending',
              'new-user-pending',
              {
                newUserName: user.name,
                newUserEmail: user.email,
                dashboardUrl: `${CLIENT_URL}/#/admin`
              }
            );
          }
        }

      } catch (e) {
        console.error("Failed to emit pending user notification", e);
      }
    }

    // Generate JWT
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is missing");
      return res.redirect(`${CLIENT_URL}/login?error=server_config_error`);
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Redirect to frontend with token
    res.redirect(`${CLIENT_URL}/#/login?token=${token}`);
  }
);

export default router;
import express, { Response } from 'express';
import { UserRole, EventStatus } from '../../types';
import { verifyToken, checkRole, AuthRequest } from '../middleware';

// Mock PrismaClient
const PrismaClient = class {
  auditLog: any = { groupBy: () => {} };
  user: any = { groupBy: () => {}, findMany: () => {}, findUnique: () => {}, update: () => {} };
  event: any = { groupBy: () => {} };
} as any;

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to ensure only ADMIN can access these routes
router.use(verifyToken, checkRole([UserRole.ADMIN]));

// GET /api/admin/audit-stats
router.get('/audit-stats', async (req: AuthRequest, res: any) => {
  try {
    // Group audit logs by Action
    // This relies on the specific action strings we defined in events.ts
    const actions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        _all: true
      }
    });

    // Format for chart: { name: 'Self Approval', value: 10 }
    const chartData = actions.map((a: any) => ({
      name: a.action.replace(/_/g, ' '),
      value: a._count._all
    }));

    // Specific counters
    const selfApprovals = actions.find((a: any) => a.action === 'APPROVE_SELF')?._count._all || 0;
    const otherApprovals = actions.find((a: any) => a.action === 'APPROVE_OTHER')?._count._all || 0;
    const autoApprovals = actions.find((a: any) => a.action === 'CREATE_AUTO_APPROVED')?._count._all || 0;

    res.json({
      chartData,
      summary: {
        selfApprovals,
        otherApprovals,
        autoApprovals,
        totalInterventions: selfApprovals + otherApprovals + autoApprovals
      }
    });
  } catch (error) {
    console.error('Audit Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch audit stats' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req: AuthRequest, res: any) => {
  try {
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    const eventCounts = await prisma.event.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const usersByRole = userCounts.reduce((acc: any, curr: any) => {
      acc[curr.role] = curr._count.role;
      return acc;
    }, {} as Record<string, number>);

    const eventsByStatus = eventCounts.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    res.json({ usersByRole, eventsByStatus });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: any) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req: AuthRequest, res: any) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!Object.values(UserRole).includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id } });

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (
      userToUpdate.role === UserRole.PENDING_ASSIGNMENT &&
      role === UserRole.ADMIN
    ) {
      return res.status(400).json({ 
        message: 'Cannot promote PENDING users directly to ADMIN. Assign another role first.' 
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

export default router;
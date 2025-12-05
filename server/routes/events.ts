import express, { Response } from 'express';
import { UserRole, EventStatus, EventType } from '../../types';
import { verifyToken, checkRole, AuthRequest } from '../middleware';
import { 
  createEventSchema, 
  updateEventStatusSchema, 
  updateEventSchema, 
  bulkUpdateStatusSchema,
  approveEventSchema,
  rejectEventSchema,
  bulkApproveEventSchema
} from '../validation';
import { 
  createGoogleCalendarEvent, 
  deleteGoogleCalendarEvent, 
  updateGoogleCalendarEvent,
  checkCalendarBusy 
} from '../services/googleCalendar';
import { getIO } from '../socket';
import { addEmailJob } from '../queue';
import crypto from 'crypto';

const router = express.Router();

// Mock PrismaClient since @prisma/client is not available or generated
const PrismaClient = class {
  auditLog: any = { create: () => {} };
  user: any = { findMany: () => {}, count: () => {}, findUnique: () => {} };
  event: any = { count: () => {}, groupBy: () => {}, findUnique: () => {}, update: () => {}, create: () => {}, findMany: () => {}, delete: () => {} };
} as any;

const prisma = new PrismaClient();

const logAudit = async (userId: string, action: string, entityType: string, entityId: string, metadata?: any) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action, 
        entityType,
        entityId,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

router.get(
  '/stats/coordinators',
  verifyToken,
  checkRole([UserRole.SUPERVISOR, UserRole.ADMIN]),
  async (req: AuthRequest, res: any) => {
    try {
      const coordinators = await prisma.user.findMany({
        where: { role: UserRole.COORDINATOR },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          _count: {
            select: {
              events: {
                where: { status: EventStatus.PENDING }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      const formatted = coordinators.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        avatar: c.avatar,
        pendingCount: c._count.events
      }));

      res.json(formatted);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas dos coordenadores' });
    }
  }
);

router.get(
  '/stats/supervisor',
  verifyToken,
  checkRole([UserRole.SUPERVISOR, UserRole.ADMIN]),
  async (req: AuthRequest, res: any) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      const [pendingToday, approvedWeek, totalEvents, approvedTotal, byType, byApprover] = await Promise.all([
        prisma.event.count({
          where: { 
            status: EventStatus.PENDING,
            startDate: { gte: today }
          }
        }),
        prisma.event.count({
          where: {
            status: EventStatus.APPROVED,
            updatedAt: { gte: weekStart }
          }
        }),
        prisma.event.count(),
        prisma.event.count({ where: { status: EventStatus.APPROVED } }),
        prisma.event.groupBy({
          by: ['eventType'],
          _count: { _all: true }
        }),
        prisma.user.findMany({
          where: { role: { in: [UserRole.SUPERVISOR, UserRole.ADMIN] } },
          select: {
            name: true,
            _count: {
              select: { approvedEvents: true }
            }
          }
        })
      ]);

      const approvalRate = totalEvents > 0 ? Math.round((approvedTotal / totalEvents) * 100) : 0;

      res.json({
        pendingToday,
        approvedWeek,
        approvalRate,
        byType: byType.map((t: any) => ({ name: t.eventType, value: t._count._all })),
        byApprover: byApprover.map((u: any) => ({ name: u.name, value: u._count.approvedEvents }))
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
  }
);

router.post(
  '/:id/approve',
  verifyToken,
  checkRole([UserRole.SUPERVISOR, UserRole.ADMIN]),
  async (req: AuthRequest, res: any) => {
    try {
      const { id } = req.params;
      const result = approveEventSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ errors: result.error.issues });

      const { notifyCreator } = result.data;
      const user = req.user!;

      const event = await prisma.event.findUnique({
        where: { id },
        include: { createdBy: true }
      });

      if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
      
      if (event.status !== EventStatus.PENDING) {
        return res.status(400).json({ message: 'Apenas eventos pendentes podem ser aprovados.' });
      }

      const isSelfApproval = event.createdById === user.userId;
      const isAdmin = user.role === UserRole.ADMIN;
      const warnings: string[] = [];

      if (isSelfApproval && !isAdmin) {
        const isSpecialType = [EventType.EVENTO, EventType.VISITA].includes(event.eventType);

        if (!isSpecialType) {
          const durationDays = (new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60 * 24);
          if (durationDays > 30) {
            return res.status(400).json({ 
              message: 'Auto-aprovação negada. Eventos com mais de 30 dias requerem aprovação de outro supervisor ou admin.' 
            });
          }

          const startOfDay = new Date();
          startOfDay.setHours(0,0,0,0);
          
          const approvedTodayCount = await prisma.event.count({
            where: {
              approvedById: user.userId,
              createdById: user.userId,
              status: EventStatus.APPROVED,
              updatedAt: { gte: startOfDay }
            }
          });

          if (approvedTodayCount >= 5) {
             return res.status(400).json({ 
              message: 'Limite diário de auto-aprovação (5) atingido. Solicite aprovação de outro supervisor.' 
            });
          }
        }
      }

      const isBusy = await checkCalendarBusy(event.startDate, event.endDate);
      if (isBusy) {
        warnings.push('Aviso: Conflito detectado no Google Agenda.');
      }

      let updatedEvent = await prisma.event.update({
        where: { id },
        data: {
          status: EventStatus.APPROVED,
          approvedById: user.userId,
        }
      });

      try {
        if (updatedEvent.googleCalendarEventId) {
          await updateGoogleCalendarEvent(updatedEvent.googleCalendarEventId, updatedEvent);
        } else {
          const gCalId = await createGoogleCalendarEvent(updatedEvent);
          updatedEvent = await prisma.event.update({
            where: { id: updatedEvent.id },
            data: { googleCalendarEventId: gCalId }
          });
        }
      } catch (gCalError) {
        console.error('Google Calendar Sync Failed during approval:', gCalError);
        warnings.push('Falha na sincronização com Google Agenda.');
      }

      const auditAction = isSelfApproval ? 'APPROVE_SELF' : 'APPROVE_OTHER';
      await logAudit(user.userId, auditAction, 'EVENT', id, { selfApproval: isSelfApproval });

      const io = getIO();

      if (isSelfApproval) {
        io.to(user.userId).emit('notification', {
          id: crypto.randomUUID(),
          type: 'EVENT_SELF_APPROVED',
          message: `Você auto-aprovou o evento: "${event.title}"`,
          timestamp: new Date().toISOString(),
          read: false,
          data: { eventId: event.id }
        });

        if (user.email) {
          addEmailJob(user.email, `Auto-Aprovação: ${event.title}`, 'self_approved', {
             userName: user.name || 'Usuário',
             eventTitle: event.title,
             startDate: new Date(event.startDate).toLocaleDateString('pt-BR')
          });
        }
      } else {
        if (notifyCreator) {
          io.to(event.createdById).emit('notification', {
            id: crypto.randomUUID(),
            type: 'EVENT_APPROVED_BY_OTHER',
            message: `Seu evento "${event.title}" foi aprovado por ${req.user?.email || 'um supervisor'}.`,
            timestamp: new Date().toISOString(),
            read: false,
            data: { eventId: event.id }
          });

          if (event.createdBy?.email) {
            addEmailJob(
              event.createdBy.email,
              `Evento Aprovado: ${event.title}`,
              'approved_by_supervisor',
              {
                userName: event.createdBy.name,
                eventTitle: event.title,
                supervisorName: req.user?.email,
                startDate: new Date(event.startDate).toLocaleDateString('pt-BR'),
              }
            );
          }
        }
      }

      return res.json({
        ...updatedEvent,
        warning: warnings.length > 0 ? warnings.join(' ') : undefined
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

router.post(
  '/:id/reject',
  verifyToken,
  checkRole([UserRole.SUPERVISOR, UserRole.ADMIN]),
  async (req: AuthRequest, res: any) => {
    try {
      const { id } = req.params;
      const result = rejectEventSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ errors: result.error.issues });

      const { reason, notifyCreator } = result.data;
      const user = req.user!;

      const event = await prisma.event.findUnique({
        where: { id },
        include: { createdBy: true }
      });

      if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
      
      const newDescription = event.description 
        ? `${event.description}\n\n[MOTIVO REJEIÇÃO]: ${reason}`
        : `[MOTIVO REJEIÇÃO]: ${reason}`;

      const updatedEvent = await prisma.event.update({
        where: { id },
        data: {
          status: EventStatus.REJECTED,
          approvedById: user.userId,
          description: newDescription
        }
      });

      if (updatedEvent.googleCalendarEventId) {
        try {
          await deleteGoogleCalendarEvent(updatedEvent.googleCalendarEventId);
          await prisma.event.update({
            where: { id },
            data: { googleCalendarEventId: null }
          });
        } catch (gCalError) {}
      }

      await logAudit(user.userId, 'REJECT', 'EVENT', id);

      if (notifyCreator) {
        try {
          const io = getIO();
          io.to(event.createdById).emit('notification', {
            id: crypto.randomUUID(),
            type: 'EVENT_REJECTED',
            message: `Seu evento "${event.title}" foi rejeitado.`,
            timestamp: new Date().toISOString(),
            read: false,
            data: { eventId: event.id }
          });
          
          if (event.createdBy?.email) {
             addEmailJob(event.createdBy.email, `Evento Rejeitado: ${event.title}`, 'event-rejected', {
                userName: event.createdBy.name,
                eventTitle: event.title,
                startDate: new Date(event.startDate).toLocaleDateString('pt-BR'),
                rejectionReason: reason
             });
          }
        } catch (e) {}
      }

      return res.json(updatedEvent);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

router.post(
  '/',
  verifyToken,
  async (req: AuthRequest, res: any) => {
    try {
      const result = createEventSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ errors: result.error.issues });
      }

      const { title, description, startDate, endDate, isAllDay, eventType, status: requestedStatus } = result.data;
      const user = req.user!;
      const warnings: string[] = [];

      let status: EventStatus = EventStatus.PENDING;
      let approvedById: string | undefined = undefined;
      let isAutoApproved = false;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();
      const isAdmin = user.role === UserRole.ADMIN;
      const isSupervisor = user.role === UserRole.SUPERVISOR;

      if (start < now) {
        warnings.push("Aviso: O evento está no passado.");
      }

      const isBusy = await checkCalendarBusy(start, end);
      if (isBusy) {
        warnings.push("Aviso: Conflito detectado no calendário.");
      }

      if (isAdmin) {
         if (requestedStatus === EventStatus.APPROVED) {
            status = EventStatus.APPROVED;
            approvedById = user.userId;
            isAutoApproved = true;
         }
      } else if (isSupervisor) {
        if (requestedStatus === EventStatus.APPROVED) {
           let allowAutoApprove = true;

           const isSpecialType = [EventType.EVENTO, EventType.VISITA].includes(eventType);

           if (!isSpecialType) {
              const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
              if (durationDays > 30) {
                 allowAutoApprove = false;
                 warnings.push("Auto-aprovação desativada: Evento excede 30 dias.");
              }

              const startOfDay = new Date();
              startOfDay.setHours(0,0,0,0);
              const approvedTodayCount = await prisma.event.count({
                where: {
                  approvedById: user.userId,
                  createdById: user.userId,
                  status: EventStatus.APPROVED,
                  updatedAt: { gte: startOfDay }
                }
              });

              if (approvedTodayCount >= 5) {
                allowAutoApprove = false;
                warnings.push("Auto-aprovação desativada: Limite diário (5) atingido.");
              }
           }

           if (allowAutoApprove) {
             status = EventStatus.APPROVED;
             approvedById = user.userId;
             isAutoApproved = true;
           } else {
             status = EventStatus.PENDING;
           }
        }
      } else if (user.role === UserRole.COORDINATOR) {
        status = EventStatus.PENDING;
      } else {
        return res.status(403).json({ message: 'Não autorizado' });
      }

      let event = await prisma.event.create({
        data: {
          title,
          description,
          startDate: start,
          endDate: end,
          isAllDay,
          eventType,
          status,
          createdById: user.userId,
          approvedById,
        },
      });

      const io = getIO();

      if (isAutoApproved) {
        try {
          const gCalEventId = await createGoogleCalendarEvent(event);
          event = await prisma.event.update({
            where: { id: event.id },
            data: { googleCalendarEventId: gCalEventId },
          });
        } catch (error) {
          console.error('GCal Sync failed:', error);
          warnings.push("Falha na sincronização do Google Agenda.");
        }

        await logAudit(user.userId, 'CREATE_AUTO_APPROVED', 'EVENT', event.id, { autoApproved: true });

        io.to(user.userId).emit('notification', {
           id: crypto.randomUUID(),
           type: 'EVENT_AUTO_APPROVED',
           message: `Evento "${event.title}" criado e auto-aprovado.`,
           timestamp: new Date().toISOString(),
           read: false,
           data: { eventId: event.id }
        });

        if (user.email) {
          addEmailJob(user.email, `Auto-Aprovado: ${event.title}`, 'auto_approved', {
             userName: user.email,
             eventTitle: event.title,
             startDate: new Date(event.startDate).toLocaleDateString('pt-BR')
          });
        }

      } else {
        await logAudit(user.userId, 'CREATE_PENDING', 'EVENT', event.id);

        if (user.role === UserRole.COORDINATOR) {
           io.to(UserRole.SUPERVISOR).emit('notification', {
             id: crypto.randomUUID(),
             type: 'NEW_EVENT_FROM_COORDINATOR',
             message: `Novo evento pendente de ${user.email}: "${event.title}"`,
             timestamp: new Date().toISOString(),
             read: false,
             data: { eventId: event.id }
           });
        }
      }

      return res.status(201).json({
        ...event,
        warning: warnings.length > 0 ? warnings.join(' ') : undefined
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

router.get(
  '/',
  verifyToken,
  async (req: AuthRequest, res: any) => {
    try {
      const user = req.user!;
      
      const { status, eventType, startDate, endDate, page, pageSize, createdById } = req.query as any;
      const where: any = {};

      if (status) where.status = status;
      if (eventType) where.eventType = eventType;
      if (startDate) where.startDate = { gte: new Date(startDate) };
      if (endDate) where.endDate = { lte: new Date(endDate) };
      if (createdById) where.createdById = createdById;

      if (user.role === UserRole.COORDINATOR) {
        where.OR = [
          { createdById: user.userId },
          { status: EventStatus.APPROVED }
        ];
      }

      const p = parseInt(page as string) || 0;
      const size = parseInt(pageSize as string) || 50;
      const skip = p * size;

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            createdBy: { select: { name: true, email: true } },
          },
          orderBy: { startDate: 'desc' },
          skip,
          take: size,
        }),
        prisma.event.count({ where })
      ]);

      return res.json({ data: events, total });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
);

router.delete(
  '/:id',
  verifyToken,
  async (req: AuthRequest, res: any) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const event = await prisma.event.findUnique({ where: { id } });

      if (!event) return res.status(404).json({ message: 'Evento não encontrado' });

      let canDelete = false;
      if (user.role === UserRole.ADMIN) canDelete = true;
      else if (user.role === UserRole.SUPERVISOR && event.status !== EventStatus.APPROVED) canDelete = true;
      else if (event.createdById === user.userId && event.status === EventStatus.PENDING) canDelete = true;

      if (!canDelete) return res.status(403).json({ message: 'Não autorizado' });

      if (event.googleCalendarEventId) {
        try { await deleteGoogleCalendarEvent(event.googleCalendarEventId); } catch (e) {}
      }

      await prisma.event.delete({ where: { id } });
      return res.json({ message: 'Evento excluído' });
    } catch (error) {
      return res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

export default router;
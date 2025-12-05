import { z } from 'zod';
import { EventType, EventStatus } from '../types';

export const createEventSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  startDate: z.string().datetime({ message: "Data de início inválida" }),
  endDate: z.string().datetime({ message: "Data de término inválida" }),
  isAllDay: z.boolean().default(false),
  eventType: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const updateEventStatusSchema = z.object({
  status: z.enum([EventStatus.APPROVED, EventStatus.REJECTED] as const),
  rejectionReason: z.string().optional(),
});

export const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum([EventStatus.APPROVED, EventStatus.REJECTED] as const),
  rejectionReason: z.string().optional(),
});

export const queryEventSchema = z.object({
  status: z.nativeEnum(EventStatus).optional(),
  eventType: z.nativeEnum(EventType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const approveEventSchema = z.object({
  reason: z.string().optional(),
  notifyCreator: z.boolean().default(true),
});

export const rejectEventSchema = z.object({
  reason: z.string().min(1, "O motivo é obrigatório para rejeição"),
  notifyCreator: z.boolean().default(true),
});

export const bulkApproveEventSchema = z.object({
  eventIds: z.array(z.string()),
  reason: z.string().optional(),
});
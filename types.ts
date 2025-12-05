

export enum UserRole {
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
  COORDINATOR = 'COORDINATOR',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export enum EventStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum EventType {
  EVENTO = 'EVENTO',
  ACAO_PONTUAL = 'ACAO_PONTUAL',
  REUNIAO = 'REUNIAO',
  VISITA = 'VISITA',
  FERIAS = 'FERIAS',
  FOLGA = 'FOLGA',
  LICENCA = 'LICENCA',
  OUTROS = 'OUTROS',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  googleId?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  startDate: string; // ISO Date string for frontend
  endDate: string;   // ISO Date string for frontend
  isAllDay: boolean;
  eventType: EventType;
  status: EventStatus;
  googleCalendarEventId?: string | null;
  createdById: string;
  approvedById?: string | null;
  warning?: string; // Optional field for API responses when external sync fails
  createdBy?: {
    name: string;
    email: string;
  };
}

export interface EventColor {
  eventType: EventType;
  colorHex: string;
  googleCalendarColorId: string;
}

export interface Notification {
  id: string;
  type: 'EVENT_APPROVED' | 'EVENT_REJECTED' | 'NEW_USER_PENDING';
  message: string;
  timestamp: string;
  read: boolean;
  data?: any; // To store eventId or userId
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
}

// Legacy Project type for Dashboard (can be deprecated later)
export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'on_hold';
  budget: number;
  lastUpdated: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
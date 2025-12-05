import { EventType, EventStatus } from './types';

// Environment variables
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export const MOCK_DELAY_MS = 800;

export const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'admin@example.com';
export const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'password123';

// Paleta "Clean Pastel" para visualização moderna
export const EVENT_COLORS: Record<EventType, string> = {
  [EventType.EVENTO]: '#64748b',       // Slate (Neutro)
  [EventType.ACAO_PONTUAL]: '#f59e0b', // Amber (Dourado suave)
  [EventType.REUNIAO]: '#6366f1',      // Indigo (Profissional)
  [EventType.VISITA]: '#10b981',       // Emerald (Verde suave)
  [EventType.FERIAS]: '#f43f5e',       // Rose (Avermelhado suave)
  [EventType.FOLGA]: '#8b5cf6',        // Violet (Roxo suave)
  [EventType.LICENCA]: '#ec4899',      // Pink (Destaque moderado)
  [EventType.OUTROS]: '#94a3b8',       // Gray (Discreto)
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.EVENTO]: 'Evento',
  [EventType.ACAO_PONTUAL]: 'Ação Pontual',
  [EventType.REUNIAO]: 'Reunião',
  [EventType.VISITA]: 'Visita',
  [EventType.FERIAS]: 'Férias',
  [EventType.FOLGA]: 'Folga',
  [EventType.LICENCA]: 'Licença',
  [EventType.OUTROS]: 'Outros',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.PENDING]: 'Pendente',
  [EventStatus.APPROVED]: 'Aprovado',
  [EventStatus.REJECTED]: 'Rejeitado',
};
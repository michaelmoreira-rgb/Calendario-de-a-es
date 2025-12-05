import { User, UserRole, Project, AuthResponse } from '../types';
import { MOCK_DELAY_MS } from '../constants';

// Simulating a backend database
const mockUser: User = {
  id: '1',
  name: 'Alex Developer',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  avatar: 'https://picsum.photos/200',
};

const mockProjects: Project[] = [
  { id: '101', name: 'Website Redesign', status: 'active', budget: 15000, lastUpdated: '2023-10-25' },
  { id: '102', name: 'Mobile App Migration', status: 'on_hold', budget: 45000, lastUpdated: '2023-10-20' },
  { id: '103', name: 'Internal Dashboard', status: 'completed', budget: 8000, lastUpdated: '2023-09-15' },
  { id: '104', name: 'AI Integration', status: 'active', budget: 25000, lastUpdated: '2023-10-27' },
];

export const mockLogin = async (email: string): Promise<AuthResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        token: 'mock-jwt-token-xyz-123',
        user: { ...mockUser, email },
      });
    }, MOCK_DELAY_MS);
  });
};

export const mockFetchProjects = async (): Promise<Project[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockProjects);
    }, MOCK_DELAY_MS);
  });
};

export const mockFetchUserProfile = async (): Promise<User> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockUser);
    }, MOCK_DELAY_MS / 2);
  });
};

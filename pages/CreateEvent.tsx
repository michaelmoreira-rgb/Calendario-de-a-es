import React from 'react';
import { Layout } from '../components/Layout';
import { EventForm } from '../components/EventForm';
import { SupervisorEventForm } from '../components/SupervisorEventForm';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const CreateEvent = () => {
  const { user } = useAuth();
  const isSupervisor = user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Agendar Evento</h1>
        </div>
        
        {isSupervisor ? (
          <SupervisorEventForm />
        ) : (
          <EventForm />
        )}
      </div>
    </Layout>
  );
};
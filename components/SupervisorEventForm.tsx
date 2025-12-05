import React from 'react';
import { EventForm } from './EventForm';

interface SupervisorEventFormProps {
  initialData?: any;
  eventId?: string;
}

/**
 * SupervisorEventForm
 * 
 * This component extends the standard EventForm by injecting supervisor-specific
 * permissions and default behaviors (like Auto-Approval).
 */
export const SupervisorEventForm: React.FC<SupervisorEventFormProps> = (props) => {
  return (
    <div className="relative">
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          Modo Supervisor
        </span>
      </div>
      <EventForm 
        {...props} 
        isSupervisor={true} 
      />
    </div>
  );
};
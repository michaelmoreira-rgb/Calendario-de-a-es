import React from 'react';
import { X, Calendar, AlignLeft, ExternalLink, User } from 'lucide-react';
import { Button } from './Button';
import { Event } from '../types';
import { EVENT_COLORS, EVENT_TYPE_LABELS } from '../constants';
import { useEventPermissions } from '../hooks/useEventPermissions';

interface EventDetailsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatGoogleCalendarLink = (event: Event) => {
  const startDate = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endDate = new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description || '',
    // location: '', // Could add location if we had it
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, isOpen, onClose }) => {
  const permissions = useEventPermissions(event);
  
  if (!isOpen || !event) return null;

  const color = EVENT_COLORS[event.eventType];
  const googleLink = formatGoogleCalendarLink(event);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative p-6 pb-4 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-slate-900 pr-8">{event.title}</h2>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span 
              className="px-2 py-0.5 rounded text-xs font-semibold text-white" 
              style={{ backgroundColor: color }}
            >
              {EVENT_TYPE_LABELS[event.eventType]}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3 text-slate-600">
            <Calendar className="w-5 h-5 mt-0.5 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">
                {new Date(event.startDate).toLocaleDateString('pt-BR')}
                {new Date(event.startDate).toDateString() !== new Date(event.endDate).toDateString() && 
                  ` - ${new Date(event.endDate).toLocaleDateString('pt-BR')}`
                }
              </p>
              {!event.isAllDay && (
                <p className="text-sm">
                  {new Date(event.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(event.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {event.isAllDay && <p className="text-sm">Dia Inteiro</p>}
            </div>
          </div>

          {event.description && (
            <div className="flex items-start space-x-3 text-slate-600">
              <AlignLeft className="w-5 h-5 mt-0.5 text-slate-400" />
              <p className="text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          <div className="flex items-center space-x-3 text-slate-600 text-sm">
             <User className="w-5 h-5 text-slate-400" />
             <span>Criado por {event.createdBy?.name || 'Desconhecido'}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-400">ID: {event.id.slice(0, 8)}</span>
            <div className="flex space-x-2">
                <Button 
                    variant="outline" 
                    className="text-sm h-9"
                    onClick={() => window.open(googleLink, '_blank')}
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Google Agenda
                </Button>
                <Button 
                    variant="secondary"
                    className="text-sm h-9"
                    onClick={onClose}
                >
                    Fechar
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
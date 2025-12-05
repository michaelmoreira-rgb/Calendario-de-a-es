import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { EventStatus, EventType } from '../types';
import { EVENT_COLORS, EVENT_TYPE_LABELS, API_BASE_URL } from '../constants';
import { EventDetailsModal } from '../components/EventDetailsModal';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// API Fetcher
const fetchCalendarEvents = async (start: string, end: string, eventType: string) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({
    startDate: start,
    endDate: end,
    status: EventStatus.APPROVED, // Only show approved events
    pageSize: '1000', // Fetch enough events
  });

  if (eventType && eventType !== 'ALL') {
    params.append('eventType', eventType);
  }

  const res = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) throw new Error('Falha ao buscar eventos do calendário');
  const json = await res.json();
  return json.data || [];
};

export const Calendar = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', dateRange, filterType],
    queryFn: () => fetchCalendarEvents(dateRange.start, dateRange.end, filterType),
    enabled: !!dateRange.start && !!dateRange.end,
  });

  // Transform backend events to FullCalendar events
  const calendarEvents = events?.map((event: any) => ({
    id: event.id,
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    allDay: event.isAllDay,
    backgroundColor: EVENT_COLORS[event.eventType as EventType],
    borderColor: EVENT_COLORS[event.eventType as EventType],
    extendedProps: { ...event } // Pass full event object for modal
  })) || [];

  const handleDatesSet = (dateInfo: any) => {
    setDateRange({
      start: dateInfo.startStr,
      end: dateInfo.endStr,
    });
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setIsModalOpen(true);
  };

  return (
    <Layout>
       <div className="flex flex-col h-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Calendário</h1>
            <p className="text-slate-500 mt-1">Visualize eventos agendados e aprovados</p>
          </div>
          
          <div className="w-full sm:w-auto">
             <select
                className="w-full sm:w-64 p-2 text-sm border-slate-300 rounded-lg bg-white border shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="ALL">Todos os Tipos de Evento</option>
                {Object.values(EventType).map(t => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           {/* FullCalendar Style Overrides */}
           <style>{`
             .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 600; color: #1e293b; }
             .fc .fc-button-primary { background-color: #4f46e5; border-color: #4f46e5; }
             .fc .fc-button-primary:hover { background-color: #4338ca; border-color: #4338ca; }
             .fc .fc-button-primary:not(:disabled).fc-button-active { background-color: #3730a3; border-color: #3730a3; }
             .fc .fc-event { border: none; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
             .fc .fc-daygrid-day.fc-day-today { background-color: #f8fafc; }
             /* Mobile adjustments */
             @media (max-width: 640px) {
               .fc .fc-toolbar { flex-direction: column; gap: 0.5rem; }
               .fc .fc-toolbar-title { font-size: 1rem; }
             }
           `}</style>
           
           <FullCalendar
             plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
             initialView="dayGridMonth"
             locale={ptBrLocale}
             headerToolbar={{
               left: 'prev,next today',
               center: 'title',
               right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
             }}
             events={calendarEvents}
             datesSet={handleDatesSet}
             eventClick={handleEventClick}
             height="auto"
             contentHeight={700}
             aspectRatio={1.8}
             nowIndicator={true}
             dayMaxEvents={true}
             loading={(isLoading) => {
               // Optional: handle loading state visually via external spinner if desired
             }}
           />
        </div>
       </div>

       <EventDetailsModal 
         event={selectedEvent} 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
       />
    </Layout>
  );
};
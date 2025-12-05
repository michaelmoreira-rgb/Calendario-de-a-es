import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { EventStatus, EventType, Event } from '../types';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, Filter, BarChart2, Users, User as UserIcon, Edit2, Trash2, AlertCircle } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EVENT_COLORS, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, API_BASE_URL } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// --- API Functions ---
const fetchSupervisorStats = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/stats/supervisor`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar estatísticas');
  return res.json();
};

const fetchCoordinatorStats = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/stats/coordinators`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar estatísticas dos coordenadores');
  return res.json();
};

const fetchEvents = async (filters: any) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar eventos');
  return res.json();
};

const approveEvent = async (id: string) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notifyCreator: true }),
  });
  if (!res.ok) {
     const error = await res.json();
     throw new Error(error.message || 'Falha ao aprovar evento');
  }
  return res.json();
};

const rejectEvent = async ({ id, reason }: { id: string; reason: string }) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason, notifyCreator: true }),
  });
  if (!res.ok) throw new Error('Falha ao rejeitar evento');
  return res.json();
};

const deleteEvent = async (id: string) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao excluir evento');
  return res.json();
};

const theme = createTheme({
  palette: { primary: { main: '#4f46e5' } },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        },
        columnHeaders: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
        row: { borderBottom: '1px solid #f1f5f9' },
      },
    },
  },
});

type DashboardTab = 'pending' | 'calendar' | 'my_events' | 'all_events' | 'stats';

export const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('pending');
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectMode, setIsRejectMode] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['supervisor-stats'], queryFn: fetchSupervisorStats });
  const { data: coordinators } = useQuery({ queryKey: ['coordinator-stats'], queryFn: fetchCoordinatorStats });

  const { data: pendingEvents, isLoading: pendingLoading } = useQuery({
    queryKey: ['events-pending', selectedCoordinatorId],
    queryFn: () => fetchEvents({ 
      status: EventStatus.PENDING, 
      pageSize: 100,
      ...(selectedCoordinatorId ? { createdById: selectedCoordinatorId } : {})
    })
  });

  const { data: myEvents, isLoading: myEventsLoading } = useQuery({
    queryKey: ['my-events-supervisor'],
    queryFn: () => fetchEvents({ createdById: user?.id, pageSize: 100 })
  });

  const { data: allEvents, isLoading: allLoading } = useQuery({
    queryKey: ['events-all', paginationModel],
    queryFn: () => fetchEvents({ ...paginationModel })
  });

  const approveMutation = useMutation({
    mutationFn: approveEvent,
    onSuccess: (data) => {
      invalidateAll();
      closeActionModal();
      if(data.warning) alert(data.warning);
    },
    onError: (error) => alert(error.message)
  });

  const rejectMutation = useMutation({
    mutationFn: rejectEvent,
    onSuccess: () => {
      invalidateAll();
      closeActionModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      invalidateAll();
      closeActionModal();
    }
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['events-pending'] });
    queryClient.invalidateQueries({ queryKey: ['events-all'] });
    queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
    queryClient.invalidateQueries({ queryKey: ['coordinator-stats'] });
    queryClient.invalidateQueries({ queryKey: ['my-events-supervisor'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const openActionModal = (event: any) => {
    setSelectedEvent(event);
    setRejectReason('');
    setIsRejectMode(false);
    setIsActionModalOpen(true);
  };

  const closeActionModal = () => {
    setIsActionModalOpen(false);
    setSelectedEvent(null);
  };

  const pendingColumns: GridColDef[] = [
    { field: 'title', headerName: 'Título', flex: 1, minWidth: 200 },
    { 
      field: 'eventType', 
      headerName: 'Tipo', 
      width: 140,
      renderCell: (params) => (
         <span className="text-slate-700">{EVENT_TYPE_LABELS[params.value as EventType]}</span>
      )
    },
    { 
      field: 'createdByName', 
      headerName: 'Solicitante', 
      width: 180,
      valueGetter: (value: any, row: any) => row?.createdBy?.name || 'Desconhecido' 
    },
    { 
      field: 'startDate', 
      headerName: 'Início', 
      width: 180,
      valueFormatter: (value: any) => new Date(value).toLocaleString('pt-BR')
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Button 
          variant="ghost" 
          className="text-indigo-600 hover:text-indigo-800 py-1 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            openActionModal(params.row);
          }}
        >
          Analisar
        </Button>
      )
    }
  ];

  const fullGridColumns: GridColDef[] = [
    { field: 'title', headerName: 'Título', flex: 1, minWidth: 200 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => {
        const color = params.value === EventStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                      params.value === EventStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{EVENT_STATUS_LABELS[params.value as EventStatus]}</span>;
      }
    },
    { 
      field: 'eventType', 
      headerName: 'Tipo', 
      width: 130, 
      valueGetter: (value: any) => EVENT_TYPE_LABELS[value as EventType]
    },
    { 
        field: 'createdByName', 
        headerName: 'Criador', 
        width: 150,
        valueGetter: (value: any, row: any) => row?.createdBy?.name || 'Desconhecido' 
    },
    { 
        field: 'startDate', 
        headerName: 'Data', 
        width: 150,
        valueFormatter: (value: any) => new Date(value).toLocaleDateString('pt-BR')
    },
  ];

  return (
    <ThemeProvider theme={theme}>
      <Layout>
        <div className="flex flex-col h-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center pb-4 border-b border-slate-200">
             <div>
               <h1 className="text-2xl font-bold text-slate-900">Painel do Supervisor</h1>
               <p className="text-slate-500 text-sm mt-1">Gerencie aprovações e supervisione a equipe</p>
             </div>
             
             <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mt-4 md:mt-0 overflow-x-auto max-w-full">
               {[
                 { id: 'pending', label: 'Pendentes', icon: Clock, count: stats?.pendingToday },
                 { id: 'calendar', label: 'Calendário', icon: CalendarIcon },
                 { id: 'my_events', label: 'Meus Eventos', icon: UserIcon },
                 { id: 'all_events', label: 'Todos Eventos', icon: Users },
                 { id: 'stats', label: 'Stats', icon: BarChart2 }
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as DashboardTab)}
                   className={`
                     flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
                     ${activeTab === tab.id 
                       ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                       : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}
                   `}
                 >
                   <tab.icon size={16} className="mr-2" />
                   {tab.label}
                   {tab.count !== undefined && tab.count > 0 && (
                     <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">
                       {tab.count}
                     </span>
                   )}
                 </button>
               ))}
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            <div className="flex-1 min-w-0">
               {activeTab === 'pending' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    <DataGrid
                      rows={pendingEvents?.data || []}
                      columns={pendingColumns}
                      loading={pendingLoading}
                      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                      pageSizeOptions={[10, 25, 50]}
                      disableRowSelectionOnClick
                      autoHeight
                      localeText={{ noRowsLabel: 'Nenhuma pendência encontrada' }}
                      getRowClassName={(params) => 
                        params.row.createdById === user?.id ? 'bg-blue-50/50' : ''
                      }
                      onRowClick={(params) => openActionModal(params.row)}
                    />
                 </div>
               )}

               {activeTab === 'calendar' && (
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <FullCalendar
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      locale="pt-br"
                      events={allEvents?.data?.map((e: any) => ({
                        title: e.title,
                        start: e.startDate,
                        end: e.endDate,
                        backgroundColor: EVENT_COLORS[e.eventType as EventType]
                      })) || []}
                      height="auto"
                    />
                 </div>
               )}

               {activeTab === 'my_events' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    <DataGrid
                      rows={myEvents?.data || []}
                      columns={fullGridColumns}
                      loading={myEventsLoading}
                      autoHeight
                      localeText={{ noRowsLabel: 'Nenhum evento encontrado' }}
                    />
                  </div>
               )}

               {activeTab === 'all_events' && (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
                   <DataGrid
                      rows={allEvents?.data || []}
                      columns={fullGridColumns}
                      loading={allLoading}
                      rowCount={allEvents?.total || 0}
                      paginationModel={paginationModel}
                      onPaginationModelChange={setPaginationModel}
                      paginationMode="server"
                      autoHeight
                      localeText={{ noRowsLabel: 'Nenhum evento encontrado' }}
                    />
                 </div>
               )}

               {activeTab === 'stats' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h3 className="text-lg font-bold mb-4">Eventos por Tipo</h3>
                       <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={stats?.byType || []}>
                             <XAxis dataKey="name" fontSize={12} />
                             <YAxis fontSize={12} />
                             <RechartsTooltip />
                             <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} />
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </div>
                  </div>
               )}
            </div>

            {(activeTab === 'pending' || activeTab === 'all_events') && (
              <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center justify-between">
                       Coordenadores
                       <Button 
                         variant="ghost" 
                         className="text-xs h-6 px-2"
                         onClick={() => setSelectedCoordinatorId(null)}
                         disabled={!selectedCoordinatorId}
                       >
                         Limpar
                       </Button>
                    </h3>
                    
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                       {coordinators?.map((c: any) => (
                         <button
                           key={c.id}
                           onClick={() => setSelectedCoordinatorId(c.id === selectedCoordinatorId ? null : c.id)}
                           className={`
                             w-full flex items-center p-2 rounded-lg text-sm transition-colors
                             ${selectedCoordinatorId === c.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}
                           `}
                         >
                           <img src={c.avatar || "https://ui-avatars.com/api/?name=" + c.name} className="w-8 h-8 rounded-full mr-3" alt="" />
                           <div className="flex-1 text-left">
                             <p className={`font-medium ${selectedCoordinatorId === c.id ? 'text-indigo-900' : 'text-slate-700'}`}>{c.name}</p>
                           </div>
                           {c.pendingCount > 0 && (
                             <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                               {c.pendingCount}
                             </span>
                           )}
                         </button>
                       ))}
                    </div>
                 </div>

                 {activeTab === 'pending' && (
                   <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">Dica Rápida</h4>
                      <p className="text-blue-800 text-xs">
                        Seus próprios eventos estão destacados em <span className="font-bold">azul claro</span> na lista de pendências. Você pode aprovar seus próprios eventos (dentro dos limites).
                      </p>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>

        {isActionModalOpen && selectedEvent && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
               
               <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedEvent.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                       Solicitado por {selectedEvent.createdBy?.name} em {new Date(selectedEvent.startDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold text-white`} style={{ backgroundColor: EVENT_COLORS[selectedEvent.eventType] }}>
                    {EVENT_TYPE_LABELS[selectedEvent.eventType]}
                  </span>
               </div>

               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-slate-500 text-xs uppercase font-bold">Início</p>
                        <p className="font-medium text-slate-900 mt-1">
                          {new Date(selectedEvent.startDate).toLocaleString('pt-BR')}
                        </p>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-slate-500 text-xs uppercase font-bold">Término</p>
                        <p className="font-medium text-slate-900 mt-1">
                          {new Date(selectedEvent.endDate).toLocaleString('pt-BR')}
                        </p>
                     </div>
                  </div>
                  
                  {selectedEvent.description && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                       {selectedEvent.description}
                    </div>
                  )}

                  {isRejectMode && (
                    <div className="mt-4 animate-in slide-in-from-top-2">
                       <label className="block text-sm font-medium text-red-700 mb-1">Motivo da Rejeição / Alterações</label>
                       <textarea 
                         className="w-full p-2 border border-red-200 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none"
                         rows={3}
                         value={rejectReason}
                         onChange={(e) => setRejectReason(e.target.value)}
                         placeholder="Por favor explique o motivo..."
                       />
                    </div>
                  )}
               </div>

               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <Button variant="ghost" onClick={closeActionModal}>Cancelar</Button>
                  
                  <div className="flex space-x-2">
                     {selectedEvent.createdById === user?.id ? (
                        <>
                           <Button 
                             variant="outline" 
                             className="text-red-600 border-red-200 hover:bg-red-50"
                             onClick={() => {
                               if (window.confirm('Excluir este evento?')) deleteMutation.mutate(selectedEvent.id);
                             }}
                           >
                              <Trash2 size={16} className="mr-1"/> Excluir
                           </Button>
                           <Button 
                              variant="outline"
                              onClick={() => navigate(`/events/${selectedEvent.id}/edit`)}
                           >
                              <Edit2 size={16} className="mr-1"/> Editar
                           </Button>
                           <Button 
                             className="bg-green-600 hover:bg-green-700"
                             onClick={() => approveMutation.mutate(selectedEvent.id)}
                             isLoading={approveMutation.isPending}
                           >
                              <CheckCircle size={16} className="mr-1"/> Auto-Aprovar
                           </Button>
                        </>
                     ) : (
                        <>
                           {!isRejectMode ? (
                              <>
                                <Button 
                                  variant="outline"
                                  onClick={() => navigate(`/events/${selectedEvent.id}/edit`)}
                                >
                                    <Edit2 size={16} className="mr-1"/> Editar
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => setIsRejectMode(true)}
                                >
                                  <XCircle size={16} className="mr-1"/> Rejeitar
                                </Button>
                                <Button 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => approveMutation.mutate(selectedEvent.id)}
                                  isLoading={approveMutation.isPending}
                                >
                                    <CheckCircle size={16} className="mr-1"/> Aprovar
                                </Button>
                              </>
                           ) : (
                              <Button 
                                className="bg-red-600 hover:bg-red-700"
                                disabled={!rejectReason}
                                onClick={() => rejectMutation.mutate({ id: selectedEvent.id, reason: rejectReason })}
                                isLoading={rejectMutation.isPending}
                              >
                                Confirmar Rejeição
                              </Button>
                           )}
                        </>
                     )}
                  </div>
               </div>

             </div>
           </div>
        )}
      </Layout>
    </ThemeProvider>
  );
};
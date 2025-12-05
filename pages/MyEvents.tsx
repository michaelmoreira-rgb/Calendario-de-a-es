import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { EventStatus, EventType, Event } from '../types';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useEventPermissions } from '../hooks/useEventPermissions';
import { useAuth } from '../context/AuthContext';
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, API_BASE_URL } from '../constants';

const theme = createTheme({
  palette: {
    primary: { main: '#4f46e5' },
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        },
        columnHeaders: {
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        },
        row: {
          borderBottom: '1px solid #f1f5f9',
        },
      },
    },
  },
});

interface FetchEventsParams {
  page: number;
  pageSize: number;
  status?: string;
  eventType?: string;
}

const fetchMyEvents = async ({ page, pageSize, status, eventType }: FetchEventsParams) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (status && status !== 'ALL') params.append('status', status);
  if (eventType && eventType !== 'ALL') params.append('eventType', eventType);

  const res = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar eventos');
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

const ActionButtons = ({ event, onDelete }: { event: Event, onDelete: (id: string) => void }) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useEventPermissions(event);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => navigate(`/events/${event.id}/edit`)}
        disabled={!canEdit}
        className={`p-1 rounded hover:bg-slate-100 ${!canEdit ? 'opacity-30 cursor-not-allowed' : 'text-indigo-600'}`}
        title="Editar"
      >
        <Edit2 size={18} />
      </button>
      <button
        onClick={() => onDelete(event.id)}
        disabled={!canDelete}
        className={`p-1 rounded hover:bg-slate-100 ${!canDelete ? 'opacity-30 cursor-not-allowed' : 'text-red-600'}`}
        title="Excluir"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export const MyEvents = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    status: 'ALL',
    eventType: 'ALL',
  });

  const { data, isLoading } = useQuery({ 
    queryKey: ['my-events', paginationModel, filters], 
    queryFn: () => fetchMyEvents({ ...paginationModel, ...filters }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
    },
    onError: (error) => alert('Erro ao excluir evento: ' + error.message),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Título', flex: 1, minWidth: 200 },
    { 
      field: 'eventType', 
      headerName: 'Tipo', 
      width: 150,
      renderCell: (params) => (
         <span className="text-slate-700">{EVENT_TYPE_LABELS[params.value as EventType]}</span>
      )
    },
    { 
      field: 'dates', 
      headerName: 'Data', 
      width: 200,
      valueGetter: (value: any, row: any) => {
        const start = new Date(row.startDate).toLocaleDateString('pt-BR');
        const end = new Date(row.endDate).toLocaleDateString('pt-BR');
        return start === end ? start : `${start} - ${end}`;
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const status = params.value as EventStatus;
        let colorClass = 'bg-slate-100 text-slate-700';
        if (status === EventStatus.APPROVED) colorClass = 'bg-green-100 text-green-700';
        else if (status === EventStatus.REJECTED) colorClass = 'bg-red-100 text-red-700';
        else if (status === EventStatus.PENDING) colorClass = 'bg-yellow-100 text-yellow-700';
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {EVENT_STATUS_LABELS[status]}
          </span>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 150,
      renderCell: (params) => (
        <ActionButtons event={params.row} onDelete={handleDelete} />
      )
    }
  ];

  return (
    <ThemeProvider theme={theme}>
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Meus Eventos</h1>
              <p className="text-slate-500 mt-1">Gerencie suas atividades agendadas</p>
            </div>
            <Button onClick={() => navigate('/events/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                className="w-full p-2 text-sm border-slate-300 rounded-lg bg-slate-50 border focus:ring-2 focus:ring-indigo-500"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="ALL">Todos os Status</option>
                {Object.values(EventStatus).map(s => <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select
                className="w-full p-2 text-sm border-slate-300 rounded-lg bg-slate-50 border focus:ring-2 focus:ring-indigo-500"
                value={filters.eventType}
                onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
              >
                <option value="ALL">Todos os Tipos</option>
                {Object.values(EventType).map(t => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 600 }}>
            <DataGrid
              rows={data?.data || []}
              rowCount={data?.total || 0}
              columns={columns}
              loading={isLoading}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              paginationMode="server"
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: 'Nenhum evento encontrado',
                footerRowSelected: (count) => `${count.toLocaleString()} linha(s) selecionada(s)`,
              }}
            />
          </div>
        </div>
      </Layout>
    </ThemeProvider>
  );
};
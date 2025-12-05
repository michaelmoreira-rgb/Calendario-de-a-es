import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { UserRole, EventStatus, User } from '../types';
import { Users, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { EVENT_TYPE_LABELS, API_BASE_URL } from '../constants';

const theme = createTheme({
  palette: {
    primary: { main: '#4f46e5' }, // Indigo 600
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

const fetchStats = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar estatísticas');
  return res.json();
};

const fetchUsers = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar usuários');
  return res.json();
};

const fetchPendingEvents = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events?status=PENDING&pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar eventos pendentes');
  const json = await res.json();
  return json.data || json; 
};

const updateUserRole = async ({ id, role }: { id: string; role: UserRole }) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Falha ao atualizar função');
  }
  return res.json();
};

const updateEventStatus = async ({ id, status }: { id: string; status: EventStatus }) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/events/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar status do evento');
  return res.json();
};

export const Admin = () => {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: fetchStats });
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers });
  const { data: pendingEvents, isLoading: eventsLoading } = useQuery({ queryKey: ['pending-events'], queryFn: fetchPendingEvents });

  const roleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: Error) => alert(error.message),
  });

  const eventMutation = useMutation({
    mutationFn: updateEventStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const userColumns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { 
      field: 'role', 
      headerName: 'Cargo', 
      flex: 1, 
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <select
          value={params.value as string}
          onChange={(e) => roleMutation.mutate({ id: params.row.id, role: e.target.value as UserRole })}
          className="w-full p-2 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white border"
          disabled={params.row.role === UserRole.ADMIN && params.value === UserRole.ADMIN} 
        >
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Entrou em', 
      width: 150,
      valueFormatter: (value: any) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
  ];

  const eventColumns: GridColDef[] = [
    { field: 'title', headerName: 'Título', flex: 1 },
    { 
      field: 'eventType', 
      headerName: 'Tipo', 
      width: 130,
      valueFormatter: (value: any) => EVENT_TYPE_LABELS[value.value as keyof typeof EVENT_TYPE_LABELS] || value.value
    },
    { 
      field: 'createdByName', 
      headerName: 'Solicitado Por', 
      width: 150,
      valueGetter: (value: any, row: any) => row?.createdBy?.name || 'Desconhecido' 
    },
    { 
      field: 'dates', 
      headerName: 'Datas', 
      width: 200,
      valueGetter: (value: any, row: any) => {
        const start = new Date(row.startDate).toLocaleDateString('pt-BR');
        const end = new Date(row.endDate).toLocaleDateString('pt-BR');
        return start === end ? start : `${start} - ${end}`;
      }
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 220,
      renderCell: (params: GridRenderCellParams) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="bg-green-600 hover:bg-green-700 py-1 px-3 h-8 text-xs"
            onClick={() => eventMutation.mutate({ id: params.row.id, status: EventStatus.APPROVED })}
            isLoading={eventMutation.isPending}
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Aprovar
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 py-1 px-3 h-8 text-xs"
            onClick={() => eventMutation.mutate({ id: params.row.id, status: EventStatus.REJECTED })}
            isLoading={eventMutation.isPending}
          >
            <XCircle className="w-3 h-3 mr-1" /> Rejeitar
          </Button>
        </div>
      )
    }
  ];

  return (
    <ThemeProvider theme={theme}>
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Console Administrativo</h1>
            <p className="text-slate-500 mt-1">Gerencie usuários, aprovações e configurações do sistema</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total de Usuários</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {stats ? Object.values(stats.usersByRole as Record<string, number>).reduce((a, b) => a + b, 0) : '-'}
                  </h3>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Users size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Eventos Pendentes</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {stats?.eventsByStatus?.PENDING || 0}
                  </h3>
                </div>
                <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                  <AlertCircle size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Usuários Pendentes</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {stats?.usersByRole?.PENDING_ASSIGNMENT || 0}
                  </h3>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Eventos Aprovados</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {stats?.eventsByStatus?.APPROVED || 0}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <Calendar size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Gerenciamento de Usuários</h3>
            </div>
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={users || []}
                columns={userColumns}
                loading={usersLoading}
                initialState={{
                  pagination: { paginationModel: { pageSize: 5 } },
                }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                localeText={{
                    noRowsLabel: 'Nenhum usuário encontrado',
                    footerRowSelected: (count) => `${count.toLocaleString()} linha(s) selecionada(s)`,
                }}
              />
            </div>
          </div>

          {/* Pending Events */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Aprovações Pendentes</h3>
            </div>
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={pendingEvents || []}
                columns={eventColumns}
                loading={eventsLoading}
                initialState={{
                  pagination: { paginationModel: { pageSize: 5 } },
                }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                localeText={{
                    noRowsLabel: 'Nenhum evento pendente',
                    footerRowSelected: (count) => `${count.toLocaleString()} linha(s) selecionada(s)`,
                }}
              />
            </div>
          </div>

        </div>
      </Layout>
    </ThemeProvider>
  );
};
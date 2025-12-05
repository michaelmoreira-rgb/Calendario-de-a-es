import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShieldCheck, UserCheck, Zap, Activity } from 'lucide-react';
import { API_BASE_URL } from '../constants';

const fetchAuditStats = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/admin/audit-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar estatísticas de auditoria');
  return res.json();
};

const COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#ef4444'];

export const AuditDashboard = () => {
  const { data, isLoading } = useQuery({ 
    queryKey: ['audit-stats'], 
    queryFn: fetchAuditStats 
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  const { summary, chartData } = data || { summary: {}, chartData: [] };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Estatísticas de Auditoria e Aprovação</h1>
          <p className="text-slate-500 mt-1">Detalhamento das ações de supervisão e aprovações de eventos.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Auto Aprovações</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.autoApprovals}</h3>
              <p className="text-xs text-slate-400 mt-1">Criação Direta pelo Supervisor</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Zap size={24} /></div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Auto Aprovações (Pendentes)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.selfApprovals}</h3>
              <p className="text-xs text-slate-400 mt-1">Próprios Eventos</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><UserCheck size={24} /></div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Aprovações de Pares</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.otherApprovals}</h3>
              <p className="text-xs text-slate-400 mt-1">Aprovando Outros</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600"><ShieldCheck size={24} /></div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total de Intervenções</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.totalInterventions}</h3>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-slate-600"><Activity size={24} /></div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Detalhamento de Ações</h3>
             <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <XAxis dataKey="name" fontSize={10} tickFormatter={(val) => val.length > 15 ? val.slice(0,15)+'...' : val} />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="value" fill="#4f46e5" radius={[4,4,0,0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Distribuição</h3>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
             </div>
           </div>
        </div>
      </div>
    </Layout>
  );
};
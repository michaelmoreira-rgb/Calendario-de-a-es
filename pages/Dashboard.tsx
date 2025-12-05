import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mockFetchProjects } from '../services/mockBackend';
import { analyzeProjects } from '../services/geminiService';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Sparkles, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard = () => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: mockFetchProjects,
  });

  const handleAiAnalyze = async () => {
    if (!projects) return;
    setIsAnalyzing(true);
    const result = await analyzeProjects(projects);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="text-red-500">Erro ao carregar dados.</div>
      </Layout>
    );
  }

  const activeProjects = projects?.filter(p => p.status === 'active') || [];
  const totalBudget = projects?.reduce((sum, p) => sum + p.budget, 0) || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Painel de Controle</h1>
            <p className="text-slate-500 mt-1">Visão geral dos seus projetos e métricas</p>
          </div>
          <Button 
            onClick={handleAiAnalyze} 
            disabled={isAnalyzing} 
            className="bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
            {isAnalyzing ? 'Analisando...' : 'Análise IA'}
          </Button>
        </header>

        {aiAnalysis && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-fade-in">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Resumo Executivo</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{aiAnalysis}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Orçamento Total</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ {totalBudget.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                <ArrowUpRight size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-emerald-600">
              <span className="font-medium">+12.5%</span>
              <span className="text-slate-500 ml-2">vs. mês anterior</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Projetos Ativos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeProjects.length}</h3>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                <Activity size={20} />
              </div>
            </div>
             <div className="mt-4 flex items-center text-sm text-slate-500">
              <span className="font-medium">{projects?.length}</span>
              <span className="ml-1">projetos totais</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Ações Pendentes</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">3</h3>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                <ArrowDownRight size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-amber-600">
              <span className="font-medium">Atenção</span>
              <span className="text-slate-500 ml-2">requer revisão</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Visão Geral do Orçamento</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projects}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} interval={0} tickFormatter={(val) => val.split(' ')[0]} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => `R$${val/1000}k`} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'}}
                    />
                    <Bar dataKey="budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Projetos Recentes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg font-semibold">Projeto</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 rounded-r-lg font-semibold text-right">Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {projects?.map((project) => (
                    <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{project.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className={`h-2 w-2 rounded-full mr-2
                            ${project.status === 'active' ? 'bg-emerald-500' : ''}
                            ${project.status === 'completed' ? 'bg-blue-500' : ''}
                            ${project.status === 'on_hold' ? 'bg-amber-500' : ''}
                          `}></span>
                          <span className="text-slate-600 capitalize">{project.status.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-right">{project.lastUpdated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
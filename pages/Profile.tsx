import React from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Perfil do Usuário</h1>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-6">
          <img 
            src={user?.avatar || "https://picsum.photos/200"} 
            alt="Perfil" 
            className="w-24 h-24 rounded-full ring-4 ring-slate-50"
          />
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Nome Completo</label>
              <p className="text-xl font-medium text-slate-900">{user?.name}</p>
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Endereço de Email</label>
              <p className="text-lg text-slate-700">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Cargo / Função</label>
              <span className="inline-block mt-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
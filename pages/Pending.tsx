import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export const Pending = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 text-center p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 p-4 rounded-full">
            <Clock className="w-12 h-12 text-yellow-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Conta Pendente</h1>
        <p className="text-slate-600 mb-6">
          Olá <strong>{user?.name}</strong>. Sua conta foi criada com sucesso, mas requer aprovação do administrador antes de acessar o sistema.
        </p>
        
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-8 text-sm text-slate-500">
          Por favor, entre em contato com o administrador do sistema para atribuir uma função à sua conta.
        </div>

        <Button variant="outline" onClick={logout} className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};
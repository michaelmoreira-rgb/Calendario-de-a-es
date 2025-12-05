import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, User as UserIcon, Shield, CalendarDays, Calendar as CalendarIcon, UserCheck, FileText, CalendarRange } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const Sidebar = () => {
  const { logout, user } = useAuth();

  // Define o item principal do Painel com base na função
  let dashboardItem = { icon: LayoutDashboard, label: 'Painel', to: '/' };

  if (user?.role === UserRole.ADMIN) {
    dashboardItem = { icon: Shield, label: 'Painel Admin', to: '/admin' };
  } else if (user?.role === UserRole.SUPERVISOR) {
    dashboardItem = { icon: UserCheck, label: 'Painel Supervisor', to: '/supervisor' };
  } else {
    // Coordenador ou outros
    dashboardItem = { icon: LayoutDashboard, label: 'Painel Coordenador', to: '/' };
  }

  const navItems = [
    dashboardItem,
    { icon: CalendarIcon, label: 'Calendário', to: '/calendar' },
    { icon: CalendarDays, label: 'Meus Eventos', to: '/my-events' },
    { icon: UserIcon, label: 'Perfil', to: '/profile' },
  ];

  // Adiciona links extras específicos para Admin
  if (user?.role === UserRole.ADMIN) {
    // Admin pode querer ver a visão de supervisor explicitamente, mas não como painel principal
    navItems.splice(1, 0, { icon: UserCheck, label: 'Visão Supervisor', to: '/supervisor' });
    navItems.push({ icon: FileText, label: 'Auditoria', to: '/audit' });
  }

  return (
    <div className="h-screen w-64 bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0 shadow-xl z-20 font-sans">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-slate-800 rounded-lg text-white">
          <CalendarRange size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white tracking-wide">
            Calendário
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">de Ações</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm
              ${isActive 
                ? 'bg-slate-800 text-white font-medium border-l-4 border-indigo-500' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-4 border-transparent'}
            `}
            end={item.to === '/'} // Garante que a rota raiz não fique ativa para sub-rotas
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <img 
            src={user?.avatar || "https://picsum.photos/200"} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full ring-2 ring-slate-700 grayscale hover:grayscale-0 transition-all"
          />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors text-xs uppercase tracking-wider font-semibold"
        >
          <LogOut size={14} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
};
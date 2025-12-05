import React from 'react';
import { Sidebar } from './Sidebar';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-end">
           <div className="flex items-center space-x-4">
              <NotificationDropdown />
              <div className="h-8 w-px bg-slate-200 mx-2"></div>
              <div className="flex items-center space-x-3">
                 <span className="text-sm font-medium text-slate-700">{user?.name}</span>
                 <img 
                   src={user?.avatar || "https://picsum.photos/200"} 
                   alt="Profile" 
                   className="w-8 h-8 rounded-full ring-2 ring-slate-100"
                 />
              </div>
           </div>
        </header>

        {/* Main Content */}
        <main className="p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
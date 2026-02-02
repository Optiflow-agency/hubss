
import React, { useState } from 'react';
import { 
  Home, 
  User, 
  MessageSquare, 
  CalendarDays, 
  Clock, 
  Settings,
  Globe,
  X 
} from 'lucide-react';
import { User as UserType } from '../types';
import Logo from './Logo';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentUser: UserType;
  workspaceName?: string;
  workspaceLogo?: string;
  isOpen?: boolean; // New prop for mobile state
  onClose?: () => void; // New prop to close sidebar
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, currentUser, workspaceName, workspaceLogo, isOpen = false, onClose }) => {
  const [imgError, setImgError] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'team', icon: User, label: 'Team' },
    { id: 'chat', icon: MessageSquare, label: 'Messaggi' },
    { id: 'projects', icon: CalendarDays, label: 'Progetti' },
    { id: 'documents', icon: Clock, label: 'Cronologia' },
    { id: 'portal', icon: Globe, label: 'Clienti' }, 
    { id: 'settings', icon: Settings, label: 'Impostazioni' },
  ];

  const getInitials = (name: string) => {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
    <aside className={`
        fixed top-0 left-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 
        flex flex-col items-center py-4 z-[70] transition-transform duration-300 shadow-xl md:shadow-sm
        w-64 md:w-24 
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      
      {/* Mobile Close Button */}
      <div className="md:hidden w-full flex justify-end px-4 mb-2">
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X size={24} />
          </button>
      </div>

      {/* Logo Area */}
      <div className="mb-6 shrink-0 flex flex-col items-center gap-2 md:gap-1 px-4 md:px-0 w-full md:w-auto">
        <div className="flex items-center gap-3 md:justify-center w-full">
            {workspaceLogo ? (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-slate-200 dark:shadow-none transition-transform hover:scale-105 cursor-pointer bg-slate-900 dark:bg-indigo-600 shrink-0">
                    <img src={workspaceLogo} alt="Workspace Logo" className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="transition-transform hover:scale-105 cursor-pointer">
                    {/* Use the new IconOnly Logo when collapsed/desktop sidebar, but we might want the full logo on mobile drawer. For now, keep it iconic. */}
                    <Logo iconOnly className="w-10 h-10 md:w-12 md:h-12" />
                </div>
            )}
            {/* Show name on mobile next to logo */}
            <span className="md:hidden font-bold text-lg text-slate-800 dark:text-white truncate">{workspaceName}</span>
        </div>
        
        {workspaceName && (
            <span className="hidden md:block text-[9px] font-bold text-slate-500 dark:text-slate-400 max-w-[80px] truncate text-center">
                {workspaceName}
            </span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col w-full px-4 md:px-2 overflow-y-auto no-scrollbar min-h-0">
        <div className="flex flex-col gap-2 md:gap-1.5 my-auto">
            {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
                <button
                key={item.id}
                id={`nav-item-${item.id}`} // Added ID for Tour Targeting
                onClick={() => setActiveView(item.id)}
                className={`
                    w-full flex md:flex-col items-center md:justify-center py-3 md:py-2 px-4 md:px-0 rounded-xl transition-all duration-300 group
                    ${isActive ? 'bg-slate-50 md:bg-transparent dark:bg-slate-800 md:dark:bg-transparent' : ''}
                `}
                >
                <div className={`
                    p-2 rounded-xl flex items-center justify-center transition-all duration-300 md:mb-1 mr-4 md:mr-0
                    ${isActive ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'}
                `}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                <span className={`text-sm md:text-[9px] font-bold tracking-wide transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 md:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                    {item.label}
                </span>
                </button>
            );
            })}
        </div>
      </nav>

      {/* User Profile (Compact) */}
      <div className="mt-auto pt-4 pb-2 w-full px-4 md:px-2 shrink-0 border-t border-slate-100 dark:border-slate-800 md:border-none">
        <button 
          onClick={() => setActiveView('settings')}
          className="w-full flex md:flex-col items-center md:justify-center gap-3 md:gap-1.5 group p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title="Il tuo profilo"
        >
          <div className="w-10 h-10 md:w-8 md:h-8 rounded-full p-0.5 border-2 border-slate-100 dark:border-slate-700 group-hover:border-indigo-500 transition-colors shrink-0 flex items-center justify-center bg-slate-200 dark:bg-slate-800 overflow-hidden">
             {!imgError ? (
                 <img 
                   src={currentUser.avatar} 
                   alt={currentUser.name} 
                   className="w-full h-full rounded-full object-cover" 
                   onError={() => setImgError(true)}
                 />
             ) : (
                 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{getInitials(currentUser.name)}</span>
             )}
          </div>
          <div className="flex flex-col md:items-center text-left md:text-center overflow-hidden">
              <span className="text-sm md:text-[9px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-tight truncate w-full">
                {currentUser.name}
              </span>
              <span className="md:hidden text-xs text-slate-400 truncate w-full">{currentUser.role || 'Member'}</span>
          </div>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;

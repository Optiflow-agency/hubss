
import React, { useState } from 'react';
import { 
  CheckCircle, FileText, MessageSquare, Calendar, 
  Filter, Search, Clock, ArrowRight, Download, 
  Briefcase, AlertCircle, ChevronDown, User as UserIcon
} from 'lucide-react';

// --- TYPES & MOCK DATA ---

type ActivityType = 'task' | 'file' | 'comment' | 'meeting' | 'ticket' | 'milestone';

interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  project: string;
  client: string; // Company Name
  clientAvatar?: string; // Optional avatar/logo color
  user: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  dateCategory: 'Oggi' | 'Ieri' | 'Questa Settimana' | 'Settimana Scorsa';
}

const activities: ActivityLog[] = [
  // OGGI
  {
    id: 'a1',
    type: 'task',
    title: 'Completato task: "Setup API Backend"',
    project: 'Mobile App Redesign',
    client: 'Acme Corp',
    user: { name: 'Alessandro M.', avatar: 'https://picsum.photos/100/100?random=1' },
    timestamp: '10:45',
    dateCategory: 'Oggi'
  },
  {
    id: 'a2',
    type: 'file',
    title: 'Caricato nuovo asset: "Brand_Guidelines_v2.pdf"',
    description: 'Versione aggiornata con i nuovi colori pantone.',
    project: 'Brand Identity',
    client: 'LogiTech',
    user: { name: 'Giulia V.', avatar: 'https://picsum.photos/100/100?random=2' },
    timestamp: '09:30',
    dateCategory: 'Oggi'
  },
  {
    id: 'a3',
    type: 'comment',
    title: 'Commentato su "Homepage Mockup"',
    description: '"Ottimo lavoro, ma sposterei il pulsante CTA più in alto."',
    project: 'Website Refresh',
    client: 'GreenEnergy',
    user: { name: 'Marco R.', avatar: 'https://picsum.photos/100/100?random=3' },
    timestamp: '09:15',
    dateCategory: 'Oggi'
  },
  
  // IERI
  {
    id: 'a4',
    type: 'meeting',
    title: 'Meeting Team: Sprint Review',
    description: 'Durata: 45 min. Partecipanti: 5.',
    project: 'Mobile App Redesign',
    client: 'Acme Corp',
    user: { name: 'Alessandro M.', avatar: 'https://picsum.photos/100/100?random=1' },
    timestamp: '16:00',
    dateCategory: 'Ieri'
  },
  {
    id: 'a5',
    type: 'ticket',
    title: 'Risolto Ticket #402: "Bug Login iOS"',
    project: 'Mobile App Redesign',
    client: 'Acme Corp',
    user: { name: 'Marco R.', avatar: 'https://picsum.photos/100/100?random=3' },
    timestamp: '14:20',
    dateCategory: 'Ieri'
  },
  
  // QUESTA SETTIMANA
  {
    id: 'a6',
    type: 'milestone',
    title: 'Raggiunta Milestone: "Approvazione Design"',
    project: 'Brand Identity',
    client: 'LogiTech',
    user: { name: 'Giulia V.', avatar: 'https://picsum.photos/100/100?random=2' },
    timestamp: 'Lunedì, 11:00',
    dateCategory: 'Questa Settimana'
  },
  {
     id: 'a7',
     type: 'task',
     title: 'Spostato task in Review: "Integrazione Stripe"',
     project: 'E-commerce Platform',
     client: 'ShopifyPlus',
     user: { name: 'Marco R.', avatar: 'https://picsum.photos/100/100?random=3' },
     timestamp: 'Lunedì, 09:45',
     dateCategory: 'Questa Settimana'
  }
];

// --- HELPERS ---

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'task': return <CheckCircle size={18} className="text-emerald-500" />;
    case 'file': return <FileText size={18} className="text-blue-500" />;
    case 'comment': return <MessageSquare size={18} className="text-indigo-500" />;
    case 'meeting': return <Calendar size={18} className="text-orange-500" />;
    case 'ticket': return <AlertCircle size={18} className="text-rose-500" />;
    case 'milestone': return <Clock size={18} className="text-purple-500" />;
    default: return <Clock size={18} className="text-slate-500" />;
  }
};

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'task': return 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    case 'file': return 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    case 'comment': return 'bg-indigo-100 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800';
    case 'meeting': return 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    case 'ticket': return 'bg-rose-100 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';
    case 'milestone': return 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  }
};

const Documents: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all'); // Added date filter
  const [searchQuery, setSearchQuery] = useState('');

  // Derived Data
  const filteredActivities = activities.filter(act => {
    const matchesType = filterType === 'all' || act.type === filterType;
    const matchesClient = filterClient === 'all' || act.client === filterClient;
    const matchesSearch = act.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          act.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          act.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (filterDate === 'today') matchesDate = act.dateCategory === 'Oggi';
    else if (filterDate === 'yesterday') matchesDate = act.dateCategory === 'Ieri';
    else if (filterDate === 'week') matchesDate = act.dateCategory === 'Questa Settimana' || act.dateCategory === 'Oggi' || act.dateCategory === 'Ieri';

    return matchesType && matchesClient && matchesSearch && matchesDate;
  });

  // Group by Date Category
  const groupedActivities = {
    'Oggi': filteredActivities.filter(a => a.dateCategory === 'Oggi'),
    'Ieri': filteredActivities.filter(a => a.dateCategory === 'Ieri'),
    'Questa Settimana': filteredActivities.filter(a => a.dateCategory === 'Questa Settimana'),
    'Settimana Scorsa': filteredActivities.filter(a => a.dateCategory === 'Settimana Scorsa'),
  };

  const categories = ['Oggi', 'Ieri', 'Questa Settimana', 'Settimana Scorsa'] as const;

  return (
    <div className="h-full bg-[#f3f4f6] dark:bg-slate-950 p-4 md:p-8 overflow-hidden flex flex-col transition-colors">
       
       {/* HEADER */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
               Cronologia Attività
               <span className="text-sm font-normal text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                 {filteredActivities.length} eventi
               </span>
             </h1>
             <p className="text-slate-500 dark:text-slate-400 mt-1">Traccia lo storico di tutto ciò che accade nei tuoi progetti.</p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca attività, utente..." 
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
             </div>
             
             {/* DATE FILTER BUTTON */}
             <div className="relative group">
                 <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm font-medium text-sm">
                    <Calendar size={20} />
                    <span className="hidden sm:inline">
                        {filterDate === 'all' ? 'Tutto' : filterDate === 'today' ? 'Oggi' : filterDate === 'yesterday' ? 'Ieri' : 'Settimana'}
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                 </button>
                 
                 {/* Dropdown Content */}
                 <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20 hidden group-hover:block animate-fade-in">
                     <button onClick={() => setFilterDate('all')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filterDate === 'all' ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}>Tutto</button>
                     <button onClick={() => setFilterDate('today')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filterDate === 'today' ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}>Oggi</button>
                     <button onClick={() => setFilterDate('yesterday')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filterDate === 'yesterday' ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}>Ieri</button>
                     <button onClick={() => setFilterDate('week')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filterDate === 'week' ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}>Questa Settimana</button>
                 </div>
             </div>

             <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm">
                <Download size={20} />
             </button>
          </div>
       </div>

       {/* FILTERS & STATS */}
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
          
          {/* LEFT SIDEBAR: FILTERS */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
             
             {/* Stats Card */}
             <div className="bg-slate-900 dark:bg-indigo-900/50 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Questa Settimana</p>
                   <h3 className="text-3xl font-bold mb-4">24 Attività</h3>
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-300">Task Completati</span>
                         <span className="font-bold">12</span>
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden"><div className="w-[50%] h-full bg-emerald-500"></div></div>
                      
                      <div className="flex justify-between text-sm mt-2">
                         <span className="text-slate-300">File Caricati</span>
                         <span className="font-bold">5</span>
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden"><div className="w-[20%] h-full bg-blue-500"></div></div>
                   </div>
                </div>
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
             </div>

             {/* Client Filter */}
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                   <Briefcase size={18} /> Filtra per Cliente
                </h3>
                <div className="space-y-2">
                   {['all', 'Acme Corp', 'LogiTech', 'GreenEnergy', 'ShopifyPlus'].map(client => (
                      <button
                        key={client}
                        onClick={() => setFilterClient(client)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                           filterClient === client 
                           ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' 
                           : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                         {client === 'all' ? 'Tutti i Clienti' : client}
                         {filterClient === client && <div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-indigo-500"></div>}
                      </button>
                   ))}
                </div>
             </div>

             {/* Type Filter */}
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                   <Filter size={18} /> Tipo Attività
                </h3>
                <div className="flex flex-wrap gap-2">
                   {[
                      { id: 'all', label: 'Tutto' },
                      { id: 'task', label: 'Task' },
                      { id: 'file', label: 'File' },
                      { id: 'meeting', label: 'Meeting' },
                      { id: 'ticket', label: 'Ticket' },
                      { id: 'milestone', label: 'Milestone' }
                   ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setFilterType(type.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                           filterType === type.id 
                           ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600' 
                           : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                         {type.label}
                      </button>
                   ))}
                </div>
             </div>

          </div>

          {/* MAIN TIMELINE */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8 overflow-y-auto custom-scrollbar">
             
             {filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} />
                   </div>
                   <p className="font-medium">Nessuna attività trovata con questi filtri.</p>
                </div>
             ) : (
                <div className="relative">
                   {/* Vertical Line */}
                   <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                   <div className="space-y-10">
                      {categories.map(category => {
                         const items = groupedActivities[category];
                         if (!items || items.length === 0) return null;

                         return (
                            <div key={category} className="relative animate-fade-in">
                               {/* Date Header */}
                               <div className="flex items-center mb-6">
                                  <div className="w-12 flex justify-center z-10">
                                     <div className="w-3 h-3 bg-slate-900 dark:bg-indigo-500 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-sm"></div>
                                  </div>
                                  <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800 pr-4">
                                     {category}
                                  </h2>
                               </div>

                               {/* Activities List */}
                               <div className="space-y-4 pl-12">
                                  {items.map(activity => (
                                     <div key={activity.id} className="group relative bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all">
                                        
                                        <div className="flex justify-between items-start gap-4">
                                           {/* Icon & Title */}
                                           <div className="flex gap-4">
                                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${getActivityColor(activity.type)}`}>
                                                 {getActivityIcon(activity.type)}
                                              </div>
                                              <div>
                                                 <h3 className="font-bold text-slate-800 dark:text-white text-base leading-snug">
                                                    {activity.title}
                                                 </h3>
                                                 {activity.description && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                       {activity.description}
                                                    </p>
                                                 )}
                                                 
                                                 <div className="flex flex-wrap items-center gap-3 mt-3">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                       <Briefcase size={12} /> {activity.client}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                                                       {activity.project}
                                                    </div>
                                                 </div>
                                              </div>
                                           </div>

                                           {/* User & Time */}
                                           <div className="text-right flex-shrink-0">
                                              <span className="text-xs font-bold text-slate-400 block mb-2">{activity.timestamp}</span>
                                              <img src={activity.user.avatar} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 ml-auto" title={activity.user.name} />
                                           </div>
                                        </div>

                                        {/* Action Button (Hover) */}
                                        <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:right-4 transition-all">
                                           <button className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white">
                                              <ArrowRight size={18} />
                                           </button>
                                        </div>

                                     </div>
                                  ))}
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default Documents;

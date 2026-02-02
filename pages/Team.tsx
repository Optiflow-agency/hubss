
import React, { useState, useMemo } from 'react';
import { Search, Plus, MoreHorizontal, Mail, Shield, Trash2, X, Check, Users, BarChart3, Filter, AlertCircle, CheckCircle2, Clock, Circle, ArrowUp, ArrowDown, Activity, User as UserIcon, Ban, Layout, Grid, List } from 'lucide-react';
import { User, Client, Board, Task, RoleDefinition, TimeLog } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line 
} from 'recharts';

interface TeamProps {
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  clients: Client[];
  boards?: Board[];
  currentUser?: User;
  roles?: RoleDefinition[];
  timeLogs?: TimeLog[];
}

// Helper types for analytics
interface MemberMetrics {
    userId: string;
    name: string;
    role: string;
    avatar: string;
    completed: number;
    totalAssigned: number;
    onTimeRate: number; // percentage
    leadTimeAvg: number; // days
    delayedTasks: number;
    reworkRate: number; // percentage
    loadPercentage: number; // capacity vs effort
    isBlocked: boolean;
    blockedCount: number;
    effortTotal: number;
}

const Team: React.FC<TeamProps> = ({ members, setMembers, clients, boards = [], currentUser, roles = [], timeLogs = [] }) => {
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberDetailOpen, setIsMemberDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // View Modes for Team Dashboard
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'analytics'>('grid');
  const [sortConfig, setSortConfig] = useState<{ key: keyof MemberMetrics; direction: 'asc' | 'desc' } | null>(null);

  // Form State (Invite)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState(roles[0]?.name || 'Member');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const isAdmin = currentUser?.role === 'Admin';

  // --- ANALYTICS ENGINE ---
  const teamMetrics = useMemo(() => {
      const allTasks = boards.flatMap(b => b.tasks.map(t => ({...t, boardTitle: b.title, boardCols: b.columns})));
      const capacityHours = 40; // Standard weekly capacity per person

      // Map basic member data to metrics
      let metrics: MemberMetrics[] = members.map(m => {
          const userTasks = allTasks.filter(t => t.assignees.some(u => u.id === m.id));
          
          const completedTasks = userTasks.filter(t => 
              t.status.toLowerCase().includes('done') || 
              t.status.toLowerCase().includes('fatto') || 
              t.status.toLowerCase().includes('completato')
          );

          const delayedTasks = userTasks.filter(t => 
              new Date(t.dueDate) < new Date() && 
              !t.status.toLowerCase().includes('done')
          ).length;

          // Mock Lead Time
          const leadTimeAvg = completedTasks.length > 0 
              ? Math.round(completedTasks.reduce((acc, t) => acc + (t.effort || 2), 0) / completedTasks.length) 
              : 0; 

          // Rework Rate
          const reworkCount = userTasks.reduce((acc, t) => acc + (t.reworkCount || 0), 0);
          const reworkRate = completedTasks.length > 0 
              ? Math.round((reworkCount / completedTasks.length) * 100) 
              : 0;

          const onTimeRate = completedTasks.length > 0 
              ? Math.round(((completedTasks.length - delayedTasks) / completedTasks.length) * 100)
              : 100;

          // Effort Load
          const activeTasks = userTasks.filter(t => !t.status.toLowerCase().includes('done'));
          const totalEffort = activeTasks.reduce((acc, t) => acc + (t.effort || 0), 0);
          const loadPercentage = Math.round((totalEffort / capacityHours) * 100);

          const blockedCount = activeTasks.filter(t => t.isBlocked).length;

          return {
              userId: m.id,
              name: m.name,
              role: m.role || 'Member',
              avatar: m.avatar,
              completed: completedTasks.length,
              totalAssigned: userTasks.length,
              onTimeRate: Math.max(0, onTimeRate),
              leadTimeAvg,
              delayedTasks,
              reworkRate,
              loadPercentage,
              isBlocked: blockedCount > 0,
              blockedCount,
              effortTotal: totalEffort
          };
      });

      // Sort Logic
      if (sortConfig) {
          metrics.sort((a, b) => {
              if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
              if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return metrics;
  }, [members, boards, sortConfig]);

  // Global Team KPIs
  const globalKPI = useMemo(() => {
      if (teamMetrics.length === 0) return { totalCompleted: 0, avgOnTime: 0, avgLeadTime: 0, totalDelayed: 0, avgRework: 0, avgLoad: 0 };
      
      const totalCompleted = teamMetrics.reduce((acc, m) => acc + m.completed, 0);
      const avgOnTime = Math.round(teamMetrics.reduce((acc, m) => acc + m.onTimeRate, 0) / teamMetrics.length);
      const avgLeadTime = Math.round(teamMetrics.reduce((acc, m) => acc + m.leadTimeAvg, 0) / teamMetrics.length);
      const totalDelayed = teamMetrics.reduce((acc, m) => acc + m.delayedTasks, 0);
      const avgRework = Math.round(teamMetrics.reduce((acc, m) => acc + m.reworkRate, 0) / teamMetrics.length);
      const avgLoad = Math.round(teamMetrics.reduce((acc, m) => acc + m.loadPercentage, 0) / teamMetrics.length);

      return { totalCompleted, avgOnTime, avgLeadTime, totalDelayed, avgRework, avgLoad };
  }, [teamMetrics]);

  // --- HANDLERS ---

  const handleSort = (key: keyof MemberMetrics) => {
      setSortConfig(current => ({
          key,
          direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handleMemberClick = (metric: MemberMetrics) => {
      setSelectedMember(metric);
      setIsMemberDetailOpen(true);
  };

  const handleCloseMemberModal = () => {
      setIsMemberDetailOpen(false);
      // Optional: clear selected member after animation if needed
      // setTimeout(() => setSelectedMember(null), 300);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    const newMember: User = {
      id: Date.now().toString(),
      name: newName,
      email: newEmail,
      role: newRole,
      status: 'offline',
      // Generate a random "real photo" style image from Unsplash instead of a cartoon avatar
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&h=150&fit=crop&auto=format`,
      accessibleClients: selectedClients
    };
    setMembers([...members, newMember]);
    setIsModalOpen(false);
    setNewName(''); setNewEmail(''); setNewRole(roles[0]?.name || 'Member'); setSelectedClients([]);
  };

  // --- SUB-COMPONENTS RENDERERS ---

  const renderKPIHeader = () => (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {[
              { label: 'Task Completati', value: globalKPI.totalCompleted, color: 'text-slate-900 dark:text-white', icon: CheckCircle2, bg: 'bg-white dark:bg-slate-800' },
              { label: '% On Time', value: `${globalKPI.avgOnTime}%`, color: globalKPI.avgOnTime > 80 ? 'text-green-600' : 'text-orange-500', icon: Clock, bg: 'bg-white dark:bg-slate-800' },
              { label: 'Lead Time (g)', value: globalKPI.avgLeadTime, color: 'text-indigo-600', icon: Activity, bg: 'bg-white dark:bg-slate-800' },
              { label: 'Ritardi Attivi', value: globalKPI.totalDelayed, color: 'text-red-600', icon: AlertCircle, bg: 'bg-red-50 dark:bg-red-900/20' },
              { label: 'Rework Rate', value: `${globalKPI.avgRework}%`, color: 'text-purple-600', icon: ArrowDown, bg: 'bg-white dark:bg-slate-800' },
              { label: 'Carico Medio', value: `${globalKPI.avgLoad}%`, color: globalKPI.avgLoad > 100 ? 'text-red-600' : 'text-blue-600', icon: BarChart3, bg: 'bg-white dark:bg-slate-800' },
          ].map((kpi, i) => (
              <div key={i} className={`${kpi.bg} p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center animate-fade-in hover:shadow-md transition-shadow`}>
                  <kpi.icon size={20} className={`mb-2 opacity-80 ${kpi.color}`} />
                  <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">{kpi.label}</span>
              </div>
          ))}
      </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
        {teamMetrics.map(member => (
            <div key={member.userId} onClick={() => handleMemberClick(member)} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500 transition cursor-pointer group relative overflow-hidden">
                {/* Status Indicator */}
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${member.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative mb-3">
                        <img src={member.avatar} className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 dark:border-slate-700 shadow-sm group-hover:scale-105 transition-transform" />
                        {member.delayedTasks > 0 && (
                            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                {member.delayedTasks}
                            </div>
                        )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{member.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{member.role}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Carico</span>
                        <span className={`text-lg font-bold ${member.loadPercentage > 100 ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}`}>{member.loadPercentage}%</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">On Time</span>
                        <span className={`text-lg font-bold ${member.onTimeRate < 80 ? 'text-orange-500' : 'text-green-600'}`}>{member.onTimeRate}%</span>
                    </div>
                </div>
                
                <div className="text-center">
                    <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-500 transition-colors">Visualizza dettagli →</span>
                </div>
            </div>
        ))}
        
        {/* Add Member Button */}
        {isAdmin && (
            <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition group h-full min-h-[250px]">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Plus size={32} />
                </div>
                <span className="font-bold">Aggiungi Membro</span>
            </button>
        )}
    </div>
  );

  const renderOverviewTable = () => (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
          <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                  <tr>
                      <th className="px-6 py-4">Membro</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('completed')}>Task Fatti</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('onTimeRate')}>On Time %</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('delayedTasks')}>In Ritardo</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('loadPercentage')}>Carico</th>
                      <th className="px-6 py-4 text-center">Stato</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {teamMetrics.map((m) => (
                      <tr key={m.userId} onClick={() => handleMemberClick(m)} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer group">
                          <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                  <img src={m.avatar} className="w-9 h-9 rounded-full object-cover" />
                                  <div>
                                      <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                                      <p className="text-xs text-slate-500">{m.role}</p>
                                  </div>
                              </div>
                          </td>
                          <td className="px-6 py-4 font-medium">{m.completed}</td>
                          <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${m.onTimeRate > 80 ? 'bg-green-500' : m.onTimeRate > 50 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${m.onTimeRate}%` }}></div>
                                  </div>
                                  <span className="text-xs">{m.onTimeRate}%</span>
                              </div>
                          </td>
                          <td className="px-6 py-4">
                              {m.delayedTasks > 0 ? (
                                  <span className="text-red-600 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs">{m.delayedTasks}</span>
                              ) : <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-6 py-4">
                              <span className={`font-bold ${m.loadPercentage > 100 ? 'text-red-600' : m.loadPercentage < 50 ? 'text-blue-400' : 'text-green-600'}`}>
                                  {m.loadPercentage}%
                              </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-2">
                                  {m.isBlocked && <span title="Bloccato"><Ban size={16} className="text-red-500" /></span>}
                                  {m.delayedTasks > 0 && <span title="Ritardi"><AlertCircle size={16} className="text-orange-500" /></span>}
                                  {m.loadPercentage > 110 && <span title="Sovraccarico"><Activity size={16} className="text-purple-500" /></span>}
                                  {!m.isBlocked && m.delayedTasks === 0 && m.loadPercentage <= 110 && <CheckCircle2 size={16} className="text-green-400" />}
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
  );

  const renderLoadChart = () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-96">
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Bilanciamento Carico Team</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={teamMetrics} 
                    layout="vertical" 
                    margin={{ top: 10, right: 30, left: 30, bottom: 10 }} // Increased margins
                  >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 150]} hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120} // Increased width for names
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        content={({ payload }) => {
                            if (!payload || !payload.length) return null;
                            const data = payload[0].payload;
                            return (
                                <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg">
                                    <p className="font-bold">{data.name}</p>
                                    <p>Carico: {data.loadPercentage}%</p>
                                    <p>Effort: {data.effortTotal}h</p>
                                </div>
                            );
                        }}
                      />
                      <Bar dataKey="loadPercentage" barSize={24} radius={[0, 4, 4, 0]}>
                          {teamMetrics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.loadPercentage > 100 ? '#ef4444' : entry.loadPercentage < 50 ? '#60a5fa' : '#10b981'} />
                          ))}
                      </Bar>
                  </BarChart>
              </ResponsiveContainer>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="font-bold text-slate-800 dark:text-white mb-4">Insights Carico</h3>
             <div className="space-y-4">
                 <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                     <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-1">
                         <AlertCircle size={18} /> Sovraccarico
                     </div>
                     <p className="text-xs text-red-600 dark:text-red-300">
                         {teamMetrics.filter(m => m.loadPercentage > 100).length} membri sono sopra il 100% della capacità settimanale. Considera di riassegnare i task.
                     </p>
                 </div>
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                     <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold mb-1">
                         <Users size={18} /> Disponibilità
                     </div>
                     <p className="text-xs text-blue-600 dark:text-blue-300">
                         {teamMetrics.filter(m => m.loadPercentage < 50).length} membri hanno un carico inferiore al 50%. Possono prendere nuovi task urgenti.
                     </p>
                 </div>
             </div>
         </div>
      </div>
  );

  // --- MEMBER DETAIL MODAL ---
  const renderMemberModal = () => {
      // Corrected logic: explicitly check the boolean state
      if (!selectedMember || !isMemberDetailOpen) return null;
      
      const allTasks = boards.flatMap(b => b.tasks.map(t => ({...t, boardTitle: b.title})));
      const userTasks = allTasks.filter(t => t.assignees.some(u => u.id === selectedMember.userId));
      const criticalTasks = userTasks.filter(t => t.priority === 'High' || t.priority === 'Critical' || t.isBlocked || (new Date(t.dueDate) < new Date()));

      // Mock Trend Data
      const trendData = [
          { week: 'W1', performance: 75, load: 60 },
          { week: 'W2', performance: 82, load: 70 },
          { week: 'W3', performance: 68, load: 110 },
          { week: 'W4', performance: selectedMember.onTimeRate, load: selectedMember.loadPercentage },
      ];

      return (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in" 
            onClick={handleCloseMemberModal}
          >
              <div 
                className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative" 
                onClick={e => e.stopPropagation()}
              >
                  
                  {/* HEADER - Clean Design Restoration */}
                  <div className="px-8 pt-8 pb-4 flex justify-between items-start bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-6">
                          <div className="relative">
                              <img src={selectedMember.avatar} className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-slate-100 dark:border-slate-700" />
                              {selectedMember.isBlocked && <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"><Ban size={16} /></div>}
                          </div>
                          <div>
                              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{selectedMember.name}</h2>
                              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">{selectedMember.role}</p>
                              <div className="flex gap-2 mt-2">
                                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${selectedMember.loadPercentage > 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                      {selectedMember.loadPercentage}% Carico
                                  </span>
                                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                      {selectedMember.completed} Completati
                                  </span>
                              </div>
                          </div>
                      </div>
                      
                      {/* Close Button - Fixed Z-index and Position */}
                      <button 
                        type="button"
                        onClick={handleCloseMemberModal}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full text-slate-500 dark:text-slate-300 transition-colors"
                      >
                          <X size={24} />
                      </button>
                  </div>

                  {/* BODY - 2 Column Layout Preserved */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f9fafb] dark:bg-slate-900/50 p-8">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          
                          {/* LEFT COLUMN: Stats & Charts */}
                          <div className="space-y-6">
                              {/* KPIs */}
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">On Time Rate</p>
                                      <p className={`text-2xl font-bold ${selectedMember.onTimeRate < 80 ? 'text-orange-500' : 'text-green-500'}`}>{selectedMember.onTimeRate}%</p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">Lead Time</p>
                                      <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{selectedMember.leadTimeAvg}g</p>
                                  </div>
                              </div>

                              {/* Distribution Chart */}
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                      <Clock size={16} className="text-indigo-500"/> Distribuzione Tempo
                                  </h4>
                                  <div className="h-48">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <PieChart>
                                              <Pie
                                                  data={[
                                                      { name: 'Delivery', value: 60 },
                                                      { name: 'Bugfix', value: 15 },
                                                      { name: 'Meeting', value: 15 },
                                                      { name: 'Altro', value: 10 },
                                                  ]}
                                                  innerRadius={40}
                                                  outerRadius={60}
                                                  paddingAngle={5}
                                                  dataKey="value"
                                              >
                                                  {['#6366f1', '#ef4444', '#f59e0b', '#94a3b8'].map((c, i) => <Cell key={i} fill={c} />)}
                                              </Pie>
                                              <Tooltip />
                                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                          </PieChart>
                                      </ResponsiveContainer>
                                  </div>
                              </div>
                          </div>

                          {/* RIGHT COLUMN: Trend & Tasks */}
                          <div className="lg:col-span-2 space-y-6">
                              {/* Trend Chart */}
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
                                      <Activity size={16} className="text-emerald-500"/> Trend Performance
                                  </h4>
                                  <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                              <defs>
                                                  <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                  </linearGradient>
                                                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                  </linearGradient>
                                              </defs>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                              <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                              <YAxis hide />
                                              <Tooltip 
                                                contentStyle={{backgroundColor: '#1e293b', border: 'none', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                                                itemStyle={{color: '#e2e8f0'}}
                                              />
                                              <Area type="monotone" dataKey="performance" stroke="#10b981" fillOpacity={1} fill="url(#colorPerf)" strokeWidth={3} name="On Time %" />
                                              <Area type="monotone" dataKey="load" stroke="#6366f1" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={3} name="Carico %" />
                                              <Legend />
                                          </AreaChart>
                                      </ResponsiveContainer>
                                  </div>
                              </div>

                              {/* Critical Tasks */}
                              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                                  <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                                          <AlertCircle size={16} className="text-red-500"/> Task Critici / In Ritardo
                                      </h4>
                                      <span className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{criticalTasks.length}</span>
                                  </div>
                                  
                                  <div className="flex-1 overflow-y-auto custom-scrollbar max-h-64">
                                      {criticalTasks.length === 0 ? (
                                          <div className="p-8 text-center text-slate-400 text-sm h-full flex flex-col justify-center items-center">
                                              <CheckCircle2 size={32} className="mb-2 opacity-20" />
                                              Nessun task critico al momento. Ottimo lavoro!
                                          </div>
                                      ) : (
                                          <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                              {criticalTasks.map(t => (
                                                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group">
                                                      <div className="flex items-start gap-3">
                                                          <div className={`mt-1 w-2 h-2 rounded-full ${t.isBlocked ? 'bg-red-500 animate-pulse' : t.priority === 'Critical' ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
                                                          <div>
                                                              <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{t.title}</p>
                                                              <p className="text-xs text-slate-500 dark:text-slate-400">{t.boardTitle} • Scadenza: {t.dueDate}</p>
                                                          </div>
                                                      </div>
                                                      <div className="text-right">
                                                          {t.isBlocked ? <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded uppercase">Bloccato</span> : 
                                                           <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded uppercase">Ritardo</span>}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full bg-[#f3f4f6] dark:bg-slate-950 p-4 md:p-8 overflow-y-auto transition-colors">
      
      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 dark:text-white">Invita Membro</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome" className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Invia</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-3 text-slate-500">Annulla</button>
              </form>
          </div>
        </div>
      )}

      {renderMemberModal()}

      <div className="max-w-7xl mx-auto space-y-8 pb-20">
         
         {/* HEADER SECTION */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Team Analytics</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoraggio performance, carichi di lavoro e qualità.</p>
            </div>
            
            <div className="flex gap-2">
                {/* View Switcher */}
               <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex shadow-sm">
                   <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Griglia"><Grid size={18} /></button>
                   <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Lista"><List size={18} /></button>
                   <button onClick={() => setViewMode('analytics')} className={`px-3 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${viewMode === 'analytics' ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                       <BarChart3 size={16} /> <span className="hidden sm:inline">Analytics</span>
                   </button>
               </div>
               
               {isAdmin && (
                   <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition shadow-lg">
                      <Plus size={18} /> <span className="hidden sm:inline">Invita</span>
                   </button>
               )}
            </div>
         </div>

         {/* 1. HEADER KPI */}
         {renderKPIHeader()}

         {/* 2. MAIN CONTENT BASED ON VIEW */}
         {viewMode === 'grid' && (
             <>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Membri del Team</h3>
                    <div className="relative w-64 hidden sm:block">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca membro..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none dark:text-white shadow-sm"
                        />
                    </div>
                </div>
                {renderGridView()}
             </>
         )}

         {viewMode === 'list' && (
             <>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Dettaglio Performance</h3>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Filtra..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none dark:text-white"
                        />
                    </div>
                </div>
                {renderOverviewTable()}
             </>
         )}

         {viewMode === 'analytics' && renderLoadChart()}

      </div>
    </div>
  );
};

export default Team;


import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Bell, MoreVertical, MoreHorizontal, Star, 
  X, PanelRightClose, PanelRightOpen, Calendar as CalendarIcon,
  Clock, Video, AlertCircle, CheckCircle2, ChevronRight, Filter,
  ArrowRight, MessageSquare, Archive, Download, Settings, ChevronLeft, 
  CalendarPlus, LogOut, User, Briefcase, Mail
} from 'lucide-react';
import { Client, Board, Task, User as UserType } from '../types';

// --- TYPES ---

interface ClientMessage {
  id: string;
  name: string;
  avatar: string;
  preview: string;
  date: string;
  read: boolean;
}

interface Meeting {
  id: string;
  title: string;
  time: string;
  duration: string;
  participants: string[];
  type: 'Google Meet' | 'Zoom' | 'In Persona';
  date?: string; 
}

interface Deadline {
  id: string;
  task: string;
  project: string;
  due: string;
  priority: 'High' | 'Critical';
}

// --- MOCK DATA ---

const initialMessages: ClientMessage[] = [
  { id: 'm1', name: 'Davide', avatar: 'https://picsum.photos/100/100?random=11', preview: 'Ciao, mi aggiorni sui progressi del progetto? Attendo tue notizie.', date: '21 Lug', read: true },
  { id: 'm2', name: 'Stefania', avatar: 'https://picsum.photos/100/100?random=12', preview: 'Ho ricevuto la prima bozza. Ottimo lavoro 👌 Possiamo iniziare il prossimo step.', date: '19 Lug', read: false },
  { id: 'm3', name: 'Guglielmo', avatar: 'https://picsum.photos/100/100?random=13', preview: 'Vorrei alcune modifiche sul lavoro precedente. Fammi sapere.', date: '17 Lug', read: true },
  { id: 'm4', name: 'Simona', avatar: 'https://picsum.photos/100/100?random=14', preview: 'Sono davvero impressionata dal tuo lavoro 😊 Continua così!', date: '15 Lug', read: true },
];

const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const upcomingMeetings: Meeting[] = [
  { id: 'mt1', title: 'Sprint Review', time: '10:00', duration: '45m', participants: ['1', '2'], type: 'Google Meet', date: formatDate(today) },
  { id: 'mt2', title: 'Briefing Giulia', time: '14:30', duration: '30m', participants: ['3'], type: 'Zoom', date: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)) },
  { id: 'mt3', title: 'Update Lavori', time: '16:00', duration: '1h', participants: ['1', '4', '5'], type: 'Google Meet', date: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)) },
];

const urgentDeadlines: Deadline[] = [
  { id: 'dl1', task: 'Consegna Mockup', project: 'Redesign Sito', due: 'Oggi', priority: 'Critical' },
  { id: 'dl2', task: 'Fix Bug Login API', project: 'App iOS', due: 'Domani', priority: 'High' },
  { id: 'dl3', task: 'Report SEO', project: 'Landing Page', due: 'Domani', priority: 'High' },
];

interface DashboardProps {
  clients: Client[];
  boards?: Board[]; 
  onAddTask?: (boardId: string, task: Task) => void;
  onAddBoard?: (board: Board) => void;
  onLogout?: () => void;
  currentUser?: UserType;
}

const Dashboard: React.FC<DashboardProps> = ({ clients, boards = [], onAddTask, onAddBoard, onLogout, currentUser }) => {
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('m2');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Dropdowns
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<string>('');
  
  // Header Dropdowns State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'alerts' | 'messages'>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // New Project Form State
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('month');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  
  // Project Filter States
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Tutti');

  // New Task Form State (Calendar)
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskType, setNewTaskType] = useState<'Task' | 'Meeting'>('Task');
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id || '');

  // Notifications Data
  const unreadMessages = messages.filter(m => !m.read);
  const activeDeadlines = urgentDeadlines;
  const hasNotifications = unreadMessages.length > 0 || activeDeadlines.length > 0;

  // Refs for click outside
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- ACTIONS ---

  const handleCreateProject = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProjectTitle || !onAddBoard) return;

      const newBoard: Board = {
          id: `b_${Date.now()}`,
          title: newProjectTitle,
          description: newProjectDesc || 'Nessuna descrizione',
          columns: [
            { id: 'todo', title: 'Da Fare' },
            { id: 'progress', title: 'In Corso' },
            { id: 'done', title: 'Completato' }
          ],
          tasks: [],
          members: currentUser ? [currentUser] : []
      };

      onAddBoard(newBoard);
      setIsProjectModalOpen(false);
      setNewProjectTitle('');
      setNewProjectDesc('');
      setNewProjectClient('');
  };

  // --- CALENDAR HELPERS ---
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
      const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
  };
  
  const handlePrevMonth = () => {
      if (calendarView === 'day') {
          setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), currentCalendarDate.getDate() - 1));
      } else if (calendarView === 'week') {
          setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), currentCalendarDate.getDate() - 7));
      } else {
          setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
      }
  };
  
  const handleNextMonth = () => {
      if (calendarView === 'day') {
          setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), currentCalendarDate.getDate() + 1));
      } else if (calendarView === 'week') {
          setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), currentCalendarDate.getDate() + 7));
      } else {
          setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
      }
  };

  const getWeekDays = (date: Date) => {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      startOfWeek.setDate(diff);
      
      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          days.push(d);
      }
      return days;
  };

  const handleCalendarCellClick = (day: number) => {
      const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDateForTask(dateStr);
      setNewTaskTime('09:00');
      setNewTaskTitle('');
      setNewTaskType('Task');
      setIsTaskModalOpen(true);
  };

  const handleTimeSlotClick = (hour: number) => {
      const dateStr = formatDate(currentCalendarDate);
      setSelectedDateForTask(dateStr);
      setNewTaskTime(`${hour.toString().padStart(2, '0')}:00`);
      setNewTaskTitle('');
      setNewTaskType('Task');
      setIsTaskModalOpen(true);
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskTitle || !onAddTask || !selectedBoardId) return;

      const fullDateTime = `${selectedDateForTask} ${newTaskTime}`;

      if (newTaskType === 'Task') {
          const newTask: Task = {
              id: `t_${Date.now()}`,
              title: newTaskTitle,
              status: 'todo',
              priority: 'Medium',
              assignees: [], 
              dueDate: fullDateTime,
              comments: 0,
              tags: ['Calendar'],
              attachments: []
          };
          onAddTask(selectedBoardId, newTask);
      } else {
          const newMeeting: Task = {
              id: `m_${Date.now()}`,
              title: `📅 ${newTaskTitle}`,
              status: 'todo',
              priority: 'Medium',
              assignees: [],
              dueDate: fullDateTime,
              comments: 0,
              tags: ['Meeting'],
              attachments: []
          };
          onAddTask(selectedBoardId, newMeeting);
      }
      setIsTaskModalOpen(false);
  };

  // --- DERIVE DATA FOR VIEWS ---
  const allTasks = boards.flatMap(b => b.tasks.map(t => ({...t, boardTitle: b.title, type: 'task'})));
  const calendarEvents = [
      ...allTasks, 
      ...upcomingMeetings.map(m => ({
          id: m.id,
          title: m.title,
          dueDate: m.date,
          type: 'meeting',
          priority: 'Medium',
          boardTitle: 'Meeting',
          tags: [] as string[]
      }))
  ];
  const uniqueCategories = ['Tutti', ...Array.from(new Set(boards.map(b => b.title.split(' ')[0])))];
  const filteredBoards = boards.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'Tutti' || b.title.includes(selectedCategoryFilter); 
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-full bg-[#f3f4f6] dark:bg-slate-950 transition-colors overflow-hidden relative">
      
      {/* --- ADD TASK/MEETING MODAL (CALENDAR) --- */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative border border-slate-100 dark:border-slate-700">
                  <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      Nuovo Evento
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <span>{selectedDateForTask}</span>
                      <span>alle</span>
                      <input 
                        type="time" 
                        value={newTaskTime} 
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                  </div>
                  
                  <form onSubmit={handleQuickAddTask} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo</label>
                          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                              <button 
                                type="button" 
                                onClick={() => setNewTaskType('Task')} 
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition ${newTaskType === 'Task' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                              >
                                  Task
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setNewTaskType('Meeting')} 
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition ${newTaskType === 'Meeting' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                              >
                                  Meeting
                              </button>
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titolo</label>
                          <input 
                              autoFocus
                              type="text" 
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder={newTaskType === 'Task' ? "Es. Consegnare Report" : "Es. Call con Cliente"}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aggiungi al Progetto</label>
                          <select 
                            value={selectedBoardId} 
                            onChange={(e) => setSelectedBoardId(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                          >
                              {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                          </select>
                      </div>

                      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md mt-2">
                          Salva
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- ADD PROJECT MODAL (FUNCTIONAL) --- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-700">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Nuovo Progetto</h3>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={24} className="text-slate-500" /></button>
             </div>
             
             <form onSubmit={handleCreateProject} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Progetto</label>
                    <input 
                      type="text" 
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Es. Website Redesign"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      required
                      autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrizione</label>
                    <textarea 
                      rows={3}
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Breve descrizione degli obiettivi..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                    <select 
                      value={newProjectClient}
                      onChange={(e) => setNewProjectClient(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                    >
                        <option value="">Seleziona un cliente (Opzionale)</option>
                        {clients.map(c => <option key={c.id} value={c.company}>{c.company}</option>)}
                    </select>
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg mt-2"
                >
                  Crea Progetto
                </button>
             </form>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT (Left) --- */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div id="mobile-dashboard-header" className="sticky top-0 z-30 bg-[#f3f4f6]/95 dark:bg-slate-950/95 backdrop-blur-md px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-transparent dark:border-slate-800/50">
          <div className="flex flex-col">
             <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
             <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm hidden sm:block">Benvenuto, {currentUser?.name || 'Utente'}. Ecco il riepilogo di oggi.</p>
          </div>
          
          <div className="flex items-center justify-end gap-2 md:gap-4 w-full md:w-auto">
             {/* Search Bar */}
            <div className="relative w-full md:w-48 lg:w-64 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca progetti..." 
                className="w-full bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-full py-2.5 pl-12 pr-4 text-sm shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none dark:text-white transition-all"
                />
            </div>

            <div className="flex gap-2 shrink-0">
                <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="w-10 h-10 bg-slate-900 dark:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 dark:hover:bg-indigo-500 transition transform hover:scale-105 active:scale-95"
                title="Nuovo Progetto"
                >
                <Plus size={20} />
                </button>
                
                {/* NOTIFICATIONS DROPDOWN */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-2.5 rounded-full shadow-sm border border-transparent dark:border-slate-700 transition ${showNotifications ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
                    >
                        <Bell size={20} />
                        {hasNotifications && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-3 w-72 md:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in z-50">
                            {/* CATEGORY TABS */}
                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-1">
                                <button onClick={() => setNotificationTab('all')} className={`text-xs font-bold py-1.5 rounded-lg transition ${notificationTab === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tutte</button>
                                <button onClick={() => setNotificationTab('alerts')} className={`text-xs font-bold py-1.5 rounded-lg transition ${notificationTab === 'alerts' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Avvisi</button>
                                <button onClick={() => setNotificationTab('messages')} className={`text-xs font-bold py-1.5 rounded-lg transition ${notificationTab === 'messages' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Messaggi</button>
                            </div>
                            
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                                    {notificationTab === 'all' ? 'Notifiche Recenti' : notificationTab === 'alerts' ? 'Scadenze & Sistema' : 'Messaggi Clienti'}
                                </h3>
                                <button className="text-xs text-indigo-600 font-bold hover:underline">Segna tutte lette</button>
                            </div>

                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {((notificationTab === 'all' || notificationTab === 'alerts') && activeDeadlines.length > 0) && activeDeadlines.map(dl => (
                                    <div key={dl.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex gap-3 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer group">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">Scadenza Imminente: {dl.task}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{dl.project} • {dl.due}</p>
                                        </div>
                                    </div>
                                ))}
                                
                                {((notificationTab === 'all' || notificationTab === 'messages') && unreadMessages.length > 0) && unreadMessages.map(msg => (
                                    <div key={msg.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex gap-3 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer group">
                                        <div className="relative shrink-0">
                                            <img src={msg.avatar} className="w-8 h-8 rounded-full" />
                                            <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-0.5 border border-white dark:border-slate-800"><Mail size={8} className="text-white"/></div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-baseline w-full">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{msg.name}</p>
                                                <span className="text-[10px] text-slate-400">{msg.date}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{msg.preview}</p>
                                        </div>
                                    </div>
                                ))}

                                {((notificationTab === 'all' && unreadMessages.length === 0 && activeDeadlines.length === 0) ||
                                  (notificationTab === 'alerts' && activeDeadlines.length === 0) ||
                                  (notificationTab === 'messages' && unreadMessages.length === 0)) && (
                                    <div className="p-8 text-center text-slate-400 text-sm">Nessuna notifica in questa sezione.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* PROFILE DROPDOWN */}
                <div className="relative" ref={profileRef}>
                    <button 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2 focus:outline-none"
                    >
                        <img src={currentUser?.avatar || "https://picsum.photos/100/100?random=user_main"} alt="Utente" className={`w-10 h-10 rounded-full border-2 shadow-sm transition ${showProfileMenu ? 'border-indigo-500' : 'border-white dark:border-slate-700'}`} />
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in z-50">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser?.email || 'user@nexus.com'}</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <button className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                    <User size={16} /> Il mio Profilo
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                    <Briefcase size={16} /> Workspace
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                    <Settings size={16} /> Impostazioni
                                </button>
                            </div>
                            <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                                <button 
                                    onClick={onLogout}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <LogOut size={16} /> Esci
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Toggle Button */}
                <button 
                id="chat-toggle-btn"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-2.5 rounded-full shadow-sm border border-transparent dark:border-slate-700 transition ${isChatOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900'}`}
                >
                {isChatOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                </button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pb-12 space-y-6 md:space-y-8">
            
            {/* --- DASHBOARD WIDGETS ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                
                {/* 1. URGENT DEADLINES */}
                <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm md:text-base">
                            <AlertCircle size={20} className="text-rose-500" /> Scadenze Urgenti
                        </h3>
                        <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full"><ChevronRight size={18} className="text-slate-400" /></button>
                    </div>
                    <div className="space-y-3">
                        {urgentDeadlines.map(dl => (
                            <div key={dl.id} className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                                <div className={`mt-0.5 w-2 h-2 rounded-full ${dl.priority === 'Critical' ? 'bg-rose-600' : 'bg-orange-500'}`}></div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{dl.task}</h4>
                                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{dl.project} • <span className="font-medium text-rose-600 dark:text-rose-400">{dl.due}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. UPCOMING MEETINGS (Mock Widget) */}
                <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm md:text-base">
                            <Video size={20} className="text-indigo-500" /> Meeting Oggi
                        </h3>
                        <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full"><ChevronRight size={18} className="text-slate-400" /></button>
                    </div>
                    <div className="space-y-3">
                        {upcomingMeetings.map(mt => (
                             <div key={mt.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{mt.time}</span>
                                        <span className="text-[10px] text-slate-400">{mt.duration}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{mt.title}</h4>
                                </div>
                                <button className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition">
                                    <Video size={16} />
                                </button>
                             </div>
                        ))}
                    </div>
                </div>

                {/* 3. TEAM AVAILABILITY */}
                <div className="bg-slate-900 dark:bg-indigo-900/20 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 text-white shadow-lg relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-100 dark:text-white flex items-center gap-2 text-sm md:text-base">
                                Team Online
                            </h3>
                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-white/10 px-2 py-1 rounded-full">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> 3 Attivi
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs md:text-sm mb-4">Il tuo team sta lavorando sul progetto.</p>
                        
                        <div className="space-y-3">
                            {[
                                { id: '1', name: 'Alessandro M.', role: 'Project Manager' },
                                { id: '2', name: 'Giulia V.', role: 'Lead Designer' },
                                { id: '3', name: 'Marco R.', role: 'Developer' }
                            ].map((member) => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={`https://picsum.photos/100/100?random=${member.id}`} className="w-9 h-9 rounded-full border-2 border-slate-700/50" alt={member.name} />
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-100 leading-tight">{member.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
                </div>
            </div>

            {/* --- REAL DYNAMIC CALENDAR SECTION --- */}
            <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CalendarIcon size={20} className="text-slate-400" /> Calendario
                        </h2>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded"><ChevronLeft size={16}/></button>
                            <span className="px-3 text-sm font-bold text-slate-700 dark:text-slate-200 capitalize min-w-[120px] text-center">
                                {calendarView === 'day' 
                                    ? currentCalendarDate.toLocaleString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                                    : currentCalendarDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })
                                }
                            </span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl self-start">
                        {(['day', 'week', 'month'] as const).map((view) => (
                            <button
                                key={view}
                                onClick={() => setCalendarView(view)}
                                className={`px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition-all capitalize ${
                                    calendarView === view 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {view === 'day' ? 'Giorno' : view === 'week' ? 'Settimana' : 'Mese'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    
                    {/* MONTH VIEW */}
                    {calendarView === 'month' && (
                        <>
                            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => <div key={d} className="py-2 text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase bg-white dark:bg-slate-800">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-fr">
                                {Array.from({length: getFirstDayOfMonth(currentCalendarDate)}).map((_, i) => (
                                    <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] border-r border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50"></div>
                                ))}
                                {Array.from({length: getDaysInMonth(currentCalendarDate)}).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayEvents = calendarEvents.filter(e => e.dueDate.startsWith(dateStr));
                                    const isToday = dateStr === formatDate(new Date());

                                    return (
                                        <div 
                                            key={day} 
                                            onClick={() => handleCalendarCellClick(day)}
                                            className={`min-h-[80px] md:min-h-[100px] border-r border-b border-slate-200/50 dark:border-slate-700/50 p-1 md:p-2 relative group hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>{day}</span>
                                                <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition"><Plus size={12}/></button>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                {dayEvents.map((evt, idx) => (
                                                    <div 
                                                        key={`${evt.id}-${idx}`} 
                                                        className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 shadow-sm ${
                                                            (evt as any).type === 'meeting' || evt.tags?.includes('Meeting')
                                                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-500'
                                                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300'
                                                        }`}
                                                        title={evt.title}
                                                    >
                                                        {evt.dueDate.includes(' ') ? evt.dueDate.split(' ')[1] : ''} {evt.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* WEEK VIEW */}
                    {calendarView === 'week' && (
                        <div className="grid grid-cols-7 h-[500px]">
                            {getWeekDays(currentCalendarDate).map((date, i) => {
                                const dateStr = formatDate(date);
                                const isToday = dateStr === formatDate(new Date());
                                const dayEvents = calendarEvents.filter(e => e.dueDate.startsWith(dateStr));

                                return (
                                    <div key={i} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 flex flex-col h-full">
                                        <div className={`text-center py-3 border-b border-slate-200 dark:border-slate-700 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">{date.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                                            <div className={`text-sm font-bold mt-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{date.getDate()}</div>
                                        </div>
                                        <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer" onClick={() => handleCalendarCellClick(date.getDate())}>
                                            {dayEvents.map((evt, idx) => (
                                                <div 
                                                    key={`${evt.id}-${idx}`} 
                                                    className={`text-xs p-2 rounded-lg border-l-4 shadow-sm ${
                                                        (evt as any).type === 'meeting' || evt.tags?.includes('Meeting')
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-500 text-indigo-900 dark:text-indigo-100'
                                                        : 'bg-white dark:bg-slate-700 border-emerald-500 text-slate-800 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <span className="font-bold block truncate">{evt.title}</span>
                                                    <span className="text-[10px] opacity-70 block truncate">{evt.dueDate.split(' ')[1]} {evt.boardTitle}</span>
                                                </div>
                                            ))}
                                            {dayEvents.length === 0 && (
                                                <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                                    <Plus size={20} className="text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* DAY VIEW */}
                    {calendarView === 'day' && (
                        <div className="flex h-[500px]">
                            {/* Time Column */}
                            <div className="w-16 border-r border-slate-200 dark:border-slate-700 flex flex-col text-right pr-2 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800">
                                {Array.from({length: 13}).map((_, i) => (
                                    <span key={i} className="text-xs text-slate-400 font-medium h-16 flex items-center justify-end pr-2 border-b border-transparent">{8 + i}:00</span>
                                ))}
                            </div>
                            
                            <div className="flex-1 relative overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white sticky top-0 bg-white/90 dark:bg-slate-900/90 p-4 border-b border-slate-100 dark:border-slate-800 z-10 backdrop-blur-sm">
                                    {currentCalendarDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                
                                <div className="relative">
                                    {Array.from({length: 13}).map((_, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => handleTimeSlotClick(8 + i)}
                                            className="h-16 border-b border-slate-200 dark:border-slate-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer relative group transition-colors"
                                        >
                                            <div className="hidden group-hover:flex absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400 items-center gap-1">
                                                <Plus size={12} /> Aggiungi
                                            </div>
                                        </div>
                                    ))}

                                    {/* Events Layer */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {calendarEvents.filter(e => e.dueDate.startsWith(formatDate(currentCalendarDate))).map((evt, idx) => {
                                            // Simple mock positioning
                                            const time = evt.dueDate.split(' ')[1] || '09:00';
                                            const hour = parseInt(time.split(':')[0]);
                                            const topOffset = (hour - 8) * 64; // 64px is height of h-16
                                            
                                            if (hour < 8 || hour > 20) return null;

                                            return (
                                                <div 
                                                    key={`${evt.id}-${idx}`} 
                                                    className="absolute left-4 right-4 h-14 bg-indigo-100 dark:bg-indigo-900/60 border-l-4 border-indigo-500 rounded p-2 shadow-sm pointer-events-auto cursor-pointer hover:brightness-95 flex flex-col justify-center"
                                                    style={{ top: `${topOffset}px` }}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">{evt.title}</h4>
                                                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-white/50 dark:bg-black/20 px-1.5 rounded">{time}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-300">{evt.boardTitle}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ACTIVE PROJECTS GRID (Using Real Data) --- */}
            <div>
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">Progetti Attivi</h2>
                    <div className="flex gap-2">
                        {/* Filter Button */}
                        <div className="relative">
                            <button 
                                onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsMoreMenuOpen(false); }}
                                className={`p-2 rounded-xl transition-colors ${selectedCategoryFilter !== 'Tutti' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <Filter size={20} />
                            </button>
                            {/* ... Filter Menu ... */}
                            {isFilterMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterMenuOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 overflow-hidden animate-fade-in">
                                        <div className="p-2">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">Filtra per Categoria</div>
                                            {uniqueCategories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => { setSelectedCategoryFilter(cat); setIsFilterMenuOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                        selectedCategoryFilter === cat 
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* More Options Button */}
                        <div className="relative">
                            <button 
                                onClick={() => { setIsMoreMenuOpen(!isMoreMenuOpen); setIsFilterMenuOpen(false); }}
                                className={`p-2 rounded-xl transition-colors ${isMoreMenuOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <MoreHorizontal size={20} />
                            </button>
                            {/* ... More Menu ... */}
                            {isMoreMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsMoreMenuOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 overflow-hidden animate-fade-in">
                                        <div className="p-1">
                                            <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2">
                                                <Archive size={16} /> Archivio Progetti
                                            </button>
                                            <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2">
                                                <Download size={16} /> Esporta Report
                                            </button>
                                            <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                            <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2">
                                                <Settings size={16} /> Impostazioni Vista
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6 pb-20">
                    {filteredBoards.map((project, idx) => {
                        const totalTasks = project.tasks.length;
                        const doneTasks = project.tasks.filter(t => t.status === 'done' || t.status === 'fatto').length;
                        const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
                        
                        const themeIndex = idx % 4;
                        const themes = ['bg-[#ffe8d6] dark:bg-orange-900/30', 'bg-[#d1fae5] dark:bg-emerald-900/30', 'bg-[#fce7f3] dark:bg-pink-900/30', 'bg-white dark:bg-slate-800'];
                        const textColors = ['text-slate-800 dark:text-orange-100', 'text-slate-800 dark:text-emerald-100', 'text-slate-800 dark:text-pink-100', 'text-slate-800 dark:text-white'];
                        const barColors = ['bg-orange-400', 'bg-emerald-500', 'bg-pink-400', 'bg-cyan-400'];
                        
                        const bgClass = themes[themeIndex];
                        const textClass = textColors[themeIndex];
                        const barClass = barColors[themeIndex];

                        return (
                        <div key={project.id} className={`${bgClass} p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer border border-transparent dark:border-white/5`}>
                            <div className="absolute top-5 right-5 md:top-6 md:right-6 px-3 py-1 rounded-full bg-white/50 dark:bg-black/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                {project.title.split(' ')[0]}
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <span className={`text-xs font-medium opacity-70 ${textClass}`}>Scadenza: --</span>
                            </div>

                            <h3 className={`text-lg md:text-xl font-bold ${textClass} mb-1`}>{project.title}</h3>
                            <p className={`text-xs md:text-sm mb-6 opacity-80 ${textClass}`}>{project.description || 'Nessuna descrizione'}</p>
                            
                            <div className="mb-6">
                                <div className="flex justify-between text-xs font-bold mb-2">
                                    <span className={textClass}>Progresso</span>
                                    <span className={textClass}>{progress}%</span>
                                </div>
                                <div className={`w-full h-1.5 md:h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden`}>
                                    <div className={`h-full ${barClass} rounded-full`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {project.members.length > 0 ? project.members.map((m, i) => (
                                    <img key={i} src={m.avatar} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" alt="membro" />
                                    )) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs text-slate-500">?</div>
                                    )}
                                    <div className={`w-8 h-8 rounded-full bg-white/50 dark:bg-black/30 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold ${textClass}`}>+</div>
                                </div>
                                <div className={`px-4 py-1.5 bg-white/60 dark:bg-black/20 rounded-full text-xs font-bold ${textClass}`}>{totalTasks - doneTasks} Task Attivi</div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR (Chat/Messages) --- */}
      {isChatOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-30"
            onClick={() => setIsChatOpen(false)}
          ></div>
      )}
      <div className={`fixed inset-y-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl w-80 md:w-96 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         {/* ... (Chat sidebar content same as before) ... */}
         <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Messaggi Clienti</h2>
            <div className="flex gap-2 items-center">
               <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Search size={20} /></button>
               <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={24} /></button>
            </div>
         </div>

         <div className="space-y-4 p-4 overflow-y-auto custom-scrollbar flex-1">
            {messages.map((msg) => (
               <div 
                  key={msg.id} 
                  onClick={() => setSelectedMessageId(msg.id)}
                  className={`flex gap-4 items-start p-4 rounded-2xl transition-all cursor-pointer border border-transparent ${
                    selectedMessageId === msg.id 
                      ? 'bg-white dark:bg-slate-800 shadow-sm border-slate-100 dark:border-slate-700 transform scale-[1.02]' 
                      : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
               >
                  <div className="relative">
                      <img src={msg.avatar} className="w-10 h-10 rounded-full object-cover" alt={msg.name} />
                      {!msg.read && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-baseline mb-1">
                        <h4 className={`font-bold text-sm ${!msg.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{msg.name}</h4>
                        <span className="text-xs text-slate-400">{msg.date}</span>
                     </div>
                     <p className={`text-xs line-clamp-2 leading-relaxed ${!msg.read ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400'}`}>
                       {msg.preview}
                     </p>
                  </div>
               </div>
            ))}
         </div>
         
         <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-indigo-500 transition shadow-lg">
                Nuovo Messaggio
            </button>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;

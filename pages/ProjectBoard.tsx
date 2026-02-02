
import React, { useState, useRef, useEffect } from 'react';
import { 
    Plus, Calendar as CalendarIcon, MessageSquare, 
    X, Layout, List, ChevronLeft, ChevronRight, ChevronDown,
    AlignLeft, CheckSquare, User, Tag, Paperclip, Clock, 
    Image as ImageIcon, CreditCard, ArrowRight, Copy, Trash2, Archive, Download,
    Check, MoreHorizontal, Edit2, Briefcase, Search, LayoutGrid, Users, FileText,
    Play, Pause, StopCircle, History, Timer as TimerIcon, AlertTriangle, AlertOctagon, Ban
} from 'lucide-react';
import { Task, Status, User as UserType, ChecklistItem, Attachment, Board, BoardColumn, Client, TimeLog } from '../types';

// --- MOCK DATA & CONFIG ---

const labelColors = [
    { name: 'Design', color: 'bg-emerald-500' },
    { name: 'Bug', color: 'bg-rose-500' },
    { name: 'Feature', color: 'bg-indigo-500' },
    { name: 'Marketing', color: 'bg-amber-500' },
    { name: 'Urgent', color: 'bg-red-600' },
    { name: 'Copy', color: 'bg-blue-400' },
];

const coverColors = [
    '#4f46e5', '#10b981', '#ef4444', '#f59e0b', 
    '#06b6d4', '#8b5cf6', '#334155', '#db2777', 
];

// --- TYPES FOR POPUP POSITIONING ---
type PopupState = {
    type: 'members' | 'labels' | 'checklist' | 'date' | 'cover' | 'move' | 'copy' | 'archive' | 'delete' | 'projects_dropdown' | 'column_options' | 'board_members' | null;
    top: number;
    right?: number;
    left?: number;
    data?: any; // To pass context (e.g., column ID)
};

interface ProjectBoardProps {
    boards: Board[];
    setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
    users: UserType[];
    clients?: Client[];
    onAddBoard?: (board: Board) => void;
    onAddClient?: (client: Client) => void;
    // Time Tracking Props
    timeLogs?: TimeLog[];
    onStartTimer?: (taskId: string) => void;
    onStopTimer?: (logId?: string) => void;
    onManualLog?: (taskId: string, start: number, end: number, desc: string) => void;
    onUpdateLog?: (logId: string, updates: Partial<TimeLog>) => void;
    onDeleteLog?: (logId: string) => void;
    currentUser?: UserType;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ 
    boards, setBoards, users, clients = [], onAddBoard, onAddClient,
    timeLogs = [], onStartTimer, onStopTimer, onManualLog, onUpdateLog, onDeleteLog, currentUser
}) => {
  // State
  const [activeBoardId, setActiveBoardId] = useState<string>(boards[0]?.id || '');
  const [view, setView] = useState<'board' | 'list' | 'calendar'>('board');
  
  // Project Dropdown State
  const [projectDropdownTab, setProjectDropdownTab] = useState<'projects' | 'clients'>('projects');
  const [expandedClients, setExpandedClients] = useState<string[]>([]);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helpers to get current data
  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];
  const tasks = activeBoard?.tasks || [];
  const columns = activeBoard?.columns || [];

  // Modal & Popup State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  
  // Time Tracking Modal State
  const [manualTimeStart, setManualTimeStart] = useState('');
  const [manualTimeEnd, setManualTimeEnd] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDuration, setManualDuration] = useState(''); // e.g. "2h 30m"
  const [manualDesc, setManualDesc] = useState('');
  const [manualEntryMode, setManualEntryMode] = useState<'range' | 'duration'>('range');

  // New Project/Client Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  
  // Form States
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientProject, setNewClientProject] = useState('');

  // Column Editing State
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');

  // Positioning
  const [activePopup, setActivePopup] = useState<PopupState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update active board if boards change (e.g. initialization)
  useEffect(() => {
      if (!activeBoard && boards.length > 0) {
          setActiveBoardId(boards[0].id);
      }
  }, [boards]);

  // Force re-render periodically for active timers
  const [_, setTick] = useState(0);
  useEffect(() => {
      const interval = setInterval(() => setTick(t => t + 1), 60000); // Update UI every minute
      return () => clearInterval(interval);
  }, []);

  if (!activeBoard) return <div className="p-8">Nessun progetto disponibile.</div>;

  // --- TIME TRACKING HELPERS ---
  const formatDuration = (ms: number) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)));
      
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m`;
      return `${seconds}s`; // Show seconds only for short durations
  };

  const calculateTaskTotalTime = (taskId: string) => {
      const logs = timeLogs.filter(l => l.taskId === taskId);
      const total = logs.reduce((acc, log) => {
          if (log.endTime) return acc + (log.endTime - log.startTime);
          // If active, add time until now
          return acc + (Date.now() - log.startTime);
      }, 0);
      return total;
  };

  const getActiveTimerForTask = (taskId: string) => {
      return timeLogs.find(l => l.taskId === taskId && l.endTime === null);
  };

  const handleManualTimeSubmit = () => {
      if (!selectedTask || !onManualLog) return;
      
      let startTs, endTs;

      if (manualEntryMode === 'range') {
          if (!manualTimeStart || !manualTimeEnd) return;
          startTs = new Date(`${manualDate}T${manualTimeStart}`).getTime();
          endTs = new Date(`${manualDate}T${manualTimeEnd}`).getTime();
      } else {
          // Duration mode parsing (simple)
          const hoursMatch = manualDuration.match(/(\d+)h/);
          const minutesMatch = manualDuration.match(/(\d+)m/);
          const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
          const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
          const durationMs = (hours * 3600000) + (minutes * 60000);
          
          if (durationMs <= 0) return;
          
          startTs = new Date(`${manualDate}T09:00:00`).getTime(); // Default start 9AM
          endTs = startTs + durationMs;
      }

      if (isNaN(startTs) || isNaN(endTs) || endTs <= startTs) {
          alert("Orario non valido.");
          return;
      }

      onManualLog(selectedTask.id, startTs, endTs, manualDesc);
      
      // Reset form
      setManualTimeStart('');
      setManualTimeEnd('');
      setManualDuration('');
      setManualDesc('');
  };

  // --- CREATION ACTIONS ---

  const handleCreateProject = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProjectTitle || !onAddBoard) return;

      const newBoard: Board = {
          id: `b_${Date.now()}`,
          title: newProjectTitle,
          description: newProjectDesc || 'Nessuna descrizione',
          client: newProjectClient || undefined,
          columns: [
            { id: 'todo', title: 'Da Fare' },
            { id: 'progress', title: 'In Corso' },
            { id: 'done', title: 'Completato' }
          ],
          tasks: [],
          members: users ? [users[0]] : [] // Assign current user
      };

      onAddBoard(newBoard);
      setShowProjectModal(false);
      setActiveBoardId(newBoard.id);
      // Reset
      setNewProjectTitle('');
      setNewProjectDesc('');
      setNewProjectClient('');
  };

  const handleCreateClient = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClientName || !newClientCompany || !onAddClient) return;

      const newClient: Client = {
          id: `c_${Date.now()}`,
          name: newClientName,
          company: newClientCompany,
          project: newClientProject || 'Nuovo Progetto',
          avatar: `https://ui-avatars.com/api/?name=${newClientCompany.replace(' ', '+')}&background=random`,
          status: 'active',
          lastAccess: 'Mai'
      };

      onAddClient(newClient);
      
      // If a project name was provided, create that project too
      if (newClientProject && onAddBoard) {
          const newBoard: Board = {
              id: `b_${Date.now()}`,
              title: newClientProject,
              description: `Progetto per ${newClientCompany}`,
              client: newClientCompany,
              columns: [{ id: 'todo', title: 'To Do' }, { id: 'done', title: 'Done' }],
              tasks: [],
              members: users ? [users[0]] : []
          };
          onAddBoard(newBoard);
          setActiveBoardId(newBoard.id);
      }

      setShowClientModal(false);
      setNewClientName('');
      setNewClientCompany('');
      setNewClientProject('');
  };

  // --- BOARD ACTIONS ---

  const handleBoardSwitch = (boardId: string) => {
      setActiveBoardId(boardId);
      setActivePopup(null);
  };

  const toggleClientExpansion = (clientName: string) => {
      setExpandedClients(prev => 
          prev.includes(clientName) ? prev.filter(c => c !== clientName) : [...prev, clientName]
      );
  };

  const updateActiveBoard = (updates: Partial<Board>) => {
      setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, ...updates } : b));
  };

  const toggleBoardMember = (user: UserType) => {
      const isMember = activeBoard.members.some(m => m.id === user.id);
      let newMembers;
      if (isMember) {
          newMembers = activeBoard.members.filter(m => m.id !== user.id);
      } else {
          newMembers = [...activeBoard.members, user];
      }
      updateActiveBoard({ members: newMembers });
  };

  // --- COLUMN ACTIONS ---

  const handleAddColumn = () => {
      const newCol: BoardColumn = {
          id: `col_${Date.now()}`,
          title: 'Nuova Colonna'
      };
      updateActiveBoard({ columns: [...activeBoard.columns, newCol] });
      setEditingColumnId(newCol.id);
      setEditingColumnTitle(newCol.title);
  };

  const handleEditColumnStart = (col: BoardColumn) => {
      setEditingColumnId(col.id);
      setEditingColumnTitle(col.title);
  };

  const handleEditColumnSave = () => {
      if (editingColumnId && editingColumnTitle.trim()) {
          const newCols = activeBoard.columns.map(c => c.id === editingColumnId ? { ...c, title: editingColumnTitle } : c);
          updateActiveBoard({ columns: newCols });
      }
      setEditingColumnId(null);
  };

  const handleDeleteColumn = (colId: string) => {
      if (activeBoard.columns.length <= 1) {
          alert("Non puoi eliminare l'ultima colonna.");
          return;
      }
      
      const newCols = activeBoard.columns.filter(c => c.id !== colId);
      const fallbackColId = newCols[0].id;
      const newTasks = activeBoard.tasks.map(t => t.status === colId ? { ...t, status: fallbackColId } : t);

      updateActiveBoard({ columns: newCols, tasks: newTasks });
      setActivePopup(null);
  };

  // --- TASK ACTIONS ---

  const updateTasksInBoard = (newTasks: Task[]) => {
      updateActiveBoard({ tasks: newTasks });
  };

  const moveTask = (taskId: string, targetColId: string) => {
    // Check if moving to done
    const targetCol = columns.find(c => c.id === targetColId);
    const isDone = targetCol?.title.toLowerCase().includes('done') || targetCol?.title.toLowerCase().includes('fatto');
    
    // Check previous state for Rework
    const task = tasks.find(t => t.id === taskId);
    const prevCol = columns.find(c => c.id === task?.status);
    const wasDone = prevCol?.title.toLowerCase().includes('done') || prevCol?.title.toLowerCase().includes('fatto');
    
    let reworkInc = 0;
    if (wasDone && !isDone) reworkInc = 1;

    const newTasks = tasks.map(t => t.id === taskId ? { 
        ...t, 
        status: targetColId, 
        reworkCount: (t.reworkCount || 0) + reworkInc,
        completedAt: isDone ? new Date().toISOString() : undefined
    } : t);

    updateTasksInBoard(newTasks);
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { 
        ...prev, 
        status: targetColId, 
        reworkCount: (prev.reworkCount || 0) + reworkInc 
    } : null);
    setActivePopup(null);
  };

  // --- DRAG AND DROP HANDLERS ---
  
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      // Optional: Set a drag image or specific data if needed
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      if (draggedTaskId) {
          moveTask(draggedTaskId, targetColumnId);
          setDraggedTaskId(null);
      }
  };

  const openTaskModal = (task?: Task, columnId?: string) => {
      if (task) {
          setSelectedTask(task);
          setDescDraft(task.description || '');
      } else {
          const newTask: Task = {
              id: Date.now().toString(),
              title: 'Nuova Scheda',
              description: '',
              status: columnId || activeBoard.columns[0].id,
              priority: 'Medium',
              assignees: [],
              dueDate: new Date().toISOString().split('T')[0],
              comments: 0,
              tags: [],
              checklist: [],
              attachments: [],
              effort: 0,
              isBlocked: false,
              reworkCount: 0
          };
          setSelectedTask(newTask);
          setDescDraft('');
      }
      setIsEditingDesc(false);
      setActivePopup(null);
  };

  const saveTaskChanges = () => {
      if (!selectedTask) return;
      const exists = tasks.find(t => t.id === selectedTask.id);
      let newTasks;
      
      if (exists) {
          newTasks = tasks.map(t => t.id === selectedTask.id ? { ...selectedTask, description: descDraft } : t);
      } else {
          newTasks = [...tasks, { ...selectedTask, description: descDraft }];
      }
      updateTasksInBoard(newTasks);
      setSelectedTask(prev => prev ? { ...prev, description: descDraft } : null);
      setIsEditingDesc(false);
  };

  const closeTaskModal = () => {
      if (isEditingDesc) saveTaskChanges(); 
      setSelectedTask(null);
      setActivePopup(null);
  };

  const updateSelectedTaskState = (updates: Partial<Task>) => {
      if(!selectedTask) return;
      const updated = { ...selectedTask, ...updates };
      setSelectedTask(updated);
      const newTasks = tasks.map(t => t.id === selectedTask.id ? updated : t);
      updateTasksInBoard(newTasks);
  };

  const toggleChecklistItem = (id: string) => {
      if(!selectedTask) return;
      const newChecklist = selectedTask.checklist?.map(c => c.id === id ? {...c, completed: !c.completed} : c);
      updateSelectedTaskState({ checklist: newChecklist });
  };
  
  const addChecklistItem = (text: string) => {
      if(!selectedTask || !text) return;
      const newItem: ChecklistItem = { id: Date.now().toString(), text, completed: false };
      updateSelectedTaskState({ checklist: [...(selectedTask.checklist || []), newItem] });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedTask || !e.target.files?.[0]) return;
      const file = e.target.files[0];
      const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type.startsWith('image/') ? 'image' : 'file'
      };
      updateSelectedTaskState({ attachments: [...(selectedTask.attachments || []), newAttachment] });
  };

  const copyTask = () => {
      if (!selectedTask) return;
      const copiedTask: Task = { ...selectedTask, id: Date.now().toString(), title: `${selectedTask.title} (Copia)` };
      updateTasksInBoard([...tasks, copiedTask]);
      setActivePopup(null);
  };

  const deleteTask = () => {
      if (!selectedTask) return;
      const newTasks = tasks.filter(t => t.id !== selectedTask.id);
      updateTasksInBoard(newTasks);
      setSelectedTask(null);
      setActivePopup(null);
  };

  // --- POPUP HANDLER (Responsive) ---
  const togglePopup = (e: React.MouseEvent<HTMLElement>, type: PopupState['type'], data?: any) => {
      e.stopPropagation();
      if (activePopup?.type === type && activePopup.data === data) {
          setActivePopup(null);
          return;
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      
      let top = rect.bottom + 5;
      let left = rect.left;
      let right = undefined;

      // Adjust for right edge overflow
      if (left + 300 > screenWidth) {
          left = undefined;
          right = screenWidth - rect.right;
      }

      if (type === 'projects_dropdown') {
          top = rect.bottom + 8;
      } 
      
      setActivePopup({
          type,
          top,
          left,
          right,
          data
      });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Low': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
      case 'Medium': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'High': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      case 'Critical': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getLabelColor = (tagName: string) => {
      const found = labelColors.find(l => l.name === tagName);
      return found ? found.color : 'bg-slate-400';
  };

  // --- CALENDAR HELPERS ---
  const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
      const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      return day === 0 ? 6 : day - 1; 
  };

  const handlePrevMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };


  // --- RENDER POPUPS ---
  const renderActivePopup = () => {
      if (!activePopup) return null;

      const style: React.CSSProperties = { top: activePopup.top, position: 'fixed', zIndex: 70 };
      if (activePopup.right !== undefined) style.right = activePopup.right;
      if (activePopup.left !== undefined) style.left = activePopup.left;

      return (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setActivePopup(null)}></div>
            <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                style={{ ...style, minWidth: '200px', maxWidth: '304px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* --- PROJECTS DROPDOWN (ENHANCED) --- */}
                {activePopup.type === 'projects_dropdown' && (
                    <div className="w-72">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button 
                                    onClick={() => setProjectDropdownTab('projects')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition ${projectDropdownTab === 'projects' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                                >
                                    <LayoutGrid size={12}/> Progetti
                                </button>
                                <button 
                                    onClick={() => setProjectDropdownTab('clients')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition ${projectDropdownTab === 'clients' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                                >
                                    <Users size={12}/> Clienti
                                </button>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {/* LIST VIEW */}
                            {projectDropdownTab === 'projects' && (
                                <div className="py-2">
                                    <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recenti</div>
                                    {boards.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => handleBoardSwitch(b.id)}
                                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${activeBoardId === b.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                                        >
                                            <div className="truncate">
                                                <span className="font-bold block text-sm truncate">{b.title}</span>
                                                {b.client && <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Briefcase size={8} /> {b.client}</span>}
                                            </div>
                                            {activeBoardId === b.id && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* CLIENT VIEW (Accordion) */}
                            {projectDropdownTab === 'clients' && (
                                <div className="py-2">
                                    {/* Get Unique Clients from Boards + Clients List */}
                                    {Array.from(new Set([...boards.map(b => b.client).filter(Boolean), ...clients.map(c => c.company)])).map(clientName => {
                                        const clientBoards = boards.filter(b => b.client === clientName);
                                        const isExpanded = expandedClients.includes(clientName as string);
                                        
                                        return (
                                            <div key={clientName as string}>
                                                <button 
                                                    onClick={() => toggleClientExpansion(clientName as string)}
                                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                                            {(clientName as string).substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{clientName}</span>
                                                    </div>
                                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                                
                                                {isExpanded && (
                                                    <div className="bg-slate-50 dark:bg-slate-900/30 border-y border-slate-100 dark:border-slate-700/50">
                                                        {clientBoards.length > 0 ? clientBoards.map(b => (
                                                            <button
                                                                key={b.id}
                                                                onClick={() => handleBoardSwitch(b.id)}
                                                                className={`w-full text-left pl-12 pr-4 py-2 text-sm transition ${activeBoardId === b.id ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                                            >
                                                                {b.title}
                                                            </button>
                                                        )) : (
                                                            <div className="pl-12 py-2 text-xs text-slate-400 italic">Nessun progetto attivo</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Unassigned Projects */}
                                    {boards.filter(b => !b.client).length > 0 && (
                                        <div>
                                            <button 
                                                onClick={() => toggleClientExpansion('unassigned')}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                                        --
                                                    </div>
                                                    <span className="font-bold text-sm text-slate-500">Non Assegnati</span>
                                                </div>
                                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedClients.includes('unassigned') ? 'rotate-180' : ''}`} />
                                            </button>
                                            {expandedClients.includes('unassigned') && (
                                                <div className="bg-slate-50 dark:bg-slate-900/30 border-y border-slate-100 dark:border-slate-700/50">
                                                    {boards.filter(b => !b.client).map(b => (
                                                        <button
                                                            key={b.id}
                                                            onClick={() => handleBoardSwitch(b.id)}
                                                            className={`w-full text-left pl-12 pr-4 py-2 text-sm transition ${activeBoardId === b.id ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                                        >
                                                            {b.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 mt-2 pt-2 px-2 pb-2">
                             {projectDropdownTab === 'projects' ? (
                                <button 
                                    onClick={() => { setShowProjectModal(true); setActivePopup(null); }}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                >
                                    <Plus size={16} /> Crea nuovo board
                                </button>
                             ) : (
                                <button 
                                    onClick={() => { setShowClientModal(true); setActivePopup(null); }}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                >
                                    <Plus size={16} /> Aggiungi cliente
                                </button>
                             )}
                        </div>
                    </div>
                )}

                {/* --- BOARD MEMBERS POPUP --- */}
                {/* ... (Previous board members popup code remains unchanged) ... */}
                {activePopup.type === 'board_members' && (
                    <div className="py-2 w-64">
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Gestisci Team Progetto</span>
                        </div>
                        <div className="px-3 mb-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input placeholder="Cerca persone..." className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none dark:text-white" autoFocus />
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {users.map(u => {
                                const isMember = activeBoard.members.some(m => m.id === u.id);
                                return (
                                    <button 
                                        key={u.id} 
                                        onClick={() => toggleBoardMember(u)}
                                        className="w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group"
                                    >
                                        <div className="relative">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" />
                                            {isMember && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800"><Check size={8} /></div>}
                                        </div>
                                        <span className={`text-sm font-medium flex-1 ${isMember ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{u.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- COLUMN OPTIONS --- */}
                {activePopup.type === 'column_options' && (
                    <div className="py-1 w-48">
                        <button 
                            onClick={() => { handleDeleteColumn(activePopup.data); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Elimina Colonna
                        </button>
                    </div>
                )}

                {/* --- TASK ACTIONS --- */}
                {(['members', 'labels', 'date', 'cover', 'move', 'copy', 'archive', 'delete'].includes(activePopup.type || '')) && (
                     <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 mb-2">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex-1 text-center capitalize">
                            {activePopup.type}
                        </span>
                        <button onClick={() => setActivePopup(null)} className="absolute right-3 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                     </div>
                )}
                
                {/* ... (Existing generic popup contents for task actions) ... */}
                {activePopup.type === 'move' && selectedTask && (
                    <div className="p-2">
                        <div className="text-center font-bold text-sm border-b pb-2 mb-2 dark:text-white">Sposta in:</div>
                        {columns.map(col => (
                            <button 
                                key={col.id} 
                                onClick={() => moveTask(selectedTask.id, col.id)}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300 ${selectedTask.status === col.id ? 'font-bold bg-indigo-50 text-indigo-700' : ''}`}
                            >
                                {col.title}
                                {selectedTask.status === col.id && <span className="float-right">(attuale)</span>}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* COVER POPUP */}
                {activePopup.type === 'cover' && selectedTask && (
                    <div className="p-3 pt-0">
                        <div className="text-xs font-bold text-slate-500 mb-2">COLORI</div>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {coverColors.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => { updateSelectedTaskState({ cover: c }); setActivePopup(null); }}
                                    className={`h-8 rounded-[4px] hover:opacity-80 transition relative ${selectedTask.cover === c ? 'ring-2 ring-slate-800 dark:ring-white ring-offset-1' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <button 
                            onClick={() => { updateSelectedTaskState({ cover: undefined }); setActivePopup(null); }}
                            className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded"
                        >
                            Rimuovi Copertina
                        </button>
                    </div>
                )}
                
                {/* MEMBERS POPUP */}
                 {activePopup.type === 'members' && selectedTask && (
                    <div className="p-3 pt-0">
                        <input placeholder="Cerca membri..." className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded mb-3 text-sm outline-none dark:bg-slate-700 dark:text-white" autoFocus />
                        <div className="space-y-1">
                            {(activeBoard.members.length > 0 ? activeBoard.members : users).map(u => {
                                const isAssigned = selectedTask.assignees.some(m => m.id === u.id);
                                return (
                                    <button 
                                        key={u.id} 
                                        onClick={() => {
                                            const newAssignees = isAssigned 
                                                ? selectedTask.assignees.filter(m => m.id !== u.id)
                                                : [...selectedTask.assignees, u];
                                            updateSelectedTaskState({ assignees: newAssignees });
                                        }}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-left"
                                    >
                                        <img src={u.avatar} className="w-8 h-8 rounded-full" />
                                        <span className="text-sm font-medium dark:text-slate-200 flex-1">{u.name}</span>
                                        {isAssigned && <Check size={16} className="text-indigo-600"/>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* LABELS POPUP */}
                {activePopup.type === 'labels' && selectedTask && (
                    <div className="p-3 pt-0 space-y-1">
                        {labelColors.map(l => {
                            const active = selectedTask.tags.includes(l.name);
                            return (
                                <div key={l.name} className="flex items-center gap-1">
                                    <button 
                                        onClick={() => {
                                            const newTags = active 
                                                ? selectedTask.tags.filter(t => t !== l.name)
                                                : [...selectedTask.tags, l.name];
                                            updateSelectedTaskState({ tags: newTags });
                                        }}
                                        className={`flex-1 h-8 rounded-[4px] text-white text-sm font-bold text-left px-3 hover:opacity-90 transition relative ${l.color}`}
                                    >
                                        {l.name}
                                        {active && <Check size={14} className="absolute right-2 top-2" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* DATE POPUP */}
                {activePopup.type === 'date' && selectedTask && (
                    <div className="p-3 pt-0">
                         <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 mb-3">
                             <input 
                                type="date" 
                                className="w-full bg-transparent text-sm outline-none dark:text-white"
                                onChange={(e) => updateSelectedTaskState({ dueDate: e.target.value })}
                                value={selectedTask.dueDate}
                             />
                         </div>
                         <button onClick={() => setActivePopup(null)} className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold">Salva</button>
                    </div>
                )}

                {/* DELETE/ARCHIVE/COPY Generic Handlers */}
                {activePopup.type === 'copy' && (
                    <div className="p-2">
                         <button onClick={copyTask} className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold">Crea Copia</button>
                    </div>
                )}
                {(activePopup.type === 'delete') && (
                    <div className="p-2">
                         <button onClick={deleteTask} className="w-full bg-red-600 text-white py-2 rounded text-sm font-bold hover:bg-red-700">Elimina Definitivamente</button>
                    </div>
                )}

            </div>
          </>
      );
  };

  // --- RENDERERS ---

  const renderTaskModal = () => {
    if (!selectedTask) return null;
    const taskLogs = timeLogs.filter(l => l.taskId === selectedTask.id).sort((a,b) => b.startTime - a.startTime);
    const activeLog = getActiveTimerForTask(selectedTask.id);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={closeTaskModal}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row relative" onClick={e => e.stopPropagation()}>
           <button onClick={closeTaskModal} className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><X size={24}/></button>

           {/* --- MAIN CONTENT (Left) --- */}
           <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                {/* Header / Cover */}
                {selectedTask.cover && <div className="h-32 rounded-xl mb-6 w-full" style={{ backgroundColor: selectedTask.cover }}></div>}
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 p-3 rounded-lg"><Layout size={24} /></div>
                    <div className="flex-1">
                        <input 
                            type="text" 
                            className="w-full text-xl md:text-2xl font-bold bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            value={selectedTask.title}
                            onChange={(e) => updateSelectedTaskState({ title: e.target.value })}
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 ml-1">nella lista <span className="font-bold underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4">{activeBoard.columns.find(c => c.id === selectedTask.status)?.title || '...'}</span></p>
                    </div>
                </div>

                {/* NEW: BLOCKED STATUS WARNING */}
                {selectedTask.isBlocked && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <Ban size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Task Bloccato</h4>
                            <p className="text-xs text-red-600 dark:text-red-300 mt-1">Questo task è segnalato come bloccato. Risolvi il problema prima di procedere.</p>
                        </div>
                        <button onClick={() => updateSelectedTaskState({ isBlocked: false })} className="ml-auto text-xs font-bold text-red-700 hover:underline">Sblocca</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-3 space-y-8">
                        {/* Description */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wide"><AlignLeft size={16}/> Descrizione</div>
                            {isEditingDesc ? (
                                <div className="space-y-2">
                                    <textarea 
                                        autoFocus
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        value={descDraft}
                                        onChange={(e) => setDescDraft(e.target.value)}
                                        placeholder="Aggiungi una descrizione dettagliata..."
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={saveTaskChanges} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700">Salva</button>
                                        <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm">Annulla</button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setIsEditingDesc(true)}
                                    className="min-h-[80px] p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                >
                                    {selectedTask.description || <span className="text-slate-400 italic">Aggiungi una descrizione...</span>}
                                </div>
                            )}
                        </div>

                        {/* TIME TRACKING SECTION */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wide"><TimerIcon size={16}/> Tracciamento Tempo</div>
                                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    Totale: {formatDuration(calculateTaskTotalTime(selectedTask.id))}
                                </div>
                            </div>

                            {/* ACTIVE TIMER */}
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    {activeLog ? (
                                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 animate-pulse">
                                            <Pause size={14} fill="currentColor" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                            <Play size={14} fill="currentColor" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-white">
                                            {activeLog ? 'Timer in corso...' : 'Avvia nuovo timer'}
                                        </div>
                                        {activeLog && <div className="text-xs text-slate-500 font-mono">{formatDuration(Date.now() - activeLog.startTime)}</div>}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => activeLog ? onStopTimer && onStopTimer(activeLog.id) : onStartTimer && onStartTimer(selectedTask.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeLog ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                                >
                                    {activeLog ? 'Stop' : 'Start'}
                                </button>
                            </div>

                            {/* MANUAL ENTRY */}
                            <div className="mb-4">
                                <div className="text-xs font-bold text-slate-400 mb-2 uppercase">Aggiungi Manualmente</div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex text-xs">
                                        <button onClick={() => setManualEntryMode('range')} className={`flex-1 py-1 rounded ${manualEntryMode === 'range' ? 'bg-slate-100 dark:bg-slate-600 font-bold' : ''}`}>Da-A</button>
                                        <button onClick={() => setManualEntryMode('duration')} className={`flex-1 py-1 rounded ${manualEntryMode === 'duration' ? 'bg-slate-100 dark:bg-slate-600 font-bold' : ''}`}>Durata</button>
                                    </div>
                                    <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-xs outline-none dark:text-white" />
                                </div>
                                <div className="flex gap-2 mb-2">
                                    {manualEntryMode === 'range' ? (
                                        <>
                                            <input type="time" value={manualTimeStart} onChange={e => setManualTimeStart(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none flex-1 dark:text-white" />
                                            <span className="self-center text-slate-400">-</span>
                                            <input type="time" value={manualTimeEnd} onChange={e => setManualTimeEnd(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none flex-1 dark:text-white" />
                                        </>
                                    ) : (
                                        <input type="text" value={manualDuration} onChange={e => setManualDuration(e.target.value)} placeholder="es. 1h 30m" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none flex-1 dark:text-white" />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="Descrizione attività..." className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none flex-1 dark:text-white" />
                                    <button onClick={handleManualTimeSubmit} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">Aggiungi</button>
                                </div>
                            </div>

                            {/* LOG LIST */}
                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                {taskLogs.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">Nessuna attività registrata.</p> : taskLogs.map(log => {
                                    const user = users.find(u => u.id === log.userId) || currentUser;
                                    const canEdit = currentUser?.role === 'Admin' || currentUser?.id === log.userId;
                                    return (
                                        <div key={log.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded group">
                                            <div className="flex items-center gap-2">
                                                <img src={user?.avatar} className="w-5 h-5 rounded-full" title={user?.name} />
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                        {new Date(log.startTime).toLocaleDateString()}
                                                        {log.isManual && <span className="ml-1 text-[9px] bg-slate-200 dark:bg-slate-700 px-1 rounded text-slate-500">Manuale</span>}
                                                    </span>
                                                    <span className="text-slate-400">{log.description || 'Tracking tempo'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-slate-800 dark:text-white">
                                                    {log.endTime ? formatDuration(log.endTime - log.startTime) : 'In corso...'}
                                                </span>
                                                {canEdit && (
                                                    <button onClick={() => onDeleteLog && onDeleteLog(log.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Checklist */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wide"><CheckSquare size={16}/> Checklist</div>
                                {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                                    <span className="text-xs text-slate-400">
                                        {Math.round((selectedTask.checklist.filter(i => i.completed).length / selectedTask.checklist.length) * 100)}%
                                    </span>
                                )}
                            </div>
                            
                            {/* Progress Bar */}
                            {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-300" 
                                        style={{ width: `${(selectedTask.checklist.filter(i => i.completed).length / selectedTask.checklist.length) * 100}%` }}
                                    ></div>
                                </div>
                            )}

                            <div className="space-y-2 mb-3">
                                {selectedTask.checklist?.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 group">
                                        <input 
                                            type="checkbox" 
                                            checked={item.completed} 
                                            onChange={() => toggleChecklistItem(item.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <span className={`flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Aggiungi un elemento..." 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:text-white"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addChecklistItem((e.target as HTMLInputElement).value);
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }}
                                />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold text-slate-500 dark:text-slate-300">Add</button>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div>
                             <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-white font-bold text-sm uppercase tracking-wide"><Paperclip size={16}/> Allegati</div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                 {selectedTask.attachments?.map(att => (
                                     <a href={att.url} target="_blank" rel="noreferrer" key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition group">
                                         <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700">
                                             {att.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                                         </div>
                                         <div className="overflow-hidden">
                                             <p className="font-bold text-sm truncate dark:text-slate-200">{att.name}</p>
                                             <p className="text-[10px] text-slate-400 uppercase font-bold">Aggiunto di recente</p>
                                         </div>
                                     </a>
                                 ))}
                                 <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition text-slate-400 hover:text-indigo-500"
                                 >
                                     <Plus size={20} /> <span className="text-sm font-bold">Carica</span>
                                 </div>
                                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                             </div>
                        </div>
                    </div>
                </div>
           </div>

           {/* --- SIDEBAR (Right - Mobile Stacked / Desktop Sidebar) --- */}
           <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900/50 p-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 flex flex-col gap-6 overflow-y-auto max-h-[300px] md:max-h-full">
                <div>
                    <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Dettagli</span>
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Stato</span>
                            <div className="relative">
                                <select 
                                    value={selectedTask.status} 
                                    onChange={(e) => updateSelectedTaskState({ status: e.target.value })}
                                    className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                >
                                    {activeBoard.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Priorità</span>
                            <div className="flex gap-1">
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => updateSelectedTaskState({ priority: p as any })}
                                        className={`flex-1 h-1.5 rounded-full transition-all ${selectedTask.priority === p ? 'bg-indigo-600 scale-110' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'}`} 
                                        title={p}
                                    />
                                ))}
                            </div>
                            <span className={`text-xs font-bold mt-1 ${
                                selectedTask.priority === 'Critical' ? 'text-purple-600' : selectedTask.priority === 'High' ? 'text-red-600' : selectedTask.priority === 'Medium' ? 'text-orange-500' : 'text-slate-500'
                            }`}>{selectedTask.priority}</span>
                        </div>

                        {/* Effort Input */}
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Effort (ore)</span>
                            <input 
                                type="number" 
                                min="0" 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={selectedTask.effort || ''}
                                onChange={(e) => updateSelectedTaskState({ effort: parseFloat(e.target.value) })}
                                placeholder="Stima..."
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Azioni</span>
                    <div className="space-y-2">
                         <button onClick={(e) => togglePopup(e, 'members')} className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition text-left">
                            <User size={14} /> Membri
                         </button>
                         <button onClick={(e) => togglePopup(e, 'labels')} className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition text-left">
                            <Tag size={14} /> Etichette
                         </button>
                         <button onClick={(e) => togglePopup(e, 'date')} className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition text-left">
                            <Clock size={14} /> Scadenza
                         </button>
                         
                         {/* Toggle Blocked */}
                         <button 
                            onClick={() => updateSelectedTaskState({ isBlocked: !selectedTask.isBlocked })} 
                            className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition text-left ${selectedTask.isBlocked ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
                         >
                            <Ban size={14} /> {selectedTask.isBlocked ? 'Sblocca Task' : 'Segnala Blocco'}
                         </button>
                    </div>
                </div>

                <div className="mt-auto">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Gestione</span>
                    <div className="space-y-2">
                        <button onClick={(e) => togglePopup(e, 'move')} className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition text-left"><ArrowRight size={14}/> Sposta</button>
                        <button onClick={(e) => togglePopup(e, 'copy')} className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition text-left"><Copy size={14}/> Copia</button>
                        <hr className="border-slate-200 dark:border-slate-700 my-2" />
                        <button onClick={(e) => togglePopup(e, 'archive')} className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition text-left"><Archive size={14}/> Archivia</button>
                        <button onClick={(e) => togglePopup(e, 'delete')} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition text-left"><Trash2 size={14}/> Elimina</button>
                    </div>
                </div>
           </div>
        </div>
      </div>
    );
  };

  const renderBoardView = () => (
    <div className="flex h-full gap-6 pb-4">
        {activeBoard.columns.map(col => (
            <div 
                key={col.id} 
                className={`w-[85vw] md:w-80 flex-shrink-0 flex flex-col max-h-full transition-colors ${draggedTaskId ? 'bg-slate-50/50 dark:bg-slate-900/30 rounded-xl' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
            >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1 group">
                    <div className="flex items-center gap-2">
                        {editingColumnId === col.id ? (
                            <input 
                                autoFocus
                                value={editingColumnTitle}
                                onChange={(e) => setEditingColumnTitle(e.target.value)}
                                onBlur={handleEditColumnSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleEditColumnSave()}
                                className="bg-white dark:bg-slate-700 px-2 py-1 rounded text-sm font-bold border border-indigo-500 outline-none w-32"
                            />
                        ) : (
                            <h3 
                                onClick={() => handleEditColumnStart(col)}
                                className="font-bold text-slate-700 dark:text-slate-200 text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded transition"
                            >
                                {col.title}
                            </h3>
                        )}
                        <span className="text-xs font-medium text-slate-400">{tasks.filter(t => t.status === col.id).length}</span>
                    </div>
                    <div className="flex items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                         <button id="project-new-task-btn" onClick={() => openTaskModal(undefined, col.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Plus size={14}/></button>
                         <button onClick={(e) => togglePopup(e, 'column_options', col.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><MoreHorizontal size={14}/></button>
                    </div>
                </div>

                {/* Tasks Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1 pb-2">
                    {tasks.filter(t => t.status === col.id).map(task => {
                        const activeTimer = getActiveTimerForTask(task.id);
                        const totalTime = calculateTaskTotalTime(task.id);
                        
                        // Visual Indicators Logic
                        const isOverdue = new Date(task.dueDate) < new Date() && !col.title.toLowerCase().includes('done');
                        const isNearDeadline = !isOverdue && new Date(task.dueDate) < new Date(Date.now() + 172800000) && !col.title.toLowerCase().includes('done'); // 2 days
                        const isComplex = (task.effort || 0) > 10;

                        return (
                        <div 
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => openTaskModal(task)}
                            className={`group bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border hover:shadow-md transition cursor-grab active:cursor-grabbing relative 
                                ${draggedTaskId === task.id ? 'opacity-50 border-dashed border-indigo-400' : 
                                  task.isBlocked ? 'border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10' :
                                  isOverdue ? 'border-red-200 dark:border-red-800' :
                                  isComplex ? 'border-blue-200 dark:border-blue-800' : 
                                  'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                        >
                            {task.cover && <div className="h-2 w-full rounded-full mb-2" style={{ backgroundColor: task.cover }}></div>}
                            
                            {/* Visual Badges Row */}
                            {(isOverdue || isNearDeadline || isComplex || task.isBlocked) && (
                                <div className="flex gap-1 mb-2">
                                    {task.isBlocked && <span title="Bloccato" className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
                                    {isOverdue && <span title="Scaduto" className="w-2 h-2 rounded-full bg-red-400"></span>}
                                    {isNearDeadline && <span title="In scadenza" className="w-2 h-2 rounded-full bg-orange-400"></span>}
                                    {isComplex && <span title="Complesso (>10h)" className="w-2 h-2 rounded-full bg-blue-400"></span>}
                                </div>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-2">
                                {task.tags.map(tag => (
                                    <span key={tag} className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${getLabelColor(tag)}`}>{tag}</span>
                                ))}
                            </div>

                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug">{task.title}</h4>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); openTaskModal(task); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400"
                                >
                                    <Edit2 size={12} />
                                </button>
                            </div>
                            
                            {/* Footer info */}
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                     {task.isBlocked ? (
                                         <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                             <Ban size={10} /> BLOCKED
                                         </div>
                                     ) : (
                                         task.dueDate && (
                                             <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600' : isNearDeadline ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                                 <Clock size={10} />
                                                 {new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                                             </div>
                                         )
                                     )}
                                     
                                     <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            activeTimer ? onStopTimer && onStopTimer(activeTimer.id) : onStartTimer && onStartTimer(task.id);
                                        }}
                                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold transition ${activeTimer ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
                                     >
                                         {activeTimer ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                                         {activeTimer ? 'Running' : (totalTime > 0 ? formatDuration(totalTime) : '0m')}
                                     </button>
                                </div>
                                
                                <div className="flex -space-x-1.5">
                                    {task.assignees.map(u => (
                                        <img key={u.id} src={u.avatar} className="w-5 h-5 rounded-full border border-white dark:border-slate-800" title={u.name} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )})}
                    <button 
                        onClick={() => openTaskModal(undefined, col.id)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-sm font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                        <Plus size={16} /> Aggiungi
                    </button>
                </div>
            </div>
        ))}
        
        {/* Add Column Button */}
        <div className="w-[85vw] md:w-80 flex-shrink-0">
            <button 
                onClick={handleAddColumn}
                className="w-full h-12 flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-xl transition border-2 border-dashed border-slate-300 dark:border-slate-700"
            >
                <Plus size={20} /> Aggiungi Colonna
            </button>
        </div>
    </div>
  );

  const renderListView = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                    <th className="px-6 py-4 w-1/3">Task</th>
                    <th className="px-6 py-4">Stato</th>
                    <th className="px-6 py-4">Priorità</th>
                    <th className="px-6 py-4">Tempo</th>
                    <th className="px-6 py-4">Assegnatari</th>
                    <th className="px-6 py-4">Scadenza</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {activeBoard.columns.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.id);
                    if (colTasks.length === 0) return null;
                    return (
                        <React.Fragment key={col.id}>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                                <td colSpan={6} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">{col.title} ({colTasks.length})</td>
                            </tr>
                            {colTasks.map(task => {
                                const totalTime = calculateTaskTotalTime(task.id);
                                return (
                                <tr key={task.id} onClick={() => openTaskModal(task)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            {task.cover && <div className="w-2 h-8 rounded-full" style={{backgroundColor: task.cover}}></div>}
                                            <span className="font-bold text-slate-800 dark:text-white">{task.title}</span>
                                            {task.isBlocked && <Ban size={14} className="text-red-500" />}
                                            {task.tags.map(t => <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] text-white ${getLabelColor(t)}`}>{t}</span>)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-600">{col.title}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono text-slate-500">
                                        {totalTime > 0 ? formatDuration(totalTime) : '-'}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex -space-x-2">
                                            {task.assignees.map(u => (
                                                <img key={u.id} src={u.avatar} className="w-6 h-6 rounded-full border border-white dark:border-slate-800" title={u.name} />
                                            ))}
                                            {task.assignees.length === 0 && <span className="text-xs text-slate-400 italic">--</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                        {new Date(task.dueDate).toLocaleDateString()}
                                    </td>
                                </tr>
                            )})}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
    </div>
  );

  const renderCalendarView = () => (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronLeft size={20}/></button>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronRight size={20}/></button>
              </div>
          </div>
          
          <div className="min-w-[600px]">
            <div className="grid grid-cols-7 mb-2">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                    <div key={d} className="text-center text-sm font-bold text-slate-400 py-2">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-700">
                {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px] md:min-h-[120px] bg-slate-50/50 dark:bg-slate-900/50 border-r border-b border-slate-200 dark:border-slate-700"></div>
                ))}
                {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayTasks = tasks.filter(t => t.dueDate === dateStr);
                    
                    return (
                        <div key={day} className="min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group relative">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">{day}</span>
                            <div className="space-y-1">
                                {dayTasks.map(task => (
                                    <div 
                                      key={task.id} 
                                      onClick={() => openTaskModal(task)}
                                      className="text-[10px] p-1.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold truncate cursor-pointer hover:opacity-80 border-l-2 border-indigo-500"
                                    >
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => {
                                const newTask: Task = { ...selectedTask, id: Date.now().toString(), dueDate: dateStr, status: activeBoard.columns[0].id } as any; 
                                openTaskModal(newTask); 
                            }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><Plus size={14}/></button>
                        </div>
                    );
                })}
            </div>
          </div>
      </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#f3f4f6] dark:bg-slate-950 transition-colors relative">
      
      {renderActivePopup()}
      {renderTaskModal()}

      {/* --- ADD NEW PROJECT MODAL --- */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setShowProjectModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 p-8 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Nuovo Progetto</h3>
                <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full dark:text-slate-400"><X size={24} /></button>
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente (Opzionale)</label>
                    <select 
                      value={newProjectClient}
                      onChange={(e) => setNewProjectClient(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                    >
                        <option value="">Seleziona un cliente...</option>
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

      {/* --- ADD NEW CLIENT MODAL --- */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setShowClientModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 p-8 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Nuovo Cliente</h3>
                <button onClick={() => setShowClientModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full dark:text-slate-400"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleCreateClient} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Referente</label>
                    <input 
                      type="text" 
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Es. Mario Rossi"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      required
                      autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Azienda</label>
                    <input 
                      type="text" 
                      value={newClientCompany}
                      onChange={(e) => setNewClientCompany(e.target.value)}
                      placeholder="Es. Acme Corp"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Progetto Iniziale (Opzionale)</label>
                    <input 
                      type="text" 
                      value={newClientProject}
                      onChange={(e) => setNewClientProject(e.target.value)}
                      placeholder="Es. Website Redesign"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Creerà automaticamente un board per questo progetto.</p>
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg mt-2"
                >
                  Aggiungi Cliente
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-transparent px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           {/* Project Selector Trigger */}
           <button 
                id="project-selector-btn"
                onClick={(e) => togglePopup(e, 'projects_dropdown')}
                className="flex items-center gap-3 mb-1 group hover:opacity-80 transition max-w-full"
           >
                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-indigo-200 dark:shadow-none shadow-lg shrink-0">
                    {activeBoard.title.substring(0, 2).toUpperCase()}
                </span>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <span className="truncate flex items-center gap-2">
                        {activeBoard.client && (
                            <>
                                <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">{activeBoard.client}</span>
                                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
                            </>
                        )}
                        {activeBoard.title}
                    </span>
                    <ChevronDown size={20} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" />
                </h1>
           </button>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 ml-11 truncate max-w-xs md:max-w-none">{activeBoard.description}</p>
        </div>
        
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex -space-x-2 mr-4">
             {activeBoard.members.map(u => (
               <img key={u.id} src={u.avatar} alt={u.name} className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-[#f3f4f6] dark:border-slate-900 hover:scale-110 transition cursor-pointer" title={u.name} />
             ))}
             <button onClick={(e) => togglePopup(e, 'board_members')} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">+</button>
          </div>
          <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
          
          <button 
            onClick={() => openTaskModal()}
            className="flex items-center gap-2 px-3 py-2 md:px-4 bg-slate-900 dark:bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 shadow-lg shadow-slate-300 dark:shadow-none transition hover:-translate-y-0.5"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Nuovo Task</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="px-4 md:px-8 pb-4 md:pb-6 flex gap-1 overflow-x-auto no-scrollbar">
          <button onClick={() => setView('board')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'board' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}><Layout size={18} /> Board</button>
          <button onClick={() => setView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'list' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}><List size={18} /> Lista</button>
          <button onClick={() => setView('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'calendar' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}><CalendarIcon size={18} /> Calendario</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-x-auto px-4 md:px-8 pb-8 custom-scrollbar">
          {view === 'board' && renderBoardView()}
          {view === 'list' && renderListView()}
          {view === 'calendar' && renderCalendarView()}
      </div>
    </div>
  );
};

export default ProjectBoard;

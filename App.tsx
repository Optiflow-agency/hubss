
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Menu, X, ArrowRight, Home, MessageSquare, CalendarDays, Globe, CheckCircle, User, Clock } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { supabase } from './src/lib/supabase';
import Dashboard from './pages/Dashboard';
import ProjectBoard from './pages/ProjectBoard';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import ClientPortal from './pages/ClientPortal';
import Team from './pages/Team';
import Auth from './pages/Auth';
import AvatarMascot from './components/AvatarMascot';
import { useAuthContext } from './src/contexts/AuthContext';
import { Client, User as UserType, Channel, Board, Task, Message, RoleDefinition, TimeLog, BoardColumn, ChecklistItem, Attachment } from './types';

type Theme = 'light' | 'dark' | 'system';

// RGB Color Palettes for Tailwind Variable Injection
const colorPalettes: Record<string, Record<number, string>> = {
  indigo: {
    50: '238 242 255',
    100: '224 231 255',
    200: '199 210 254',
    300: '165 180 252',
    400: '129 140 248',
    500: '99 102 241',
    600: '79 70 229',
    700: '67 56 202',
    800: '55 48 163',
    900: '49 46 129',
    950: '30 27 75',
  },
  blue: {
    50: '239 246 255',
    100: '219 234 254',
    200: '191 219 254',
    300: '147 197 253',
    400: '96 165 250',
    500: '59 130 246',
    600: '37 99 235',
    700: '29 78 216',
    800: '30 64 175',
    900: '30 58 138',
    950: '23 37 84',
  },
  purple: {
    50: '250 245 255',
    100: '243 232 255',
    200: '233 213 255',
    300: '216 180 254',
    400: '192 132 252',
    500: '168 85 247',
    600: '147 51 234',
    700: '126 34 206',
    800: '107 33 168',
    900: '88 28 135',
    950: '59 7 100',
  },
  emerald: {
    50: '236 253 245',
    100: '209 250 229',
    200: '167 243 208',
    300: '110 231 183',
    400: '52 211 153',
    500: '16 185 129',
    600: '5 150 105',
    700: '4 120 87',
    800: '6 95 70',
    900: '6 78 59',
    950: '2 44 34',
  },
  rose: {
    50: '255 241 242',
    100: '255 228 230',
    200: '254 205 211',
    300: '253 164 175',
    400: '251 113 133',
    500: '244 63 94',
    600: '225 29 72',
    700: '190 18 60',
    800: '159 18 57',
    900: '136 19 55',
    950: '76 5 25',
  },
  orange: {
    50: '255 247 237',
    100: '255 237 213',
    200: '254 215 170',
    300: '253 186 116',
    400: '251 146 60',
    500: '249 115 22',
    600: '234 88 12',
    700: '194 65 12',
    800: '159 52 18',
    900: '124 45 18',
    950: '67 20 7',
  }
};

// Helper: format ISO date to Italian relative time
function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Adesso';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return new Date(isoDate).toLocaleDateString('it-IT');
}

// --- CONFETTI COMPONENT ---
const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        life: 100 + Math.random() * 50
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let activeParticles = false;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.life > 0) {
          activeParticles = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2; // Gravity
          p.life--;
          p.size *= 0.96; // Shrink

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (activeParticles) {
        requestAnimationFrame(animate);
      }
    };

    animate();

    // Clean up
    const timeout = setTimeout(() => {
        if(canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[130]" />;
};

const OnboardingTour: React.FC<{ onComplete: () => void, onChangeStep: (step: number) => void }> = ({ onComplete, onChangeStep }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; position: 'center' | 'right' }>({ top: 0, left: 0, position: 'center' });
  const [showConfetti, setShowConfetti] = useState(false);

  const steps = [
    {
      title: "Benvenuto su Hubss",
      description: "Questa è la tua nuova command center. Gestisci progetti, team e clienti.",
      target: "center"
    },
    {
      title: "Dashboard",
      description: "Panoramica immediata: scadenze, meeting e stato del team.",
      target: "dashboard"
    },
    {
      title: "Team & Ruoli",
      description: "Invita colleghi e assegna ruoli specifici.",
      target: "team"
    },
    {
      title: "Chat & AI",
      description: "Comunica in tempo reale e usa l'AI per generare idee.",
      target: "chat"
    },
    {
      title: "Progetti",
      description: "Gestisci il lavoro con Kanban, Liste e Calendari.",
      target: "projects"
    },
    {
      title: "Cronologia",
      description: "Traccia ogni attività e gestisci i file condivisi.",
      target: "documents"
    },
    {
      title: "Clienti",
      description: "Portale dedicato per approvazioni e ticket esterni.",
      target: "portal"
    },
    {
      title: "Tutto Pronto!",
      description: "Hai configurato tutto. Inizia a lavorare con Hubss.",
      target: "center"
    }
  ];

  // Effect to handle view changing and positioning
  useLayoutEffect(() => {
    onChangeStep(currentStep);
    
    // Slight delay to allow DOM to update (sidebar expansion/view change)
    const timer = setTimeout(() => {
        const isMobile = window.innerWidth < 768;
        const targetId = steps[currentStep].target;

        if (targetId === 'center' || isMobile) {
            setCoords({ top: 0, left: 0, position: 'center' });
        } else {
            const el = document.getElementById(`nav-item-${targetId}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                setCoords({ 
                    top: rect.top, 
                    left: rect.right + 15, // 15px margin from sidebar
                    position: 'right' 
                });
            } else {
                // Fallback if element not found
                setCoords({ top: 0, left: 0, position: 'center' });
            }
        }
    }, 150);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Trigger confetti on last step
  useEffect(() => {
      if (currentStep === steps.length - 1) {
          setShowConfetti(true);
      }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      onComplete();
    }
  };

  const isCenter = coords.position === 'center';

  return (
    <div className={`fixed inset-0 z-[120] ${isCenter ? 'flex items-center justify-center p-4' : ''}`}>
      {showConfetti && <Confetti />}
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500" />

      {/* Tour Card */}
      <div 
        className={`
            bg-white dark:bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative z-10 
            border border-slate-200 dark:border-slate-700 
            transition-all duration-500 ease-in-out
            ${isCenter ? 'animate-in zoom-in-95' : 'absolute transition-all duration-500'}
        `}
        style={!isCenter ? { top: coords.top, left: coords.left } : {}}
      >
        {/* Arrow for Desktop Side Positioning */}
        {!isCenter && (
            <div 
                className="absolute top-6 -left-2 w-4 h-4 bg-white dark:bg-slate-800 border-l border-b border-slate-200 dark:border-slate-700 transform rotate-45" 
            />
        )}

        <div className="flex justify-between items-center mb-4">
           <div className="flex gap-1">
              {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
              ))}
           </div>
           <button onClick={onComplete} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">SALTA</button>
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{steps[currentStep].title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed min-h-[3rem]">
            {steps[currentStep].description}
        </p>

        <div className="flex justify-between items-center">
            <button 
                onClick={() => setCurrentStep(c => Math.max(0, c - 1))}
                disabled={currentStep === 0}
                className={`text-sm font-bold ${currentStep === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
            >
                Indietro
            </button>
            <button 
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2"
            >
                {currentStep === steps.length - 1 ? 'Inizia' : 'Avanti'} <ArrowRight size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // CONSUME AUTH CONTEXT (session persistence)
  const { user: authUser, profile: authProfile, workspace: authWorkspace, loading: authLoading } = useAuthContext();

  // AUTH STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState<Theme>('light');
  const [primaryColor, setPrimaryColor] = useState('indigo');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  // NEW USER STATE
  const [isNewUser, setIsNewUser] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // AVATAR MASCOT STATE
  const [showMascot, setShowMascot] = useState(true);

  // Workspace Info
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('Hubss Workspace');
  const [workspaceLogo, setWorkspaceLogo] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Shared State - loaded from Supabase after login
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserType[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);

  // ROLE & AGENCY STATE
  const [roles, setRoles] = useState<RoleDefinition[]>([]);

  // Shared Message State
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});

  // Derived state for current user (safe fallback before login)
  const currentUser = teamMembers[0] || { id: '', name: '', avatar: '', accessibleClients: [] as string[] };

  // Derived Admin User for Mascot
  const adminUser = teamMembers.find(u => u.role === 'Admin') || currentUser;

  // Derived stats for Mascot
  const userTasks = boards.flatMap(b => b.tasks).filter(t => t.assignees.some(u => u.id === currentUser.id));
  const completedTasksCount = userTasks.filter(t => t.status.toLowerCase().includes('done') || t.status.toLowerCase().includes('fatto')).length;
  const pendingTasksCount = userTasks.filter(t => !t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('fatto')).length;

  // --- WORKSPACE DATA LOADING FROM SUPABASE ---
  const loadWorkspaceData = async (userId: string) => {
    setDataLoading(true);
    try {
      // 1. Get user profile to find workspace_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile?.workspace_id) {
        setDataLoading(false);
        return;
      }

      const wsId = profile.workspace_id;
      setWorkspaceId(wsId);

      // 2. Fetch all workspace data in parallel
      const [
        { data: dbProfiles },
        { data: dbBoards },
        { data: dbClients },
        { data: dbChannels },
        { data: dbRoles },
        { data: dbTimeLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('workspace_id', wsId),
        supabase.from('boards').select('*').eq('workspace_id', wsId),
        supabase.from('clients').select('*').eq('workspace_id', wsId),
        supabase.from('channels').select('*').eq('workspace_id', wsId),
        supabase.from('roles').select('*').eq('workspace_id', wsId),
        supabase.from('time_logs').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
      ]);

      // 3. Map profiles → frontend UserType
      const profileMap = new Map<string, UserType>();
      const mappedTeam: UserType[] = (dbProfiles || []).map(p => {
        const u: UserType = {
          id: p.id,
          name: p.name,
          email: p.email,
          avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name)}`,
          avatarConfig: p.avatar_config as UserType['avatarConfig'],
          status: p.status === 'away' ? 'offline' : (p.status as UserType['status']),
          role: p.role || undefined,
          accessibleClients: p.accessible_clients || [],
        };
        profileMap.set(p.id, u);
        return u;
      });

      // Ensure current user is at index 0
      const currentIdx = mappedTeam.findIndex(u => u.id === userId);
      if (currentIdx > 0) {
        const [cu] = mappedTeam.splice(currentIdx, 1);
        mappedTeam.unshift(cu);
      }
      setTeamMembers(mappedTeam);

      // 4. Map clients → frontend Client
      const clientCompanyMap = new Map<string, string>();
      const mappedClients: Client[] = (dbClients || []).map(c => {
        clientCompanyMap.set(c.id, c.company);
        return {
          id: c.id,
          name: c.name,
          company: c.company,
          avatar: c.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.company)}`,
          project: c.project || '',
          status: (c.status === 'archived' ? 'completed' : c.status) as Client['status'],
          lastAccess: c.last_access ? formatRelativeTime(c.last_access) : 'Mai',
          owner: c.owner_id ? (profileMap.get(c.owner_id)?.name || '') : '',
        };
      });
      setClients(mappedClients);

      // 5. Fetch tasks with assignees + attachments for workspace boards
      const boardIds = (dbBoards || []).map(b => b.id);
      let dbTasks: any[] = [];
      const boardMembersMap: Record<string, string[]> = {};
      const commentCounts: Record<string, number> = {};

      if (boardIds.length > 0) {
        const [
          { data: tasks },
          { data: boardMembers },
        ] = await Promise.all([
          supabase
            .from('tasks')
            .select('*, task_assignees(user_id), task_attachments(*)')
            .in('board_id', boardIds)
            .order('position', { ascending: true }),
          supabase
            .from('board_members')
            .select('board_id, user_id')
            .in('board_id', boardIds),
        ]);

        dbTasks = tasks || [];
        (boardMembers || []).forEach(bm => {
          if (!boardMembersMap[bm.board_id]) boardMembersMap[bm.board_id] = [];
          boardMembersMap[bm.board_id].push(bm.user_id);
        });

        // Fetch comment counts
        const taskIds = dbTasks.map((t: any) => t.id);
        if (taskIds.length > 0) {
          const { data: comments } = await supabase
            .from('task_comments')
            .select('task_id')
            .in('task_id', taskIds);
          (comments || []).forEach(c => {
            commentCounts[c.task_id] = (commentCounts[c.task_id] || 0) + 1;
          });
        }
      }

      // Group tasks by board and map to frontend Task type
      const tasksByBoard: Record<string, Task[]> = {};
      dbTasks.forEach((t: any) => {
        const assigneeIds: string[] = (t.task_assignees || []).map((a: any) => a.user_id);
        const assignees = assigneeIds.map((id: string) => profileMap.get(id)).filter(Boolean) as UserType[];
        const attachments: Attachment[] = (t.task_attachments || []).map((a: any) => ({
          id: a.id, name: a.name, url: a.url, type: a.type,
        }));

        const task: Task = {
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          status: t.status,
          priority: t.priority,
          assignees,
          dueDate: t.due_date || '',
          comments: commentCounts[t.id] || 0,
          tags: t.tags || [],
          checklist: (t.checklist as ChecklistItem[]) || undefined,
          cover: t.cover || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          clientVisible: t.client_visible,
          effort: t.effort || undefined,
          actualEffort: t.actual_effort || undefined,
          isBlocked: t.is_blocked,
          reworkCount: t.rework_count,
          completedAt: t.completed_at || undefined,
          totalTimeSpent: t.total_time_spent,
        };
        if (!tasksByBoard[t.board_id]) tasksByBoard[t.board_id] = [];
        tasksByBoard[t.board_id].push(task);
      });

      // 6. Map boards → frontend Board
      const mappedBoards: Board[] = (dbBoards || []).map(b => {
        const memberIds = boardMembersMap[b.id] || [];
        const members = memberIds.map(id => profileMap.get(id)).filter(Boolean) as UserType[];
        return {
          id: b.id,
          title: b.title,
          description: b.description || '',
          client: b.client_id ? (clientCompanyMap.get(b.client_id) || '') : undefined,
          columns: (b.columns as BoardColumn[]) || [],
          tasks: tasksByBoard[b.id] || [],
          members,
        };
      });
      setBoards(mappedBoards);

      // 7. Map channels + fetch messages
      const aiChannel: Channel = {
        id: 'ai', name: 'Hubss AI', type: 'ai', status: 'online',
        lastMessage: 'Come posso aiutarti?', category: 'Assistente',
      };
      const channelIds = (dbChannels || []).map(c => c.id);
      const messagesMap: Record<string, Message[]> = {
        ai: [{ id: '1', senderId: 'ai', content: 'Ciao! Sono Hubss AI. Posso aiutarti a gestire i tuoi progetti, analizzare i dati o creare nuovi task. Chiedimi pure!', timestamp: '10:00', isAi: true }],
      };

      if (channelIds.length > 0) {
        const { data: dbMessages } = await supabase
          .from('messages')
          .select('*')
          .in('channel_id', channelIds)
          .order('created_at', { ascending: true })
          .limit(500);

        (dbMessages || []).forEach(m => {
          const msg: Message = {
            id: m.id,
            senderId: m.sender_id || 'system',
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            isAi: m.is_ai,
            threadId: m.thread_id || undefined,
            replyCount: m.reply_count,
            reactions: (m.reactions as Message['reactions']) || undefined,
            pinned: m.pinned,
          };
          if (!messagesMap[m.channel_id]) messagesMap[m.channel_id] = [];
          messagesMap[m.channel_id].push(msg);
        });
      }

      // Build channel list with lastMessage
      const mappedChannels: Channel[] = [
        aiChannel,
        ...(dbChannels || []).map(c => {
          const msgs = messagesMap[c.id];
          const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1].content : undefined;
          return {
            id: c.id,
            name: c.name,
            type: c.type,
            category: c.category || undefined,
            avatar: c.avatar || undefined,
            lastMessage: lastMsg ? (lastMsg.length > 50 ? lastMsg.substring(0, 50) + '...' : lastMsg) : undefined,
          };
        }),
      ];
      setChannels(mappedChannels);
      setAllMessages(messagesMap);

      // 8. Map time logs → frontend TimeLog
      const mappedTimeLogs: TimeLog[] = (dbTimeLogs || []).map(tl => ({
        id: tl.id,
        taskId: tl.task_id,
        userId: tl.user_id,
        startTime: new Date(tl.start_time).getTime(),
        endTime: tl.end_time ? new Date(tl.end_time).getTime() : null,
        duration: tl.duration,
        description: tl.description || undefined,
        isManual: tl.is_manual,
      }));
      setTimeLogs(mappedTimeLogs);

      // 9. Map roles → frontend RoleDefinition
      const mappedRoles: RoleDefinition[] = (dbRoles || []).map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        isSystem: r.is_system,
        permissions: r.permissions || [],
      }));
      setRoles(mappedRoles);

    } catch (err) {
      console.error('Error loading workspace data:', err);
    }
    setDataLoading(false);
  };

  // Trigger data loading after authentication
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      loadWorkspaceData(currentUserId);
    }
  }, [isAuthenticated, currentUserId]);

  // Session restore: if AuthContext has a session but App is not authenticated, auto-login
  useEffect(() => {
    if (authLoading || isAuthenticated) return;

    if (authUser && authProfile) {
      // Don't restore session if onboarding was never completed
      if (!authProfile.workspace_id) {
        setLoading(false);
        return;
      }

      // Build frontend UserType from existing profile
      const restoredUser: UserType = {
        id: authProfile.id,
        name: authProfile.name,
        email: authProfile.email,
        avatar: authProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authProfile.name)}`,
        avatarConfig: authProfile.avatar_config as UserType['avatarConfig'],
        status: authProfile.status === 'away' ? 'offline' : (authProfile.status as UserType['status']),
        role: authProfile.role || undefined,
        accessibleClients: authProfile.accessible_clients || [],
      };

      setTeamMembers([restoredUser]);

      if (authWorkspace) {
        setWorkspaceName(authWorkspace.name);
        setWorkspaceLogo(authWorkspace.logo_url || '');
      }

      setCurrentUserId(authUser.id);
      setIsAuthenticated(true);
      // loadWorkspaceData will be triggered by the effect above
    }
  }, [authUser, authProfile, authWorkspace, authLoading, isAuthenticated]);

  // --- TIME TRACKING STATE ---
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  
  // Logic: Ensure only one active timer per user. We track the active session here.
  // We can derive "isActive" state for UI by checking if a log has endTime: null
  
  const startTimer = (taskId: string) => {
      // 1. Stop any currently active timer for this user
      const activeLog = timeLogs.find(log => log.userId === currentUser.id && log.endTime === null);
      if (activeLog) {
          stopTimer(activeLog.id);
      }

      // 2. Create new log
      const now = Date.now();
      const newLog: TimeLog = {
          id: `tl_${now}`,
          userId: currentUser.id,
          taskId: taskId,
          startTime: now,
          endTime: null,
          duration: 0,
          isManual: false
      };
      setTimeLogs(prev => [...prev, newLog]);

      // Persist to Supabase
      supabase.from('time_logs').insert({
        task_id: taskId,
        user_id: currentUser.id,
        start_time: new Date(now).toISOString(),
        is_manual: false,
      }).then(({ error }) => { if (error) console.error('Error starting timer:', error); });
  };

  const stopTimer = (logId?: string) => {
      const now = Date.now();
      const logToStop = timeLogs.find(log =>
          log.endTime === null && (logId ? log.id === logId : log.userId === currentUser.id)
      );

      setTimeLogs(prev => prev.map(log => {
          if (log.endTime === null && (logId ? log.id === logId : log.userId === currentUser.id)) {
              return { ...log, endTime: now, duration: now - log.startTime };
          }
          return log;
      }));

      // Persist to Supabase
      if (logToStop) {
        const duration = now - logToStop.startTime;
        supabase.from('time_logs').update({
          end_time: new Date(now).toISOString(),
          duration,
        }).eq('id', logToStop.id)
          .then(({ error }) => { if (error) console.error('Error stopping timer:', error); });
      }
  };

  const logManualTime = (taskId: string, startTime: number, endTime: number, description: string) => {
      const newLog: TimeLog = {
          id: `tl_man_${Date.now()}`,
          userId: currentUser.id,
          taskId: taskId,
          startTime: startTime,
          endTime: endTime,
          duration: endTime - startTime,
          description: description,
          isManual: true
      };
      setTimeLogs(prev => [...prev, newLog]);

      // Persist to Supabase
      supabase.from('time_logs').insert({
        task_id: taskId,
        user_id: currentUser.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        description,
        is_manual: true,
      }).then(({ error }) => { if (error) console.error('Error logging manual time:', error); });
  };

  const updateTimeLog = (logId: string, updates: Partial<TimeLog>) => {
      setTimeLogs(prev => prev.map(log => log.id === logId ? { ...log, ...updates } : log));

      // Persist to Supabase
      const dbUpdates: Record<string, any> = {};
      if (updates.startTime !== undefined) dbUpdates.start_time = new Date(updates.startTime).toISOString();
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime ? new Date(updates.endTime).toISOString() : null;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('time_logs').update(dbUpdates).eq('id', logId)
          .then(({ error }) => { if (error) console.error('Error updating time log:', error); });
      }
  };

  const deleteTimeLog = (logId: string) => {
      setTimeLogs(prev => prev.filter(log => log.id !== logId));

      // Persist to Supabase
      supabase.from('time_logs').delete().eq('id', logId)
        .then(({ error }) => { if (error) console.error('Error deleting time log:', error); });
  };

  // --- END TIME TRACKING ---

  // Handle Theme Change
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Handle Primary Color Change
  useEffect(() => {
    const root = window.document.documentElement;
    const palette = colorPalettes[primaryColor];
    
    if (palette) {
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });
    }
  }, [primaryColor]);

  const handleViewChange = (view: string) => {
      setActiveView(view);
      setIsMobileMenuOpen(false);
  };

  const handleSendMessage = (channelId: string, messageContent: string, senderId: string, isAi: boolean = false, parentId?: string) => {
      const newMessage: Message = {
          id: Date.now().toString(),
          senderId,
          content: messageContent,
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          isAi,
          threadId: parentId
      };

      // Optimistic local update
      setAllMessages(prev => {
          const currentMessages = prev[channelId] || [];
          let updatedMessages = [...currentMessages, newMessage];
          if (parentId) {
              updatedMessages = updatedMessages.map(msg =>
                  msg.id === parentId
                  ? { ...msg, replyCount: (msg.replyCount || 0) + 1 }
                  : msg
              );
          }
          return { ...prev, [channelId]: updatedMessages };
      });

      if (!parentId) {
          setChannels(prev => prev.map(c =>
              c.id === channelId
              ? { ...c, lastMessage: isAi ? 'AI Response' : (messageContent.includes('<') ? 'Allegato/Formattato' : messageContent) }
              : c
          ));
      }

      // Persist to Supabase (skip AI channel)
      if (channelId !== 'ai') {
        supabase.from('messages').insert({
          channel_id: channelId,
          sender_id: senderId,
          content: messageContent,
          is_ai: isAi,
          thread_id: parentId || null,
        }).then(({ error }) => {
          if (error) console.error('Error saving message:', error);
        });
      }
  };

  const handleAddReaction = (channelId: string, messageId: string, emoji: string) => {
      // Compute new reactions
      const msgs = allMessages[channelId] || [];
      const msg = msgs.find(m => m.id === messageId);
      if (!msg) return;

      const existingReactions = msg.reactions || [];
      const existingReaction = existingReactions.find(r => r.emoji === emoji);

      let newReactions;
      if (existingReaction) {
          newReactions = existingReactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
      } else {
          newReactions = [...existingReactions, { emoji, userId: currentUser.id, count: 1 }];
      }

      // Optimistic local update
      setAllMessages(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || []).map(m => m.id === messageId ? { ...m, reactions: newReactions } : m)
      }));

      // Persist to Supabase
      supabase.from('messages').update({ reactions: newReactions }).eq('id', messageId)
        .then(({ error }) => { if (error) console.error('Error updating reactions:', error); });
  };

  const handleTogglePin = (channelId: string, messageId: string) => {
      const msgs = allMessages[channelId] || [];
      const msg = msgs.find(m => m.id === messageId);
      const newPinned = msg ? !msg.pinned : false;

      setAllMessages(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || []).map(m =>
              m.id === messageId ? { ...m, pinned: newPinned } : m
          )
      }));

      // Persist to Supabase
      supabase.from('messages').update({ pinned: newPinned }).eq('id', messageId)
        .then(({ error }) => { if (error) console.error('Error toggling pin:', error); });
  };

  const handleAddClient = (newClient: Client) => {
    // Optimistic local update
    setClients([...clients, newClient]);
    const newClientChannels: Channel[] = [
      { id: `${newClient.id}_official`, name: 'canale-ufficiale', type: 'channel', category: newClient.company, lastMessage: 'Benvenuto nel canale ufficiale.' },
      { id: `${newClient.id}_gen`, name: 'generale', type: 'channel', category: newClient.company },
      { id: `${newClient.id}_dev`, name: 'sviluppo', type: 'channel', category: newClient.company },
      { id: `${newClient.id}_des`, name: 'design', type: 'channel', category: newClient.company },
    ];
    setChannels(prev => [...prev, ...newClientChannels]);
    setAllMessages(prev => ({
        ...prev,
        [`${newClient.id}_official`]: [{ id: 'init', senderId: 'system', content: 'Canale ufficiale creato.', timestamp: 'Adesso' }]
    }));

    // Persist to Supabase
    if (workspaceId) {
      supabase.from('clients').insert({
        workspace_id: workspaceId,
        name: newClient.name,
        company: newClient.company,
        avatar: newClient.avatar || null,
        project: newClient.project || null,
        status: newClient.status,
        owner_id: currentUserId,
      }).select().single().then(({ data, error }) => {
        if (error) { console.error('Error creating client:', error); return; }
        if (!data || !workspaceId) return;
        // Create default channels for the new client
        const channelNames = ['canale-ufficiale', 'generale', 'sviluppo', 'design'];
        Promise.all(channelNames.map(name =>
          supabase.from('channels').insert({
            workspace_id: workspaceId!,
            name,
            type: 'channel' as const,
            category: newClient.company,
            client_id: data.id,
          })
        )).catch(err => console.error('Error creating client channels:', err));
      });
    }
  };

  const handleUpdateClient = (updatedClient: Client) => {
      // Optimistic local update
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));

      // Persist to Supabase
      supabase.from('clients').update({
        name: updatedClient.name,
        company: updatedClient.company,
        avatar: updatedClient.avatar || null,
        project: updatedClient.project || null,
        status: updatedClient.status,
      }).eq('id', updatedClient.id)
        .then(({ error }) => { if (error) console.error('Error updating client:', error); });
  };

  const handleAddTask = (boardId: string, task: Task) => {
      // Optimistic local update
      setBoards(prevBoards => prevBoards.map(b => {
          if (b.id === boardId) {
              return { ...b, tasks: [...b.tasks, task] };
          }
          return b;
      }));

      // Persist to Supabase
      supabase.from('tasks').insert({
        board_id: boardId,
        title: task.title,
        description: task.description || null,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate || null,
        tags: task.tags || [],
        checklist: (task.checklist || []) as any,
        cover: task.cover || null,
        client_visible: task.clientVisible || false,
        effort: task.effort || null,
        position: 0,
        created_by: currentUserId,
      }).select().single().then(({ data, error }) => {
        if (error) { console.error('Error creating task:', error); return; }
        // Add assignees if any
        if (data && task.assignees.length > 0) {
          Promise.all(task.assignees.map(a =>
            supabase.from('task_assignees').insert({ task_id: data.id, user_id: a.id })
          )).catch(err => console.error('Error assigning task:', err));
        }
      });
  };

  const handleAddBoard = (newBoard: Board) => {
      // Optimistic local update
      setBoards([...boards, newBoard]);

      // Persist to Supabase
      if (workspaceId) {
        supabase.from('boards').insert({
          workspace_id: workspaceId,
          title: newBoard.title,
          description: newBoard.description || null,
          columns: (newBoard.columns || []) as any,
          created_by: currentUserId,
        }).select().single().then(({ data, error }) => {
          if (error) { console.error('Error creating board:', error); return; }
          // Add board members
          if (data && newBoard.members.length > 0) {
            Promise.all(newBoard.members.map(m =>
              supabase.from('board_members').insert({ board_id: data.id, user_id: m.id })
            )).catch(err => console.error('Error adding board members:', err));
          }
        });
      }
  };

  const handleLogin = (user: UserType, initialBoard?: Board, workspaceInfo?: { name: string, logo: string }, initialClient?: Client, isNewUser: boolean = false) => {
      // Set initial user in team (will be overwritten by loadWorkspaceData)
      setTeamMembers([user]);

      // Set initial board/client for immediate UI feedback (new users)
      if (initialBoard) {
          setBoards(prev => [initialBoard, ...prev]);
      }

      if (workspaceInfo) {
          setWorkspaceName(workspaceInfo.name);
          setWorkspaceLogo(workspaceInfo.logo);
      }

      if (initialClient) {
          setClients(prev => [...prev, initialClient]);
      }

      // Trigger authentication + data loading
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      if (isNewUser) {
          setIsNewUser(true);
          setShowTour(true);
      }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setWorkspaceId(null);
      setShowTour(false);
      setIsNewUser(false);
      setTeamMembers([]);
      setClients([]);
      setBoards([]);
      setChannels([]);
      setAllMessages({});
      setTimeLogs([]);
      setRoles([]);
  };

  const handleTourStepChange = (step: number) => {
      const targetPages = [
          'dashboard', 'dashboard', 'team', 'chat', 'projects', 'documents', 'portal', 'dashboard'
      ];
      if (targetPages[step]) {
          setActiveView(targetPages[step]);
      }
  };

  if (authLoading) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#f3f4f6] dark:bg-slate-950">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      );
  }

  if (dataLoading) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-[#f3f4f6] dark:bg-slate-950 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Caricamento workspace...</p>
        </div>
      );
  }

  if (!isAuthenticated) {
      return <Auth onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard 
                  clients={clients} 
                  boards={boards} 
                  onAddTask={handleAddTask}
                  onAddBoard={handleAddBoard}
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />;
      case 'projects':
        return <ProjectBoard 
                  boards={boards} 
                  setBoards={setBoards} 
                  users={teamMembers} 
                  clients={clients}
                  onAddBoard={handleAddBoard}
                  onAddClient={handleAddClient}
                  // Time Tracking Props
                  timeLogs={timeLogs}
                  onStartTimer={startTimer}
                  onStopTimer={stopTimer}
                  onManualLog={logManualTime}
                  onUpdateLog={updateTimeLog}
                  onDeleteLog={deleteTimeLog}
                  currentUser={currentUser}
               />;
      case 'chat':
        return <Chat 
                  channels={channels} 
                  teamMembers={teamMembers} 
                  clients={clients} 
                  boards={boards} 
                  onAddTask={handleAddTask} 
                  workspaceName={workspaceName}
                  allMessages={allMessages}
                  onSendMessage={handleSendMessage}
                  onAddReaction={handleAddReaction}
                  onTogglePin={handleTogglePin}
                />;
      case 'documents':
        return <Documents />;
      case 'portal':
        return <ClientPortal 
                  clients={clients} 
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  allMessages={allMessages}
                  onSendMessage={handleSendMessage}
                  currentUser={currentUser}
                  teamMembers={teamMembers} // Pass teamMembers for owner dropdown
               />;
      case 'team':
        return <Team 
                  members={teamMembers} 
                  setMembers={setTeamMembers} 
                  clients={clients} 
                  boards={boards} 
                  currentUser={currentUser}
                  roles={roles} // Pass roles here
                  timeLogs={timeLogs} // Pass time logs for analytics
                />;
      case 'settings':
          return (
            <Settings 
                currentTheme={theme} 
                onThemeChange={setTheme} 
                primaryColor={primaryColor}
                onColorChange={setPrimaryColor}
                roles={roles}
                setRoles={setRoles}
                currentUser={currentUser}
                // Mascot props will be added to settings later, for now we pass a dummy or implement logic
            />
          );
      default:
        return <Dashboard clients={clients} boards={boards} onAddTask={handleAddTask} onAddBoard={handleAddBoard} onLogout={handleLogout} currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden dark:bg-slate-950 dark:text-white transition-colors duration-300">
      
      {isAuthenticated && (
          <AvatarMascot 
            user={adminUser} // Always pass the Admin's avatar as the Mascot
            completedTasksCount={completedTasksCount} 
            pendingTasksCount={pendingTasksCount}
            enabled={showMascot} 
          />
      )}

      {showTour && (
          <OnboardingTour 
            onComplete={() => setShowTour(false)} 
            onChangeStep={handleTourStepChange}
          />
      )}

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-50 flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
                  <Menu size={24} />
              </button>
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {workspaceLogo ? <img src={workspaceLogo} className="w-full h-full object-cover" /> : workspaceName.charAt(0)}
              </div>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{workspaceName}</span>
          </div>
          <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" alt="User" />
      </div>

      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <Sidebar 
        activeView={activeView} 
        setActiveView={handleViewChange} 
        currentUser={currentUser} 
        workspaceName={workspaceName}
        workspaceLogo={workspaceLogo}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0 md:ml-24 pt-16 md:pt-0 h-full">
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;

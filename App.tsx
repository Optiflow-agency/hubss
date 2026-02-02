
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Menu, X, ArrowRight, Home, MessageSquare, CalendarDays, Globe, CheckCircle, User, Clock } from 'lucide-react'; 
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProjectBoard from './pages/ProjectBoard';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import ClientPortal from './pages/ClientPortal';
import Team from './pages/Team';
import Auth from './pages/Auth';
import AvatarMascot from './components/AvatarMascot';
import { Client, User as UserType, Channel, Board, Task, Message, RoleDefinition, TimeLog } from './types';

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

// Initial Mock Data
const initialClients: Client[] = [
    { id: 'c1', name: 'Mario Rossi', company: 'Acme Corp', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop', project: 'Mobile App Redesign', status: 'active', lastAccess: '2 ore fa', owner: 'Utente Ospite' },
    { id: 'c2', name: 'Giulia Bianchi', company: 'LogiTech', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop', project: 'E-commerce Platform', status: 'active', lastAccess: '1 giorno fa', owner: 'Giulia V.' },
];

// Placeholder team - will be updated upon login
// Admin (ID 1) uses Avatar for Mascot feature. Others use real Photos.
const defaultTeam: UserType[] = [
  { id: '1', name: 'Utente Ospite', role: 'Admin', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', accessibleClients: ['c1', 'c2'], email: 'guest@hubss.com' },
  { id: '2', name: 'Giulia V.', role: 'Designer', status: 'busy', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop', accessibleClients: ['c1'], email: 'giulia@hubss.com' },
  { id: '3', name: 'Marco R.', role: 'Developer', status: 'offline', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop', accessibleClients: ['c2'], email: 'marco@hubss.com' },
  { id: '4', name: 'Cody Fisher', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop', accessibleClients: [], role: 'Marketing' },
  { id: '5', name: 'Jane Cooper', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop', accessibleClients: [], role: 'Copywriter' },
];

const initialRoles: RoleDefinition[] = [
    { 
        id: 'admin', 
        name: 'Admin', 
        description: 'Accesso completo a tutte le funzionalità dell\'agenzia.', 
        isSystem: true, 
        permissions: ['all'] 
    },
    { 
        id: 'media_buyer', 
        name: 'Media Buyer', 
        description: 'Gestione campagne pubblicitarie e reportistica.', 
        permissions: ['view_dashboard', 'manage_projects', 'view_clients'] 
    },
    { 
        id: 'dev', 
        name: 'Developer', 
        description: 'Sviluppo tecnico, accesso ai board e task di sviluppo.', 
        permissions: ['view_dashboard', 'manage_projects', 'edit_tasks'] 
    },
    { 
        id: 'copywriter', 
        name: 'Copywriter', 
        description: 'Creazione contenuti testuali.', 
        permissions: ['view_dashboard', 'view_projects', 'edit_tasks', 'view_files'] 
    }
];

// Need to update tasks/boards assignees to match dynamic user ID if needed, 
// but for mock purposes we'll keep ID '1' as the "main user" in data until backend.
const initialBoards: Board[] = [
    {
        id: 'b1',
        title: 'Alexa AI Development',
        description: 'Gestione sprint e backlog sviluppo.',
        client: 'Acme Corp',
        members: [defaultTeam[0], defaultTeam[1]], 
        columns: [
            { id: 'todo', title: 'Da Fare' },
            { id: 'progress', title: 'In Corso' },
            { id: 'review', title: 'Revisione' },
            { id: 'done', title: 'Fatto' }
        ],
        tasks: [
            {
                id: 't1', title: 'Pianificare il lancio', description: 'Coordinare le attività con il team marketing.', status: 'todo', priority: 'Low', assignees: [defaultTeam[0]], dueDate: '2025-11-04', comments: 2, tags: ['Marketing'],
                checklist: [{ id: 'c1', text: 'Meeting iniziale', completed: true }], attachments: [], cover: '#4f46e5'
            },
            { id: 't2', title: 'Sviluppo strategia', status: 'progress', priority: 'Medium', assignees: [defaultTeam[1]], dueDate: '2025-02-10', comments: 5, tags: ['Feature'] },
            { id: 't5', title: 'Setup API Backend', status: 'done', priority: 'Critical', assignees: [defaultTeam[0], defaultTeam[1]], dueDate: '2025-10-30', comments: 8, tags: ['Feature'] },
        ]
    },
    {
        id: 'b2',
        title: 'Campagna Marketing Q3',
        description: 'Materiali social e adv.',
        client: 'LogiTech',
        members: [defaultTeam[0], defaultTeam[2], defaultTeam[4]],
        columns: [
            { id: 'ideas', title: 'Idee' },
            { id: 'copy', title: 'Copywriting' },
            { id: 'graphics', title: 'Grafica' },
            { id: 'scheduled', title: 'Programmati' }
        ],
        tasks: [
             { id: 'm1', title: 'Post Instagram Lancio', status: 'graphics', priority: 'High', assignees: [defaultTeam[2]], dueDate: '2025-09-01', comments: 1, tags: ['Design'], cover: '#ef4444' },
             { id: 'm2', title: 'Blog Post SEO', status: 'copy', priority: 'Medium', assignees: [defaultTeam[0]], dueDate: '2025-08-20', comments: 0, tags: ['Copy'] }
        ]
    }
];

const initialChannels: Channel[] = [
  { id: 'ai', name: 'Hubss AI', type: 'ai', status: 'online', lastMessage: 'Come posso aiutarti?', category: 'Assistente' },
  { id: 'gen', name: 'generale', type: 'channel', category: 'Workspace', lastMessage: 'Benvenuti!' },
  { id: 'ann', name: 'annunci', type: 'channel', category: 'Workspace', lastMessage: 'Meeting alle 15:00' },
  { id: 'c1_official', name: 'canale-ufficiale', type: 'channel', category: 'Acme Corp', lastMessage: 'Nuovi mockups caricati.' }, 
  { id: 'c1_gen', name: 'generale', type: 'channel', category: 'Acme Corp', lastMessage: 'Update richiesto' },
  { id: 'c1_des', name: 'design', type: 'channel', category: 'Acme Corp', lastMessage: 'Nuovi mockup' },
  { id: 'c2_official', name: 'canale-ufficiale', type: 'channel', category: 'LogiTech', unread: 2, lastMessage: 'Grazie Alessandro!' }, 
  { id: 'c2_gen', name: 'generale', type: 'channel', category: 'LogiTech' },
  { id: 'dm1', name: 'Maria Rossi', type: 'dm', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop', status: 'online', category: 'Messaggi Diretti' },
];

const initialMessagesData: Record<string, Message[]> = {
  'ai': [
    { id: '1', senderId: 'ai', content: "Ciao! Sono Hubss AI. Posso aiutarti a gestire i tuoi progetti, analizzare i dati o creare nuovi task. Chiedimi pure!", timestamp: '10:00', isAi: true },
  ],
  'gen': [
    { id: 'g1', senderId: '1', content: "Benvenuti nel workspace generale! Qui coordiniamo tutte le attività.", timestamp: '09:00', reactions: [{ emoji: '👋', userId: '2', count: 1 }], pinned: true },
    { id: 'g2', senderId: '2', content: "Grazie Alessandro! Ho caricato i nuovi asset.", timestamp: '09:15' },
  ],
  'c1_official': [
      { id: 'm1', senderId: '1', content: "Buongiorno! Abbiamo caricato i nuovi mockups nella sezione File.", timestamp: '10:30', pinned: true },
  ],
  'c2_official': [
      { id: 'm1', senderId: '1', content: "Buongiorno Giulia! Abbiamo caricato i nuovi mockups nella sezione File. Facci sapere cosa ne pensi.", timestamp: '10:30' },
      { id: 'm2', senderId: 'client_c2', content: "Grazie Alessandro, gli do un'occhiata subito!", timestamp: '10:35' }
  ]
};

// Initial Mock Time Logs
const initialTimeLogs: TimeLog[] = [
    { id: 'tl1', userId: '1', taskId: 't1', startTime: Date.now() - 3600000 * 2, endTime: Date.now() - 3600000, duration: 3600000, description: 'Briefing iniziale', isManual: false },
    { id: 'tl2', userId: '2', taskId: 't1', startTime: Date.now() - 3600000 * 1.5, endTime: Date.now() - 3600000 * 0.5, duration: 3600000, description: 'Mockup bozza', isManual: false },
];

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
  const [workspaceName, setWorkspaceName] = useState('Hubss Workspace');
  const [workspaceLogo, setWorkspaceLogo] = useState('');

  // Shared State
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [teamMembers, setTeamMembers] = useState<UserType[]>(defaultTeam);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  
  // ROLE & AGENCY STATE (NEW)
  const [roles, setRoles] = useState<RoleDefinition[]>(initialRoles);
  
  // Shared Message State
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(initialMessagesData);

  // Derived state for current user
  const currentUser = teamMembers[0];

  // Derived Admin User for Mascot
  const adminUser = teamMembers.find(u => u.role === 'Admin') || teamMembers[0];

  // Derived stats for Mascot
  const userTasks = boards.flatMap(b => b.tasks).filter(t => t.assignees.some(u => u.id === currentUser.id));
  const completedTasksCount = userTasks.filter(t => t.status.toLowerCase().includes('done') || t.status.toLowerCase().includes('fatto')).length;
  const pendingTasksCount = userTasks.filter(t => !t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('fatto')).length;

  // --- TIME TRACKING STATE ---
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(initialTimeLogs);
  
  // Logic: Ensure only one active timer per user. We track the active session here.
  // We can derive "isActive" state for UI by checking if a log has endTime: null
  
  const startTimer = (taskId: string) => {
      // 1. Stop any currently active timer for this user
      const activeLog = timeLogs.find(log => log.userId === currentUser.id && log.endTime === null);
      if (activeLog) {
          stopTimer(activeLog.id);
      }

      // 2. Create new log
      const newLog: TimeLog = {
          id: `tl_${Date.now()}`,
          userId: currentUser.id,
          taskId: taskId,
          startTime: Date.now(),
          endTime: null,
          duration: 0,
          isManual: false
      };
      
      setTimeLogs(prev => [...prev, newLog]);
  };

  const stopTimer = (logId?: string) => {
      // If logId provided, stop specific. Else find active one for user.
      const now = Date.now();
      setTimeLogs(prev => prev.map(log => {
          if (log.endTime === null && (logId ? log.id === logId : log.userId === currentUser.id)) {
              return {
                  ...log,
                  endTime: now,
                  duration: now - log.startTime
              };
          }
          return log;
      }));
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
  };

  const updateTimeLog = (logId: string, updates: Partial<TimeLog>) => {
      setTimeLogs(prev => prev.map(log => log.id === logId ? { ...log, ...updates } : log));
  };

  const deleteTimeLog = (logId: string) => {
      setTimeLogs(prev => prev.filter(log => log.id !== logId));
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
          threadId: parentId // Link to parent if it's a reply
      };
      
      setAllMessages(prev => {
          const currentMessages = prev[channelId] || [];
          
          // If replying to a thread, update parent's replyCount
          let updatedMessages = [...currentMessages, newMessage];
          if (parentId) {
              updatedMessages = updatedMessages.map(msg => 
                  msg.id === parentId 
                  ? { ...msg, replyCount: (msg.replyCount || 0) + 1 }
                  : msg
              );
          }

          return {
              ...prev,
              [channelId]: updatedMessages
          };
      });

      // Update channel last message only if main chat (not thread reply)
      if (!parentId) {
          setChannels(prev => prev.map(c => 
              c.id === channelId 
              ? { ...c, lastMessage: isAi ? 'AI Response' : (messageContent.includes('<') ? 'Allegato/Formattato' : messageContent) } 
              : c
          ));
      }
  };

  const handleAddReaction = (channelId: string, messageId: string, emoji: string) => {
      setAllMessages(prev => {
          const msgs = prev[channelId] || [];
          const updatedMsgs = msgs.map(msg => {
              if (msg.id !== messageId) return msg;
              
              const existingReactions = msg.reactions || [];
              const existingReaction = existingReactions.find(r => r.emoji === emoji);
              
              let newReactions;
              if (existingReaction) {
                  // Currently simple toggle logic: if user clicked, assume increment for demo
                  // In real app, we check if userId already reacted
                  newReactions = existingReactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
              } else {
                  newReactions = [...existingReactions, { emoji, userId: currentUser.id, count: 1 }];
              }
              
              return { ...msg, reactions: newReactions };
          });
          return { ...prev, [channelId]: updatedMsgs };
      });
  };

  const handleTogglePin = (channelId: string, messageId: string) => {
      setAllMessages(prev => {
          const msgs = prev[channelId] || [];
          const updatedMsgs = msgs.map(msg => 
              msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
          );
          return { ...prev, [channelId]: updatedMsgs };
      });
  };

  const handleAddClient = (newClient: Client) => {
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
  };

  const handleUpdateClient = (updatedClient: Client) => {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleAddTask = (boardId: string, task: Task) => {
      setBoards(prevBoards => prevBoards.map(b => {
          if (b.id === boardId) {
              return { ...b, tasks: [...b.tasks, task] };
          }
          return b;
      }));
  };

  const handleAddBoard = (newBoard: Board) => {
      setBoards([...boards, newBoard]);
  };

  const handleLogin = (user: UserType, initialBoard?: Board, workspaceInfo?: { name: string, logo: string }, initialClient?: Client, isNewUser: boolean = false) => {
      const newTeam = [...teamMembers];
      newTeam[0] = user;
      setTeamMembers(newTeam);
      
      if (initialBoard) {
          setBoards([initialBoard, ...boards]);
      }

      if (workspaceInfo) {
          setWorkspaceName(workspaceInfo.name);
          setWorkspaceLogo(workspaceInfo.logo);
      }

      if (initialClient) {
          setClients(prev => [...prev, initialClient]);
          const newClientChannels: Channel[] = [
            { id: `${initialClient.id}_official`, name: 'canale-ufficiale', type: 'channel', category: initialClient.company, lastMessage: 'Progetto iniziato' },
            { id: `${initialClient.id}_gen`, name: 'generale', type: 'channel', category: initialClient.company },
            { id: `${initialClient.id}_dev`, name: 'sviluppo', type: 'channel', category: initialClient.company },
            { id: `${initialClient.id}_des`, name: 'design', type: 'channel', category: initialClient.company },
          ];
          setChannels(prev => [...prev, ...newClientChannels]);
          
          setAllMessages(prev => ({
            ...prev,
            [`${initialClient.id}_official`]: [{ id: 'init', senderId: 'system', content: 'Progetto Iniziato. Canale Ufficiale Attivo.', timestamp: 'Adesso' }]
          }));
      }

      setIsAuthenticated(true);
      if (isNewUser) {
          setIsNewUser(true);
          setShowTour(true);
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setShowTour(false);
      setIsNewUser(false);
  };

  const handleTourStepChange = (step: number) => {
      const targetPages = [
          'dashboard', 'dashboard', 'team', 'chat', 'projects', 'documents', 'portal', 'dashboard'
      ];
      if (targetPages[step]) {
          setActiveView(targetPages[step]);
      }
  };

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

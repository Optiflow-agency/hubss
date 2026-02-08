
import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight, Check, User as UserIcon,
  Mail, Lock, Image as ImageIcon,
  Briefcase, Smile, Shirt, Scissors,
  Glasses, ArrowLeft, AlertCircle, RefreshCw,
  Layout, List, Kanban, Calendar as CalendarIcon,
  ChevronDown, MoreHorizontal
} from 'lucide-react';
import { User, Board, Client, AvatarConfig } from '../types';
import {
    AVATAR_CONSTANTS,
    DEFAULT_AVATAR_CONFIG,
    generateAvatarUrl,
    getAssetsForGender,
    getDisplayName,
    getSafeAvatarConfig
} from '../utils/avatarConfig';
import Logo from '../components/Logo';
import { supabase } from '../src/lib/supabase';

interface AuthProps {
  onLogin: (user: User, initialBoard?: Board, workspaceInfo?: { name: string, logo: string }, initialClient?: Client, isNewUser?: boolean) => void;
}

type AuthView = 'login' | 'register_step_1' | 'onboarding_workspace' | 'onboarding_role' | 'onboarding_function' | 'onboarding_project' | 'onboarding_tasks' | 'onboarding_sections' | 'onboarding_invite' | 'onboarding_avatar';

// Colors are now HEX values directly in AVATAR_CONSTANTS

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- USER DATA STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // --- AVATAR STATE (New Engine) ---
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const [activeAvatarTab, setActiveAvatarTab] = useState<'Face' | 'Hair' | 'Clothes' | 'Accessories'>('Face');

  // --- ONBOARDING DATA STATE ---
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceLogo, setWorkspaceLogo] = useState<string>('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState(''); 
  const [firstTasks, setFirstTasks] = useState(['', '', '']);
  const [viewLayout, setViewLayout] = useState<'board' | 'list' | 'calendar'>('board');
  const [sectionType, setSectionType] = useState<'kanban' | 'creative' | 'simple'>('kanban');
  const [teamInvites, setTeamInvites] = useState(['', '', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CONFIG HELPER ---
  const sectionTemplates = {
      kanban: { label: 'Kanban Classico', columns: ['Da fare', 'In corso', 'Fatto'] },
      creative: { label: 'Processo Creativo', columns: ['Idee', 'Bozze', 'Revisione', 'Approvato'] },
      simple: { label: 'Semplice', columns: ['To Do', 'Done'] }
  };

  const rolesList = ["Membro del team", "Manager", "Direttore", "Dirigente", "Imprenditore", "Freelance", "Studente"];
  const departments = [
      { id: 'marketing', label: 'Marketing', icon: '📢' },
      { id: 'product', label: 'Prodotto', icon: '🚀' },
      { id: 'design', label: 'Design', icon: '🎨' },
      { id: 'engineering', label: 'Engineering', icon: '💻' },
      { id: 'operations', label: 'Operations', icon: '⚙️' },
      { id: 'sales', label: 'Vendite', icon: '💼' },
      { id: 'hr', label: 'Risorse Umane', icon: '👥' },
      { id: 'it', label: 'IT', icon: '🔌' },
  ];

  // --- EFFECT: Update URL when Config Changes ---
  useEffect(() => {
      setImageError(false); 
      setAvatarUrl(generateAvatarUrl(avatarConfig));
  }, [avatarConfig]);

  // --- ACTIONS ---

  const handleGenderChange = (newGender: 'man' | 'woman') => {
      const safeDefault = getSafeAvatarConfig({ 
          ...avatarConfig, 
          gender: newGender,
          top: newGender === 'woman' ? 'straight01' : 'shortFlat',
          facialHair: 'none'
      });
      setAvatarConfig(safeDefault);
  };

  const handleRandomizeAvatar = () => {
      const randomChoice = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
      const assets = getAssetsForGender(avatarConfig.gender || 'man');
      
      const newConfig: AvatarConfig = {
          ...avatarConfig,
          seed: Math.random().toString(36).substring(7),
          top: randomChoice(assets.top),
          accessories: Math.random() > 0.8 ? randomChoice(AVATAR_CONSTANTS.accessories) : 'none',
          hairColor: randomChoice(AVATAR_CONSTANTS.hairColor),
          facialHair: avatarConfig.gender === 'man' && Math.random() > 0.7 ? randomChoice(assets.facialHair) : 'none',
          clothing: randomChoice(assets.clothing),
          eyes: randomChoice(assets.eyes),
          mouth: randomChoice(assets.mouth),
          eyebrows: randomChoice(assets.eyebrows),
          skinColor: randomChoice(AVATAR_CONSTANTS.skinColor)
      };
      
      setAvatarConfig(getSafeAvatarConfig(newConfig));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthError(error.message === 'Invalid login credentials'
          ? 'Email o password non corretti.'
          : error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        setAuthError('Errore durante il login. Riprova.');
        setIsLoading(false);
        return;
      }

      // Fetch profile from Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // If no workspace_id, user never completed onboarding — redirect there
      if (!profile?.workspace_id) {
        setFullName(profile?.name || data.user.email || '');
        setEmail(data.user.email || '');
        setIsLoading(false);
        setView('onboarding_workspace');
        return;
      }

      // Fetch workspace if exists
      let wsName = 'Hubss Workspace';
      let wsLogo = '';
      if (profile?.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', profile.workspace_id)
          .single();
        if (workspace) {
          wsName = workspace.name;
          wsLogo = workspace.logo_url || '';
        }
      }

      // Build user object compatible with App.tsx frontend types
      const avatarCfg = profile?.avatar_config
        ? getSafeAvatarConfig(profile.avatar_config as Partial<AvatarConfig>)
        : getSafeAvatarConfig({ seed: data.user.id });

      const loggedUser: User = {
        id: data.user.id,
        name: profile?.name || data.user.email || 'Utente',
        email: data.user.email,
        avatar: profile?.avatar || generateAvatarUrl(avatarCfg),
        avatarConfig: avatarCfg,
        role: profile?.role || 'Admin',
        status: 'online',
        accessibleClients: profile?.accessible_clients || [],
      };

      onLogin(loggedUser, undefined, { name: wsName, logo: wsLogo }, undefined, false);
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Errore di connessione. Controlla la tua rete.');
      setIsLoading(false);
    }
  };

  const handleRegisterStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: fullName },
        },
      });

      if (error) {
        setAuthError(error.message === 'User already registered'
          ? 'Questa email e\' gia\' registrata. Prova ad accedere.'
          : error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        setAuthError('Errore durante la registrazione. Riprova.');
        setIsLoading(false);
        return;
      }

      // Registration successful - move to onboarding
      setIsLoading(false);
      setView('onboarding_workspace');
    } catch (err) {
      console.error('Registration error:', err);
      setAuthError('Errore di connessione. Controlla la tua rete.');
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setWorkspaceLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleOnboardingFinal = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Get current authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setAuthError('Sessione scaduta. Riprova il login.');
        setIsLoading(false);
        return;
      }

      // 1. Create workspace via RPC
      const slug = (workspaceName || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: workspaceId, error: wsError } = await supabase.rpc('setup_new_workspace', {
        p_name: workspaceName || 'Workspace',
        p_slug: slug + '-' + Date.now(),
      });

      if (wsError) {
        console.error('Workspace creation error:', wsError);
        setAuthError('Errore nella creazione del workspace: ' + wsError.message);
        setIsLoading(false);
        return;
      }

      // 2. Update profile with avatar and role
      const finalConfig = getSafeAvatarConfig(avatarConfig);
      const finalAvatarUrl = generateAvatarUrl(finalConfig);

      await supabase
        .from('profiles')
        .update({
          name: fullName,
          avatar: finalAvatarUrl,
          avatar_config: finalConfig as any,
          role: 'Admin',
          status: 'online',
          workspace_id: workspaceId,
        })
        .eq('id', authUser.id);

      // 3. Create board in Supabase
      const columns = sectionTemplates[sectionType].columns.map((title, i) => ({ id: `col_${i}`, title }));
      const { data: boardData } = await supabase
        .from('boards')
        .insert({
          workspace_id: workspaceId,
          title: projectName || 'Primo progetto',
          description: clientName ? `Progetto per ${clientName}` : `Progetto ${department}`,
          columns: columns as any,
          created_by: authUser.id,
        })
        .select()
        .single();

      // 4. Create tasks in Supabase
      if (boardData) {
        const tasksToInsert = firstTasks.filter(t => t.trim()).map((title, i) => ({
          board_id: boardData.id,
          title,
          status: 'col_0',
          priority: 'Medium' as const,
          position: i,
          created_by: authUser.id,
        }));

        if (tasksToInsert.length > 0) {
          const { data: createdTasks } = await supabase
            .from('tasks')
            .insert(tasksToInsert)
            .select();

          // Assign tasks to current user
          if (createdTasks) {
            await supabase.from('task_assignees').insert(
              createdTasks.map(t => ({ task_id: t.id, user_id: authUser.id }))
            );
          }
        }
      }

      // 5. Create client in Supabase (if provided)
      let initialClient: Client | undefined;
      if (clientName.trim()) {
        const { data: clientData } = await supabase
          .from('clients')
          .insert({
            workspace_id: workspaceId,
            name: 'Referente Principale',
            company: clientName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`,
            project: projectName,
            status: 'active',
            owner_id: authUser.id,
          })
          .select()
          .single();

        if (clientData) {
          // Grant access
          await supabase.from('user_client_access').insert({
            user_id: authUser.id,
            client_id: clientData.id,
            granted_by: authUser.id,
          });

          initialClient = {
            id: clientData.id,
            name: 'Referente Principale',
            company: clientName,
            avatar: clientData.avatar || '',
            project: projectName,
            status: 'active',
            lastAccess: 'Mai',
            owner: fullName,
          };
        }
      }

      // 6. Build frontend-compatible objects for App.tsx
      const newUser: User = {
        id: authUser.id,
        name: fullName,
        email: email,
        avatar: finalAvatarUrl,
        avatarConfig: finalConfig,
        role: 'Admin',
        status: 'online',
        accessibleClients: initialClient ? [initialClient.id] : [],
      };

      const initialBoard: Board = {
        id: boardData?.id || `b_${Date.now()}`,
        title: projectName || 'Primo progetto',
        description: clientName ? `Progetto per ${clientName}` : `Progetto ${department}`,
        members: [newUser],
        columns: columns,
        tasks: firstTasks.filter(t => t.trim()).map((title, i) => ({
          id: `t_${Date.now()}_${i}`,
          title,
          status: 'col_0',
          priority: 'Medium',
          assignees: [newUser],
          dueDate: new Date().toISOString().split('T')[0],
          comments: 0,
          tags: ['Onboarding'],
          attachments: [],
        })),
      };

      // Send welcome email (fire-and-forget, don't block onboarding)
      supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'welcome',
          userId: authUser.id,
          data: { dashboardUrl: window.location.origin },
        },
      }).catch(err => console.warn('Welcome email failed:', err));

      onLogin(newUser, initialBoard, { name: workspaceName || 'Workspace', logo: workspaceLogo }, initialClient, true);
    } catch (err) {
      console.error('Onboarding error:', err);
      setAuthError('Errore durante la configurazione. Riprova.');
      setIsLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const handleTaskChange = (index: number, value: string) => { const n = [...firstTasks]; n[index] = value; setFirstTasks(n); };
  const handleInviteChange = (index: number, value: string) => { const n = [...teamInvites]; n[index] = value; setTeamInvites(n); };

  // --- RENDER SOCIAL LOGIN BUTTONS ---
  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setAuthError(`Errore ${provider}: ${error.message}`);
      }
    } catch (err) {
      setAuthError('Errore di connessione con il provider OAuth.');
    }
  };

  const renderSocialLogin = () => (
      <>
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase font-bold"><span className="bg-white dark:bg-slate-950 px-2 text-slate-400">oppure continua con</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
            <button type="button" onClick={() => handleOAuthLogin('google')} className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition text-slate-700 dark:text-white font-bold text-sm">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" /> Google
            </button>
            <button type="button" onClick={() => handleOAuthLogin('apple')} className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition text-slate-700 dark:text-white font-bold text-sm">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.93 3.69-.93.95 0 1.93.35 2.66.89-2.3 1.3-2.07 4.24.31 5.49-.62 1.84-1.29 3.58-1.74 6.78zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg> Apple
            </button>
        </div>
      </>
  );

  // --- RENDER MOBILE PREVIEW ---
  const renderMobilePreview = () => {
      const activeTasks = firstTasks.filter(t => t.trim() !== '');
      const currentCols = sectionTemplates[sectionType].columns;
      return (
          <div className="lg:hidden w-full mb-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-[10px]">
                      {workspaceLogo ? <img src={workspaceLogo} className="w-full h-full object-cover rounded" /> : (workspaceName ? workspaceName.charAt(0).toUpperCase() : 'W')}
                  </div>
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{projectName || 'Nuovo Progetto'}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {currentCols.map((col, i) => (
                      <div key={col} className="min-w-[100px] bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">{col}</div>
                          {i === 0 && activeTasks.map((task, ti) => (
                              <div key={ti} className="bg-slate-50 dark:bg-slate-700 p-1.5 rounded mb-1 border border-slate-100 dark:border-slate-600">
                                  <div className="h-1 w-6 bg-indigo-400 rounded-full mb-1"></div>
                                  <div className="text-[9px] font-medium text-slate-800 dark:text-slate-200 truncate">{task}</div>
                              </div>
                          ))}
                          {i === 0 && activeTasks.length === 0 && <div className="text-[9px] text-slate-400 italic text-center py-1">...</div>}
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  // --- RENDER RIGHT PANEL PREVIEW (DESKTOP) ---
  const renderLivePreview = () => {
      const currentCols = sectionTemplates[sectionType].columns;
      return (
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-100 dark:bg-slate-900 flex-col justify-center items-center p-12 transition-colors">
              <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
              </div>
              {/* MOCKUP CONTAINER */}
              <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px] transition-all duration-500">
                  <div className="h-14 border-b border-slate-100 dark:border-slate-700 flex items-center px-4 justify-between bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                              {workspaceLogo ? <img src={workspaceLogo} className="w-full h-full object-cover" /> : workspaceName ? workspaceName.charAt(0).toUpperCase() : 'W'}
                          </div>
                          <div className="flex flex-col">
                              <div className="font-bold text-slate-800 dark:text-white text-xs">{projectName || 'Nome Progetto'}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">{clientName && <Briefcase size={10} />}{clientName || workspaceName || 'Workspace'}</div>
                          </div>
                      </div>
                      <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-slate-300 border border-white dark:border-slate-800"></div></div>
                  </div>
                  <div className="h-10 border-b border-slate-100 dark:border-slate-700 flex items-center px-4 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${viewLayout === 'board' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}><Kanban size={10}/> Board</div>
                          <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${viewLayout === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}><List size={10}/> Lista</div>
                          <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${viewLayout === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}><CalendarIcon size={10}/> Cal.</div>
                      </div>
                  </div>
                  <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-900/30 overflow-hidden relative">
                      {viewLayout === 'board' && (
                          <div className="flex gap-4 h-full">
                              {currentCols.map((col, colIndex) => (
                                  <div key={col} className="w-48 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-2 flex flex-col gap-2 border border-slate-200/60 dark:border-slate-700/50">
                                      <div className="flex justify-between items-center px-1"><div className="font-bold text-xs text-slate-500 uppercase">{col}</div><MoreHorizontal size={12} className="text-slate-400" /></div>
                                      {colIndex === 0 && firstTasks.map((task, ti) => (
                                          <div key={ti} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 group animate-scale-up">
                                              <div className="flex justify-between items-start mb-2"><div className="h-1.5 w-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full"></div><div className={`w-2 h-2 rounded-full ${ti === 0 ? 'bg-orange-500' : ti === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`}></div></div>
                                              <div className={`font-bold text-xs mb-3 leading-snug ${task ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600 italic'}`}>{task || `Nuovo Task ${ti + 1}`}</div>
                                              <div className="flex items-center justify-between"><div className="flex -space-x-1"><div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-600"></div></div><div className="h-1 w-12 bg-slate-100 dark:bg-slate-700 rounded-full"></div></div>
                                          </div>
                                      ))}
                                      {colIndex > 0 && <div className="h-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs">Vuoto</div>}
                                      {colIndex === 0 && <div className="p-2 text-center text-xs text-slate-400 font-medium bg-white/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300">+ Aggiungi</div>}
                                  </div>
                              ))}
                          </div>
                      )}
                      {viewLayout === 'list' && <div className="space-y-6">{currentCols.map((col, colIndex) => (<div key={col} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"><div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700"><ChevronDown size={12} className="text-slate-400" /><span className="font-bold text-xs text-slate-800 dark:text-white">{col}</span><span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-500">{colIndex === 0 ? firstTasks.length : 0}</span></div><div className="divide-y divide-slate-50 dark:divide-slate-700">{colIndex === 0 ? firstTasks.map((task, ti) => (<div key={ti} className="grid grid-cols-12 items-center px-4 py-3 gap-2 animate-slide-in-right"><div className="col-span-7 flex items-center gap-2"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${ti === 0 ? 'bg-orange-500' : ti === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`}></div><span className={`text-xs font-bold truncate ${task ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 italic'}`}>{task || `Nuovo Task ${ti + 1}`}</span></div><div className="col-span-2"><div className="w-5 h-5 rounded-full bg-slate-200"></div></div><div className="col-span-3 flex justify-end"><div className="h-1.5 w-10 bg-slate-100 dark:bg-slate-700 rounded-full"></div></div></div>)) : (<div className="p-4 text-center text-xs text-slate-400 italic">Nessun task</div>)}</div></div>))}</div>}
                      {viewLayout === 'calendar' && <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"><div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">{['L','M','M','G','V','S','D'].map(d => <div key={d} className="text-center text-[10px] text-slate-400 font-bold p-2 bg-slate-50 dark:bg-slate-900">{d}</div>)}</div><div className="grid grid-cols-7 auto-rows-fr h-full">{Array.from({length: 31}).map((_, i) => (<div key={i} className="border-b border-r border-slate-100 dark:border-slate-700/50 p-1 relative min-h-[40px]"><span className={`text-[9px] font-bold absolute top-1 left-1 ${i === 14 ? 'bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center' : 'text-slate-400'}`}>{i+1}</span>{i === 14 && (<div className={`mt-4 text-[8px] font-bold px-1 py-0.5 rounded truncate ${firstTasks[0] ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>{firstTasks[0] || 'Task 1'}</div>)}</div>))}</div></div>}
                  </div>
              </div>
              <div className="absolute bottom-10 text-center"><p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full">Anteprima dal vivo</p></div>
          </div>
      );
  };

  // --- AVATAR EDITOR CONTROLS (LEFT PANEL) ---
  const renderAvatarControls = () => {
      const gender = avatarConfig.gender || 'man';
      const availableAssets = getAssetsForGender(gender);

      return (
      <div className="animate-fade-in flex flex-col h-full max-h-screen">
          <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Crea il tuo Alter Ego</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Personalizza il tuo avatar per Hubss.</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6 shadow-inner">
              <button 
                onClick={() => handleGenderChange('man')} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${gender === 'man' ? 'bg-white dark:bg-slate-600 shadow-md text-indigo-600 dark:text-white transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                  <span className="text-lg">👨</span> Uomo
              </button>
              <button 
                onClick={() => handleGenderChange('woman')} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${gender === 'woman' ? 'bg-white dark:bg-slate-600 shadow-md text-pink-600 dark:text-pink-300 transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                  <span className="text-lg">👩</span> Donna
              </button>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col min-h-0">
                  <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                      {[
                          { id: 'Face', icon: Smile, label: 'Viso' }, 
                          { id: 'Hair', icon: Scissors, label: 'Capelli' }, 
                          { id: 'Clothes', icon: Shirt, label: 'Abiti' },
                          { id: 'Accessories', icon: Glasses, label: 'Accessori' }
                      ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveAvatarTab(tab.id as any)}
                            className={`flex-1 min-w-[80px] py-4 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeAvatarTab === tab.id ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-transparent'}`}
                          >
                              <tab.icon size={20} className="mb-1"/> {tab.label}
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30 dark:bg-slate-900/30">
                      {activeAvatarTab === 'Face' && (
                          <div className="space-y-8">
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Tonalità Pelle</label>
                                  <div className="flex gap-3 flex-wrap">
                                      {AVATAR_CONSTANTS.skinColor.map(c => (
                                          <button 
                                            key={c} 
                                            onClick={() => setAvatarConfig({...avatarConfig, skinColor: c})} 
                                            className={`w-12 h-12 rounded-full shadow-sm ring-2 ring-offset-2 dark:ring-offset-slate-900 transition-all ${avatarConfig.skinColor === c ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:scale-105'}`} 
                                            style={{ backgroundColor: `#${c}` }} 
                                          />
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Espressione</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      {availableAssets.mouth.map(m => (
                                          <button 
                                            key={m} 
                                            onClick={() => setAvatarConfig({...avatarConfig, mouth: m})} 
                                            className={`px-4 py-3 text-xs font-bold border rounded-xl transition-all shadow-sm ${avatarConfig.mouth === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                          >
                                              {getDisplayName(m)}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Sopracciglia</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      {availableAssets.eyebrows.map(e => (
                                          <button 
                                            key={e} 
                                            onClick={() => setAvatarConfig({...avatarConfig, eyebrows: e})} 
                                            className={`px-4 py-3 text-xs font-bold border rounded-xl transition-all shadow-sm ${avatarConfig.eyebrows === e ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                          >
                                              {getDisplayName(e)}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeAvatarTab === 'Hair' && (
                          <div className="space-y-8">
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Colore</label>
                                  <div className="flex gap-3 flex-wrap">
                                      {AVATAR_CONSTANTS.hairColor.map(c => (
                                          <button 
                                            key={c} 
                                            onClick={() => setAvatarConfig({...avatarConfig, hairColor: c})} 
                                            className={`w-12 h-12 rounded-full shadow-sm ring-2 ring-offset-2 dark:ring-offset-slate-900 transition-all ${avatarConfig.hairColor === c ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:scale-105'}`} 
                                            style={{ backgroundColor: `#${c}` }} 
                                          />
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Stile Taglio</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      {availableAssets.top.map(t => (
                                          <button 
                                            key={t} 
                                            onClick={() => setAvatarConfig({...avatarConfig, top: t})} 
                                            className={`px-3 py-3 text-xs font-bold border rounded-xl truncate text-center transition-all shadow-sm ${avatarConfig.top === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                          >
                                              {getDisplayName(t)}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeAvatarTab === 'Clothes' && (
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Guardaroba</label>
                              <div className="grid grid-cols-2 gap-3">
                                  {availableAssets.clothing.map(c => (
                                      <button 
                                        key={c} 
                                        onClick={() => setAvatarConfig({...avatarConfig, clothing: c})} 
                                        className={`px-3 py-4 text-xs font-bold border rounded-xl truncate text-center transition-all shadow-sm ${avatarConfig.clothing === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                      >
                                          {getDisplayName(c)}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeAvatarTab === 'Accessories' && (
                          <div className="space-y-8">
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Occhiali</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      {AVATAR_CONSTANTS.accessories.map(a => (
                                          <button 
                                            key={a} 
                                            onClick={() => setAvatarConfig({...avatarConfig, accessories: a})} 
                                            className={`px-3 py-3 text-xs font-bold border rounded-xl truncate text-center transition-all shadow-sm ${avatarConfig.accessories === a ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                          >
                                              {getDisplayName(a)}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              {gender === 'man' && (
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Barba & Baffi</label>
                                      <div className="grid grid-cols-2 gap-3">
                                          {availableAssets.facialHair.map(f => (
                                              <button 
                                                key={f} 
                                                onClick={() => setAvatarConfig({...avatarConfig, facialHair: f})} 
                                                className={`px-3 py-3 text-xs font-bold border rounded-xl truncate text-center transition-all shadow-sm ${avatarConfig.facialHair === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                              >
                                                  {getDisplayName(f)}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={() => setView('onboarding_invite')} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                  <ArrowLeft size={16} /> Indietro
              </button>
              <button 
                onClick={handleOnboardingFinal} 
                disabled={isLoading}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 transform hover:scale-105"
              >
                  {isLoading ? 'Creazione...' : 'Salva e Entra'} <ArrowRight size={16} />
              </button>
          </div>
      </div>
      );
  };

  // --- RENDER LEFT PANEL (FORMS) ---
  const renderLeftPanel = () => (
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 md:p-12 relative bg-white dark:bg-slate-950 transition-colors overflow-hidden h-full">
         <div className={`w-full mx-auto my-auto flex flex-col h-full justify-center ${view === 'onboarding_avatar' ? 'max-w-xl' : 'max-w-md'}`}>
            
            {/* --- 1. LOGIN --- */}
            {view === 'login' && (
               <div className="animate-fade-in space-y-8">
                  <div className="text-center lg:text-left">
                     <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Bentornato 👋</h2>
                     <p className="text-slate-500 dark:text-slate-400">Inserisci le tue credenziali per accedere a Hubss.</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                     {authError && (
                       <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
                         <AlertCircle size={16} className="shrink-0" />
                         <span>{authError}</span>
                       </div>
                     )}
                     <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Email</label>
                        <div className="relative group">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                           <input 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@company.com" 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                              required 
                           />
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between items-center mb-2 ml-1">
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Password</label>
                           <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Password dimenticata?</a>
                        </div>
                        <div className="relative group">
                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                           <input 
                              type="password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                              required 
                           />
                        </div>
                     </div>

                     <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                     >
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Accedi <ArrowRight size={18} /></>}
                     </button>
                  </form>

                  {/* SOCIAL LOGIN - RESTORED */}
                  {renderSocialLogin()}

                  <p className="text-center text-slate-500 dark:text-slate-400 mt-8">
                     Non hai un account? <button onClick={() => { setAuthError(null); setView('register_step_1'); }} className="text-indigo-600 font-bold hover:underline">Registrati ora</button>
                  </p>
               </div>
            )}

            {/* ... Other steps ... */}
            {/* Same content as before for register steps */}
            {view === 'register_step_1' && (
               <div className="animate-fade-in space-y-8">
                  <div className="text-center lg:text-left">
                     <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Benvenuto in Hubss ✨</h2>
                     <p className="text-slate-500 dark:text-slate-400">Iniziamo dai tuoi dati personali.</p>
                  </div>
                  {/* ... form ... */}
                  <form onSubmit={handleRegisterStep1} className="space-y-5">
                     {authError && (
                       <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
                         <AlertCircle size={16} className="shrink-0" />
                         <span>{authError}</span>
                       </div>
                     )}
                     <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Nome Completo</label>
                        <div className="relative group">
                           <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                           <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Es. Mario Rossi" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required autoFocus />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Email</label>
                        <div className="relative group">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                           <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Crea Password</label>
                        <div className="relative group">
                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                           <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Almeno 8 caratteri" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required minLength={8} />
                        </div>
                     </div>

                     <button type="submit" disabled={isLoading} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Continua <ArrowRight size={18} /></>}
                     </button>
                  </form>
                  {renderSocialLogin()}
                  <p className="text-center text-slate-500 dark:text-slate-400 mt-8">Hai già un account? <button onClick={() => { setAuthError(null); setView('login'); }} className="text-indigo-600 font-bold hover:underline">Accedi</button></p>
               </div>
            )}

            {/* ... Other steps ... */}
            {view === 'onboarding_workspace' && (
                <div className="animate-fade-in space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Il tuo Spazio di Lavoro</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Dai un nome al tuo workspace e carica un logo.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition overflow-hidden relative group"
                            >
                                {workspaceLogo ? (
                                    <img src={workspaceLogo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500">
                                        <ImageIcon size={24} />
                                        <span className="text-[10px] font-bold mt-1">Logo</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white font-bold text-xs">Modifica</div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Nome Workspace</label>
                                <input 
                                    type="text" 
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    placeholder="Es. Acme Corp HQ" 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => workspaceName && setView('onboarding_role')}
                        disabled={!workspaceName}
                        className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${workspaceName ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        Continua <ArrowRight size={18} />
                    </button>
                    <button onClick={() => setView('register_step_1')} className="block w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-2">← Indietro</button>
                </div>
            )}
            
            {/* Keeping other steps logic identical... */}
            {view === 'onboarding_role' && (
               <div className="animate-fade-in space-y-6">
                  <div className="mb-2">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Qual è il tuo ruolo?</h2>
                     <p className="text-slate-500 dark:text-slate-400 text-sm">Ci aiuta a personalizzare la tua esperienza.</p>
                  </div>
                  <div className="space-y-3">
                      {rolesList.map((r) => (
                          <button 
                            key={r} 
                            onClick={() => { setRole(r); setView('onboarding_function'); }}
                            className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium text-sm flex justify-between items-center ${role === r ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                          >
                              {r}
                              {role === r && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setView('onboarding_workspace')} className="text-sm text-slate-400 hover:text-slate-600 mt-4 block">← Indietro</button>
               </div>
            )}
            {view === 'onboarding_function' && (
                <div className="animate-fade-in space-y-6">
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quale funzione descrive il tuo lavoro?</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {departments.map((dept) => (
                            <button
                                key={dept.id}
                                onClick={() => { setDepartment(dept.label); setView('onboarding_project'); }}
                                className={`p-4 rounded-xl border-2 text-left flex flex-col gap-2 transition-all hover:scale-[1.02] ${department === dept.label ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'}`}
                            >
                                <span className="text-2xl">{dept.icon}</span>
                                <span className="font-bold text-sm text-slate-800 dark:text-white">{dept.label}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setView('onboarding_role')} className="text-sm text-slate-400 hover:text-slate-600 mt-4 block">← Indietro</button>
                </div>
            )}
            {view === 'onboarding_project' && (
                <div className="animate-fade-in space-y-8">
                    <div>
                        <span className="text-indigo-600 font-bold uppercase text-xs tracking-wider mb-2 block">Step 1 di 4</span>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">A che cosa state lavorando?</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Crea il tuo primo progetto per iniziare.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Nome del Progetto</label>
                        <input 
                            type="text" 
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Es. Lancio Sito Web" 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium"
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Nome Cliente (Opzionale)</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Es. Acme Corp" 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 ml-1">Creeremo automaticamente un profilo cliente e canali chat dedicati.</p>
                    </div>

                    <button 
                        onClick={() => projectName && setView('onboarding_tasks')}
                        disabled={!projectName}
                        className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${projectName ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        Continua <ArrowRight size={18} />
                    </button>
                </div>
            )}
            {view === 'onboarding_tasks' && (
                <div className="animate-fade-in space-y-8">
                    <div>
                        <span className="text-indigo-600 font-bold uppercase text-xs tracking-wider mb-2 block">Step 2 di 4</span>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quali sono le attività?</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Elenca alcune cose da fare per {projectName}.</p>
                    </div>
                    {renderMobilePreview()}
                    <div className="space-y-4">
                        {firstTasks.map((task, i) => (
                            <div key={i}>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 ml-1">Task {i+1}</label>
                                <input 
                                    type="text" 
                                    value={task}
                                    onChange={(e) => handleTaskChange(i, e.target.value)}
                                    placeholder={i === 0 ? "Es. Redigere brief" : i === 1 ? "Es. Meeting kickoff" : "Es. Condividere timeline"} 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    autoFocus={i===0}
                                />
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => setView('onboarding_sections')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        Continua <ArrowRight size={18} />
                    </button>
                </div>
            )}
            {view === 'onboarding_sections' && (
                <div className="animate-fade-in space-y-8">
                    <div>
                        <span className="text-indigo-600 font-bold uppercase text-xs tracking-wider mb-2 block">Step 3 di 4</span>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Come vuoi organizzare le attività?</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Scegli una struttura e una vista.</p>
                    </div>
                    {renderMobilePreview()}
                    <div className="space-y-4">
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button onClick={() => setViewLayout('board')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewLayout === 'board' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}><Kanban size={16}/> Board</button>
                            <button onClick={() => setViewLayout('list')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewLayout === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}><List size={16}/> Lista</button>
                            <button onClick={() => setViewLayout('calendar')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewLayout === 'calendar' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}><CalendarIcon size={16}/> Cal.</button>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Template Sezioni</label>
                            <div className="space-y-2">
                                {(Object.keys(sectionTemplates) as Array<keyof typeof sectionTemplates>).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setSectionType(key)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${sectionType === key ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                                    >
                                        <div className="font-bold text-sm text-slate-800 dark:text-white">{sectionTemplates[key].label}</div>
                                        <div className="text-xs text-slate-500 mt-1">{sectionTemplates[key].columns.join(' → ')}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setView('onboarding_invite')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        Continua <ArrowRight size={18} />
                    </button>
                </div>
            )}
            {view === 'onboarding_invite' && (
                <div className="animate-fade-in space-y-8">
                    <div>
                        <span className="text-indigo-600 font-bold uppercase text-xs tracking-wider mb-2 block">Step Finale</span>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invita il tuo team</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Il lavoro è migliore insieme. Invita i colleghi ora (opzionale).</p>
                    </div>
                    <div className="space-y-4">
                        {teamInvites.map((invite, i) => (
                            <div key={i} className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    value={invite}
                                    onChange={(e) => handleInviteChange(i, e.target.value)}
                                    placeholder="collega@email.com" 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => setView('onboarding_avatar')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        Prossimo: Crea Avatar <ArrowRight size={18} />
                    </button>
                    <button onClick={() => setView('onboarding_avatar')} className="block w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-2">Salta a Avatar</button>
                </div>
            )}

            {/* --- AVATAR CREATOR STEP (CONTROLS ON LEFT) --- */}
            {view === 'onboarding_avatar' && renderAvatarControls()}

         </div>
      </div>
  );

  return (
    <div className="flex h-screen w-full bg-white dark:bg-slate-950">
        {renderLeftPanel()}
        
        {/* RENDER RIGHT PANEL (PREVIEW OR HERO) */}
        {view === 'onboarding_avatar' ? (
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 text-white flex-col justify-center items-center p-12 animate-fade-in">
                {/* 3D Background Lighting */}
                <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                   <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/30 rounded-full filter blur-[120px] opacity-60 animate-pulse"></div>
                   <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/30 rounded-full filter blur-[120px] opacity-60 animate-pulse delay-1000"></div>
                   <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                </div>
                
                {/* LARGE PREVIEW ON RIGHT */}
                <div className="relative z-10 flex flex-col items-center">
                    
                    {/* AVATAR STAGE */}
                    <div className="relative w-96 h-96 mb-10 flex items-center justify-center group perspective-1000">
                        <div className="absolute inset-4 bg-indigo-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                        
                        <div className="relative w-80 h-80 rounded-[3rem] bg-gradient-to-tr from-white/10 via-white/5 to-transparent backdrop-blur-md border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-500 hover:scale-[1.02] ring-1 ring-white/10">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none z-20"></div>
                            
                            {imageError ? (
                                <div className="flex flex-col items-center justify-center text-center p-4 z-30">
                                    <AlertCircle size={48} className="text-red-400 mb-2" />
                                    <p className="text-sm text-slate-300">Anteprima non disponibile</p>
                                </div>
                            ) : avatarUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center animate-float">
                                    <img 
                                        key={avatarUrl} 
                                        src={avatarUrl} 
                                        alt="Avatar Preview" 
                                        className={`w-[85%] h-[85%] object-contain z-10 filter drop-shadow-2xl brightness-110 saturate-110`} 
                                        style={{ filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.6)) brightness(1.1) saturate(1.1)' }}
                                        onError={() => setImageError(true)}
                                    />
                                </div>
                            ) : (
                                <div className="animate-pulse bg-white/10 w-full h-full"></div>
                            )}
                            
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-50 z-20"></div>
                        </div>
                        <div className="absolute -bottom-10 w-40 h-4 bg-black/50 blur-xl rounded-[100%]"></div>
                    </div>
                    
                    <h2 className="text-5xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Esprimiti.</h2>
                    <p className="text-xl text-slate-400 text-center max-w-md font-light leading-relaxed">
                        Il tuo alter ego digitale ti accompagnerà nel tuo viaggio su Hubss.
                    </p>
                    
                    <button 
                        type="button"
                        onClick={handleRandomizeAvatar}
                        className="mt-10 flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full text-base font-bold transition-all border border-white/20 backdrop-blur-md hover:scale-105 active:scale-95 shadow-xl hover:shadow-indigo-500/20 group"
                    >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> 
                        <span>Randomizza Stile</span>
                    </button>
                </div>
            </div>
        ) : (
            view.startsWith('onboarding_') && view !== 'onboarding_role' && view !== 'onboarding_function' && view !== 'onboarding_workspace' ? renderLivePreview() : (
                <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 text-white flex-col justify-center p-16">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                       <div className="absolute top-0 -left-10 w-[500px] h-[500px] bg-indigo-500 rounded-full filter blur-3xl opacity-60 animate-blob"></div>
                       <div className="absolute top-0 -right-10 w-[500px] h-[500px] bg-purple-500 rounded-full filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
                       <div className="absolute -bottom-40 left-20 w-[600px] h-[600px] bg-blue-500 rounded-full filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
                       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-start justify-center h-full max-w-lg">
                      <div className="mb-10">
                          <Logo className="w-48 h-auto" onDark />
                      </div>
                      <h1 className="text-6xl font-bold leading-tight mb-6">
                        Gestisci il tuo team.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Senza il caos.</span>
                      </h1>
                      <p className="text-slate-300 text-xl leading-relaxed mb-10 max-w-md">
                        Hubss unifica progetti, chat, documenti e clienti in un unico sistema operativo per aziende moderne.
                      </p>
                      
                      {/* Optional Social Proof or Small Widget */}
                      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-2xl w-full animate-fade-in-up hover:bg-white/10 transition-colors duration-300">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="flex -space-x-2">
                                {[1,2,3].map(i => (
                                    <img key={i} src={`https://picsum.photos/100/100?random=${i+10}`} className="w-8 h-8 rounded-full border-2 border-slate-800" />
                                ))}
                            </div>
                            <p className="text-sm text-slate-300"><span className="font-bold text-white">10.000+</span> team usano Hubss</p>
                         </div>
                         <div className="space-y-2 text-left">
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Check size={12} /></div>
                                <span>Gestione Progetti Agile</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Check size={12} /></div>
                                <span>Chat in Tempo Reale & AI</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Check size={12} /></div>
                                <span>Portale Clienti Dedicato</span>
                            </div>
                         </div>
                      </div>
                    </div>
                </div>
            )
        )}
    </div>
  );
};

export default Auth;

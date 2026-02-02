
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Bell, Plug, Palette, CreditCard, LogOut, Check, 
  Settings as SettingsIcon, Shield, X, Moon, Sun, 
  Monitor, Video, Camera, Briefcase, Plus, Trash2, ChevronRight,
  Mic, Speaker, Mail, HardDrive, FileText, Download, Users, Zap, ZapOff,
  Clock, Smile
} from 'lucide-react';
import { IntegrationApp, IntegrationCategory, RoleDefinition, PermissionItem, User as UserType } from '../types';

// Extended Mock Data for Integrations
const initialIntegrations: IntegrationApp[] = [
  { id: 'google_workspace', name: 'Google Workspace', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg', description: 'Suite completa: Drive, Calendar, Gmail.', connected: true, permissions: [], features: [] },
  { id: 'slack', name: 'Slack', category: 'communication', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg', description: 'Notifiche canali e messaggi.', connected: false, permissions: [], features: [] },
  { id: 'zoom', name: 'Zoom', category: 'communication', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Zoom_communications_logo.svg', description: 'Videochiamate e meeting.', connected: false, permissions: [], features: [] },
  { id: 'figma', name: 'Figma', category: 'design', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg', description: 'Anteprima file design in tempo reale.', connected: true, permissions: [], features: [] },
  { id: 'github', name: 'GitHub', category: 'dev', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/GitHub_Invertocat_Logo.svg', description: 'Link commit, PR e issue tracking.', connected: false, permissions: [], features: [] },
  { id: 'notion', name: 'Notion', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png', description: 'Sync pagine e database.', connected: false, permissions: [], features: [] },
  { id: 'jira', name: 'Jira', category: 'dev', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg', description: 'Gestione ticket agile.', connected: true, permissions: [], features: [] },
  { id: 'trello', name: 'Trello', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Trello-logo-blue.svg', description: 'Importazione board kanban.', connected: false, permissions: [], features: [] },
  { id: 'dropbox', name: 'Dropbox', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg', description: 'Archiviazione cloud file.', connected: false, permissions: [], features: [] },
  { id: 'intercom', name: 'Intercom', category: 'crm', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Intercom_logo.svg', description: 'Supporto clienti chat.', connected: false, permissions: [], features: [] },
  { id: 'hubspot', name: 'HubSpot', category: 'crm', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/15/HubSpot_Logo.png', description: 'Integrazione CRM contatti.', connected: false, permissions: [], features: [] },
];

const colorOptions = [
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
];

const categories: { id: IntegrationCategory | 'all', label: string }[] = [
  { id: 'all', label: 'Tutte' },
  { id: 'productivity', label: 'Produttività' },
  { id: 'communication', label: 'Comunicazione' },
  { id: 'dev', label: 'Sviluppo' },
  { id: 'design', label: 'Design' },
  { id: 'crm', label: 'CRM' },
];

// --- PERMISSIONS DEFINITIONS ---
const permissionList: PermissionItem[] = [
    { id: 'view_dashboard', label: 'Visualizza Dashboard', description: 'Accesso alla panoramica generale.', category: 'General' },
    { id: 'manage_team', label: 'Gestisci Team', description: 'Invitare e rimuovere membri.', category: 'Team' },
    { id: 'manage_roles', label: 'Gestisci Ruoli', description: 'Creare e modificare ruoli agenzia.', category: 'Team' },
    { id: 'manage_projects', label: 'Gestisci Progetti', description: 'Creare, modificare ed eliminare progetti.', category: 'Projects' },
    { id: 'view_projects', label: 'Visualizza Progetti', description: 'Sola lettura sui progetti assegnati.', category: 'Projects' },
    { id: 'edit_tasks', label: 'Modifica Task', description: 'Creare e completare task.', category: 'Projects' },
    { id: 'view_clients', label: 'Visualizza Clienti', description: 'Accesso alla lista clienti.', category: 'Clients' },
    { id: 'manage_portals', label: 'Gestisci Portali', description: 'Configurare i portali clienti.', category: 'Clients' },
    { id: 'view_files', label: 'Accesso File', description: 'Scaricare e visualizzare documenti.', category: 'General' },
    { id: 'manage_time', label: 'Gestione Tempi', description: 'Modificare ed eliminare i time log del team.', category: 'Projects' } // Added Time Management
];

interface SettingsProps {
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  primaryColor: string;
  onColorChange: (color: string) => void;
  roles: RoleDefinition[];
  setRoles: React.Dispatch<React.SetStateAction<RoleDefinition[]>>;
  currentUser: UserType;
}

const Settings: React.FC<SettingsProps> = ({ currentTheme, onThemeChange, primaryColor, onColorChange, roles, setRoles, currentUser }) => {
  const isAdmin = currentUser?.role === 'Admin';
  const [mascotEnabled, setMascotEnabled] = useState(true); // Should be lifted to App state in full version, local mock here
  
  // Tabs Definition
  const tabs = [
    { id: 'profile', label: 'Profilo', icon: User },
    { id: 'devices', label: 'Audio & Video', icon: Video },
    { id: 'notifications', label: 'Notifiche', icon: Bell },
    { id: 'integrations', label: 'Integrazioni', icon: Plug },
    { id: 'appearance', label: 'Aspetto', icon: Palette },
    { id: 'billing', label: 'Piani', icon: CreditCard },
  ];

  if (isAdmin) {
      tabs.unshift({ id: 'agency', label: 'Gestione Agenzia', icon: Briefcase });
  }

  const [activeTab, setActiveTab] = useState(isAdmin ? 'agency' : 'profile');
  
  // States for Tabs
  const [integrations, setIntegrations] = useState<IntegrationApp[]>(initialIntegrations);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  
  // Audio/Video State
  const [audioLevel, setAudioLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoMode, setIsVideoMode] = useState(false); // Track if current stream has video
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isTestScreenSharing, setIsTestScreenSharing] = useState(false);
  const [testScreenStream, setTestScreenStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Audio Analysis Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Admin Role Management State
  const [selectedRole, setSelectedRole] = useState<RoleDefinition>(roles[0] || { id: 'temp', name: 'Loading', description: '', permissions: [] });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // --- AUDIO/VIDEO LOGIC ---
  useEffect(() => {
      // Clean up stream when leaving 'devices' tab
      if (activeTab !== 'devices' && stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
          setAudioLevel(0);
      }
  }, [activeTab]);

  // Real Audio Visualization Effect
  useEffect(() => {
    if (stream) {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            // Create analyzer only if not exists
            if (!analyserRef.current) {
                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 256;
            }
            
            // Connect stream source
            if (stream.getAudioTracks().length > 0) {
                 const source = ctx.createMediaStreamSource(stream);
                 source.connect(analyserRef.current);
                 
                 dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
                 
                 const updateVolume = () => {
                     if (analyserRef.current && dataArrayRef.current) {
                         analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                         // Calculate average volume
                         let sum = 0;
                         for(let i = 0; i < dataArrayRef.current.length; i++) {
                             sum += dataArrayRef.current[i];
                         }
                         const avg = sum / dataArrayRef.current.length;
                         // Normalize for visualizer (0-100)
                         setAudioLevel(Math.min(100, avg * 2.5)); 
                     }
                     rafIdRef.current = requestAnimationFrame(updateVolume);
                 };
                 updateVolume();
            }
        } catch (err) {
            console.error("Audio Context Error", err);
        }
    } else {
        setAudioLevel(0);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    }

    return () => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [stream]);

  const stopStream = () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
          setAudioLevel(0);
          setIsVideoMode(false);
      }
  };

  const startCamera = async () => {
      if (stream) stopStream();
      try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(mediaStream);
          setIsVideoMode(true);
          setCameraPermission('granted');
          if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
          }
      } catch (err: any) {
          console.error("Error accessing media devices.", err);
          setCameraPermission('denied');
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              alert("Permesso negato. Per favore, consenti l'accesso a fotocamera e microfono nelle impostazioni del browser (icona lucchetto nella barra degli indirizzi).");
          } else {
              alert("Errore nell'accesso ai dispositivi multimediali: " + err.message);
          }
      }
  };

  const startMicrophone = async () => {
      if (stream) stopStream();
      try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setStream(mediaStream);
          setIsVideoMode(false);
          setCameraPermission('granted');
      } catch (err: any) {
          console.error("Error accessing microphone.", err);
          setCameraPermission('denied');
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              alert("Permesso negato. Per favore, consenti l'accesso al microfono nelle impostazioni del browser (icona lucchetto nella barra degli indirizzi).");
          } else {
              alert("Errore nell'accesso al microfono: " + err.message);
          }
      }
  };

  const toggleTestScreenShare = async () => {
      if (isTestScreenSharing) {
          if (testScreenStream) {
              testScreenStream.getTracks().forEach(track => track.stop());
              setTestScreenStream(null);
          }
          setIsTestScreenSharing(false);
          // Restart camera if it was previously active and we were in video mode
          if (cameraPermission === 'granted' && !stream && isVideoMode) startCamera();
      } else {
          try {
              const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              setTestScreenStream(displayStream);
              setIsTestScreenSharing(true);
              if (videoRef.current) {
                  videoRef.current.srcObject = displayStream;
              }
              displayStream.getVideoTracks()[0].onended = () => {
                  setIsTestScreenSharing(false);
                  setTestScreenStream(null);
                  if (cameraPermission === 'granted' && isVideoMode) startCamera();
              };
          } catch (err) {
              console.error("Error sharing screen", err);
          }
      }
  };

  // --- ROLE ACTIONS ---
  const handleAddRole = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRoleName) return;
      const newRole: RoleDefinition = {
          id: newRoleName.toLowerCase().replace(/\s+/g, '_'),
          name: newRoleName,
          description: newRoleDesc || 'Nuovo ruolo personalizzato',
          permissions: ['view_dashboard', 'view_projects'] 
      };
      setRoles([...roles, newRole]);
      setSelectedRole(newRole);
      setIsRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
  };

  const handleDeleteRole = (roleId: string) => {
      if (window.confirm("Sei sicuro di voler eliminare questo ruolo?")) {
          const updatedRoles = roles.filter(r => r.id !== roleId);
          setRoles(updatedRoles);
          if (selectedRole.id === roleId) {
              setSelectedRole(updatedRoles[0]);
          }
      }
  };

  const togglePermission = (roleId: string, permId: string) => {
      const role = roles.find(r => r.id === roleId);
      if (!role) return;

      let newPermissions;
      if (role.permissions.includes('all')) return; 

      if (role.permissions.includes(permId)) {
          newPermissions = role.permissions.filter(p => p !== permId);
      } else {
          newPermissions = [...role.permissions, permId];
      }

      const updatedRoles = roles.map(r => r.id === roleId ? { ...r, permissions: newPermissions } : r);
      setRoles(updatedRoles);
      setSelectedRole({ ...role, permissions: newPermissions });
  };

  const toggleIntegration = (id: string) => {
      setIntegrations(integrations.map(app => app.id === id ? { ...app, connected: !app.connected } : app));
  };

  // --- RENDER HELPERS ---

  const renderAgencySettings = () => (
      <div className="flex flex-col h-full animate-fade-in">
          <div className="mb-6 flex justify-between items-start">
              <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gestione Agenzia</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                      Definisci la struttura del tuo team, crea ruoli personalizzati e assegna permessi granulari.
                  </p>
              </div>
              <button 
                onClick={() => setIsRoleModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg"
              >
                  <Plus size={16} /> Nuovo Ruolo
              </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
              {/* LEFT COL: ROLES LIST */}
              <div className="lg:w-1/3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar h-[500px] lg:h-auto">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">Ruoli Definiti</h4>
                  <div className="space-y-2">
                      {roles.map(role => (
                          <div 
                            key={role.id}
                            onClick={() => setSelectedRole(role)}
                            className={`p-3 rounded-xl cursor-pointer transition border flex items-center justify-between group ${selectedRole.id === role.id ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedRole.id === role.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                      <Shield size={16} />
                                  </div>
                                  <div>
                                      <p className={`text-sm font-bold ${selectedRole.id === role.id ? 'text-indigo-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{role.name}</p>
                                      <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{role.permissions.includes('all') ? 'Accesso Totale' : `${role.permissions.length} permessi`}</p>
                                  </div>
                              </div>
                              {!role.isSystem && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>

              {/* RIGHT COL: PERMISSIONS MATRIX */}
              <div className="lg:w-2/3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden h-[500px] lg:h-auto">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-start">
                          <div>
                              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  {selectedRole.name}
                                  {selectedRole.isSystem && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full uppercase">Sistema</span>}
                              </h2>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedRole.description}</p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      {selectedRole.permissions.includes('all') ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-70">
                              <Shield size={64} className="text-emerald-500 mb-4" />
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Accesso Amministrativo Completo</h3>
                              <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                                  Questo ruolo ha permessi di sistema globali che non possono essere modificati. Può vedere e gestire ogni aspetto dell'agenzia.
                              </p>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              {['General', 'Projects', 'Clients', 'Team'].map((cat) => {
                                  const catPermissions = permissionList.filter(p => p.category === cat);
                                  if (catPermissions.length === 0) return null;

                                  return (
                                      <div key={cat}>
                                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{cat}</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {catPermissions.map(perm => {
                                                  const isEnabled = selectedRole.permissions.includes(perm.id);
                                                  return (
                                                      <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isEnabled ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                          <div className="relative flex items-center mt-0.5">
                                                              <input 
                                                                type="checkbox" 
                                                                checked={isEnabled}
                                                                onChange={() => togglePermission(selectedRole.id, perm.id)}
                                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 checked:border-indigo-600 checked:bg-indigo-600 transition-all"
                                                              />
                                                              <Check size={12} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                                                          </div>
                                                          <div>
                                                              <p className={`text-sm font-bold ${isEnabled ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{perm.label}</p>
                                                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{perm.description}</p>
                                                          </div>
                                                      </label>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* ADD ROLE MODAL */}
          {isRoleModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Crea Nuovo Ruolo</h3>
                      <form onSubmit={handleAddRole} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Ruolo</label>
                              <input 
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="es. Junior Developer" 
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrizione</label>
                              <textarea 
                                value={newRoleDesc}
                                onChange={(e) => setNewRoleDesc(e.target.value)}
                                placeholder="Breve descrizione..." 
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20"
                              />
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                              <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annulla</button>
                              <button type="submit" disabled={!newRoleName} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">Crea Ruolo</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#f3f4f6] dark:bg-slate-950 p-4 md:p-8 gap-0 md:gap-8 relative overflow-hidden transition-colors">
      
      {/* --- MAIN LAYOUT --- */}
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8 flex-1 overflow-hidden">
        
        {/* Settings Navigation Sidebar */}
        <div className="md:w-64 flex-shrink-0 flex flex-col">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 px-2 hidden md:block">Impostazioni</h2>
           
           {/* Mobile Navigation (Horizontal Scroll) */}
           <div className="md:hidden overflow-x-auto pb-4 mb-2 flex gap-2 no-scrollbar">
              {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                   activeTab === tab.id 
                     ? 'bg-indigo-600 text-white shadow-md' 
                     : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                 }`}
               >
                 <tab.icon size={16} />
                 {tab.label}
               </button>
              ))}
           </div>

           {/* Desktop Navigation (Sidebar) */}
           <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex-1 h-full">
             <nav className="space-y-1">
               {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                     activeTab === tab.id 
                       ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' 
                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                   }`}
                 >
                   <div className="flex items-center gap-3">
                      <tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                      {tab.label}
                   </div>
                   {activeTab === tab.id && <ChevronRight size={16} className="text-indigo-400" />}
                 </button>
               ))}
             </nav>
             
             <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                <button className="flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-3 rounded-xl w-full text-sm font-bold transition-colors">
                   <LogOut size={18} /> Esci
                </button>
             </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-800 md:rounded-[2rem] rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 md:border-transparent p-6 md:p-10 overflow-y-auto custom-scrollbar transition-colors">
           
           {/* AGENCY SETTINGS (Admin Only) */}
           {activeTab === 'agency' && isAdmin && renderAgencySettings()}

           {/* PROFILE TAB */}
           {activeTab === 'profile' && (
              <div className="animate-fade-in max-w-2xl">
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Il tuo Profilo</h3>
                 <p className="text-slate-500 dark:text-slate-400 mb-8">Gestisci le tue informazioni personali e di contatto.</p>
                 
                 <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 mt-6">
                    <img src={currentUser?.avatar} className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-slate-700 shadow-sm object-cover" />
                    <div className="text-center sm:text-left">
                       <button className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 transition">Carica Nuova Foto</button>
                       <p className="text-xs text-slate-400 mt-2">JPG, GIF o PNG. Max 2MB.</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                         <input type="text" defaultValue={currentUser?.name} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                         <input type="email" defaultValue={currentUser?.email} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bio</label>
                         <textarea rows={3} placeholder="Parlaci di te..." className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"></textarea>
                     </div>
                 </div>
                 <div className="mt-8 flex justify-end">
                     <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition">Salva Modifiche</button>
                 </div>
              </div>
           )}

           {/* AUDIO & VIDEO (DEVICES) TAB */}
           {activeTab === 'devices' && (
               <div className="animate-fade-in max-w-2xl">
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Audio & Video</h3>
                   <p className="text-slate-500 dark:text-slate-400 mb-8">Testa e configura i dispositivi per le chiamate.</p>

                   <div className="space-y-8">
                       {/* Camera Section */}
                       <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><Video size={18} /> Videocamera</h4>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => stream && isVideoMode ? stopStream() : startCamera()}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${stream && isVideoMode ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}
                                    >
                                        {stream && isVideoMode ? 'Ferma Test' : 'Testa Videocamera'}
                                    </button>
                                    <button 
                                        onClick={toggleTestScreenShare} 
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${isTestScreenSharing ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}
                                    >
                                        {isTestScreenSharing ? 'Ferma Schermo' : 'Testa Schermo'}
                                    </button>
                                </div>
                           </div>
                           
                           <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-4">
                               <option>Default Camera</option>
                               <option>FaceTime HD Camera</option>
                           </select>

                           <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center">
                               {stream || testScreenStream ? (
                                   (isVideoMode || isTestScreenSharing) ? (
                                       <video 
                                         ref={videoRef} 
                                         autoPlay 
                                         playsInline 
                                         muted 
                                         className={`w-full h-full object-cover ${isTestScreenSharing ? '' : 'transform scale-x-[-1]'}`} 
                                       />
                                   ) : (
                                       <div className="text-center text-slate-500">
                                           <Mic size={48} className="mx-auto mb-2 text-green-500" />
                                           <p className="text-xs">Modalità Solo Audio Attiva</p>
                                       </div>
                                   )
                               ) : (
                                   <div className="text-center text-slate-500">
                                       <Camera size={48} className="mx-auto mb-2 opacity-20" />
                                       <p className="text-xs">Clicca "Testa Videocamera" per vedere l'anteprima.</p>
                                       {cameraPermission === 'denied' && <p className="text-xs text-red-500 font-bold mt-2">Accesso negato. Controlla i permessi del browser.</p>}
                                   </div>
                               )}
                           </div>
                       </div>

                       {/* Audio Section */}
                       <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><Mic size={18} /> Microfono</h4>
                                <button 
                                    onClick={() => stream && !isVideoMode ? stopStream() : startMicrophone()}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${stream && !isVideoMode ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}
                                >
                                    {stream && !isVideoMode ? 'Ferma Test' : 'Testa Microfono'}
                                </button>
                           </div>
                           <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-6">
                               <option>Default Microphone</option>
                               <option>MacBook Pro Microphone</option>
                           </select>
                           
                           {/* Visualizer */}
                           <div className="flex items-center gap-4">
                               <div className={`p-2 rounded-full ${audioLevel > 10 ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                   <Mic size={20} />
                               </div>
                               <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                   {Array.from({length: 20}).map((_, i) => (
                                       <div 
                                         key={i} 
                                         className={`flex-1 rounded-sm transition-all duration-75 ${
                                             i < (audioLevel / 5) 
                                             ? (i > 15 ? 'bg-red-500' : i > 10 ? 'bg-yellow-500' : 'bg-green-500') 
                                             : 'bg-transparent'
                                         }`}
                                       ></div>
                                   ))}
                               </div>
                           </div>
                           <p className="text-xs text-slate-400 mt-2 text-right">
                               {stream ? 'Livello Input (Real-time)' : 'Avvia un test per vedere il livello'}
                           </p>
                       </div>

                       {/* Speaker Section */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><Speaker size={18} /> Altoparlanti</h4>
                                <button className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition">Test Audio</button>
                           </div>
                           <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                               <option>Default Output</option>
                               <option>MacBook Pro Speakers</option>
                           </select>
                       </div>
                   </div>
               </div>
           )}

           {/* NOTIFICATIONS TAB */}
           {activeTab === 'notifications' && (
               <div className="animate-fade-in max-w-3xl">
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Notifiche</h3>
                   <p className="text-slate-500 dark:text-slate-400 mb-8">Personalizza come e quando vuoi essere aggiornato.</p>

                   <div className="grid grid-cols-1 gap-6">
                       
                       {/* Activity Notifications */}
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Bell size={20} className="text-indigo-500"/> Attività su Hubss</h4>
                           <div className="space-y-4">
                               {['Menzioni (@nome)', 'Nuovi commenti sui tuoi task', 'Aggiornamenti di stato progetto', 'Assegnazione nuovi task', 'Messaggi diretti'].map((item, i) => (
                                   <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                       <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                                       <div className="relative inline-flex items-center cursor-pointer">
                                           <input type="checkbox" className="sr-only peer" defaultChecked={i < 3} />
                                           <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       {/* Email Notifications */}
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Mail size={20} className="text-blue-500"/> Email Digest</h4>
                           <div className="space-y-4">
                               {['Riepilogo giornaliero (Mattina)', 'Report settimanale (Venerdì)', 'Nuovi inviti nel team', 'Newsletter marketing'].map((item, i) => (
                                   <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                       <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                                       <div className="relative inline-flex items-center cursor-pointer">
                                           <input type="checkbox" className="sr-only peer" defaultChecked={i === 0} />
                                           <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       {/* Desktop & Sound */}
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Monitor size={20} className="text-orange-500"/> Desktop & Suoni</h4>
                           <div className="space-y-4">
                               <div className="flex items-center justify-between py-2">
                                   <div>
                                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Suoni di notifica</p>
                                       <p className="text-xs text-slate-500">Riproduci un suono per i nuovi messaggi.</p>
                                   </div>
                                   <div className="relative inline-flex items-center cursor-pointer">
                                       <input type="checkbox" className="sr-only peer" defaultChecked />
                                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                   </div>
                               </div>
                               <div className="flex items-center justify-between py-2">
                                   <div>
                                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Anteprima messaggio</p>
                                       <p className="text-xs text-slate-500">Mostra il contenuto nelle notifiche desktop.</p>
                                   </div>
                                   <div className="relative inline-flex items-center cursor-pointer">
                                       <input type="checkbox" className="sr-only peer" />
                                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                   </div>
                               </div>
                           </div>
                       </div>

                   </div>
               </div>
           )}

           {/* INTEGRATIONS TAB */}
           {activeTab === 'integrations' && (
               <div className="animate-fade-in">
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Integrazioni</h3>
                   <p className="text-slate-500 dark:text-slate-400 mb-8">Connetti i tuoi strumenti preferiti per centralizzare il lavoro.</p>

                   <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                       {categories.map(cat => (
                           <button 
                               key={cat.id} 
                               onClick={() => setSelectedCategory(cat.id as any)}
                               className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
                           >
                               {cat.label}
                           </button>
                       ))}
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                       {integrations.filter(i => selectedCategory === 'all' || i.category === selectedCategory).map(app => (
                           <div key={app.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                               <div className="flex items-start justify-between mb-4">
                                   <div className="flex gap-4">
                                       <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl p-2.5 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                           <img src={app.icon} className="w-full h-full object-contain" alt={app.name} />
                                       </div>
                                       <div>
                                           <h4 className="font-bold text-slate-900 dark:text-white text-lg">{app.name}</h4>
                                           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{categories.find(c => c.id === app.category)?.label}</span>
                                       </div>
                                   </div>
                                   {app.connected ? (
                                       <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                                   ) : (
                                       <div className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                   )}
                               </div>
                               
                               <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 min-h-[40px]">{app.description}</p>
                               
                               <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
                                   <button className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
                                       <SettingsIcon size={12} /> Configura
                                   </button>
                                   <button 
                                       onClick={() => toggleIntegration(app.id)}
                                       className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${app.connected ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900'}`}
                                   >
                                       {app.connected ? 'Disconnetti' : 'Connetti'}
                                   </button>
                                </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {/* PLANS & BILLING TAB */}
           {activeTab === 'billing' && (
               <div className="animate-fade-in max-w-3xl">
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Piani e Fatturazione</h3>
                   <p className="text-slate-500 dark:text-slate-400 mb-8">Gestisci il tuo abbonamento e i metodi di pagamento.</p>

                   <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white mb-8 shadow-xl relative overflow-hidden">
                       <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                           <div>
                               <p className="text-indigo-100 text-xs font-bold uppercase mb-2 tracking-widest">Piano Attuale</p>
                               <h2 className="text-4xl font-bold mb-4">Hubss Pro</h2>
                               <div className="flex flex-wrap gap-3 text-sm font-medium">
                                   <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">€ 29/mese</span>
                                   <span className="flex items-center gap-1 bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30 text-green-100"><Check size={14} /> Attivo</span>
                                   <span className="flex items-center gap-1 text-indigo-100"><Clock size={14} /> Rinnovo: 01 Set 2025</span>
                               </div>
                           </div>
                           <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition transform hover:scale-105 active:scale-95">Upgrade Piano</button>
                       </div>
                       <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                       <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><HardDrive size={16} /> Spazio Archiviazione</h4>
                               <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">75%</span>
                           </div>
                           <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                               <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-3/4 rounded-full"></div>
                           </div>
                           <p className="text-xs text-slate-500">15GB usati di 20GB disponibili</p>
                       </div>
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Users size={16} /> Utenti Team</h4>
                               <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">5/10</span>
                           </div>
                           <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                               <div className="h-full bg-green-500 w-1/2 rounded-full"></div>
                           </div>
                           <p className="text-xs text-slate-500">5 posti ancora disponibili</p>
                       </div>
                   </div>

                   <div>
                       <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><FileText size={20} /> Cronologia Fatture</h4>
                       <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase text-xs">
                                   <tr>
                                       <th className="px-6 py-4">Data</th>
                                       <th className="px-6 py-4">Descrizione</th>
                                       <th className="px-6 py-4">Importo</th>
                                       <th className="px-6 py-4">Stato</th>
                                       <th className="px-6 py-4 text-right">Azioni</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                   {[1, 2, 3].map((i) => (
                                       <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                           <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">01/{i.toString().padStart(2, '0')}/2024</td>
                                           <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Hubss Pro - Mensile</td>
                                           <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">€ 29.00</td>
                                           <td className="px-6 py-4"><span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1"><Check size={10} /> Pagata</span></td>
                                           <td className="px-6 py-4 text-right"><button className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold text-xs hover:underline flex items-center justify-end gap-1 ml-auto"><Download size={14} /> PDF</button></td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </div>
           )}

           {/* APPEARANCE TAB */}
           {activeTab === 'appearance' && (
              <div className="animate-fade-in max-w-3xl">
                 <div className="mb-8">
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Aspetto & Personalizzazione</h3>
                     <p className="text-slate-500 dark:text-slate-400">Rendi Hubss tuo. Le modifiche vengono salvate automaticamente.</p>
                 </div>

                 {/* Theme Section */}
                 <div className="mb-10">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Tema Interfaccia</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <button 
                         onClick={() => onThemeChange('light')}
                         className={`group relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${currentTheme === 'light' ? 'border-indigo-600 bg-white ring-4 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                       >
                          <div className="absolute top-0 right-0 p-2 opacity-10"><Sun size={48} /></div>
                          <div className="flex justify-between items-center relative z-10">
                             <span className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Sun size={18} className="text-orange-500" /> Chiaro</span>
                             {currentTheme === 'light' && <div className="bg-indigo-600 text-white rounded-full p-1"><Check size={12} /></div>}
                          </div>
                       </button>

                       <button 
                         onClick={() => onThemeChange('dark')}
                         className={`group relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${currentTheme === 'dark' ? 'border-indigo-600 bg-slate-900 ring-4 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-300'}`}
                       >
                          <div className="absolute top-0 right-0 p-2 opacity-10"><Moon size={48} /></div>
                          <div className="flex justify-between items-center relative z-10">
                             <span className="font-bold text-white text-sm flex items-center gap-2"><Moon size={18} className="text-indigo-400" /> Scuro</span>
                             {currentTheme === 'dark' && <div className="bg-indigo-600 text-white rounded-full p-1"><Check size={12} /></div>}
                          </div>
                       </button>

                       <button 
                         onClick={() => onThemeChange('system')}
                         className={`group relative p-4 rounded-2xl border-2 transition-all text-left overflow-hidden ${currentTheme === 'system' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 ring-4 ring-indigo-100 dark:ring-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                       >
                          <div className="absolute top-0 right-0 p-2 opacity-10"><Monitor size={48} /></div>
                          <div className="flex justify-between items-center relative z-10">
                             <span className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Monitor size={18} className="text-slate-500" /> Auto</span>
                             {currentTheme === 'system' && <div className="bg-indigo-600 text-white rounded-full p-1"><Check size={12} /></div>}
                          </div>
                       </button>
                    </div>
                 </div>

                 {/* Colors Section */}
                 <div className="mb-10 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Colore Principale (Brand)</h4>
                    <div className="flex gap-4 flex-wrap">
                       {colorOptions.map(option => (
                          <button 
                            key={option.id}
                            onClick={() => onColorChange(option.id)}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${primaryColor === option.id ? 'scale-110 ring-4 ring-offset-2 ring-slate-200 dark:ring-slate-700 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            style={{ backgroundColor: option.hex }}
                            title={option.label}
                          >
                             {primaryColor === option.id && <Check size={24} className="text-white drop-shadow-md" />}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Avatar Mascot Toggle */}
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <Smile size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Hubss Buddy</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Il tuo assistente motivazionale personale.</p>
                            </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={mascotEnabled} 
                                onChange={() => setMascotEnabled(!mascotEnabled)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </div>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default Settings;


import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, MessageSquare, CheckSquare, FileText, 
  BarChart2, LifeBuoy, Clock, CheckCircle, Circle, 
  Download, Eye, Send, Plus, Search, Filter, AlertCircle,
  HardDrive, Cloud, X, Loader2, UploadCloud, ChevronLeft, Users,
  Camera, Image as ImageIcon
} from 'lucide-react';
import { Milestone, Ticket, ClientFile, Task, User, Client, Message } from '../types';

// --- MOCK DATA (Clients moved to App.tsx) ---

const milestones: Milestone[] = [
  { id: 'm1', title: 'Approvazione Design', status: 'completed', date: '10 Lug' },
  { id: 'm2', title: 'Sviluppo Frontend', status: 'in_progress', date: '25 Lug' },
  { id: 'm3', title: 'Integrazione API', status: 'pending', date: '05 Ago' },
  { id: 'm4', title: 'Lancio Beta', status: 'pending', date: '20 Ago' },
];

const initialClientFiles: ClientFile[] = [
  { id: 'f1', name: 'Contratto_v2_Signed.pdf', type: 'pdf', size: '2.4 MB', date: '01 Lug', uploadedBy: 'Alessandro M.' },
  { id: 'f2', name: 'Brand_Assets.zip', type: 'zip', size: '45 MB', date: '05 Lug', uploadedBy: 'Giulia V.' },
  { id: 'f3', name: 'Mockups_Home.png', type: 'img', size: '1.2 MB', date: '12 Lug', uploadedBy: 'Giulia V.' },
];

const tickets: Ticket[] = [
  { id: 't1', subject: 'Modifica colore header', type: 'Modifica', status: 'In Lavorazione', priority: 'Medium', date: 'Ieri' },
  { id: 't2', subject: 'Login non funziona da mobile', type: 'Bug', status: 'Ricevuta', priority: 'High', date: 'Oggi' },
  { id: 't3', subject: 'Richiesta info su API', type: 'Domanda', status: 'Completata', priority: 'Low', date: '01 Lug' },
];

// --- SUB-COMPONENTS ---

const PortalHeader = ({ client, onBack, onLogoUpdate }: { client: Client, onBack: () => void, onLogoUpdate: (client: Client) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              const newLogo = reader.result as string;
              // Update local client object and trigger update
              const updatedClient = { ...client, avatar: newLogo };
              onLogoUpdate(updatedClient);
          };
          reader.readAsDataURL(file);
      }
  };

  return (
  <div className="flex items-center justify-between mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
        <ChevronLeft size={24} />
      </button>
      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl uppercase overflow-hidden">
        {client.avatar && client.avatar.startsWith('http') ? (
            <img src={client.avatar} alt="Logo" className="w-full h-full object-cover" />
        ) : (
            client.company.substring(0, 2)
        )}
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{client.company} - {client.project}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Portale Cliente</p>
      </div>
    </div>
    
    <div className="flex items-center gap-4">
       <div className="text-right hidden md:block">
          {/* Display Owner/Creator name here if desired, or client contact name */}
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{client.owner || client.name}</p> 
          <p className="text-xs text-slate-500 dark:text-slate-400">Referente Principale</p>
       </div>
       
       <div 
         className="relative group cursor-pointer"
         onClick={handleLogoClick}
         title="Modifica logo cliente"
       >
           <img src={client.avatar} className="w-10 h-10 rounded-full border-2 border-indigo-100 dark:border-indigo-900 object-cover" alt="Client" />
           {/* Removed opacity-0 group-hover:opacity-100 to make it always visible but subtle */}
           <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center transition-opacity">
               <Camera size={14} className="text-white drop-shadow-md" />
           </div>
           <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*"
               onChange={handleFileChange}
           />
       </div>
    </div>
  </div>
  );
};

const PortalTabs = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'tasks', label: 'Task', icon: CheckSquare },
    { id: 'files', label: 'File', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'tickets', label: 'Richieste', icon: LifeBuoy },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === tab.id 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-700'
          }`}
        >
          <tab.icon size={18} />
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

interface ClientPortalProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void; 
  allMessages: Record<string, Message[]>;
  onSendMessage: (channelId: string, content: string, senderId: string, isAi?: boolean) => void; 
  currentUser?: User;
  teamMembers?: User[]; // Optional as it might not be passed initially
}

const ClientPortal: React.FC<ClientPortalProps> = ({ clients, onAddClient, onUpdateClient, allMessages, onSendMessage, currentUser, teamMembers = [] }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [files, setFiles] = useState<ClientFile[]>(initialClientFiles);
  
  // Chat Input State
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Client Modal State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientProject, setNewClientProject] = useState('');
  const [newClientOwner, setNewClientOwner] = useState(currentUser?.name || '');
  const [newClientLogo, setNewClientLogo] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Task generation for specific client
  const clientTasks: Task[] = selectedClient ? [
      { id: 'ct1', title: 'Revisione Bozze UI', status: 'In Progress', priority: 'High', assignees: teamMembers.slice(0,1), dueDate: 'Domani', comments: 3, tags: ['Design'], clientVisible: true },
      { id: 'ct2', title: 'Fornire credenziali server', status: 'To Do', priority: 'Critical', assignees: [], dueDate: '20 Lug', comments: 0, tags: ['Admin'], clientVisible: true },
      { id: 'ct3', title: 'Approvazione testi', status: 'Done', priority: 'Medium', assignees: teamMembers.slice(0,1), dueDate: '10 Lug', comments: 1, tags: ['Content'], clientVisible: true },
  ] : [];

  // --- ACTIONS ---

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewClientLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newClientName || !newClientCompany) return;

    const newClient: Client = {
      id: `c${Date.now()}`,
      name: newClientName, // External contact
      company: newClientCompany,
      project: newClientProject || 'Nuovo Progetto',
      status: 'pending',
      lastAccess: 'Mai',
      avatar: newClientLogo || `https://ui-avatars.com/api/?name=${newClientCompany.replace(' ', '+')}&background=random`,
      owner: newClientOwner || currentUser?.name || 'Admin' 
    };

    onAddClient(newClient);
    setIsAddClientModalOpen(false);
    // Reset Form
    setNewClientName('');
    setNewClientCompany('');
    setNewClientProject('');
    setNewClientOwner(currentUser?.name || '');
    setNewClientLogo('');
  };

  const handleComputerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFile: ClientFile = {
        id: `f${Date.now()}`,
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.match(/\.(jpg|jpeg|png|gif)$/) ? 'img' : 'doc',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: 'Oggi',
        uploadedBy: 'Tu'
      };
      
      setIsUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        setFiles([newFile, ...files]);
        setIsUploading(false);
        setIsUploadModalOpen(false);
      }, 1500);
    }
  };

  const handleDriveUpload = () => {
    setIsUploading(true);
    // Simulate Drive Picker and upload
    setTimeout(() => {
      const driveFile: ClientFile = {
        id: `drive${Date.now()}`,
        name: 'Project_Specs_V3.gdoc',
        type: 'doc',
        size: 'Link',
        date: 'Oggi',
        uploadedBy: 'Google Drive'
      };
      setFiles([driveFile, ...files]);
      setIsUploading(false);
      setIsUploadModalOpen(false);
    }, 2000);
  };

  // --- CHAT LOGIC ---
  const handleClientSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || !selectedClient) return;
      
      // Use the shared handler for the official client channel
      const channelId = `${selectedClient.id}_official`;
      onSendMessage(channelId, chatInput, currentUser?.id || 'me');
      setChatInput('');
  };

  useEffect(() => {
      if (activeTab === 'chat' && chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [allMessages, activeTab, selectedClient]);

  // Handle local update when logo changes in child component
  const handleLocalClientUpdate = (updated: Client) => {
      setSelectedClient(updated);
      onUpdateClient(updated);
  };

  // Render Functions

  const renderClientDirectory = () => (
      <div className="animate-fade-in max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
              <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">I Miei Clienti</h1>
                  <p className="text-slate-500 dark:text-slate-400">Seleziona un cliente per accedere al suo portale dedicato.</p>
              </div>
              <div className="relative">
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="text" placeholder="Cerca cliente..." className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-none dark:text-white dark:placeholder-slate-500 shadow-sm" />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map(client => (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500 transition-all cursor-pointer group"
                  >
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl uppercase group-hover:scale-110 transition-transform overflow-hidden relative">
                            {/* If avatar is a URL (likely from picsum in mocks or user upload), show it, else show initials */}
                            {client.avatar && client.avatar.startsWith('http') ? (
                                <img src={client.avatar} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                client.company.substring(0, 2)
                            )}
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            client.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {client.status}
                        </span>
                     </div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{client.company}</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{client.project}</p>
                     
                     <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {client.owner ? client.owner.charAt(0) : 'A'}
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{client.owner || 'Non assegnato'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Referente Principale</span>
                     </div>
                  </div>
              ))}
              
              <button 
                onClick={() => setIsAddClientModalOpen(true)}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                 <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                     <Plus size={24} />
                 </div>
                 <span className="font-bold">Nuovo Cliente</span>
              </button>
          </div>
      </div>
  );

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><CheckSquare size={20} /></div>
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">Task Aperti</h3>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{clientTasks.filter(t => t.status !== 'Done' && t.status !== 'Fatto').length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><FileText size={20} /></div>
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">File Condivisi</h3>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{files.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400"><Clock size={20} /></div>
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">Prossima Milestone</h3>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{milestones.find(m => m.status !== 'completed')?.title || 'Nessuna'}</p>
                <p className="text-xs text-slate-500">{milestones.find(m => m.status !== 'completed')?.date}</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Milestones Progetto</h3>
            <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-700">
                {milestones.map((m, i) => (
                    <div key={m.id} className="relative flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-white dark:border-slate-800 ${m.status === 'completed' ? 'bg-green-500 text-white' : m.status === 'in_progress' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                            {m.status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h4 className={`font-bold text-sm ${m.status === 'pending' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{m.title}</h4>
                                <p className="text-xs text-slate-400">{m.date}</p>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${m.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : m.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                {m.status === 'in_progress' ? 'In Corso' : m.status === 'completed' ? 'Completato' : 'In Attesa'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderChat = () => {
      const channelId = selectedClient ? `${selectedClient.id}_official` : '';
      const messages = allMessages[channelId] || [];

      return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-[600px] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Canale Ufficiale</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Comunicazioni con {selectedClient?.company}</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 my-auto pt-20">
                        <MessageSquare size={48} className="mx-auto mb-2 opacity-20" />
                        <p>Nessun messaggio ancora.</p>
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === 'me' || msg.senderId === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                                <p>{msg.content}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                        </div>
                    );
                })}
                <div ref={chatEndRef}></div>
            </div>

            <form onSubmit={handleClientSend} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Scrivi un messaggio..." 
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition shadow-md disabled:opacity-50" disabled={!chatInput.trim()}>
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
      );
  };

  const renderTasks = () => (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Task Condivisi</h3>
              <div className="flex gap-2">
                  <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">Active: {clientTasks.filter(t => t.status !== 'Done').length}</span>
              </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {clientTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Nessun task visibile al cliente.</div>
              ) : clientTasks.map(task => (
                  <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${task.priority === 'High' || task.priority === 'Critical' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                          <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm">{task.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Scadenza: {task.dueDate}</p>
                          </div>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{task.status}</span>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderFiles = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Documenti & Asset</h3>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md"
              >
                  <UploadCloud size={16} /> Carica File
              </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                  <div key={file.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-sm group relative">
                      <div className="flex justify-between items-start mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${file.type === 'pdf' ? 'bg-red-100 text-red-600' : file.type === 'zip' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                              <FileText size={20} />
                          </div>
                          <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"><Download size={18} /></button>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate mb-1" title={file.name}>{file.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{file.size} • {file.date}</p>
                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                          <div className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm text-xs font-bold text-slate-700 dark:text-white">Scarica</div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderTickets = () => (
      <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ticket di Supporto</h3>
              <button 
                onClick={() => setTicketFormOpen(!ticketFormOpen)} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                  {ticketFormOpen ? 'Chiudi Form' : 'Nuovo Ticket'}
              </button>
          </div>

          {ticketFormOpen && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 animate-slide-up">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-4">Invia una richiesta</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input type="text" placeholder="Oggetto" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                      <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                          <option>Bug</option>
                          <option>Modifica</option>
                          <option>Domanda</option>
                      </select>
                  </div>
                  <textarea rows={3} placeholder="Descrivi il problema..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-4 dark:text-white resize-none"></textarea>
                  <div className="flex justify-end">
                      <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md">Invia Ticket</button>
                  </div>
              </div>
          )}

          <div className="space-y-3">
              {tickets.map(ticket => (
                  <div key={ticket.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${ticket.type === 'Bug' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              <AlertCircle size={20} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm">{ticket.subject}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{ticket.type} • {ticket.date}</p>
                          </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'Completata' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {ticket.status}
                      </span>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderReports = () => (
      <div className="animate-fade-in bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <BarChart2 size={48} className="mx-auto text-indigo-200 dark:text-indigo-900 mb-4" />
          <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">Reportistica in arrivo</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              Stiamo lavorando a una dashboard avanzata per visualizzare ore lavorate, budget e performance del progetto in tempo reale.
          </p>
      </div>
  );
  
  if (!selectedClient) {
      return (
          <div className="h-full bg-[#f3f4f6] dark:bg-slate-950 p-8 overflow-y-auto transition-colors">
             {/* ADD CLIENT MODAL */}
             {isAddClientModalOpen && (
               <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Nuovo Cliente</h3>
                        <button onClick={() => setIsAddClientModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full dark:text-white">
                           <X size={24} />
                        </button>
                     </div>
                     <form onSubmit={handleAddClientSubmit} className="space-y-4">
                        
                        {/* LOGO UPLOAD FIELD */}
                        <div className="flex items-center gap-4">
                            <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition overflow-hidden relative group shrink-0"
                            >
                                {newClientLogo ? (
                                    <img src={newClientLogo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Camera size={20} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-[10px] font-bold">Modifica</div>
                            </div>
                            <input 
                                type="file" 
                                ref={logoInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                            <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Logo Azienda</p>
                                <p className="text-xs text-slate-500">Clicca per caricare</p>
                            </div>
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Azienda</label>
                           <input 
                              type="text" 
                              value={newClientCompany}
                              onChange={(e) => setNewClientCompany(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                              placeholder="Es. Acme Corp"
                              required
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Referente Cliente</label>
                           <input 
                              type="text" 
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                              placeholder="Es. Mario Rossi (Cliente)"
                              required
                           />
                        </div>

                        {/* INTERNAL OWNER DROPDOWN */}
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referente Interno (Account Manager)</label>
                           <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select 
                                    value={newClientOwner}
                                    onChange={(e) => setNewClientOwner(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white appearance-none"
                                >
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.name}>{member.name} ({member.role})</option>
                                    ))}
                                    {teamMembers.length === 0 && <option value={currentUser?.name}>{currentUser?.name} (Tu)</option>}
                                </select>
                           </div>
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Progetto Principale (Opzionale)</label>
                           <input 
                              type="text" 
                              value={newClientProject}
                              onChange={(e) => setNewClientProject(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                              placeholder="Es. Website Redesign"
                           />
                        </div>
                        <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-md">
                           Aggiungi Cliente
                        </button>
                     </form>
                  </div>
               </div>
             )}
             
             {renderClientDirectory()}
          </div>
      );
  }

  return (
    <div className="h-full bg-[#f3f4f6] dark:bg-slate-950 p-8 overflow-y-auto transition-colors">
       {/* UPLOAD MODAL */}
       {isUploadModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
             <button 
               onClick={() => setIsUploadModalOpen(false)}
               className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
             >
               <X size={20} />
             </button>
             
             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Carica File</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Scegli da dove vuoi importare i tuoi documenti.</p>
             
             {isUploading ? (
               <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
                  <p className="font-bold text-slate-800 dark:text-white">Caricamento in corso...</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
                 >
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 mb-3 transition">
                      <HardDrive size={24} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">Dal Computer</span>
                    <span className="text-xs text-slate-400 mt-1">Seleziona file locale</span>
                 </button>
                 
                 <button 
                   onClick={handleDriveUpload}
                   className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
                 >
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 group-hover:text-blue-700 dark:group-hover:text-blue-300 mb-3 transition">
                      <Cloud size={24} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">Google Drive</span>
                    <span className="text-xs text-slate-400 mt-1">Account Connesso</span>
                 </button>
               </div>
             )}

             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               onChange={handleComputerUpload}
             />
           </div>
         </div>
       )}

       <div className="max-w-6xl mx-auto pb-20">
         <PortalHeader client={selectedClient} onBack={() => setSelectedClient(null)} onLogoUpdate={handleLocalClientUpdate} />
         <PortalTabs activeTab={activeTab} setActiveTab={setActiveTab} />
         
         <div className="mt-8">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'chat' && renderChat()}
            {activeTab === 'tasks' && renderTasks()}
            {activeTab === 'files' && renderFiles()}
            {activeTab === 'tickets' && renderTickets()}
            {activeTab === 'reports' && renderReports()}
         </div>
       </div>
    </div>
  );
};

export default ClientPortal;

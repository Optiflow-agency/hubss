
import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, Info, Bot, Search, Hash, 
    X, HardDrive, Cloud, Loader2, ChevronDown, ChevronRight,
    Plus, Sparkles, Building2, Briefcase, MessageCircle, MoreVertical,
    Phone, Video, UserPlus, Smile, Image as ImageIcon, Bold, Italic, List,
    FileText, Bell, Lock, Trash2, Check, CheckSquare, FolderPlus, Edit2, ArrowLeft,
    Calendar as CalendarIcon, Users, Reply, Pin as PinIcon
} from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';
import { Message, Channel, User as UserType, Client, CallSession, Board, Task } from '../types';
import CallInterface from '../components/CallInterface';

interface ChatProps {
  channels: Channel[];
  teamMembers: UserType[];
  clients: Client[];
  boards: Board[]; 
  onAddTask: (boardId: string, task: Task) => void;
  workspaceName?: string; 
  allMessages: Record<string, Message[]>; // Received from App
  onSendMessage: (channelId: string, content: string, senderId: string, isAi?: boolean, parentId?: string) => void; // Received from App
  onAddReaction?: (channelId: string, messageId: string, emoji: string) => void;
  onTogglePin?: (channelId: string, messageId: string) => void;
}

const commonEmojis = ["👍", "❤️", "😂", "🎉", "🚀", "🔥", "👀", "✅", "😅", "👏", "🤔", "👎", "😊", "😎", "😭", "🙌", "✨", "💯"];

const Chat: React.FC<ChatProps> = ({ channels: initialChannels, teamMembers, clients, boards, onAddTask, workspaceName = "Workspace", allMessages, onSendMessage, onAddReaction, onTogglePin }) => {
  // --- STATE ---
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState('ai');
  
  const [hasContent, setHasContent] = useState(false); 
  const [isTyping, setIsTyping] = useState(false);
  
  // UI State
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'members' | 'info' | 'files'>('members');
  const [activeMobileMessageId, setActiveMobileMessageId] = useState<string | null>(null);

  // Thread State
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const [threadInputContent, setThreadInputContent] = useState('');

  // Call State
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isCallSelectionOpen, setIsCallSelectionOpen] = useState(false);
  const [callTypeToStart, setCallTypeToStart] = useState<'audio' | 'video'>('audio');
  const [selectedCallParticipants, setSelectedCallParticipants] = useState<string[]>([]);

  // Modals & Popups
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // TASK Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id || '');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low'|'Medium'|'High'|'Critical'>('Medium');

  // MEETING Menu State
  const [isMeetingMenuOpen, setIsMeetingMenuOpen] = useState(false);

  // CHANNEL/CATEGORY MANAGEMENT STATE
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [editingType, setEditingType] = useState<'channel' | 'category'>('channel');
  const [editName, setEditName] = useState('');
  const [editCategoryParent, setEditCategoryParent] = useState('Workspace');
  const [originalCategoryName, setOriginalCategoryName] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
  const allChannelMessages = allMessages[activeChannelId] || []; 
  // Main chat only shows messages that are NOT replies
  const mainMessages = allChannelMessages.filter(m => !m.threadId);
  const threadMessages = activeThreadMessage ? allChannelMessages.filter(m => m.threadId === activeThreadMessage.id) : [];
  
  const pinnedMessages = mainMessages.filter(m => m.pinned);

  const currentUser = teamMembers[0];

  // --- EFFECTS ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mainMessages, activeChannelId]);

  useEffect(() => {
    if (activeThreadMessage) {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages, activeThreadMessage]);

  useEffect(() => {
      if (initialChannels.length > channels.length) {
          setChannels(initialChannels);
      }
  }, [initialChannels]);

  const handleChannelSelect = (id: string) => {
      setActiveChannelId(id);
      setMobileView('chat');
      setActiveThreadMessage(null); // Close thread when changing channel
      setIsRightPanelOpen(false);
      setActiveMobileMessageId(null);
  };

  const handleBackToList = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setMobileView('list');
  };

  const handleOpenThread = (msg: Message) => {
      setActiveThreadMessage(msg);
      setIsRightPanelOpen(true); // Reuse right panel area for thread
  };

  const handleCloseThread = () => {
      setActiveThreadMessage(null);
      setIsRightPanelOpen(false);
  };

  const handleThreadReply = (e: React.FormEvent) => {
      e.preventDefault();
      if (!threadInputContent.trim() || !activeThreadMessage) return;
      onSendMessage(activeChannelId, threadInputContent, 'me', false, activeThreadMessage.id);
      setThreadInputContent('');
  };

  const openCreateModal = () => {
      setEditingId(null);
      setEditingType('channel');
      setEditName('');
      setEditCategoryParent('Workspace');
      setIsEditModalOpen(true);
  };

  const openEditChannel = (channel: Channel) => {
      setEditingId(channel.id);
      setEditingType('channel');
      setEditName(channel.name);
      setEditCategoryParent(channel.category || 'Workspace');
      setIsEditModalOpen(true);
  };

  const openEditCategory = (categoryName: string) => {
      setEditingId('CATEGORY_EDIT'); 
      setEditingType('category');
      setEditName(categoryName);
      setOriginalCategoryName(categoryName);
      setIsEditModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editName.trim()) return;

      if (editingId === 'CATEGORY_EDIT' && editingType === 'category') {
          const updatedChannels = channels.map(c => {
              if (c.category === originalCategoryName) {
                  return { ...c, category: editName };
              }
              return c;
          });
          setChannels(updatedChannels);
      }
      else if (editingId && editingType === 'channel') {
          const updatedChannels = channels.map(c => {
              if (c.id === editingId) {
                  return { 
                      ...c, 
                      name: editName.toLowerCase().replace(/\s+/g, '-'), 
                      category: editCategoryParent 
                  };
              }
              return c;
          });
          setChannels(updatedChannels);
      }
      else {
          const newId = `new_${Date.now()}`;
          let newChannel: Channel;

          if (editingType === 'category') {
              newChannel = {
                  id: newId,
                  name: 'generale',
                  type: 'channel',
                  category: editName,
                  status: 'online',
                  lastMessage: 'Canale creato'
              };
          } else {
              newChannel = {
                  id: newId,
                  name: editName.toLowerCase().replace(/\s+/g, '-'), 
                  type: 'channel',
                  category: editCategoryParent,
                  status: 'online'
              };
          }
          setChannels([...channels, newChannel]);
          setActiveChannelId(newId);
          setMobileView('chat');
      }

      setIsEditModalOpen(false);
  };

  const deleteChannel = (channelId: string) => {
      if (channels.length <= 1) return;
      const newChannels = channels.filter(c => c.id !== channelId);
      setChannels(newChannels);
      if (activeChannelId === channelId) {
          setActiveChannelId(newChannels[0].id);
      }
  };

  const deleteCategory = (categoryName: string) => {
      if (window.confirm(`Sei sicuro di voler eliminare la categoria "${categoryName}" e tutti i suoi canali?`)) {
          const newChannels = channels.filter(c => c.category !== categoryName);
          setChannels(newChannels);
          if (!newChannels.find(c => c.id === activeChannelId)) {
              setActiveChannelId(newChannels.find(c => c.type === 'ai')?.id || newChannels[0]?.id || '');
          }
      }
  };

  const handleCreateTaskFromChat = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskTitle || !selectedBoardId) return;

      const board = boards.find(b => b.id === selectedBoardId);
      if (!board) return;

      const newTask: Task = {
          id: `t_${Date.now()}`,
          title: newTaskTitle,
          status: board.columns[0].id,
          priority: newTaskPriority,
          assignees: [currentUser],
          dueDate: new Date().toISOString().split('T')[0],
          comments: 0,
          tags: ['Chat'],
          attachments: []
      };

      onAddTask(selectedBoardId, newTask);
      
      // Use onSendMessage prop
      const sysContent = `✅ Task creato: <b>${newTaskTitle}</b> in <i>${board.title}</i>`;
      onSendMessage(activeChannelId, sysContent, 'system');

      setIsTaskModalOpen(false);
      setNewTaskTitle('');
  };

  // --- NEW: HANDLE CREATE MEETING ---
  const handleCreateMeeting = (platform: 'google' | 'zoom' | 'teams' | 'nexus') => {
      setIsMeetingMenuOpen(false);
      
      if (platform === 'nexus') {
          initiateCall('video');
          return;
      }

      let link = '';
      let label = '';
      let colorClass = '';
      const id = Math.random().toString(36).substring(7);

      switch(platform) {
          case 'google':
              link = `https://meet.google.com/${id}`;
              label = 'Google Meet';
              colorClass = 'bg-green-50 text-green-700 border-green-200';
              break;
          case 'zoom':
              link = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
              label = 'Zoom';
              colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
              break;
          case 'teams':
              link = `https://teams.microsoft.com/l/meetup-join/${id}`;
              label = 'Microsoft Teams';
              colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
              break;
      }

      const content = `
          <div class="flex flex-col gap-1.5 p-2 rounded-lg border ${colorClass} bg-opacity-50">
              <div class="font-bold flex items-center gap-2">📹 Meeting: ${label}</div>
              <div class="text-xs opacity-80 mb-1">Partecipa cliccando qui sotto:</div>
              <a href="${link}" target="_blank" class="font-mono text-xs underline truncate block bg-white/50 p-1.5 rounded border border-black/5 hover:bg-white transition">${link}</a>
          </div>
      `;
      onSendMessage(activeChannelId, content, 'me');
  };

  const handleSend = async () => {
    if (!editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;
    const textContent = editorRef.current.innerText.trim();
    if (!textContent && !htmlContent.includes('<img')) return;

    // Use shared prop
    onSendMessage(activeChannelId, htmlContent, 'me');
    
    editorRef.current.innerHTML = '';
    setHasContent(false);

    if (activeChannel.type === 'ai') {
      setIsTyping(true);
      try {
        const context = {
            boards: boards,
            clients: clients,
            team: teamMembers
        };
        const aiResponseText = await generateAIResponse(textContent, context);
        onSendMessage(activeChannelId, aiResponseText, 'ai', true);
      } catch (e) { console.error(e); } finally { setIsTyping(false); }
    }
  };

  const initiateCall = (type: 'audio' | 'video') => {
      setCallTypeToStart(type);
      setSelectedCallParticipants([]); 
      setIsCallSelectionOpen(true);
  };
  
  const toggleCallParticipant = (userId: string) => {
      setSelectedCallParticipants(prev => 
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  const confirmStartCall = () => {
      if (selectedCallParticipants.length === 0) return;
      const participantsToCall = teamMembers.filter(m => selectedCallParticipants.includes(m.id));
      setActiveCall({
          isActive: true, status: 'dialing', type: callTypeToStart, participants: participantsToCall, startTime: Date.now()
      });
      setIsCallSelectionOpen(false);
      setTimeout(() => {
        setActiveCall(prev => prev && prev.isActive ? { ...prev, status: 'connected', startTime: Date.now() } : prev);
      }, 4000);
  };

  const endCall = (duration: number) => {
      if (!activeCall) return;
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const icon = activeCall.type === 'video' ? '📹' : '📞';
      const text = activeCall.type === 'video' ? 'Videochiamata terminata' : 'Chiamata vocale terminata';
      
      const content = `<div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 italic text-xs"><span class="text-base">${icon}</span> <span>${text} • Durata: ${timeString}</span></div>`;
      onSendMessage(activeChannelId, content, 'system');
      
      setActiveCall(null);
  };

  const handleFileUpload = (source: 'computer' | 'drive', fileName?: string) => {
    setIsUploading(true);
    setTimeout(() => {
       const name = fileName || (source === 'computer' ? 'Documento_Locale.pdf' : 'Google_Doc_Condiviso.gdoc');
       const content = `📎 Ha inviato un file: <b>${name}</b>`;
       onSendMessage(activeChannelId, content, 'me');
       setIsUploading(false);
       setIsUploadModalOpen(false);
    }, 1000);
  };

  const handleInput = () => { if (editorRef.current) setHasContent(editorRef.current.innerText.trim().length > 0); };
  const addEmoji = (emoji: string) => { if (editorRef.current) { editorRef.current.focus(); document.execCommand('insertText', false, emoji); setHasContent(true); } setShowEmojiPicker(false); };
  const applyFormat = (command: string) => { document.execCommand(command, false, undefined); editorRef.current?.focus(); };
  
  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // Group channels dynamically
  const groupedChannels = channels.reduce((acc, channel) => {
    const cat = channel.category || 'Altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  const sortedCategories = Object.keys(groupedChannels).sort((a, b) => {
    if (a === 'Assistente') return -1;
    if (b === 'Assistente') return 1;
    if (a === 'Workspace') return -1;
    if (b === 'Workspace') return 1;
    return a.localeCompare(b);
  });

  // Helpers for sidebar
  const getClientLogo = (categoryName: string) => {
      if (categoryName === 'Assistente') return <Sparkles size={16} className="text-purple-500" />;
      if (categoryName === 'Workspace') return <Building2 size={16} className="text-blue-500" />;
      if (categoryName === 'Messaggi Diretti') return <MessageCircle size={16} className="text-green-500" />;
      const client = clients.find(c => c.company === categoryName);
      if (client) return <img src={client.avatar} className="w-5 h-5 rounded-md object-cover" alt="logo" />;
      return <Briefcase size={16} className="text-slate-400" />;
  };
  
  const getChannelIcon = (channel: Channel, isActive: boolean) => {
      if (channel.type === 'ai') return <Bot size={18} className="text-indigo-500" />;
      if (channel.type === 'dm') return channel.avatar ? <img src={channel.avatar} className="w-5 h-5 rounded-full object-cover" /> : <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{channel.name.charAt(0)}</div>;
      return <Hash size={18} className={isActive ? "text-indigo-500" : "text-slate-400"} />;
  };
  
  const getUserDetails = (userId: string) => {
      if (userId === 'me') return { name: 'Alessandro M.', avatar: 'https://picsum.photos/100/100?random=1' };
      if (userId === 'ai') return { name: 'Nexus AI', avatar: '' };
      
      const teamUser = teamMembers.find(u => u.id === userId);
      if (teamUser) return teamUser;

      // Handle Client IDs
      if (userId.startsWith('client_')) {
          const clientId = userId.replace('client_', '');
          const client = clients.find(c => c.id === clientId);
          if (client) return { name: client.name, avatar: client.avatar, role: 'Cliente' };
      }

      return { name: 'Utente Sconosciuto', avatar: '' };
  };

  const renderThreadPanel = () => (
      <div className={`
        fixed inset-y-0 right-0 z-50 w-full md:w-96 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
        transition-transform duration-300 transform ${isRightPanelOpen && activeThreadMessage ? 'translate-x-0' : 'translate-x-full'} 
        shadow-2xl md:relative md:transform-none md:flex md:h-full md:shadow-xl md:z-20
        ${(!isRightPanelOpen || !activeThreadMessage) && 'hidden md:hidden'}
      `}>
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Conversazione</h3>
              </div>
              <button onClick={handleCloseThread} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30 dark:bg-slate-900">
              {activeThreadMessage && (
                  <>
                    {/* Parent Message */}
                    <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-start gap-3">
                            <img src={getUserDetails(activeThreadMessage.senderId).avatar} className="w-10 h-10 rounded-lg object-cover" />
                            <div className="flex-1">
                                <div className="flex items-baseline justify-between mb-1">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{getUserDetails(activeThreadMessage.senderId).name}</span>
                                    <span className="text-xs text-slate-400">{activeThreadMessage.timestamp}</span>
                                </div>
                                <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span dangerouslySetInnerHTML={{ __html: activeThreadMessage.content }}></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    <div className="space-y-4">
                        {threadMessages.length > 0 && <div className="text-xs font-bold text-slate-400 uppercase mb-2">{threadMessages.length} {threadMessages.length === 1 ? 'Risposta' : 'Risposte'}</div>}
                        {threadMessages.map(msg => (
                            <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <img src={getUserDetails(msg.senderId).avatar} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                <div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-bold text-slate-900 dark:text-white text-xs">{getUserDetails(msg.senderId).name}</span>
                                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl rounded-tl-none border border-slate-100 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 shadow-sm">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={threadEndRef} />
                    </div>
                  </>
              )}
          </div>

          {/* Thread Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form onSubmit={handleThreadReply} className="relative">
                  <input 
                    type="text" 
                    value={threadInputContent}
                    onChange={(e) => setThreadInputContent(e.target.value)}
                    placeholder="Rispondi..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                  />
                  <button 
                    type="submit" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    disabled={!threadInputContent.trim()}
                  >
                      <Send size={14} />
                  </button>
              </form>
          </div>
      </div>
  );

  const renderRightPanel = () => (
      <div className={`
        fixed inset-y-0 right-0 z-50 w-full md:w-80 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 
        transition-transform duration-300 transform ${isRightPanelOpen && !activeThreadMessage ? 'translate-x-0' : 'translate-x-full'} 
        shadow-2xl md:relative md:transform-none md:flex md:h-full md:shadow-xl md:z-20
        ${(!isRightPanelOpen || activeThreadMessage) && 'hidden md:hidden'}
      `}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Dettagli Canale</h3>
              <button onClick={() => setIsRightPanelOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><X size={18} /></button>
          </div>
          <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200 dark:border-slate-700">
                  {activeChannel.type === 'ai' ? <Sparkles size={32} className="text-purple-500" /> : <Hash size={32} className="text-slate-400" />}
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg">{activeChannel.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeChannel.category === 'Workspace' ? workspaceName : activeChannel.category}</p>
          </div>
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-2">
              {[{ id: 'members', label: 'Membri' }, { id: 'info', label: 'Info' }, { id: 'files', label: 'File' }].map(tab => (
                  <button key={tab.id} onClick={() => setRightPanelTab(tab.id as any)} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${rightPanelTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>{tab.label}</button>
              ))}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {rightPanelTab === 'members' && (
                  <div className="space-y-4">
                      <div className="space-y-1">
                          {teamMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition cursor-pointer group">
                                  <img src={member.avatar} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.role}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="flex h-full bg-white dark:bg-slate-950 transition-colors relative overflow-hidden">
      
      {activeCall && <CallInterface session={activeCall} currentUser={currentUser} onEnd={endCall} onMinimize={() => setActiveCall({...activeCall, isMinimized: true})} onMaximize={() => setActiveCall({...activeCall, isMinimized: false})} />}

      {/* --- ADD/EDIT CHANNEL/CATEGORY MODAL --- */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-slate-100 dark:border-slate-700">
                  <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <FolderPlus size={24} className="text-indigo-500" /> 
                      {editingId ? 'Modifica' : 'Nuovo'} {editingType === 'channel' ? 'Canale' : 'Categoria'}
                  </h3>
                  
                  <form onSubmit={handleSaveItem} className="space-y-4">
                      {/* TYPE SWITCHER (Only if creating new) */}
                      {!editingId && (
                          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl mb-4">
                              <button type="button" onClick={() => setEditingType('channel')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${editingType === 'channel' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Canale</button>
                              <button type="button" onClick={() => setEditingType('category')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${editingType === 'category' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Categoria</button>
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome {editingType === 'channel' ? 'Canale' : 'Categoria'}</label>
                          <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder={editingType === 'channel' ? "es. marketing-updates" : "es. Progetto X"}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                              autoFocus
                          />
                      </div>

                      {editingType === 'channel' && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria Genitore {editingId && '(Sposta)'}</label>
                              <select 
                                value={editCategoryParent} 
                                onChange={(e) => setEditCategoryParent(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                              >
                                  {sortedCategories.filter(c => c !== 'Assistente' && c !== 'Messaggi Diretti').map(c => <option key={c} value={c}>{c === 'Workspace' ? workspaceName : c}</option>)}
                              </select>
                          </div>
                      )}

                      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md mt-2">
                          {editingId ? 'Salva Modifiche' : `Crea ${editingType === 'channel' ? 'Canale' : 'Categoria'}`}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- TASK CREATION MODAL --- */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-slate-100 dark:border-slate-700">
                  <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <CheckSquare size={24} className="text-indigo-500" /> Nuovo Task
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Aggiungi un'attività direttamente al progetto.</p>
                  
                  <form onSubmit={handleCreateTaskFromChat} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titolo Task</label>
                          <input 
                              type="text" 
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Es. Aggiornare Homepage"
                              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                              autoFocus
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Progetto</label>
                          <select 
                            value={selectedBoardId} 
                            onChange={(e) => setSelectedBoardId(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                          >
                              {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priorità</label>
                          <div className="flex gap-2">
                              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setNewTaskPriority(p as any)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg border ${newTaskPriority === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
                                  >
                                      {p}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md mt-2">
                          Crea Task
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- UPLOAD MODAL --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative border border-slate-100 dark:border-slate-700">
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
                   onClick={() => handleFileUpload('drive')}
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
               onChange={(e) => {
                   if (e.target.files && e.target.files[0]) {
                       handleFileUpload('computer', e.target.files[0].name);
                   }
               }}
             />
           </div>
        </div>
      )}

      {/* --- CALL SELECTION MODAL --- */}
      {isCallSelectionOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative border border-slate-100 dark:border-slate-700">
                  <button onClick={() => setIsCallSelectionOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Avvia {callTypeToStart === 'video' ? 'Videochiamata' : 'Chiamata'}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Seleziona chi vuoi invitare.</p>
                  
                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                      {teamMembers.filter(m => m.id !== 'me' && m.id !== '1').map(member => (
                          <div 
                            key={member.id} 
                            onClick={() => toggleCallParticipant(member.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedCallParticipants.includes(member.id) ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-slate-50 dark:bg-slate-700 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                          >
                              <img src={member.avatar} className="w-10 h-10 rounded-full object-cover" />
                              <div className="flex-1">
                                  <p className="font-bold text-sm text-slate-900 dark:text-white">{member.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                              </div>
                              {selectedCallParticipants.includes(member.id) && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white"><Check size={12} /></div>}
                          </div>
                      ))}
                  </div>
                  
                  <button 
                    onClick={confirmStartCall}
                    disabled={selectedCallParticipants.length === 0}
                    className={`w-full py-3 rounded-xl font-bold transition shadow-lg ${selectedCallParticipants.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                  >
                      Avvia {callTypeToStart === 'video' ? 'Videochiamata' : 'Chiamata'}
                  </button>
              </div>
          </div>
      )}
      
      {/* LEFT SIDEBAR (Channels List) */}
      <div className={`
        absolute inset-0 z-50 bg-slate-50/95 dark:bg-slate-900/95 md:relative md:bg-slate-50/50 md:dark:bg-slate-900/50 md:z-20 md:w-80 md:flex flex-col border-r border-slate-200 dark:border-slate-800 backdrop-blur-md 
        transition-transform duration-300 md:translate-x-0 w-full h-full
        ${mobileView === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Chat</h2>
          <button 
            onClick={openCreateModal}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition"
            title="Aggiungi Canale o Categoria"
          >
              <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-3 pb-24 md:pb-4 space-y-6">
           {sortedCategories.map(category => (
             <div key={category} className="group/cat">
                <div className="flex items-center justify-between px-2 mb-2 group-hover/cat:text-slate-800 dark:group-hover/cat:text-white transition-colors relative group/header">
                    <button onClick={() => toggleCategory(category)} className="flex items-center gap-2 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-1">
                        {collapsedCategories.includes(category) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        <span className="flex items-center gap-2">
                            {getClientLogo(category)} 
                            <span className={category === 'Assistente' ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 font-extrabold' : ''}>
                                {/* DYNAMIC WORKSPACE NAME HERE */}
                                {category === 'Workspace' ? workspaceName : category}
                            </span>
                        </span>
                    </button>
                    {/* Category Actions */}
                    {category !== 'Assistente' && (
                        <div className="absolute right-0 opacity-0 group-hover/header:opacity-100 flex gap-1 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openEditCategory(category); }}
                                className="p-1 text-slate-400 hover:text-indigo-500"
                                title="Rinomina Categoria"
                            >
                                <Edit2 size={12} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteCategory(category); }}
                                className="p-1 text-slate-400 hover:text-red-500"
                                title="Elimina Categoria"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                </div>
                {!collapsedCategories.includes(category) && (
                  <div className="space-y-1 ml-1">
                    {groupedChannels[category].map(channel => (
                      <button key={channel.id} onClick={() => handleChannelSelect(channel.id)} className={`w-full px-3 py-2.5 flex items-center justify-between rounded-xl text-sm font-medium transition-all group/chan relative overflow-hidden select-none outline-none focus:outline-none ${activeChannelId === channel.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md border border-slate-100 dark:border-slate-700' : 'hover:bg-white/60 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-transparent'}`}>
                        {activeChannelId === channel.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                        <div className="flex items-center gap-3 truncate pl-1">{getChannelIcon(channel, activeChannelId === channel.id)} <span className="truncate">{channel.name}</span></div>
                        <div className="flex items-center gap-1">
                            {channel.unread && <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{channel.unread}</span>}
                            {/* Channel Actions */}
                            {channel.type !== 'ai' && (
                                <div className="opacity-0 group-hover/chan:opacity-100 flex gap-1 z-10 transition-opacity">
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); openEditChannel(channel); }}
                                        className="p-1 text-slate-400 hover:text-indigo-500"
                                    >
                                        <Edit2 size={14} />
                                    </div>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); deleteChannel(channel.id); }}
                                        className="p-1 text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </div>
                                </div>
                            )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>
           ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`
        fixed inset-0 z-[60] md:relative md:z-auto md:inset-auto flex-1 flex flex-col bg-white dark:bg-slate-950 
        transition-transform duration-300 md:translate-x-0
        ${mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full'}
      `}>
         {/* HEADER WITH DIFFERENT COLOR */}
         <div className="h-16 px-4 md:px-6 flex items-center justify-between bg-indigo-50/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-indigo-100 dark:border-slate-800 sticky top-0 z-30 transition-colors">
            <div className="flex items-center gap-3">
               {/* Mobile Back Button */}
               <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full z-50 relative">
                   <ArrowLeft size={20} />
               </button>
               
               <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}>
                    {activeChannel.type === 'ai' ? <Bot size={22} className="text-indigo-500" /> : <Hash size={22} className="text-slate-400" />}
                    <div>
                        <h2 className="font-bold text-slate-900 dark:text-white text-lg leading-tight flex items-center gap-2">{activeChannel.name} <ChevronDown size={14} className="text-slate-400" /></h2>
                    </div>
               </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
               <div className="hidden md:flex gap-1 bg-white/50 dark:bg-slate-800 p-1 rounded-lg border border-indigo-100/50 dark:border-slate-700/50">
                   <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition shadow-sm"><Phone size={18} /></button>
                   <button onClick={() => initiateCall('video')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition shadow-sm"><Video size={18} /></button>
                   <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition shadow-sm"><UserPlus size={18} /></button>
               </div>
               {/* Mobile Call Buttons (Combined or Simplified) */}
               <div className="md:hidden flex gap-1">
                   <button onClick={() => initiateCall('audio')} className="p-2 text-slate-500 dark:text-slate-400"><Phone size={20} /></button>
               </div>
               
               <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className={`p-2 rounded-full transition ${isRightPanelOpen ? 'bg-white dark:bg-slate-800 text-indigo-600' : 'hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700'}`}><Info size={20}/></button>
            </div>
         </div>

         {/* PINNED MESSAGES BANNER */}
         {pinnedMessages.length > 0 && (
             <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 border-b border-amber-100 dark:border-amber-800/30 flex items-center justify-between text-xs transition-colors z-20">
                 <div className="flex items-center gap-2 flex-1 min-w-0">
                    <PinIcon size={12} className="text-amber-600 dark:text-amber-500 flex-shrink-0" fill="currentColor" />
                    <span className="font-bold text-amber-700 dark:text-amber-500 whitespace-nowrap">Fissato:</span>
                    <span className="truncate text-slate-600 dark:text-slate-400 flex-1">{pinnedMessages[0].content}</span>
                 </div>
                 {pinnedMessages.length > 1 && (
                     <span className="ml-2 text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 rounded-full">+{pinnedMessages.length - 1}</span>
                 )}
             </div>
         )}

         <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950" onClick={() => setActiveMobileMessageId(null)}>
            {mainMessages.map((msg, index) => {
               if (msg.senderId === 'system') {
                   return <div key={msg.id} className="flex justify-center my-4 animate-in fade-in zoom-in-95"><div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-sm text-xs md:text-sm"><span dangerouslySetInnerHTML={{ __html: msg.content }} /></div></div>;
               }
               const user = getUserDetails(msg.senderId);
               const isMe = msg.senderId === 'me' || msg.senderId === currentUser?.id;
               const showAvatar = index === 0 || mainMessages[index - 1].senderId !== msg.senderId;
               return (
               <div 
                    key={msg.id} 
                    className={`group flex gap-3 md:gap-4 ${isMe ? 'flex-row-reverse' : ''} ${!showAvatar ? 'mt-1' : 'mt-4'} animate-in fade-in slide-in-from-bottom-1 duration-200`}
                    onClick={(e) => {
                        // Toggle mobile action bar on click
                        e.stopPropagation();
                        setActiveMobileMessageId(activeMobileMessageId === msg.id ? null : msg.id);
                    }}
               >
                  <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm ${!showAvatar ? 'invisible' : ''} ${msg.isAi ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                     {msg.isAi ? <Bot size={18} /> : <img src={user.avatar} className="w-full h-full object-cover" />}
                  </div>
                  <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} relative group/message`}>
                     {showAvatar && (
                         <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{isMe ? 'Tu' : user.name}</span>
                            <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                         </div>
                     )}
                     <div className={`px-3 py-2 md:px-4 md:py-2.5 text-sm leading-relaxed shadow-sm relative transition-all ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'} ${msg.pinned ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900' : ''}`}>
                        <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></span>
                        
                        {/* Pinned Indicator on Message */}
                        {msg.pinned && (
                            <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-600 p-0.5 rounded-full border border-white dark:border-slate-800 shadow-sm" title="Messaggio fissato">
                                <PinIcon size={10} fill="currentColor" />
                            </div>
                        )}
                     </div>

                     {/* Thread Link */}
                     {msg.replyCount && msg.replyCount > 0 ? (
                         <div 
                            onClick={(e) => { e.stopPropagation(); handleOpenThread(msg); }}
                            className="mt-1 flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 px-2 py-1 rounded-lg w-fit transition"
                         >
                             <div className="flex -space-x-1.5">
                                 {/* Mock avatars for thread participants */}
                                 <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border border-white dark:border-slate-900"></div>
                                 <div className="w-4 h-4 rounded-full bg-slate-400 dark:bg-slate-500 border border-white dark:border-slate-900"></div>
                             </div>
                             <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">{msg.replyCount} {msg.replyCount === 1 ? 'risposta' : 'risposte'}</span>
                             <span className="text-[10px] text-slate-400">Ultima risposta oggi</span>
                             <ChevronRight size={12} className="text-slate-400" />
                         </div>
                     ) : null}

                     {/* Reactions Display (Pills Style) */}
                     {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap relative z-10 select-none">
                            {msg.reactions.map((r, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); onAddReaction && onAddReaction(activeChannelId, msg.id, r.emoji); }}
                                    className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-full text-xs text-slate-700 dark:text-slate-300 transition-all shadow-sm group/reaction"
                                    title="Aggiungi reazione"
                                >
                                    <span className="text-sm leading-none group-hover/reaction:scale-110 transition-transform">{r.emoji}</span>
                                    <span className="font-bold text-[10px] opacity-80">{r.count}</span>
                                </button>
                            ))}
                        </div>
                     )}

                     {/* Action Bar (Hover) - Responsive Fix: Centered Below for Mobile Tap */}
                     <div className={`
                        absolute 
                        z-30 
                        
                        /* Mobile: Centered below message */
                        top-full mt-2 left-1/2 -translate-x-1/2
                        flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl px-2 py-1.5 rounded-full
                        
                        /* Mobile Visibility Control */
                        ${activeMobileMessageId === msg.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none md:pointer-events-auto'}
                        
                        /* Desktop Overrides */
                        md:opacity-0 md:group-hover/message:opacity-100 md:scale-100 md:shadow-md md:py-1
                        md:top-[-12px] md:mt-0
                        md:${isMe ? 'left-0 -translate-x-[105%] right-auto' : 'right-0 translate-x-[105%] left-auto'}
                        
                        transition-all duration-200 origin-center
                     `}>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onAddReaction && onAddReaction(activeChannelId, msg.id, '👍'); setActiveMobileMessageId(null); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:scale-125 transition"
                            title="Mi piace"
                         >
                             👍
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onAddReaction && onAddReaction(activeChannelId, msg.id, '❤️'); setActiveMobileMessageId(null); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:scale-125 transition"
                            title="Love"
                         >
                             ❤️
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onAddReaction && onAddReaction(activeChannelId, msg.id, '😂'); setActiveMobileMessageId(null); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:scale-125 transition"
                            title="Haha"
                         >
                             😂
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onAddReaction && onAddReaction(activeChannelId, msg.id, '🔥'); setActiveMobileMessageId(null); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:scale-125 transition"
                            title="Fuoco"
                         >
                             🔥
                         </button>
                         
                         <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenThread(msg); setActiveMobileMessageId(null); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition"
                            title="Rispondi nel thread"
                         >
                             <MessageCircle size={16} />
                         </button>
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); onTogglePin && onTogglePin(activeChannelId, msg.id); setActiveMobileMessageId(null); }}
                            className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition ${msg.pinned ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500'}`}
                            title={msg.pinned ? "Rimuovi Pin" : "Fissa in alto"}
                         >
                             <PinIcon size={16} fill={msg.pinned ? "currentColor" : "none"} />
                         </button>
                     </div>
                  </div>
               </div>
            )})}
            {isTyping && <div className="flex items-center gap-2 ml-14 pt-2"><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div></div>}
            <div ref={messagesEndRef} className="h-24 md:h-4" />
         </div>

         {/* Rich Input Area */}
         <div className="p-3 md:p-4 bg-white dark:bg-slate-950 relative z-20 pb-safe">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex flex-col relative">
               <div className="flex items-center gap-1 p-2 border-b border-slate-200/50 dark:border-slate-800/50 text-slate-400">
                   <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition hidden md:block"><Bold size={16}/></button>
                   <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition hidden md:block"><Italic size={16}/></button>
                   
                   {/* CREATE TASK BUTTON */}
                   <button 
                        onMouseDown={(e) => { e.preventDefault(); setIsTaskModalOpen(true); }}
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded transition ml-0 md:ml-2 flex items-center gap-1 text-xs font-bold"
                   >
                       <CheckSquare size={14} /> Task
                   </button>

                   {/* CREATE MEETING BUTTON */}
                   <div className="relative">
                       <button 
                            onMouseDown={(e) => { e.preventDefault(); setIsMeetingMenuOpen(!isMeetingMenuOpen); }}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded transition ml-2 flex items-center gap-1 text-xs font-bold"
                       >
                           <Video size={14} /> Meeting
                       </button>
                       {isMeetingMenuOpen && (
                           <>
                               <div className="fixed inset-0 z-40" onClick={() => setIsMeetingMenuOpen(false)}></div>
                               <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                   <div className="p-1">
                                       <button onClick={() => handleCreateMeeting('nexus')} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                           <Video size={14} className="text-indigo-500" /> Nexus Video
                                       </button>
                                       <button onClick={() => handleCreateMeeting('google')} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                           <Video size={14} className="text-green-600" /> Google Meet
                                       </button>
                                       <button onClick={() => handleCreateMeeting('zoom')} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                           <Video size={14} className="text-blue-500" /> Zoom
                                       </button>
                                       <button onClick={() => handleCreateMeeting('teams')} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                           <Users size={14} className="text-purple-600" /> Microsoft Teams
                                       </button>
                                   </div>
                               </div>
                           </>
                       )}
                   </div>
               </div>
               
               <div className="relative w-full">
                    {!hasContent && <div className="absolute top-3 left-3 text-slate-400 text-sm pointer-events-none select-none">Scrivi in #{activeChannel.name}...</div>}
                    <div ref={editorRef} contentEditable onInput={handleInput} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} className="w-full bg-transparent border-none focus:ring-0 max-h-32 min-h-[50px] p-3 text-slate-800 dark:text-white text-sm overflow-y-auto outline-none" />
               </div>
               
               <div className="flex items-center justify-between p-2 pt-0">
                   <div className="flex items-center gap-2 relative">
                       <button onClick={() => setIsUploadModalOpen(true)} className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition"><Plus size={16}/></button>
                       <div className="relative"><button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-1.5 rounded-lg transition ${showEmojiPicker ? 'bg-slate-200 dark:bg-slate-800 text-indigo-500' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'}`}><Smile size={18}/></button>
                          {showEmojiPicker && (<div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)}></div>)}
                          {showEmojiPicker && (<div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 w-72 z-40 animate-in fade-in zoom-in-95 origin-bottom-left"><div className="grid grid-cols-6 gap-2">{commonEmojis.map(emoji => (<button key={emoji} onClick={() => addEmoji(emoji)} className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">{emoji}</button>))}</div></div>)}
                       </div>
                   </div>
                   <button onClick={handleSend} className={`p-2 rounded-xl transition-all duration-200 ${hasContent ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`} disabled={!hasContent}><Send size={18} className={hasContent ? 'ml-0.5' : ''} /></button>
               </div>
            </div>
         </div>
      </div>

      {isRightPanelOpen && activeThreadMessage ? renderThreadPanel() : isRightPanelOpen && renderRightPanel()}
    </div>
  );
};

export default Chat;

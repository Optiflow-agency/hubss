
import React, { useState, useEffect, useRef } from 'react';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, 
    Monitor, Users, MessageSquare, Maximize2, Minimize2,
    Settings, MoreVertical, Wifi, Lock, AlertTriangle, Loader2, StopCircle, Phone,
    Zap, ZapOff, Check, Cast, X, Send, Smile
} from 'lucide-react';
import { User, CallSession } from '../types';

interface CallInterfaceProps {
    session: CallSession;
    currentUser: User; 
    onEnd: (duration: number) => void; 
    onMinimize: () => void;
    onMaximize: () => void;
}

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ session, currentUser, onEnd, onMinimize, onMaximize }) => {
    const [duration, setDuration] = useState(0);
    const [isMicOn, setIsMicOn] = useState(true);
    
    // Initial state depends on session type
    const [isCamOn, setIsCamOn] = useState(session.type === 'video');
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    
    // UI States
    const [isLowDataMode, setIsLowDataMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Media Stream State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    
    // REFS FOR CLEANUP (Critical for stopping tracks correctly)
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    
    const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
    
    // Refs for Video Elements
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    
    // Audio Context Ref
    const ringtoneCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // Voice Activity Detection State
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
    const analyzerCtxRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [connectionStatus, setConnectionStatus] = useState<'Connecting...' | 'Secure' | 'Poor Connection'>('Connecting...');

    // Combine participants for Grid View
    const gridParticipants = [...session.participants, currentUser];

    // --- SYNC REFS WITH STATE ---
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        screenStreamRef.current = screenStream;
    }, [screenStream]);

    // --- CLEANUP FUNCTION ---
    const cleanupMedia = () => {
        // Stop Local Stream (Mic/Cam)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
        }
        // Stop Screen Share
        stopScreenShare();

        // Close Audio Contexts
        if (analyzerCtxRef.current && analyzerCtxRef.current.state !== 'closed') {
            analyzerCtxRef.current.close().catch(e => console.error(e));
        }
        if (ringtoneCtxRef.current && ringtoneCtxRef.current.state !== 'closed') {
            ringtoneCtxRef.current.close().catch(e => console.error(e));
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const handleEndCall = () => {
        cleanupMedia();
        onEnd(duration);
    };

    // --- HELPER: GET MEDIA CONSTRAINTS ---
    const getMediaConstraints = (forceVideo: boolean = false) => {
        const videoConstraints = isLowDataMode 
            ? { width: 480, height: 360, frameRate: 15, facingMode: "user" } 
            : { width: 1280, height: 720, frameRate: 30, facingMode: "user" };

        return {
            audio: true,
            video: (forceVideo || isCamOn) ? videoConstraints : false
        };
    };

    // --- CHAT SCROLL EFFECT ---
    useEffect(() => {
        if (showChat && chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            setHasUnreadMessages(false);
        }
    }, [chatMessages, showChat]);

    // --- SEND MESSAGE HANDLER ---
    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!chatInput.trim()) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            senderName: 'Tu',
            text: chatInput,
            timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, newMessage]);
        setChatInput("");
    };

    // --- SIMULATE INCOMING MESSAGES ---
    useEffect(() => {
        if (session.status !== 'connected') return;
        
        const interval = setInterval(() => {
            if (Math.random() > 0.9 && session.participants.length > 0) {
                const randomParticipant = session.participants[Math.floor(Math.random() * session.participants.length)];
                const msg: ChatMessage = {
                    id: Date.now().toString(),
                    senderId: randomParticipant.id,
                    senderName: randomParticipant.name,
                    text: ["Ciao a tutti!", "Mi sentite?", "Ottimo punto.", "Condivido il link dopo.", "Possiamo rivedere questo punto?"][Math.floor(Math.random() * 5)],
                    timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                };
                setChatMessages(prev => [...prev, msg]);
                if (!showChat) setHasUnreadMessages(true);
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [session.status, showChat, session.participants]);


    // --- 0. PROCEDURAL RINGTONE LOGIC ---
    useEffect(() => {
        let breathingInterval: any = null;

        const stopAudio = () => {
            if (breathingInterval) clearInterval(breathingInterval);
            // Cleanup is handled by main cleanupMedia, but specific ringtone logic here
        };

        if (session.status === 'dialing' && !session.isMinimized) {
            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContext();
                ringtoneCtxRef.current = ctx;

                const masterGain = ctx.createGain();
                masterGain.gain.value = 0; 
                masterGain.connect(ctx.destination);
                gainNodeRef.current = masterGain;

                const frequencies = [261.63, 329.63, 392.00, 493.88]; 
                
                frequencies.forEach(freq => {
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    osc.detune.setValueAtTime(Math.random() * 10 - 5, ctx.currentTime);
                    const oscGain = ctx.createGain();
                    oscGain.gain.value = 0.15; 
                    osc.connect(oscGain);
                    oscGain.connect(masterGain);
                    osc.start();
                });

                const breathe = () => {
                    if (ctx.state === 'closed') return;
                    const now = ctx.currentTime;
                    const attack = 2;
                    const release = 2;
                    
                    masterGain.gain.cancelScheduledValues(now);
                    masterGain.gain.setValueAtTime(0, now);
                    masterGain.gain.linearRampToValueAtTime(0.3, now + attack); 
                    masterGain.gain.linearRampToValueAtTime(0, now + attack + release);
                };

                breathe();
                breathingInterval = setInterval(breathe, 4500);

            } catch (e) {
                console.error("Web Audio API Error:", e);
            }
        } else {
            stopAudio();
        }

        return () => {
            stopAudio();
        };
    }, [session.status, session.isMinimized]);

    // --- 1. INITIALIZE CALL ---
    useEffect(() => {
        let mounted = true;

        const initMedia = async () => {
            try {
                const constraints = getMediaConstraints(session.type === 'video');
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (mounted) {
                    setLocalStream(stream);
                    setPermissionStatus('granted');
                    setConnectionStatus('Secure');
                    setupLocalVoiceDetection(stream);
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
                if (mounted) {
                    setPermissionStatus('denied');
                    setConnectionStatus('Secure');
                }
            }
        };

        initMedia();

        return () => {
            mounted = false;
            cleanupMedia(); // Ensures tracks are stopped on unmount
        };
    }, []); 

    // --- 1.1 LOCAL VOICE DETECTION ---
    const setupLocalVoiceDetection = (stream: MediaStream) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (analyzerCtxRef.current?.state !== 'running') {
                 analyzerCtxRef.current = new AudioContext();
            }
            const audioContext = analyzerCtxRef.current;
            if(!audioContext) return;

            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            
            microphone.connect(analyser);
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.3; 

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const detectVolume = () => {
                if (!analyzerCtxRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                
                let sum = 0;
                for(let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                
                const speakingThreshold = 15; 
                setIsLocalSpeaking(average > speakingThreshold);

                animationFrameRef.current = requestAnimationFrame(detectVolume);
            };
            detectVolume();
        } catch (e) {
            console.error("Error setting up audio analysis", e);
        }
    };

    // --- 1.2 REMOTE VOICE SIMULATION ---
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (session.status === 'connected') {
            timer = setInterval(() => {
                if (Math.random() > 0.3 && session.participants.length > 0) {
                    const randomIndex = Math.floor(Math.random() * session.participants.length);
                    setActiveSpeakerId(session.participants[randomIndex].id);
                } else {
                    setActiveSpeakerId(null);
                }
            }, 2000);
        }
        return () => clearInterval(timer);
    }, [session.status, session.participants]);


    // --- 2. HANDLE VIDEO TOGGLE ---
    const toggleVideo = async () => {
        if (isCamOn) {
            setIsCamOn(false);
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = false;
                    videoTrack.stop(); 
                    localStream.removeTrack(videoTrack);
                    setLocalStream(new MediaStream(localStream.getTracks()));
                }
            }
            return;
        }

        try {
            const constraints = getMediaConstraints(true);
            const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newVideoTrack = videoStream.getVideoTracks()[0];
            
            if (localStream) {
                localStream.addTrack(newVideoTrack);
                setLocalStream(new MediaStream(localStream.getTracks())); 
            } else {
                setLocalStream(videoStream);
            }
            setIsCamOn(true);
        } catch (err) {
            console.error("Failed to upgrade to video:", err);
            alert("Impossibile accedere alla videocamera.");
            setIsCamOn(false);
        }
    };

    // --- 3. HANDLE SCREEN SHARE ---
    
    // Robust cleanup function for screen share
    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
        }
        setScreenStream(null);
        setIsScreenSharing(false);
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            stopScreenShare();
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                setScreenStream(stream);
                setIsScreenSharing(true);
                
                // IMPORTANT: Handle when user clicks "Stop sharing" from the browser's native UI
                const track = stream.getVideoTracks()[0];
                track.onended = () => {
                    stopScreenShare();
                };
            } catch (err) {
                console.error("Screen share cancelled:", err);
                stopScreenShare(); // Ensure clean state if cancelled
            }
        }
    };

    // --- 4. ATTACH VIDEOS ---
    useEffect(() => {
        // Screen Share Stream
        if (screenVideoRef.current) {
            if (isScreenSharing && screenStream && screenStream.active) {
                screenVideoRef.current.srcObject = screenStream;
            } else {
                screenVideoRef.current.srcObject = null;
            }
        }

        // Local Webcam Stream
        const timeout = setTimeout(() => {
            if (localVideoRef.current) {
                if (isCamOn && localStream && localStream.getVideoTracks().length > 0 && localStream.getVideoTracks()[0].readyState === 'live') {
                    localVideoRef.current.srcObject = localStream;
                } else {
                    localVideoRef.current.srcObject = null;
                }
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, [localStream, screenStream, isCamOn, isScreenSharing, showChat, activeSpeakerId]);

    // --- 5. HANDLE AUDIO TOGGLE ---
    useEffect(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMicOn;
            }
        }
    }, [isMicOn, localStream]);

    // --- 6. TIMER ---
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (session.status === 'connected') {
            const start = session.startTime || Date.now();
            timer = setInterval(() => {
                setDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [session.status, session.startTime]);


    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getGridClass = (count: number) => {
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        return 'grid-cols-2 md:grid-cols-3';
    };

    // --- RENDER HELPERS ---
    const renderParticipantCard = (participant: User | typeof currentUser, isLocal: boolean, compact: boolean = false) => {
        const isSpeaking = isLocal ? isLocalSpeaking : activeSpeakerId === participant.id;
        
        return (
            <div 
                key={participant.id} 
                className={`relative overflow-hidden bg-slate-800 shadow-xl transition-all duration-300 border-2 
                ${isSpeaking ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] z-10' : 'border-white/5'}
                ${compact ? 'aspect-video rounded-xl min-w-[160px] md:min-w-full' : 'rounded-3xl h-full w-full'}`}
            >
                {isLocal ? (
                    isCamOn ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <div className="relative">
                                {isSpeaking && <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75 duration-1000"></div>}
                                <div className={`relative ${compact ? 'w-12 h-12' : 'w-24 h-24'} rounded-full p-1 bg-gradient-to-tr ${isSpeaking ? 'from-green-400 to-emerald-600' : 'from-indigo-500 to-purple-500'} shadow-lg`}>
                                    <img src={participant.avatar} className="w-full h-full rounded-full object-cover border-2 border-slate-800" />
                                </div>
                                {!compact && <div className="absolute bottom-0 right-0 bg-slate-800 rounded-full p-1.5 border border-slate-700">
                                    {isMicOn ? <Mic size={14} className="text-green-400" /> : <MicOff size={14} className="text-red-400" />}
                                </div>}
                            </div>
                        </div>
                    )
                ) : (
                    session.type === 'video' ? (
                        <img src={participant.avatar} className="w-full h-full object-cover" alt={participant.name} />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <div className="relative">
                                {isSpeaking && <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75 duration-1000"></div>}
                                <div className={`relative ${compact ? 'w-12 h-12' : 'w-24 h-24'} rounded-full p-1 bg-gradient-to-tr ${isSpeaking ? 'from-green-400 to-emerald-600' : 'from-indigo-500 to-purple-500'} shadow-lg`}>
                                    <img src={participant.avatar} className="w-full h-full rounded-full object-cover border-2 border-slate-800" />
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Name Tag */}
                <div className={`absolute bottom-2 left-2 md:bottom-4 md:left-4 flex justify-between items-end max-w-[90%]`}>
                    <div className="px-2 py-1 md:px-3 md:py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white font-medium text-[10px] md:text-sm flex items-center gap-2 truncate">
                        <span className="truncate">{participant.name} {isLocal && '(Tu)'}</span>
                        {isSpeaking && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}
                    </div>
                </div>
            </div>
        );
    };

    // --- PERMISSION DENIED UI ---
    if (permissionStatus === 'denied') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center text-white p-6 animate-in fade-in">
                <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/20">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Accesso Negato</h2>
                <p className="text-slate-400 text-center max-w-md mb-8">
                    Nexus ha bisogno dell'accesso al microfono (e opzionalmente videocamera). Controlla le impostazioni del browser.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => onEnd(0)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition">Chiudi</button>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition">Riprova</button>
                </div>
            </div>
        );
    }

    // --- MINIMIZED VIEW (PIP) ---
    if (session.isMinimized) {
        return (
            <div className={`fixed bottom-4 right-4 z-[100] w-64 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col cursor-move transition-all duration-300 border-2 ${activeSpeakerId ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-slate-700'}`}>
                <div className="relative h-32 bg-slate-800">
                    {/* Simplified PIP Content */}
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900">
                        <div className="w-12 h-12 rounded-full p-0.5 border-2 border-white/20">
                            <img src={isLocalSpeaking ? currentUser.avatar : session.participants[0].avatar} className="w-full h-full rounded-full object-cover" />
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 hover:opacity-100">
                        <button onClick={onMaximize} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm"><Maximize2 size={16} /></button>
                        <button onClick={handleEndCall} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg"><PhoneOff size={16} /></button>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-md flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${session.status === 'dialing' ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
                        <span className="text-[10px] font-mono text-white">{session.status === 'dialing' ? 'Dialing...' : formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        );
    }

    // --- FULL SCREEN VIEW ---
    // Changed z-50 to z-[100] to ensure it covers the sidebar (which is z-[70])
    return (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col animate-in fade-in duration-300 overflow-hidden">
            
            {/* HEADER */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
                    <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                        <Lock size={12} className="text-emerald-400" />
                        <span className="text-xs font-medium text-white hidden md:inline">End-to-End Encrypted</span>
                        <span className="text-xs font-medium text-white md:hidden">E2EE</span>
                    </div>
                    {connectionStatus !== 'Secure' && (
                        <div className="px-3 py-1.5 bg-yellow-500/20 backdrop-blur-md rounded-full border border-yellow-500/20 flex items-center gap-2">
                            <Wifi size={12} className="text-yellow-400" />
                            <span className="text-xs font-medium text-yellow-200 hidden md:inline">{connectionStatus}</span>
                        </div>
                    )}
                </div>
                <div className="pointer-events-auto">
                    <button onClick={onMinimize} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all">
                        <Minimize2 size={20} />
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className={`flex-1 flex overflow-hidden relative ${isScreenSharing ? 'flex-col md:flex-row' : 'flex-row'}`}>
                
                {/* VIDEO AREA */}
                <div className={`flex-1 relative flex items-center justify-center p-4 pt-16 pb-24 md:pb-28 transition-all duration-300 ${showChat ? 'md:mr-80' : ''}`}>
                    
                    {session.status === 'dialing' ? (
                        /* DIALING VIEW */
                        <div className="flex flex-col items-center justify-center gap-8 animate-fade-in z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-ping opacity-20 duration-[3000ms]"></div>
                                <div className="absolute inset-8 bg-indigo-400/10 rounded-full animate-ping opacity-30 delay-700 duration-[3000ms]"></div>
                                <div className="relative flex -space-x-4">
                                    {session.participants.map((p, i) => (
                                        <div key={p.id} className="w-24 h-24 rounded-full border-4 border-[#0f172a] overflow-hidden bg-slate-800" style={{ zIndex: 10 - i }}>
                                            <img src={p.avatar} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">{session.participants.map(p => p.name.split(' ')[0]).join(', ')}</h2>
                                <p className="text-indigo-200 text-lg font-medium animate-pulse">Chiamata in corso...</p>
                            </div>
                        </div>
                    ) : (isScreenSharing && screenStream) ? (
                        /* PRESENTATION MODE */
                        <div className="flex flex-col md:flex-row w-full h-full gap-4 max-w-full animate-in fade-in">
                            {/* Main Screen Share */}
                            <div className="flex-1 bg-black rounded-3xl overflow-hidden relative border border-white/10 flex items-center justify-center shadow-2xl min-h-[300px]">
                                <video ref={screenVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                                <div className="absolute top-4 left-4 px-3 py-1.5 bg-indigo-600/90 backdrop-blur-md rounded-lg flex items-center gap-2 shadow-lg">
                                    <Cast size={14} className="text-white" />
                                    <span className="text-xs font-bold text-white">Stai condividendo</span>
                                </div>
                            </div>

                            {/* Participants Strip (Bottom on Mobile, Right on Desktop) */}
                            <div className={`flex gap-3 overflow-auto custom-scrollbar md:flex-col md:w-64 md:h-full md:overflow-y-auto w-full h-32 flex-shrink-0 px-1`}>
                                {gridParticipants.map(p => renderParticipantCard(p, p.id === currentUser.id, true))}
                            </div>
                        </div>
                    ) : (
                        /* GRID MODE */
                        <div className={`grid ${getGridClass(gridParticipants.length)} gap-3 md:gap-6 w-full h-full max-w-6xl max-h-full items-center justify-center content-center`}>
                            {gridParticipants.map(p => renderParticipantCard(p, p.id === currentUser.id))}
                        </div>
                    )}
                </div>

                {/* CHAT PANEL (SIDEBAR ON DESKTOP, DRAWER ON MOBILE) */}
                <div className={`
                    fixed inset-y-0 right-0 z-40 w-full md:w-80 bg-[#1e293b]/95 backdrop-blur-xl border-l border-white/10 flex flex-col
                    transition-transform duration-300 ease-in-out transform 
                    ${showChat ? 'translate-x-0' : 'translate-x-full'}
                    md:absolute md:h-full
                `}>
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                        <h3 className="font-bold text-white">Messaggi nella chiamata</h3>
                        <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-300 transition"><X size={20} /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={chatScrollRef}>
                        {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                                <MessageSquare size={32} className="opacity-50" />
                                <p className="text-sm">Nessun messaggio.</p>
                            </div>
                        ) : (
                            chatMessages.map(msg => {
                                const isMe = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-xs font-bold text-slate-300">{isMe ? 'Tu' : msg.senderName}</span>
                                            <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                                        </div>
                                        <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-700 text-slate-200 rounded-tl-sm'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5">
                        <div className="relative flex items-center gap-2">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Scrivi un messaggio..." 
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button type="submit" disabled={!chatInput.trim()} className="p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50 hover:bg-indigo-700 transition">
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>

            </div>

            {/* 3. Control Bar (Floating) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
                <div className="flex items-center justify-center gap-2 md:gap-4 px-4 py-3 bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                    
                    <button 
                        onClick={() => setIsMicOn(!isMicOn)}
                        className={`p-3 rounded-full transition-all ${isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-900'}`}
                    >
                        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <button 
                        onClick={toggleVideo}
                        className={`p-3 rounded-full transition-all ${isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-900'}`}
                    >
                        {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>

                    <button 
                        onClick={handleEndCall}
                        className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-lg hover:scale-105 transition-all mx-2"
                    >
                        <PhoneOff size={24} fill="currentColor" />
                    </button>

                    <button 
                        onClick={toggleScreenShare}
                        className={`hidden md:block p-3 rounded-full transition-all ${isScreenSharing ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title="Condividi Schermo"
                    >
                        {isScreenSharing ? <StopCircle size={20} /> : <Monitor size={20} />}
                    </button>

                    <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`p-3 rounded-full transition-all relative ${showChat ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <MessageSquare size={20} />
                        {hasUnreadMessages && !showChat && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e293b]"></span>}
                    </button>

                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-3 rounded-full transition-all ${showSettings ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Settings Overlay */}
            {showSettings && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-64 bg-[#1e293b] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50">
                    <button 
                        onClick={() => setIsLowDataMode(!isLowDataMode)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${isLowDataMode ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            {isLowDataMode ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
                            <span className="text-sm font-bold">Risparmio Dati</span>
                        </div>
                        {isLowDataMode && <Check size={16} />}
                    </button>
                    {/* Mobile Only: Screen Share Button inside menu */}
                    <button 
                        onClick={() => { toggleScreenShare(); setShowSettings(false); }}
                        className={`md:hidden w-full flex items-center justify-between p-3 rounded-xl transition-all mt-1 ${isScreenSharing ? 'bg-green-600 text-white' : 'hover:bg-white/5 text-slate-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Monitor size={18} />
                            <span className="text-sm font-bold">{isScreenSharing ? 'Ferma Condivisione' : 'Condividi Schermo'}</span>
                        </div>
                    </button>
                </div>
            )}

        </div>
    );
};

export default CallInterface;

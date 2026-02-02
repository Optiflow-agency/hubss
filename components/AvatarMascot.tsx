
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface AvatarMascotProps {
    user: User;
    completedTasksCount: number;
    pendingTasksCount: number;
    enabled: boolean;
}

type Position = 'bottom-right' | 'bottom-left' | 'top-right';

interface Message {
    text: string;
    trigger?: (props: AvatarMascotProps) => boolean;
}

// --- MESSAGE BANK ---
const messages: Message[] = [
    // Motivational
    { text: "Bel ritmo di lavoro! 💪" },
    { text: "Ogni task chiuso è un problema in meno ✨", trigger: (p) => p.completedTasksCount > 0 },
    { text: "State andando forte, continuate così!" },
    // Focus
    { text: "Ricorda: meglio un task fatto bene che tre fatti di corsa 😉" },
    { text: "Hai già deciso qual è la prossima priorità?", trigger: (p) => p.pendingTasksCount > 5 },
    { text: "Un piccolo passo in più ora ti evita un problema domani." },
    // Context Aware
    { text: "Wow, hai già completato {{completed}} task oggi! 😎", trigger: (p) => p.completedTasksCount > 2 },
    { text: "Ancora {{pending}} task in lista... ce la puoi fare! 🚀", trigger: (p) => p.pendingTasksCount > 0 },
    // Friendly
    { text: "Ehi, mi stavo solo assicurando che fosse tutto ok 😄" },
    { text: "Ricordati di bere un po' d'acqua 💧" },
    { text: "Prenditi una pausa se serve, la produttività ringrazierà ☕" }
];

const AvatarMascot: React.FC<AvatarMascotProps> = ({ user, completedTasksCount, pendingTasksCount, enabled }) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [position, setPosition] = useState<Position>('bottom-right');
    const [isHovered, setIsHovered] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Main Loop
    useEffect(() => {
        if (!enabled || imgError) return;

        // Random interval between 30s and 90s
        const intervalTime = Math.floor(Math.random() * (90000 - 30000 + 1) + 30000);
        
        const triggerAppearance = () => {
            if (document.hidden) return; // Don't trigger if tab is inactive

            // Pick Position
            const posOptions: Position[] = ['bottom-right', 'bottom-left', 'top-right'];
            const newPos = posOptions[Math.floor(Math.random() * posOptions.length)];
            setPosition(newPos);

            // Pick Message
            const validMessages = messages.filter(m => !m.trigger || m.trigger({ user, completedTasksCount, pendingTasksCount, enabled }));
            const msgObj = validMessages[Math.floor(Math.random() * validMessages.length)];
            let finalMsg = msgObj.text
                .replace('{{completed}}', completedTasksCount.toString())
                .replace('{{pending}}', pendingTasksCount.toString())
                .replace('{{name}}', user.name.split(' ')[0]);
            
            setMessage(finalMsg);
            setVisible(true);

            // Auto Hide after 6s (unless hovered)
            setTimeout(() => {
                if (!isHovered) setVisible(false);
            }, 6000);
        };

        const timer = setInterval(triggerAppearance, intervalTime);
        return () => clearInterval(timer);
    }, [enabled, completedTasksCount, pendingTasksCount, isHovered, user, imgError]);

    // Handle Hover pause logic separately to be reactive
    useEffect(() => {
        let hideTimer: ReturnType<typeof setTimeout>;
        if (visible && !isHovered) {
            hideTimer = setTimeout(() => setVisible(false), 4000);
        }
        return () => clearTimeout(hideTimer);
    }, [isHovered, visible]);

    if (!enabled || !user.avatar || imgError) return null;

    // --- POSITIONS ---
    const posClasses = {
        'bottom-right': 'bottom-8 right-8 flex-row-reverse',
        'bottom-left': 'bottom-20 left-20 flex-row', // Higher to avoid covering sidebar nav sometimes
        'top-right': 'top-24 right-8 flex-row-reverse'
    };

    const bubbleClasses = {
        'bottom-right': 'mr-4 rounded-tr-none',
        'bottom-left': 'ml-4 rounded-tl-none',
        'top-right': 'mr-4 rounded-br-none'
    };

    return (
        <div 
            className={`fixed z-[60] flex items-end transition-all duration-500 pointer-events-none ${posClasses[position]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* AVATAR IMAGE */}
            <div className="relative pointer-events-auto cursor-pointer group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden relative z-10 transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
                    <img 
                        src={user.avatar} 
                        alt="Mascot" 
                        className="w-full h-full object-cover" 
                        onError={() => setImgError(true)}
                    />
                </div>
                {/* Shadow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/20 rounded-full blur-sm group-hover:w-16 transition-all"></div>
            </div>

            {/* SPEECH BUBBLE */}
            <div className={`pointer-events-auto bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-[250px] relative animate-in fade-in zoom-in-95 duration-300 origin-bottom ${bubbleClasses[position]}`}>
                <button 
                    onClick={() => setVisible(false)}
                    className="absolute -top-2 -right-2 bg-slate-200 dark:bg-slate-700 rounded-full p-1 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X size={12} />
                </button>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                    {message}
                </p>
                {/* Triangle Tail */}
                <div 
                    className={`absolute w-4 h-4 bg-white dark:bg-slate-800 border-b border-r border-slate-100 dark:border-slate-700 transform rotate-45 
                    ${position === 'bottom-right' ? '-right-2 bottom-6 border-l-0 border-t-0' : ''}
                    ${position === 'bottom-left' ? '-left-2 bottom-6 border-r-0 border-b-0 border-l border-slate-100 dark:border-slate-700' : ''}
                    ${position === 'top-right' ? '-right-2 top-6 border-l-0 border-t-0' : ''}
                    `}
                ></div>
            </div>
        </div>
    );
};

export default AvatarMascot;

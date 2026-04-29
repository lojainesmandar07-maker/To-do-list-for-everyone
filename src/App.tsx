/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Leaf, ShoppingBasket, Plus, Trash2, Upload, Edit2, X, Check, FileQuestion, Camera, Lock, Unlock, Play, Pause, RotateCcw, Music, Music3 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import localforage from 'localforage';
import { useLocalForage, fileToBase64 } from './useLocalForage';
import { useGlobalAssets } from './useFirestore';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

// --- Types ---
type Tab = 'Home' | 'Characters' | 'Decorations' | 'Goals' | 'Memories' | 'Admin';

// --- Shared Assets & SVGs ---
const AcornBullet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-1">
    <path d="M12 2C7.58172 2 4 5.58172 4 10C4 11.8384 4.6213 13.535 5.6582 14.93C6.73173 16.3752 7 16.8 9 19C10.6667 20.8333 11 22 12 22C13 22 13.3333 20.8333 15 19C17 16.8 17.2683 16.3752 18.3418 14.93C19.3787 13.535 20 11.8384 20 10C20 5.58172 16.4183 2 12 2Z" fill="#A07253"/>
    <path d="M4 10H20C20 10 18 6 12 6C6 6 4 10 4 10Z" fill="#6B442A"/>
    <path d="M12 2V6" stroke="#6B442A" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const DecorativeFlourish = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center gap-3 w-full mb-4">
    <span className="text-wood-dark opacity-70">
      <svg width="32" height="12" viewBox="0 0 32 12" fill="currentColor">
        <path d="M30 6C24 6 22 1 18 1C14 1 12 6 6 6C12 6 14 11 18 11C22 11 24 6 30 6Z"/>
        <circle cx="2" cy="6" r="2"/>
        <circle cx="18" cy="6" r="1"/>
      </svg>
    </span>
    <h3 className="font-serif text-2xl font-semibold text-text-brown tracking-wide">{children}</h3>
    <span className="text-wood-dark opacity-70 rotate-180">
      <svg width="32" height="12" viewBox="0 0 32 12" fill="currentColor">
        <path d="M30 6C24 6 22 1 18 1C14 1 12 6 6 6C12 6 14 11 18 11C22 11 24 6 30 6Z"/>
        <circle cx="2" cy="6" r="2"/>
        <circle cx="18" cy="6" r="1"/>
      </svg>
    </span>
  </div>
);

// --- Draggable Setup (React mechanics for Decorations and Dress-Up) ---
type DraggableItem = { id: string; src: string; x: number; y: number; width?: number; flip?: number; isLocked?: boolean };

const DraggableObject: React.FC<{ item: DraggableItem, onRemove?: (id: string) => void, onUpdate?: (item: DraggableItem) => void }> = ({ item, onRemove, onUpdate }) => {
  const [width, setWidth] = useState(item.width || 120);
  const [flip, setFlip] = useState(item.flip || 1);
  const [isLocked, setIsLocked] = useState(item.isLocked || false);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(item.x || 0);
  const y = useMotionValue(item.y || 0);

  // Sync internal state back up on change (except x/y which sync on drag end)
  useEffect(() => {
    if (onUpdate) {
      onUpdate({ ...item, width, flip, isLocked, x: x.get(), y: y.get() });
    }
  }, [width, flip, isLocked]);

  return (
    <motion.div
      drag={!isLocked}
      dragMomentum={false}
      style={{ x, y, touchAction: 'none' }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setIsDragging(false);
        if (onUpdate) {
          onUpdate({ 
            ...item, 
            x: x.get(), 
            y: y.get(),
            width,
            flip,
            isLocked
          });
        }
      }}
      className={`absolute z-[100] group pointer-events-auto ${isLocked ? '' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'z-[200]' : ''}`}
    >
      <div className={`relative p-1 rounded transition-all ${isLocked ? '' : 'group-hover:ring-2 ring-dashed ring-wood-dark/50'}`} style={{ width: width }}>
        {onRemove && !isLocked && (
           <button 
             onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
             onPointerDown={(e) => e.stopPropagation()} 
             className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 shadow-sm"
           >
             <X className="w-3 h-3" />
           </button>
        )}
        
        <button 
          onClick={(e) => { e.stopPropagation(); setIsLocked(!isLocked); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute -top-2 -left-2 bg-wood-dark text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-wood-shadow shadow-sm ${isLocked ? 'bg-wood-shadow' : ''}`}
        >
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>

        {/* Resize & Flip Controls */}
        {!isLocked && (
          <div 
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onPointerDown={(e) => e.stopPropagation()}
          >
             <button 
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWidth(w => Math.max(40, w - 20)); }} 
               className="bg-wood-dark text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md font-sans font-bold hover:scale-110 active:scale-95 text-lg leading-none pb-0.5"
             >-</button>
             <button 
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFlip(f => f * -1); }} 
               className="bg-wood-dark text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md font-sans hover:scale-110 active:scale-95 text-xs font-bold pb-[1px]"
             >⇄</button>
             <button 
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWidth(w => w + 20); }} 
               className="bg-wood-dark text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md font-sans font-bold hover:scale-110 active:scale-95 text-lg leading-none pb-0.5"
             >+</button>
          </div>
        )}

        {item.src && (item.src.startsWith('blob:') || item.src.startsWith('http') || item.src.startsWith('data:')) ? (
          <img 
             src={item.src} 
             className="w-full h-auto pointer-events-none origin-center transition-transform" 
             alt="Asset" 
             style={{ transform: `scaleX(${flip})` }}
          />
        ) : (
          <div 
             className="w-full aspect-square bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center text-xs text-center text-gray-500 pointer-events-none"
          >
             <span>[Asset]</span>
             <span className="text-[10px] break-all">{item.src}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { auth, useIsAdmin } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AuthView } from './AuthView';

export type Memory = { id: string; url: string; date: string; note: string };

export default function Main() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return null;
  if (!user) return <AuthView />;

  return <CornerApp user={user} />;
}

export function CornerApp({ user }: { user: User }) {
  const isAdmin = useIsAdmin();
  const [currentTab, setCurrentTab] = useState<Tab>('Home');
  const [globalDecorations, setGlobalDecorations] = useLocalForage<DraggableItem[]>('corner_globalDecos', []);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom assets state
  const [customBgUrl, setCustomBgUrl] = useLocalForage<string>('corner_bg', '');
  const [signBgUrl, setSignBgUrl] = useLocalForage<string>('corner_sign', '');
  const [boardBgUrl, setBoardBgUrl] = useLocalForage<string>('corner_board', '');
  const [avatarUrl, setAvatarUrl] = useLocalForage<string>('corner_avatar', '');
  const [customDecals, setCustomDecals] = useLocalForage<string[]>('corner_decals', []);
  const [customClothes, setCustomClothes] = useLocalForage<string[]>('corner_clothes', []);
  const [characterBaseUrl, setCharacterBaseUrl] = useLocalForage<string>('corner_characterBase', '');
  const [fontMode, setFontMode] = useLocalForage<'Dark' | 'Light'>('corner_fontMode', 'Dark');

  // Memories
  const [memories, setMemories] = useLocalForage<Memory[]>('corner_memories', []);
  const [isCapturingMemory, setIsCapturingMemory] = useState(false);

  const takeSnapshot = async () => {
    const boardElement = document.getElementById('main-board-capture');
    if (!boardElement) return;
    try {
      setIsCapturingMemory(true);
      // Wait a tick for UI update
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await htmlToImage.toJpeg(boardElement, {
         quality: 0.4,
         style: { transform: 'scale(1)', margin: '0' }
      });
      const newMemory: Memory = {
         id: Date.now().toString(),
         url: dataUrl,
         date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
         note: 'A cozy moment...'
      };
      setMemories(prev => [newMemory, ...prev]);
      setCurrentTab('Memories');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCapturingMemory(false);
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'Home': return <HomeView avatarUrl={avatarUrl} onOpenSettings={() => setShowSettings(true)} />;
      case 'Characters': return <CharactersDressUpView characterBaseUrl={characterBaseUrl} setCharacterBaseUrl={setCharacterBaseUrl} onDone={(src: string) => {
        setGlobalDecorations(prev => [...prev, { id: Math.random().toString(), src, x: window.innerWidth / 2 - 100, y: 100 }]);
        setCurrentTab('Home');
      }} />;
      case 'Decorations': return <DecorationsMenu onAdd={(src: string) => {
        setGlobalDecorations(prev => [...prev, { id: Math.random().toString(), src, x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
      }} />;
      case 'Goals': return <GoalsTrackerView />;
      case 'Memories': return <MemoriesDiaryView memories={memories} setMemories={setMemories} />;
      case 'Admin': return <AdminDashboard />;
    }
  };

  return (
    <div 
      className={`relative min-h-screen pb-16 pt-8 flex justify-center overflow-x-hidden select-none ${fontMode === 'Light' ? 'theme-light-fonts' : ''}`}
      style={customBgUrl ? { backgroundImage: `url(${customBgUrl})`, backgroundSize: 'cover' } : {}}
    >
      {/* Global Freely Draggable Decorations Layer */}
      <div className="absolute inset-0 z-[100] pointer-events-none">
        {globalDecorations.map(dec => (
          <DraggableObject 
            key={dec.id} 
            item={dec} 
            onRemove={isCapturingMemory ? undefined : (id) => setGlobalDecorations(prev => prev.filter(d => d.id !== id))} 
            onUpdate={(updatedItem) => setGlobalDecorations(prev => prev.map(d => d.id === updatedItem.id ? updatedItem : d))}
          />
        ))}
      </div>

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          customBgUrl={customBgUrl}
          setCustomBgUrl={setCustomBgUrl}
          signBgUrl={signBgUrl}
          setSignBgUrl={setSignBgUrl}
          boardBgUrl={boardBgUrl}
          setBoardBgUrl={setBoardBgUrl}
          fontMode={fontMode}
          setFontMode={setFontMode}
          avatarUrl={avatarUrl}
          setAvatarUrl={setAvatarUrl}
        />
      )}

      {/* Floating Camera Button */}
      <button 
        onClick={takeSnapshot}
        disabled={isCapturingMemory}
        className="fixed bottom-6 right-6 w-14 h-14 bg-pink-400 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 hover:bg-pink-500 hover:scale-110 active:scale-95 transition-all z-50 group"
        title="Take Snapshot of Desk"
      >
        <Camera className="w-6 h-6" />
        <span className="absolute right-16 bg-white/90 text-pink-700 text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm whitespace-nowrap font-bold">
          {isCapturingMemory ? 'Capturing...' : 'Snap Desk!'}
        </span>
      </button>

      <div className="w-[850px] max-w-[95vw] flex flex-col items-center z-10">
        
        {/* -- Header Sign -- */}
        <div className="relative w-full wood-board rounded-t-[3rem] rounded-b-xl p-3 border-b-8 border-r-4 border-wood-dark z-20 dynamic-border">
          <div 
            className="wood-inner rounded-t-[2.5rem] rounded-b-lg p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[150px] dynamic-text-container dynamic-border"
            style={signBgUrl ? { backgroundImage: `url(${signBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {/* Grass/Mushroom decorative footer placeholder */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-green-900/10 border-t border-green-900/20" />

            <h1 className="font-script text-[4.5rem] text-[#4d2b18] mt-6 tracking-wide drop-shadow-sm z-20 dynamic-text">
              Little Corner
            </h1>
          </div>
        </div>

        {/* -- Ropes & Navigation -- */}
        <div className="flex flex-wrap gap-2 md:gap-4 w-full justify-center -mt-1 z-10 relative px-2 md:px-8">
          <NavPill label="Home" tab="Home" current={currentTab} setTab={setCurrentTab} color="bg-pink-muted" />
          <NavPill label="Characters" tab="Characters" current={currentTab} setTab={setCurrentTab} color="bg-purple-muted pattern-stars" pattern />
          <NavPill label="Decorations" tab="Decorations" current={currentTab} setTab={setCurrentTab} color="bg-mauve-muted pattern-damask" pattern />
          <NavPill label="Goals" tab="Goals" current={currentTab} setTab={setCurrentTab} color="bg-teal-muted pattern-clouds" pattern />
          <NavPill label="Memories" tab="Memories" current={currentTab} setTab={setCurrentTab} color="bg-[#d0a79e] pattern-dots" pattern />
          {isAdmin && <NavPill label="Admin" tab="Admin" current={currentTab} setTab={setCurrentTab} color="bg-red-200" />}
        </div>

        {/* -- Main Board -- */}
        <div className="w-full relative wood-board p-5 mt-4 rounded-xl border-b-8 border-r-4 border-wood-dark z-0 dynamic-border" id="main-board-capture">
          <div 
            className="bg-paper stitch-border p-8 rounded-lg relative text-text-brown h-[700px] flex flex-col shadow-sm dynamic-text-container dynamic-border"
            style={boardBgUrl ? { backgroundImage: `url(${boardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {/* Screws */}
            <div className="screw top-3 left-3" />
            <div className="screw top-3 right-3" />
            <div className="screw bottom-3 left-3" />
            <div className="screw bottom-3 right-3" />

            {/* Welcome Banner */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center drop-shadow-md z-30">
               <div className="bg-wood-light border-y-2 border-x-4 border-wood-shadow px-8 py-2 rounded-sm relative flex items-center gap-3 dynamic-border">
                  <div className="absolute -left-3 top-[-2px] bottom-[-2px] w-4 bg-[#c8a883] rounded-l-full border-2 border-wood-shadow dynamic-border" />
                  <div className="absolute -right-3 top-[-2px] bottom-[-2px] w-4 bg-[#c8a883] rounded-r-full border-2 border-wood-shadow dynamic-border" />
                  <span className="text-wood-dark text-sm dynamic-text">✿</span>
                  <h2 className="font-script text-2xl text-[#8E4424] dynamic-text">Welcome!</h2>
                  <span className="text-wood-dark text-sm dynamic-text">✿</span>
               </div>
            </div>

            {/* Dynamic Content */}
            <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 transition-all duration-300">
              {renderContent()}
            </div>
            
            {/* Lofi Radio / Phonograph */}
            <LoFiPlayer />
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Navigation Pill Helper ---
function NavPill({ label, tab, current, setTab, color, pattern }: { label: string, tab: Tab, current: Tab, setTab: (t: Tab) => void, color: string, pattern?: boolean }) {
  const isActive = current === tab;
  return (
    <div className="relative group cursor-pointer flex flex-col items-center" onClick={() => setTab(tab)}>
      {/* Ropes */}
      <div className="w-2 h-6 bg-[repeating-linear-gradient(45deg,#f5f5f5,#f5f5f5_2px,#d4d4d4_2px,#d4d4d4_4px)] rounded-sm shadow-sm z-0" />
      {/* Pill */}
      <div className={`
        relative overflow-hidden z-10 px-8 py-2 rounded-full border-2 border-dashed border-[#ead9c4] 
        shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-transform duration-200
        ${color} ${isActive ? 'translate-y-1 shadow-[0_2px_4px_rgba(0,0,0,0.3)]' : 'hover:translate-y-0.5'}
      `}>
        {pattern && <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" />}
        <span className="relative z-20 font-serif text-lg text-[#fdf9f1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
          {label}
        </span>
      </div>
    </div>
  );
}

type Task = {
  id: number;
  text: string;
  completed: boolean;
  completing: boolean;
  dateCategory: string; // 'Today', 'Tomorrow', 'This week', 'This month'
  isDaily: boolean;
  important?: boolean;
};

const initialTasks: Task[] = [
  { id: 1, text: "Welcome to your Little Corner!", completed: false, completing: false, dateCategory: "Today", isDaily: true },
];

function LoFiPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const saved = localStorage.getItem('corner_trackIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('corner_trackIndex', currentTrackIndex.toString());
  }, [currentTrackIndex]);

  const audioRef = useRef<HTMLAudioElement>(null);

  const tracks = [
    { name: "Chill LoFi", src: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
    { name: "Coffee Shop", src: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" },
    { name: "Crackling Fire", src: "https://actions.google.com/sounds/v1/ambiences/fire.ogg" },
  ];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
         audioRef.current.play().catch(e => console.log('Playback error:', e));
      }
    }
  }, [currentTrackIndex, isPlaying]); // Added isPlaying to deps just in case, though play() is also called in togglePlay

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log('Playback error:', e));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
       <audio ref={audioRef} loop src={tracks[currentTrackIndex]?.src || tracks[0].src} /> 
       
       <div className="flex flex-col items-end gap-2">
         {/* Toggle Menu Button - Top */}
         <button 
           onClick={() => setShowMenu(!showMenu)}
           className="bg-wood-light text-wood-dark px-3 py-1.5 rounded-full border-2 border-wood-dark shadow-sm text-xs font-bold font-sans hover:bg-wood-mid hover:text-white transition-colors flex items-center gap-2"
         >
           <Music className="w-3 h-3" />
           {tracks[currentTrackIndex]?.name || tracks[0].name}
         </button>

         <div className="flex items-start gap-3">
           {/* Track Menu */}
           <AnimatePresence>
             {showMenu && (
               <motion.div 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="bg-wood-light border-2 border-wood-dark p-2 rounded-xl shadow-lg flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar"
               >
                 {tracks.map((track, i) => (
                   <button
                     key={i}
                     onClick={() => { setCurrentTrackIndex(i); setShowMenu(false); }}
                     className={`text-left px-3 py-1.5 rounded-lg font-sans text-sm whitespace-nowrap transition-colors ${currentTrackIndex === i ? 'bg-wood-dark text-white font-bold' : 'text-wood-dark hover:bg-wood-mid/40'}`}
                   >
                     {track.name}
                   </button>
                 ))}
               </motion.div>
             )}
           </AnimatePresence>

           {/* Phonograph / Radio UI */}
           <div 
             className={`relative flex items-center justify-center w-16 h-16 rounded-full bg-wood-light border-4 border-wood-dark shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95 ${isPlaying ? 'animate-[spin_4s_linear_infinite] border-teal-muted' : ''}`}
             onClick={togglePlay}
           >
             {/* Inner record details */}
             <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-pink-400 border-2 border-[#1a1a1a]" />
             </div>
             
             {isPlaying && (
               <motion.div 
                 initial={{ opacity: 0, y: 0 }}
                 animate={{ opacity: [0, 1, 0], y: -20, x: [0, 10, -5, 0] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                 className="absolute -top-2 -right-4 pointer-events-none"
               >
                 <Music3 className="w-4 h-4 text-pink-400" />
               </motion.div>
             )}
           </div>
         </div>
       </div>
    </div>
  );
}

function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionLength, setSessionLength] = useState(25); // in minutes
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const [customTime, setCustomTime] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Finished
      setIsActive(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000); // Stop confetti after 8s
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(sessionLength * 60);
    setShowConfetti(false);
  };

  const handleSessionChange = (mins: number) => {
    setSessionLength(mins);
    if (!isActive) {
      setTimeLeft(mins * 60);
    }
    setShowConfetti(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customTime);
    if (!isNaN(mins) && mins > 0) {
       handleSessionChange(mins);
       setShowCustom(false);
       setCustomTime("");
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  return (
    <div className="mt-8 relative w-full flex flex-col items-center">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} gravity={0.15} style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }} />}
      {/* Acorn shape container */}
      <div className="relative w-48 mx-auto flex flex-col items-center z-10 transition-transform hover:-translate-y-1 duration-300 group">
         {/* Acorn Cap */}
         <div className="w-40 h-16 bg-[#8c5737] rounded-[50px_50px_10px_10px] border-b-4 border-[#61361c] relative flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] z-10">
           {/* STEM */}
           <div className="absolute -top-3 w-3 h-5 bg-[#61361c] rounded-[10px_10px_0_0]" />
           <div className="absolute -top-3 -right-2 transform rotate-45 w-4 h-4 text-green-700/80 pointer-events-none group-hover:rotate-[60deg] transition-transform duration-500 origin-bottom-left">
             <Leaf className="w-full h-full fill-current" />
           </div>
           {/* Crosshatch Pattern for Cap */}
           <div className="absolute inset-0 opacity-20 pointer-events-none rounded-[50px_50px_10px_10px]" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #4d2b18 4px, #4d2b18 8px), repeating-linear-gradient(-45deg, transparent, transparent 4px, #4d2b18 4px, #4d2b18 8px)'}}></div>
         </div>
         
         {/* Acorn Body (Timer Display) */}
         <div className="w-36 h-36 bg-[#d8b792] rounded-[10px_10px_100px_100px] flex flex-col items-center pt-3 pb-6 shadow-[inset_0_-8px_16px_rgba(100,50,20,0.3)] border-2 border-t-0 border-[#c5a17b] relative overflow-hidden -mt-1">
            <h4 className="font-serif text-[11px] uppercase tracking-widest text-[#8c5737] font-bold mb-1 z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">Focus Time</h4>
            <div className={`font-mono text-4xl font-bold tracking-tighter drop-shadow-md z-10 transition-colors ${timeLeft === 0 ? 'text-green-700 animate-pulse' : 'text-[#61361c]'}`}>
              {timeString}
            </div>

            {/* Controls */}
            <div className="flex gap-2 mt-2 z-10">
              <button onClick={toggleTimer} className="w-8 h-8 rounded-full bg-[#8c5737] hover:bg-[#61361c] flex items-center justify-center text-white shadow-sm transition-colors border border-white/20 hover:scale-110 active:scale-95">
                {isActive ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current ml-0.5"/>}
              </button>
              <button onClick={resetTimer} className="w-8 h-8 rounded-full bg-[#8c5737] hover:bg-[#61361c] flex items-center justify-center text-white shadow-sm transition-colors border border-white/20 hover:scale-110 active:scale-95">
                <RotateCcw className="w-4 h-4"/>
              </button>
            </div>
            
            {/* Progress fill visual */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-[#c5a17b] transition-all duration-1000 ease-linear z-0"
              style={{ height: `${((sessionLength * 60 - timeLeft) / (sessionLength * 60)) * 100}%` }}
            />
         </div>
      </div>

      {/* Duration Selectors */}
      <div className="flex gap-1.5 mt-4 bg-wood-light/40 px-3 py-1.5 rounded-full border border-wood-dark/10 shadow-sm relative z-0 flex-wrap justify-center">
        {[5, 10, 25, 45].map(m => (
          <button 
            key={m}
            onClick={() => { handleSessionChange(m); setShowCustom(false); }}
            className={`text-[11px] font-bold font-sans px-2.5 py-1 rounded-full transition-all ${sessionLength === m && !showCustom ? 'bg-wood-dark text-white shadow-sm scale-110' : 'text-wood-dark hover:bg-wood-mid/30'}`}
          >
            {m}m
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`text-[11px] font-bold font-sans px-2.5 py-1 rounded-full transition-all ${showCustom ? 'bg-wood-dark text-white shadow-sm scale-110' : 'text-wood-dark hover:bg-wood-mid/30'}`}
        >
          Custom
        </button>
      </div>
      
      <AnimatePresence>
        {showCustom && (
          <motion.form 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            onSubmit={handleCustomSubmit} 
            className="mt-2 flex gap-2"
          >
            <input 
              type="number" 
              min="1" 
              max="999" 
              value={customTime} 
              onChange={e => setCustomTime(e.target.value)} 
              placeholder="mins" 
              className="w-16 px-2 py-1 text-xs text-center border-2 border-wood-dark/20 rounded-md bg-white focus:outline-none focus:border-wood-dark text-wood-dark"
            />
            <button type="submit" className="bg-green-700 text-white px-2 py-1 text-xs rounded-md font-bold hover:bg-green-800 transition-colors">Set</button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function HomeView({ avatarUrl, onOpenSettings }: { avatarUrl: string, onOpenSettings: () => void }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [dateFilter, setDateFilter] = useState("Today");
  const [viewMode, setViewMode] = useState<'Active' | 'Completed'>('Active');

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskIsDaily, setNewTaskIsDaily] = useState(false);
  const [newTaskIsImportant, setNewTaskIsImportant] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskText, setEditTaskText] = useState("");

  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  
  const [rolloverTasks, setRolloverTasks] = useState<Task[]>([]);
  const [showRollover, setShowRollover] = useState(false);

  useEffect(() => {
    const loadTasks = async () => {
       const todayStr = new Date().toISOString().split('T')[0];
       let storedTasks = await localforage.getItem<Task[]>('corner_tasks');
       let storedDate = await localforage.getItem<string>('corner_date');
       
       if (!storedTasks) {
          const old = localStorage.getItem('corner_tasks');
          if (old) storedTasks = JSON.parse(old);
       }
       if (!storedDate) {
          const old = localStorage.getItem('corner_date');
          if (old) storedDate = old;
       }
       
       let loadedTasks: Task[] = storedTasks ? storedTasks : initialTasks;
       
       if (storedDate && storedDate !== todayStr) {
          // A new day! Reset dailies
          let uncompletedTasks: Task[] = [];
          loadedTasks = loadedTasks.map(t => {
            if (t.isDaily) {
               return { ...t, completed: false, dateCategory: "Today" };
            }
            if (t.dateCategory === "Tomorrow") {
               return { ...t, dateCategory: "Today" }; // Rollover Tomorrow to Today automatically
            }
            if (!t.completed && (t.dateCategory === "Today" || t.dateCategory === "This week" || t.dateCategory === "This month")) {
               uncompletedTasks.push(t);
            }
            if (t.completed && t.dateCategory === "Today") {
               return { ...t, dateCategory: "Past_Completed" }; // Hide old completed ones from today
            }
            return t;
          });
          
          if (uncompletedTasks.length > 0) {
             setRolloverTasks(uncompletedTasks);
             setShowRollover(true);
          }
          await localforage.setItem('corner_date', todayStr);
       } else if (!storedDate) {
          await localforage.setItem('corner_date', todayStr);
       }
       
       setTasks(loadedTasks);
       setTasksLoaded(true);
    };
    loadTasks();
  }, []);

  useEffect(() => {
    if (tasksLoaded) {
       localforage.setItem('corner_tasks', tasks);
    }
  }, [tasks, tasksLoaded]);

  const toggleTask = (id: number) => {
    if (editingTaskId !== null) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (task.completed) {
      setTasks(ts => ts.map(t => t.id === id ? { ...t, completed: false } : t));
    } else if (!task.completing) {
      setTasks(ts => ts.map(t => t.id === id ? { ...t, completing: true } : t));
      setTimeout(() => {
        setTasks(ts => ts.map(t => t.id === id ? { ...t, completing: false, completed: true } : t));
      }, 1200);
    }
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    setTasks(prev => [...prev, {
      id: Date.now(),
      text: newTaskText,
      completed: false,
      completing: false,
      dateCategory: dateFilter,
      isDaily: newTaskIsDaily,
      important: newTaskIsImportant,
    }]);
    setNewTaskText("");
    setNewTaskIsDaily(false);
    setNewTaskIsImportant(false);
    setShowNewTaskForm(false);
  };

  const saveEdit = (id: number) => {
    if (!editTaskText.trim()) return;
    setTasks(ts => ts.map(t => t.id === id ? { ...t, text: editTaskText } : t));
    setEditingTaskId(null);
  };

  const confirmRemoveTask = (id: number) => {
    setTaskToDelete(id);
  };

  const executeRemoveTask = () => {
    if (taskToDelete !== null) {
      setTasks(ts => ts.filter(t => t.id !== taskToDelete));
      setTaskToDelete(null);
    }
  };
  
  const clearCompletedTasks = () => {
    setTasks(ts => ts.filter(t => !(t.dateCategory === dateFilter && t.completed)));
  };

  const handleRolloverDecision = (taskId: number, decision: 'delete' | 'keep') => {
    if (decision === 'delete') {
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } else {
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, dateCategory: "Today" } : t));
    }
    setRolloverTasks(prev => prev.filter(t => t.id !== taskId));
    if (rolloverTasks.length <= 1) setShowRollover(false);
  };

  const filteredTasksByDate = tasks.filter(t => t.dateCategory === dateFilter);
  const displayedTasks = filteredTasksByDate.filter(t => {
    if (viewMode === 'Active') return !t.completed || t.completing;
    return t.completed && !t.completing;
  });

  const totalTasks = filteredTasksByDate.length;
  const completedTasksCount = filteredTasksByDate.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

  return (
    <div className="flex flex-col md:flex-row gap-10">
      {/* Left Sidebar: Profile */}
      <div className="w-full md:w-[240px] flex-shrink-0 flex flex-col items-center">
        {/* Avatar Area */}
        <div className="rounded-full bg-[#d0a79e] p-1.5 border-[4px] border-[#6b4231] shadow-[0_4px_12px_rgba(41,25,10,0.3)] relative transition-transform hover:scale-105 duration-300">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white border-2 border-black border-opacity-10 flex items-center justify-center text-xs text-gray-500" id="asset-avatar">
             {avatarUrl ? (
               <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <div className="flex flex-col items-center opacity-50"><Upload className="w-6 h-6 mb-1"/> Avatar</div>
             )}
          </div>
        </div>
        
        {/* Name */}
        <div className="mt-4 flex items-center gap-2 font-serif text-xl font-bold text-text-brown">
          <Leaf className="w-5 h-5 text-green-700 fill-current drop-shadow-sm" />
          <span className="drop-shadow-sm">Little Corner</span>
          <span className="text-pink-400 text-lg">🎀</span>
        </div>

        {/* Scroll Greeting */}
        <div className="mt-4 mb-6 scroll-banner w-full text-center py-3 px-2 transition-transform hover:-translate-y-1 duration-300">
          <p className="font-serif text-lg leading-tight text-[#4d2b18]">
             welcome to my<br/>little corner !
          </p>
        </div>

        <div className="w-full text-left font-sans text-[15px] text-text-brown px-2">
          {/* Enhanced Progress Bar */}
          <div className="mb-6">
            <p className="mb-2 flex justify-between items-end">
              <span className="font-semibold text-wood-dark">Progress</span> 
              <strong className="text-lg leading-none text-green-800">{completedTasksCount}/{totalTasks}</strong>
            </p>
            <div className="w-full h-3.5 bg-wood-mid/30 rounded-full overflow-hidden border border-wood-dark/20 shadow-inner relative">
              <motion.div 
                className="absolute top-0 left-0 bottom-0 bg-green-600/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
          
          <ul className="space-y-3">
            <li onClick={() => setViewMode('Active')} className={`flex items-center justify-between cursor-pointer group transition-all p-2 rounded-lg ${viewMode === 'Active' ? 'bg-wood-light border border-wood-dark/20 shadow-sm font-bold' : 'hover:bg-wood-light/40 border border-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full border shadow-sm transition-colors ${viewMode === 'Active' ? 'bg-[#c5a17b] border-wood-dark' : 'bg-[#d8b792] border-wood-dark/50'}`}>
                  <Leaf className="w-5 h-5 text-wood-dark" />
                </div>
                <span className="text-[17px] text-wood-dark">Current Tasks</span>
              </div>
              {viewMode === 'Active' && <span className="text-wood-dark/60 text-xs">✿</span>}
            </li>
            
            <li onClick={() => setViewMode('Completed')} className={`flex items-center justify-between cursor-pointer group transition-all p-2 rounded-lg ${viewMode === 'Completed' ? 'bg-wood-light border border-wood-dark/20 shadow-sm font-bold' : 'hover:bg-wood-light/40 border border-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full border shadow-sm transition-colors ${viewMode === 'Completed' ? 'bg-[#c5a17b] border-wood-dark' : 'bg-[#d8b792] border-wood-dark/50'}`}>
                  <ShoppingBasket className="w-5 h-5 text-wood-dark" />
                </div>
                <span className="text-[17px] text-wood-dark">Completed Tasks</span>
              </div>
            </li>
            <li onClick={onOpenSettings} className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity">
              <div className="p-1.5 bg-[#d8b792] rounded-full border border-wood-dark shadow-sm">
                <Settings className="w-5 h-5 text-wood-dark" />
              </div>
              <span className="text-[17px]">Settings</span>
            </li>
          </ul>

          {/* Acorn Pomodoro Timer */}
          <div className="mt-8 mb-4 border-t-2 border-dashed border-wood-dark/20 pt-6 px-2">
            <PomodoroTimer />
          </div>
        </div>
      </div>

      {/* Right Area: Tasks */}
      <div className="flex-1 md:border-l-2 border-t-2 md:border-t-0 border-dashed border-[#d8b792] md:pl-10 pt-6 md:pt-0 flex flex-col">
        
        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {["Today", "This week", "Tomorrow", "This month"].map(f => (
            <button 
              key={f} 
              onClick={() => { setDateFilter(f); setViewMode('Active'); setShowNewTaskForm(false); }}
              className={`py-1.5 px-4 border-2 border-dashed rounded-full text-[17px] font-sans font-bold transition-all ${
                dateFilter === f 
                  ? 'bg-wood-shadow border-wood-dark text-white shadow-inner scale-95' 
                  : 'bg-[#fdfaf3] border-wood-shadow text-wood-dark hover:bg-wood-light/50 shadow-sm'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <DecorativeFlourish>{viewMode === 'Active' ? `${dateFilter}'s Tasks` : `Completed in ${dateFilter}`}</DecorativeFlourish>
          
          {viewMode === 'Completed' && displayedTasks.length > 0 && (
            <button 
              onClick={clearCompletedTasks}
              className="text-xs font-bold font-sans text-red-500 hover:text-white border border-red-200 hover:bg-red-500 hover:border-red-500 px-3 py-1 rounded-full transition-colors"
            >
              Clear All Completed
            </button>
          )}
        </div>
        
        {/* Add Task Area (Moved to Top) */}
        {viewMode === 'Active' && (
          <div className="mb-6 overflow-hidden">
             {showNewTaskForm ? (
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#fdfaf3] p-4 rounded-xl border-2 border-wood-dark/20 flex flex-col gap-3 shadow-sm relative">
                 <div className="absolute top-0 right-0 w-8 h-8 bg-wood-dark/10 rounded-bl-xl pointer-events-none" />
                 <input 
                   autoFocus
                   placeholder={`Write a task for ${dateFilter}...`}
                   value={newTaskText}
                   onChange={e => setNewTaskText(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && addTask()}
                   className="w-full bg-transparent border-b-2 border-wood-dark/10 px-1 py-2 font-serif text-lg text-wood-dark focus:outline-none focus:border-wood-dark/30"
                 />
                 <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-wood-dark text-sm font-sans font-semibold">
                        <input type="checkbox" checked={newTaskIsDaily} onChange={e => setNewTaskIsDaily(e.target.checked)} className="rounded text-wood-dark focus:ring-wood-dark bg-white border-wood-dark/40" />
                        Daily Task
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-red-600 text-sm font-sans font-semibold">
                        <input type="checkbox" checked={newTaskIsImportant} onChange={e => setNewTaskIsImportant(e.target.checked)} className="rounded text-red-500 focus:ring-red-500 bg-white border-red-200" />
                        Important
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowNewTaskForm(false)} className="px-4 py-1.5 text-sm font-bold text-wood-dark/70 hover:bg-wood-mid/30 rounded-full transition-colors">Cancel</button>
                      <button onClick={addTask} className="px-4 py-1.5 text-sm font-bold bg-[#8c5737] text-white rounded-full hover:bg-wood-shadow hover:-translate-y-0.5 transition-all shadow-sm">Save Task</button>
                    </div>
                 </div>
               </motion.div>
             ) : (
               <button 
                 onClick={() => setShowNewTaskForm(true)}
                 className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-[#d8b792] rounded-xl text-[#8c5737] font-sans font-bold hover:bg-[#fdfaf3] hover:border-[#8c5737] hover:text-[#61361c] transition-all group shadow-sm bg-white"
               >
                 <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                 Add New Task
               </button>
             )}
          </div>
        )}
        
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12 pr-4 flex-1 items-start content-start">
          <AnimatePresence mode="popLayout">
            {displayedTasks.length === 0 && viewMode === 'Completed' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-full text-center font-sans text-wood-dark/50 italic py-8 border-2 border-dashed border-wood-dark/10 rounded-xl">
                No completed tasks yet! 🍃
              </motion.div>
            )}
            
            {displayedTasks.map(task => {
              const isDone = task.completed || task.completing;
              const isJustFinished = task.completing;
              const isEditing = editingTaskId === task.id;

              return (
                <motion.li 
                  layout
                  key={task.id} 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: task.completed ? 0.8 : 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3 }}
                  className={`mt-3 relative p-4 flex flex-col group/item transition-all ${
                     task.important 
                        ? 'bg-[#fff5f5] border-[#fecaca]' 
                        : 'bg-[#fffdf0] border-[#fdf0a6]'
                  } border shadow-sm hover:shadow-md rounded-xl`}
                >
                  {/* Tape */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transform rotate-2 rounded-[2px] pointer-events-none z-10 mix-blend-overlay" />
                  
                  {/* Pin or Tape decoration */}
                  {task.important && (
                     <div className="absolute -top-1 -right-2 flex gap-1 items-center bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm transform rotate-3 z-10">
                        <span className="animate-pulse">!</span>
                        IMPORTANT
                     </div>
                  )}

                  <div className="flex-1 flex flex-col pt-1">
                    <div className="flex justify-between items-start gap-3 relative pb-2 min-h-[60px]">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 relative z-20">
                            <textarea 
                              autoFocus
                              value={editTaskText}
                              onChange={e => setEditTaskText(e.target.value)}
                              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(task.id); } }}
                              className="w-full bg-transparent border-b-2 border-wood-dark/20 resize-none font-serif text-[17px] text-text-brown leading-snug focus:outline-none focus:border-wood-dark/40 placeholder-wood-dark/30"
                              rows={2}
                            />
                            <button onClick={() => saveEdit(task.id)} className="self-end bg-green-700/10 text-green-800 border border-green-700/20 px-3 py-1 text-xs font-bold rounded-md hover:bg-green-700/20 transition-colors shadow-sm">
                              Save
                            </button>
                          </div>
                        ) : (
                          <span 
                            className={`font-serif text-[17px] leading-relaxed cursor-pointer block break-words ${isDone ? 'opacity-50 text-wood-dark line-through decoration-wood-dark/40' : 'text-text-brown'}`}
                            onClick={() => toggleTask(task.id)}
                          >
                            {task.text}
                          </span>
                        )}
                      </div>
                      
                      {/* Completion Checkbox */}
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all border-2 relative z-20 mt-1 cursor-pointer ${
                          isDone ? 'bg-green-600 border-green-600 text-white shadow-inner' : 'bg-white/50 border-wood-dark/20 text-transparent hover:bg-white hover:border-wood-dark/40 shadow-sm'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {isJustFinished && (
                          <motion.div 
                            key="sparkle"
                            initial={{ opacity: 1, scale: 0.5 }} 
                            animate={{ opacity: 0, scale: 2 }} 
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center text-xl drop-shadow-sm pointer-events-none"
                          >✨</motion.div>
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between items-end mt-auto pt-3 border-t border-wood-dark/5">
                       {/* Left Side: status badges */}
                       <div className="flex gap-1 flex-wrap">
                          {task.isDaily && <span className="text-[10px] bg-wood-dark/5 border border-wood-dark/10 text-wood-dark/70 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider">Daily</span>}
                       </div>
                       
                       {/* Hover Actions */}
                       {!isDone && (
                         <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity ml-2 relative z-20">
                           <button onClick={() => { setEditingTaskId(task.id); setEditTaskText(task.text); }} className="p-1.5 text-wood-dark/50 hover:text-wood-dark hover:bg-wood-dark/5 rounded transition-colors" title="Edit Task">
                             <Edit2 className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => confirmRemoveTask(task.id)} className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Task">
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>

      {/* Rollover Modal */}
      <AnimatePresence>
        {showRollover && rolloverTasks.length > 0 && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-wood-dark/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#fcf8f2] border-2 border-[#d8b792] p-6 rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col max-h-[80vh]"
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-orange-100 text-[#8c5737] rounded-full flex items-center justify-center mb-4 border border-[#d8b792]">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl text-wood-dark font-bold mb-1">Past Tasks Await!</h3>
                <p className="text-wood-dark/80 font-sans text-sm">You have some incomplete tasks from a previous day. How would you like to handle them?</p>
              </div>
              
              <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 mb-4">
                 <div className="flex flex-col gap-3">
                   {rolloverTasks.map(task => (
                      <div key={task.id} className="bg-white border border-wood-dark/20 rounded-xl p-4 flex justify-between items-center gap-4 shadow-sm">
                         <span className="font-serif text-lg text-text-brown flex-1 truncate">{task.text}</span>
                         <div className="flex gap-2 shrink-0">
                           <button 
                             onClick={() => handleRolloverDecision(task.id, 'delete')}
                             className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors flex items-center gap-1 group"
                             title="Delete"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleRolloverDecision(task.id, 'keep')}
                             className="bg-green-600/90 hover:bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                           >
                             <Check className="w-3.5 h-3.5" /> Move to Today
                           </button>
                         </div>
                      </div>
                   ))}
                 </div>
              </div>
              
              <div className="flex gap-3 justify-center pt-4 border-t border-wood-dark/10">
                <button 
                  onClick={() => setShowRollover(false)}
                  className="px-6 py-2.5 rounded-full font-sans font-bold text-wood-dark/70 bg-wood-mid/20 hover:bg-wood-mid/40 transition-colors w-full"
                >
                  Decide Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete !== null && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setTaskToDelete(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#fcf8f2] border-2 border-[#d8b792] p-6 rounded-2xl shadow-xl max-w-[320px] w-full text-center relative z-10"
            >
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 drop-shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl text-wood-dark font-bold mb-2">Delete Task?</h3>
              <p className="text-wood-dark/80 font-sans text-sm mb-6">Are you sure you want to permanently remove this task? This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  className="px-5 py-2.5 rounded-full font-sans font-bold text-wood-dark text-sm hover:bg-wood-mid/30 transition-colors w-full"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeRemoveTask}
                  className="px-5 py-2.5 rounded-full font-sans font-bold text-sm bg-red-500 text-white hover:bg-red-600 shadow-sm transition-colors w-full"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CharactersDressUpView({ characterBaseUrl, setCharacterBaseUrl, onDone }: any) {
  const [sceneClothes, setSceneClothes] = useState<any[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const { assets: globalClothes } = useGlobalAssets('clothing');
  const { assets: globalCharacters } = useGlobalAssets('character');

  const selectedBase = globalCharacters.find(c => c.url === characterBaseUrl);

  const matchedClothes = selectedBase 
    ? globalClothes.filter(c => c.characterId === selectedBase.id)
    : [];

  const handleToggleClothes = (clothing: any) => {
     setSceneClothes(prev => {
        if (prev.find(p => p.id === clothing.id)) {
           return prev.filter(p => p.id !== clothing.id);
        } else {
           return [...prev, clothing];
        }
     });
  };

  const handleDone = async () => {
     if (!captureRef.current || !characterBaseUrl) return;
     setIsCapturing(true);
     try {
       await new Promise(r => setTimeout(r, 100)); // allow render to settle
       const dataUrl = await htmlToImage.toPng(captureRef.current, {
         skipFonts: true,
         backgroundColor: 'rgba(0,0,0,0)',
         fontEmbedCSS: '',
         style: {
           transform: 'scale(1)', // Ensuring the snapshot works properly
           transformOrigin: 'top left'
         }
       });
       onDone(dataUrl);
     } catch (err) {
       console.error("Failed to capture scene:", err);
     } finally {
       setIsCapturing(false);
     }
  };

  if (!characterBaseUrl) {
    return (
      <div className="flex flex-col items-center min-h-[500px] justify-center text-center">
         <DecorativeFlourish>Dress Up Character</DecorativeFlourish>
         <p className="mb-6 max-w-sm text-wood-dark/80">Choose a character to start dressing up!</p>
         
         <div className="flex gap-4 justify-center flex-wrap max-w-2xl px-4">
            {globalCharacters.map(c => (
               <button 
                  key={c.id} 
                  onClick={() => setCharacterBaseUrl(c.url)} 
                  className="w-32 h-32 border-4 border-[#d8b792] bg-white rounded-xl hover:scale-105 hover:border-[#8c5737] transition-all overflow-hidden p-2 shadow-sm"
               >
                 <img src={c.url} alt="Character" className="w-full h-full object-contain pointer-events-none" />
               </button>
            ))}
            {globalCharacters.length === 0 && (
               <p className="italic text-wood-dark/50 p-4 border-2 border-dashed border-wood-dark/20 rounded-xl">No characters available yet. Admins must upload them first.</p>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[500px]">
      <DecorativeFlourish>Dress Up</DecorativeFlourish>
      
      <div className="flex justify-between w-full max-w-4xl mb-4 px-4 items-center">
         <button onClick={() => { setCharacterBaseUrl(''); setSceneClothes([]); }} className="text-[#8c5737] font-bold font-sans hover:underline flex items-center gap-1">
           <RotateCcw className="w-4 h-4" /> Change Character
         </button>
         <p className="italic text-wood-dark/70 text-sm">Click wardrobe items to toggle them on/off!</p>
      </div>
      
      <div className="flex w-full max-w-4xl gap-8 flex-col sm:flex-row px-4">
        {/* Clothing Items Catalog (Left) */}
        <div className="w-full sm:w-80 bg-wood-light/40 border border-wood-dark/20 rounded-lg p-4 custom-scrollbar overflow-y-auto z-10 flex flex-col max-h-[500px]">
           <h4 className="border-b border-wood-dark/20 pb-2 mb-4 text-center font-bold">Wardrobe</h4>
           
           <div className="grid grid-cols-2 gap-3 flex-1 content-start">
              {matchedClothes.map((clothing: any) => {
                const isSelected = sceneClothes.find(s => s.id === clothing.id);
                return (
                  <button 
                    key={clothing.id}
                    onClick={() => handleToggleClothes(clothing)}
                    className={`relative aspect-square bg-paper border border-wood-dark/10 rounded-md flex justify-center items-center cursor-pointer hover:bg-white/90 hover:scale-105 shadow-sm transform transition-all overflow-hidden p-1 ${isSelected ? 'ring-2 ring-[#5c8b51] bg-[#eef5ed]' : ''}`}
                  >
                    <img src={clothing.url} alt={`Clothing`} className="w-full h-full object-contain drop-shadow-md pointer-events-none" />
                    {isSelected && <div className="absolute top-1 right-1 bg-[#5c8b51] rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>}
                  </button>
                )
              })}
              {matchedClothes.length === 0 && (
                <div className="col-span-2 aspect-[2/1] bg-white/30 border border-dashed border-wood-dark/20 rounded-md flex justify-center items-center text-xs text-center text-wood-dark/60 p-4">
                   No outfits found for this character.
                </div>
              )}
           </div>
           
           <button 
             onClick={handleDone}
             disabled={isCapturing}
             className="mt-6 w-full py-3 bg-[#5c8b51] text-white rounded-xl border-b-[4px] border-[#3b5e33] font-sans font-bold flex items-center justify-center hover:bg-[#4d7543] active:translate-y-[2px] active:border-b-[2px] active:mb-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm leading-tight px-2"
           >
              {isCapturing ? 'Saving...' : <div className="flex items-center gap-2"><Check className="w-5 h-5 flex-shrink-0" /> <span>Done & Spawn</span></div>}
           </button>
        </div>

        {/* Character Base (Right/Center) */}
        <div className="flex-1 bg-paper-shade border-2 border-dashed border-wood-dark/30 rounded-lg flex relative items-center justify-center min-h-[500px]">
            {/* 
                CRITICAL FIX FOR CAPTURE && FITTING: 
                The capture container must exactly match the sizing used in the admin tool (w-[300px] h-[400px]) 
                so coordinates transfer perfectly 1:1.
            */}
            <div ref={captureRef} className="relative w-[300px] h-[400px]">
              <img 
                src={characterBaseUrl} 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
              />
              
              {sceneClothes.map(c => {
                 const isFullFit = c.useFullCanvasFit || (c.x === 0 && c.y === 0 && c.width === 300);
                 return (
                   <img
                     key={c.id}
                     src={c.url}
                     style={isFullFit ? {
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                     } : {
                        position: 'absolute',
                        left: c.x,
                        top: c.y,
                        width: c.width,
                        pointerEvents: 'none'
                     }}
                     className="drop-shadow-md"
                   />
                 );
              })}
            </div>
        </div>
      </div>
    </div>
  );
}

function DecorationsMenu({ onAdd }: any) {
  const { assets: globalDecals } = useGlobalAssets('decal');
  const [selectedCat, setSelectedCat] = useState('All');
  
  const categories = ['All', ...Array.from(new Set(globalDecals.map((d: any) => d.category || 'Uncategorized')))];
  
  const displayedDecals = selectedCat === 'All' 
    ? globalDecals 
    : globalDecals.filter((d: any) => (d.category || 'Uncategorized') === selectedCat);

  return (
    <div className="flex flex-col items-center min-h-[500px]">
      <DecorativeFlourish>Room Stickers</DecorativeFlourish>
      
      <p className="text-center italic mb-4 opacity-80 text-wood-dark">Click any sticker below to place it on your desk. You can then drag and arrange it!</p>
      
      {categories.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto max-w-full px-8 pb-2 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat as string}
              onClick={() => setSelectedCat(cat as string)}
              className={`px-4 py-1.5 rounded-full font-sans font-bold text-sm whitespace-nowrap transition-colors shadow-sm ${selectedCat === cat ? 'bg-[#8c5737] text-white' : 'bg-[#e8dcc4] text-[#61361c] hover:bg-[#d8b792]'}`}
            >
              {cat as string}
            </button>
          ))}
        </div>
      )}
      
      {globalDecals.length === 0 ? (
         <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 italic text-wood-dark p-8 border-2 border-dashed border-wood-dark/20 rounded-xl bg-wood-mid/10">
           <p className="mb-2">No stickers are available right now.</p>
           <p className="text-sm">Wait for an Admin to upload new stickers for you to use!</p>
         </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6 w-full px-8">
          {displayedDecals.map((decal: any, i: number) => (
            <div 
              key={i} 
              className="relative group aspect-square bg-paper border-2 border-dashed border-wood-dark/20 rounded-xl flex items-center justify-center hover:scale-105 hover:bg-white transition-all shadow-md transform"
            >
              <button 
                onClick={() => onAdd(decal.url)}
                className="w-full h-full p-2 overflow-hidden flex justify-center items-center rounded-xl focus:outline-none"
              >
                 <img src={decal.url} alt={`Sticker ${i}`} className="w-full h-full object-contain drop-shadow-sm pointer-events-none" />
              </button>
            </div>
          ))}
          {displayedDecals.length === 0 && (
             <div className="col-span-full py-10 text-center opacity-60 italic font-sans text-wood-dark w-full">No stickers in this category.</div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const [selectedType, setSelectedType] = useState<'character' | 'clothing' | 'decal'>('character');
  const { assets: characters, addGlobalAsset: addCharacter, removeGlobalAsset: removeCharacter } = useGlobalAssets('character');
  const { assets: clothings, addGlobalAsset: addClothing, removeGlobalAsset: removeClothing } = useGlobalAssets('clothing');
  const { assets: decals, addGlobalAsset: addDecal, removeGlobalAsset: removeDecal } = useGlobalAssets('decal');

  const assets = selectedType === 'character' ? characters : selectedType === 'clothing' ? clothings : decals;
  const removeAsset = selectedType === 'character' ? removeCharacter : selectedType === 'clothing' ? removeClothing : removeDecal;

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const [fittingImage, setFittingImage] = useState<string | null>(null);
  const [fittingConfig, setFittingConfig] = useState({ x: 0, y: 0, width: 300 });
  const [useFullCanvasFit, setUseFullCanvasFit] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('Plants');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const b64 = await fileToBase64(e.target.files[0]);
      if (selectedType === 'clothing') {
        if (!selectedCharacterId) {
           alert("Please select a character base below first to fit the clothing onto!");
           return;
        }
        setFittingImage(b64);
        setFittingConfig({ x: 0, y: 0, width: 300 });
        setUseFullCanvasFit(true);
      } else if (selectedType === 'character') {
        await addCharacter(b64);
      } else {
        await addDecal(b64, { category: newCategoryName }); // Sticker
      }
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const handleSaveFitting = async () => {
    if (fittingImage && selectedCharacterId) {
      await addClothing(fittingImage, {
        characterId: selectedCharacterId,
        x: fittingConfig.x,
        y: fittingConfig.y,
        width: fittingConfig.width,
        useFullCanvasFit
      });
      setFittingImage(null);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-paper stitch-border rounded-xl max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="font-script text-3xl text-wood-dark">Admin Dashboard</h2>
      </div>
      
      <p className="text-sm font-sans mb-4 text-[#61361c] shrink-0">
        Welcome Admin! You can upload global characters, tailored clothing, and stickers. Users won't need to upload anything themselves. ("Decals" means stickers).
      </p>

      <div className="flex gap-4 mb-6 shrink-0">
        {(['character', 'clothing', 'decal'] as const).map(type => (
          <button
            key={type}
            onClick={() => {
              setSelectedType(type);
              setFittingImage(null);
            }}
            className={`px-4 py-2 rounded-lg font-sans font-bold capitalize transition-colors ${selectedType === type ? 'bg-[#8c5737] text-white' : 'bg-[#e8dcc4] text-[#61361c] hover:bg-[#d8b792]'}`}
          >
            {type === 'decal' ? 'Stickers' : type + 's'}
          </button>
        ))}
      </div>

      {selectedType === 'clothing' && !fittingImage && (
        <div className="mb-6 shrink-0">
          <h3 className="font-bold text-wood-dark mb-2 font-sans">1. Select a Character Base to fit clothing onto:</h3>
          <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
            {characters.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCharacterId(c.id)}
                className={`flex-shrink-0 w-24 h-24 border-4 rounded-xl overflow-hidden p-1 transition-all ${selectedCharacterId === c.id ? 'border-green-500 bg-green-50 shadow-md scale-105' : 'border-[#d8b792] bg-white hover:scale-105'}`}
              >
                <img src={c.url} alt="" className="w-full h-full object-contain pointer-events-none" />
              </button>
            ))}
            {characters.length === 0 && <span className="text-sm text-gray-500 italic mt-2">Upload a character first!</span>}
          </div>
        </div>
      )}

      {fittingImage && selectedCharacter ? (
        <div className="mb-6 flex flex-col items-center bg-wood-mid/10 p-6 rounded-xl border-2 border-dashed border-wood-dark/20 shrink-0">
          <h3 className="font-bold font-sans text-wood-dark mb-2">2. Adjust Clothing Fit</h3>
          <p className="text-xs text-wood-dark/70 mb-4 text-center max-w-sm">If your clothing image is the same size as your character base (e.g., drawn on the same canvas), simply click "Save as Full Canvas Fit".</p>
          
          <label className="flex items-center gap-2 mb-4 bg-white px-3 py-1.5 rounded shadow-sm border border-wood-dark/20 cursor-pointer">
            <input type="checkbox" checked={useFullCanvasFit} onChange={e => {
               setUseFullCanvasFit(e.target.checked);
               if (e.target.checked) setFittingConfig({ x: 0, y: 0, width: 300 });
            }} className="text-[#8c5737] focus:ring-[#8c5737]" />
            <span className="font-sans text-sm font-bold text-wood-dark">Auto-Fit (Matches Character Size)</span>
          </label>

          <div 
            ref={containerRef}
            className={`relative w-[300px] h-[400px] bg-white rounded-xl shadow-inner overflow-hidden border-2 mb-4 select-none ${useFullCanvasFit ? 'border-[#8c5737]' : 'border-wood-dark/20'}`}
          >
            <img src={selectedCharacter.url} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            
            {useFullCanvasFit ? (
               <img src={fittingImage} className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md" />
            ) : (
               <div
                 className="absolute cursor-move touch-none"
                 style={{ left: fittingConfig.x, top: fittingConfig.y }}
                 onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const target = e.currentTarget as HTMLElement;
                    target.setPointerCapture(e.pointerId);
                    
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startLeft = fittingConfig.x;
                    const startTop = fittingConfig.y;
                    
                    const handleMove = (moveEvent: PointerEvent) => {
                      setFittingConfig(prev => ({ 
                        ...prev, 
                        x: startLeft + (moveEvent.clientX - startX),
                        y: startTop + (moveEvent.clientY - startY)
                      }));
                    };
                    const handleUp = (upEvent: PointerEvent) => {
                      target.releasePointerCapture(upEvent.pointerId);
                      target.removeEventListener('pointermove', handleMove);
                      target.removeEventListener('pointerup', handleUp);
                      target.removeEventListener('pointercancel', handleUp);
                    };
                    target.addEventListener('pointermove', handleMove);
                    target.addEventListener('pointerup', handleUp);
                    target.addEventListener('pointercancel', handleUp);
                 }}
               >
                 <div className="relative group">
                   <img src={fittingImage} style={{ width: fittingConfig.width }} draggable={false} className="drop-shadow-md pointer-events-none" />
                   
                   {/* Resizer Handle */}
                   <div 
                     className="absolute bottom-0 right-0 w-8 h-8 bg-[#8c5737] border-[3px] border-white rounded-full translate-x-1/2 translate-y-1/2 cursor-nwse-resize opacity-80 hover:opacity-100 transition-opacity shadow-lg touch-none"
                     onPointerDown={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       const target = e.currentTarget as HTMLElement;
                       target.setPointerCapture(e.pointerId);

                       const startX = e.clientX;
                       const startWidth = fittingConfig.width;
                       
                       const handleMove = (moveEvent: PointerEvent) => {
                         const deltaX = moveEvent.clientX - startX;
                         setFittingConfig(prev => ({ ...prev, width: Math.max(20, startWidth + deltaX) }));
                       };
                       const handleUp = (upEvent: PointerEvent) => {
                         target.releasePointerCapture(upEvent.pointerId);
                         target.removeEventListener('pointermove', handleMove);
                         target.removeEventListener('pointerup', handleUp);
                         target.removeEventListener('pointercancel', handleUp);
                       };
                       target.addEventListener('pointermove', handleMove);
                       target.addEventListener('pointerup', handleUp);
                       target.addEventListener('pointercancel', handleUp);
                     }}
                   />
                 </div>
               </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={() => setFittingImage(null)} className="px-6 py-2 rounded-full font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Cancel</button>
            <button onClick={handleSaveFitting} className="px-6 py-2 rounded-full font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-md">Save Clothing Config</button>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex justify-center shrink-0">
          <label className={`cursor-pointer border-dashed border-2 border-[#d8b792] rounded-xl p-8 flex flex-col items-center justify-center text-[#8c5737] hover:bg-[#fcf8f2] transition-colors w-full max-w-sm ${selectedType === 'clothing' && !selectedCharacterId ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-8 h-8 mb-2" />
            <span className="font-sans font-bold">1. Upload new {selectedType === 'decal' ? 'sticker' : selectedType}</span>
            {selectedType === 'clothing' && <span className="text-xs mt-1 text-center font-sans opacity-80">(Requires Character selected)</span>}
            {selectedType === 'decal' && (
               <div className="mt-4 flex flex-col items-center" onClick={(e) => e.preventDefault()}>
                 <span className="text-xs font-bold text-wood-dark mb-1">Sticker Category:</span>
                 <input 
                   type="text" 
                   value={newCategoryName} 
                   onChange={(e) => setNewCategoryName(e.target.value)} 
                   placeholder="e.g. Plants" 
                   className="px-3 py-1 rounded text-sm text-wood-dark border border-wood-dark/20 text-center bg-white shadow-sm w-3/4"
                 />
                 <span className="text-[10px] opacity-70 mt-1">Set this BEFORE selecting file!</span>
               </div>
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-[300px] border-2 border-wood-dark/10 p-4 rounded-xl bg-white shadow-inner">
        <h3 className="font-bold text-wood-dark mb-4 font-sans border-b border-wood-dark/10 pb-2">Uploaded {selectedType === 'decal' ? 'Stickers' : selectedType + 's'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence>
            {assets.map(asset => (
              <motion.div key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative aspect-square border-2 border-[#d8b792] rounded-xl overflow-hidden bg-[#faf7f2] group flex items-center justify-center">
                <img src={asset.url} alt="" className="object-contain w-4/5 h-4/5 pointer-events-none" />
                <button
                  onClick={() => removeAsset(asset.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {assets.length === 0 && (
            <div className="col-span-full h-full flex items-center justify-center text-gray-400 font-sans italic py-10">
              No global {selectedType === 'decal' ? 'stickers' : selectedType + 's'} uploaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ onClose, customBgUrl, setCustomBgUrl, signBgUrl, setSignBgUrl, boardBgUrl, setBoardBgUrl, fontMode, setFontMode, avatarUrl, setAvatarUrl }: any) {
  const isAdmin = useIsAdmin();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="relative bg-paper stitch-border p-8 rounded-2xl w-[550px] max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border-4 border-wood-dark"
      >
        <div className="flex justify-between items-center mb-6 border-b-2 border-wood-dark/10 pb-4">
           <h2 className="font-script text-3xl text-wood-dark">App Settings & Setup</h2>
           <button onClick={onClose} className="p-2 hover:bg-wood-dark/10 rounded-full text-wood-dark transition-colors">
             <span className="font-sans font-bold text-xl leading-none">✕</span>
           </button>
        </div>

        <div className="space-y-6">
          {/* Account Section */}
          <div>
            <h3 className="font-serif text-lg font-semibold text-text-brown mb-2">Account Actions</h3>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => auth.signOut()}
                className="w-full bg-red-50 text-red-600 font-bold font-sans py-3 rounded-lg border-2 border-red-200 hover:bg-red-100 transition-colors shadow-sm"
              >
                Log Out
              </button>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
               <h4 className="font-bold text-blue-900 text-sm mb-1">Admin Configuration</h4>
               <p className="text-blue-800 text-xs mb-2">
                 {isAdmin ? "You are an admin! You should now see the Admin tab at the top." : "You do not have admin permissions. To become an admin, copy your User ID below and create a document with that ID inside the `admins` collection in your Firebase Console."}
               </p>
               <div className="bg-white border border-blue-100 p-2 rounded flex items-center justify-between shadow-sm">
                 <code className="text-[10px] text-gray-500 truncate mr-2">{auth.currentUser?.uid || "Not logged in"}</code>
                 <button onClick={() => {
                   if (auth.currentUser?.uid) {
                     navigator.clipboard.writeText(auth.currentUser.uid);
                     alert("User ID copied!");
                   }
                 }} className="text-xs text-blue-600 hover:underline shrink-0">Copy ID</button>
               </div>
            </div>
          </div>

          {/* Font Mode Toggle */}
          <div>
            <h3 className="font-serif text-lg font-semibold text-text-brown mb-2">Text Color Mode</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setFontMode('Dark')}
                className={`flex-1 py-2 rounded-xl font-sans font-bold border-2 transition-all ${
                  fontMode === 'Dark' 
                    ? 'bg-wood-dark text-white border-wood-dark shadow-md' 
                    : 'bg-white text-wood-dark border-wood-dark/20 hover:border-wood-dark/50'
                }`}
              >
                Dark Text
              </button>
              <button 
                onClick={() => setFontMode('Light')}
                className={`flex-1 py-2 rounded-xl font-sans font-bold border-2 transition-all ${
                  fontMode === 'Light' 
                    ? 'bg-wood-dark text-white border-wood-dark shadow-md' 
                    : 'bg-white text-wood-dark border-wood-dark/20 hover:border-wood-dark/50'
                }`}
              >
                Light Text
              </button>
            </div>
            <p className="font-sans text-xs text-text-brown/60 mt-2">
              Switch to Light Text if your custom background is dark and hard to read.
            </p>
          </div>

          {/* Background Upload */}
          <div>
            <h3 className="font-serif text-lg font-semibold text-text-brown mb-2">Change Page Background</h3>
            <label className="flex items-center gap-3 p-3 bg-[#e8d0b3]/30 border-2 border-dashed border-wood-dark/30 rounded-lg cursor-pointer hover:bg-[#e8d0b3]/50 transition-colors">
               <div className="p-2 bg-white rounded-md shadow-sm border border-wood-dark/10">
                 <Upload className="w-5 h-5 text-wood-dark" />
               </div>
               <div className="flex-1 font-sans text-sm text-text-brown">
                 Upload a background for the entire page. 
               </div>
               <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                 if (e.target.files?.[0]) {
                   const b64 = await fileToBase64(e.target.files[0]);
                   setCustomBgUrl(b64);
                 }
               }} />
            </label>
            {customBgUrl && (
               <div className="mt-2 flex items-center justify-between bg-white p-2 text-text-brown rounded-md border border-wood-dark/10 font-sans text-xs shadow-sm">
                 <span className="text-green-700 truncate max-w-[200px] font-semibold">Background active ✓</span>
                 <button onClick={() => setCustomBgUrl('')} className="text-red-500 hover:underline px-2 py-1 rounded bg-red-50">Remove</button>
               </div>
            )}
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold text-text-brown mb-2">Change Sign Banner Background</h3>
            <label className="flex items-center gap-3 p-3 bg-[#e8d0b3]/30 border-2 border-dashed border-wood-dark/30 rounded-lg cursor-pointer hover:bg-[#e8d0b3]/50 transition-colors">
               <div className="p-2 bg-white rounded-md shadow-sm border border-wood-dark/10">
                 <Upload className="w-5 h-5 text-wood-dark" />
               </div>
               <div className="flex-1 font-sans text-sm text-text-brown">
                 Upload a background image for "Little Corner" sign. 
               </div>
               <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                 if (e.target.files?.[0]) {
                   const b64 = await fileToBase64(e.target.files[0]);
                   setSignBgUrl(b64);
                 }
               }} />
            </label>
            {signBgUrl && (
               <div className="mt-2 flex items-center justify-between bg-white p-2 text-text-brown rounded-md border border-wood-dark/10 font-sans text-xs shadow-sm">
                 <span className="text-green-700 truncate max-w-[200px] font-semibold">Sign background active ✓</span>
                 <button onClick={() => setSignBgUrl('')} className="text-red-500 hover:underline px-2 py-1 rounded bg-red-50">Remove</button>
               </div>
            )}
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold text-text-brown mb-2">Change Main Board Background</h3>
            <label className="flex items-center gap-3 p-3 bg-[#e8d0b3]/30 border-2 border-dashed border-wood-dark/30 rounded-lg cursor-pointer hover:bg-[#e8d0b3]/50 transition-colors">
               <div className="p-2 bg-white rounded-md shadow-sm border border-wood-dark/10">
                 <Upload className="w-5 h-5 text-wood-dark" />
               </div>
               <div className="flex-1 font-sans text-sm text-text-brown">
                 Upload a background image for the main app area. 
               </div>
               <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                 if (e.target.files?.[0]) {
                   const b64 = await fileToBase64(e.target.files[0]);
                   setBoardBgUrl(b64);
                 }
               }} />
            </label>
            {boardBgUrl && (
               <div className="mt-2 flex items-center justify-between bg-white p-2 text-text-brown rounded-md border border-wood-dark/10 font-sans text-xs shadow-sm">
                 <span className="text-green-700 truncate max-w-[200px] font-semibold">Board background active ✓</span>
                 <button onClick={() => setBoardBgUrl('')} className="text-red-500 hover:underline px-2 py-1 rounded bg-red-50">Remove</button>
               </div>
            )}
          </div>

          {/* Avatar Upload */}
          <div>
            <h3 className="font-serif text-lg font-semibold text-text-brown mb-2">Change Avatar</h3>
            <label className="flex items-center gap-3 p-3 bg-[#e8d0b3]/30 border-2 border-dashed border-wood-dark/30 rounded-lg cursor-pointer hover:bg-[#e8d0b3]/50 transition-colors">
               <div className="p-2 bg-white rounded-md shadow-sm border border-wood-dark/10">
                 <Upload className="w-5 h-5 text-wood-dark" />
               </div>
               <div className="flex-1 font-sans text-sm text-text-brown">
                 Click to upload a new profile picture.
               </div>
               <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                 if (e.target.files?.[0]) {
                   const b64 = await fileToBase64(e.target.files[0]);
                   setAvatarUrl(b64);
                 }
               }} />
            </label>
            {avatarUrl && (
               <div className="mt-2 flex items-center justify-between bg-white p-2 text-text-brown rounded-md border border-wood-dark/10 font-sans text-xs shadow-sm">
                 <span className="text-green-700 truncate max-w-[200px] font-semibold">Avatar active ✓</span>
                 <button onClick={() => setAvatarUrl('')} className="text-red-500 hover:underline px-2 py-1 rounded bg-red-50">Remove</button>
               </div>
            )}
          </div>

          {/* Information Section */}
          <div className="mt-8 bg-[#e1f0e5] border border-[#7ba988] p-5 rounded-xl shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
            <h4 className="font-bold font-sans text-sm text-green-900 mb-2 flex flex-col gap-1">
              <span className="uppercase text-[10px] tracking-widest text-green-700">Instructions</span>
              How to complete your site:
            </h4>
            <p className="font-sans text-[13px] text-green-900 leading-relaxed drop-shadow-sm">
              I have provided you with placeholder tools. To fully set up this system:
              <br/><br/>
              1. <strong>Settings (Here):</strong> Upload your Background image and Profile Avatar.<br/>
              2. <strong>Admin Setup:</strong> Copy your User ID above and add it to the `admins` collection in Firebase.<br/>
              3. <strong>Admin Tab:</strong> Once you are an admin, open the Admin Tab to upload and configure global Characters, Clothing, and Stickers for all users!<br/>
              <br/>
              <span className="font-semibold text-green-950">Once uploaded, they will appear dynamically in the UI so your users can drag, drop, and play!</span>
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

function GoalsTrackerView() {
  const [goals, setGoals] = useLocalForage('corner_goals', [
    { id: 1, title: "Create my ultimate little corner", details: "Decorate my personal page and add my daily habits", completed: false, stickerUrl: "" }
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const [showGoalForm, setShowGoalForm] = useState(false);
  
  const { assets: globalDecals } = useGlobalAssets('decal');
  const [selectedSticker, setSelectedSticker] = useState("");

  const addGoal = () => {
    if (newTitle.trim()) {
      setGoals([{ id: Date.now(), title: newTitle, details: newDetails, completed: false, stickerUrl: selectedSticker }, ...goals]);
      setNewTitle("");
      setNewDetails("");
      setSelectedSticker("");
      setShowGoalForm(false);
    }
  };

  const toggleGoal = (id: number) => {
    const goal = goals.find(g => g.id === id);
    if (goal && !goal.completed) {
       setShowConfetti(true);
       setTimeout(() => setShowConfetti(false), 5000); // 5 seconds of celebration
    }
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const removeGoal = (id: number) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="flex flex-col min-h-[500px]">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.2} style={{ position: 'fixed', top: 0, left: 0, zIndex: 10000 }} />}
      
      <div className="flex justify-between items-end mb-6 border-b-2 border-wood-dark/20 pb-4 dynamic-border">
         <div>
           <h3 className="font-script text-4xl text-wood-dark dynamic-text">My Goals</h3>
           <p className="font-sans text-sm text-text-brown/70 dynamic-text-muted">Achievements and big dreams</p>
         </div>
         <button 
           onClick={() => setShowGoalForm(!showGoalForm)}
           className="bg-[#8c5737] text-white px-4 py-2 rounded-full font-sans font-bold shadow-sm hover:bg-[#61361c] hover:-translate-y-0.5 transition-all text-sm flex gap-2 items-center"
         >
           {showGoalForm ? 'Cancel' : <><Plus className="w-4 h-4"/> New Goal</>}
         </button>
      </div>
      
      {/* Add New Goal */}
      <AnimatePresence>
        {showGoalForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-[#fdfaf3] border-2 border-[#d8b792] shadow-sm rounded-xl p-4 flex flex-col gap-3">
              <input 
                type="text" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Goal Title (e.g. Write a Novel)"
                className="w-full px-4 py-2 bg-white border border-wood-dark/20 rounded-xl font-sans text-wood-dark placeholder-wood-dark/40 focus:outline-none focus:border-wood-dark"
                onKeyDown={e => e.key === 'Enter' && addGoal()}
              />
              <div className="flex gap-4">
                 <textarea 
                   value={newDetails}
                   onChange={e => setNewDetails(e.target.value)}
                   placeholder="Details or steps..."
                   className="flex-1 px-4 py-2 bg-white border border-wood-dark/20 rounded-xl font-sans text-wood-dark placeholder-wood-dark/40 focus:outline-none focus:border-wood-dark resize-none h-16 text-sm"
                 />
                 
                 {/* Sticker selection box */}
                 <div className="w-48 bg-white border border-wood-dark/20 rounded-xl p-2 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-wood-dark/60 uppercase mb-1">Badge Sticker</span>
                    {globalDecals.length > 0 ? (
                       <select value={selectedSticker} onChange={(e) => setSelectedSticker(e.target.value)} className="w-full text-xs font-sans p-1 border rounded border-wood-dark/10 mb-1">
                          <option value="">None</option>
                          {globalDecals.map((d: any, idx: number) => (
                             <option key={idx} value={d.url}>Sticker {idx + 1}</option>
                          ))}
                       </select>
                    ) : (
                       <div className="text-[10px] opacity-50 italic text-center">No stickers uploaded yet.</div>
                    )}
                    {selectedSticker && <img src={selectedSticker} alt="preview" className="h-6 object-contain" />}
                 </div>
              </div>
              <div className="flex justify-end mt-1">
                <button 
                  onClick={addGoal}
                  className="bg-[#5c8b51] text-white px-6 py-2 rounded-xl font-sans font-bold shadow-md hover:bg-[#4d7543] hover:scale-105 transition-all text-sm"
                >
                  Save Goal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {goals.map((goal: any) => (
            <motion.div 
              key={goal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-5 rounded-xl border-2 transition-colors flex flex-col relative group overflow-hidden shadow-sm min-h-[140px] justify-between ${
                goal.completed 
                  ? 'bg-amber-100/40 border-amber-500/30' 
                  : 'bg-paper border-wood-dark/20 hover:border-[#8c5737] dynamic-border'
              }`}
            >
              {/* Sticker Decor */}
              {goal.stickerUrl && (
                 <div className="absolute top-2 right-2 w-12 h-12 opacity-80 group-hover:scale-110 transition-transform -rotate-12 drop-shadow-sm pointer-events-none z-10">
                    <img src={goal.stickerUrl} alt="badge" className="w-full h-full object-contain" />
                 </div>
              )}
            
              {/* Top Row: Title & Actions */}
              <div className="flex justify-between items-start mb-2 gap-2 relative z-10">
                <h4 className={`font-serif text-lg font-bold flex-1 pr-10 ${goal.completed ? 'text-amber-800' : 'text-[#61361c] dynamic-text'}`}>
                  {goal.title}
                </h4>
              </div>

              {/* Details */}
              <p className={`font-sans text-sm relative z-10 whitespace-pre-wrap flex-1 mb-4 ${goal.completed ? 'text-amber-800/80' : 'text-text-brown/90 dynamic-text-muted mt-1'}`}>
                {goal.details || <span className="italic opacity-50">No details...</span>}
              </p>
              
              <div className="flex justify-between items-end border-t border-wood-dark/10 pt-2 z-10">
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeGoal(goal.id)}
                    className="p-1.5 bg-white/50 border border-wood-dark/10 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <button 
                  onClick={() => toggleGoal(goal.id)}
                  className={`py-1.5 px-3 border rounded-lg font-sans text-xs font-bold transition-all flex items-center gap-1 ${goal.completed ? 'bg-amber-500 border-amber-600 text-white shadow-inner' : 'bg-white border-wood-dark/20 text-[#8c5737] hover:bg-[#8c5737] hover:text-white hover:border-[#8c5737]'}`}
                >
                  <Check className={`w-3.5 h-3.5 ${goal.completed ? 'text-white' : ''}`} />
                  {goal.completed ? 'Achieved!' : 'Mark Complete'}
                </button>
              </div>

              {/* Achieved Background Filter */}
              {goal.completed && (
                <div className="absolute inset-0 bg-white/40 z-0 pointer-events-none" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {goals.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-16 px-4 bg-wood-light/10 rounded-2xl border-2 border-dashed border-wood-dark/20 dynamic-border">
            <h4 className="text-xl font-serif text-wood-dark mb-2 dynamic-text">No big goals yet!</h4>
            <p className="text-sm font-sans text-wood-dark/60 dynamic-text-muted">What's something amazing you want to do in your lifetime?</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoriesDiaryView({ memories, setMemories }: { memories: Memory[], setMemories: React.Dispatch<React.SetStateAction<Memory[]>> }) {
  const deleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const updateNote = (id: string, newNote: string) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, note: newNote } : m));
  };

  return (
    <div className="flex flex-col min-h-[500px]">
      <div className="flex justify-between items-end mb-6 border-b-2 border-wood-dark/20 pb-4 dynamic-border">
         <div>
           <h3 className="font-script text-4xl text-wood-dark dynamic-text">My Scrapbook</h3>
           <p className="font-sans text-sm text-text-brown/70 dynamic-text-muted">Snapshots of your cozy space. Write down how you felt today!</p>
         </div>
      </div>

      {memories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 bg-wood-light/10 rounded-2xl border-2 border-dashed border-wood-dark/20 dynamic-border">
          <Camera className="w-12 h-12 text-wood-dark/40 mb-4" />
          <h4 className="text-xl font-serif text-wood-dark mb-2 dynamic-text">No memories yet!</h4>
          <p className="text-sm font-sans text-wood-dark/60 dynamic-text-muted">Click the pink camera button in the bottom right<br/>to take a snapshot of your desk.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pr-2 custom-scrollbar pb-8">
          <AnimatePresence>
            {memories.map((m) => (
              <motion.div 
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-[#fcf8f2] p-4 rounded-sm shadow-md border border-[#e6dac7] relative group flex flex-col"
                style={{ 
                  transform: `rotate(${Math.sin(parseInt(m.id)) * 2}deg)`,
                  boxShadow: '2px 4px 10px rgba(0,0,0,0.1), inset 0 0 20px rgba(230,218,199,0.3)'
                }}
              >
                {/* Tape pieces */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-[#f4ebd0]/80 backdrop-blur-sm -rotate-2 z-10 border border-[#e6dac7]/50 shadow-sm" />
                
                {/* Photo snapshot */}
                <div className="aspect-[4/3] w-full bg-white border border-gray-200 p-2 shadow-inner mb-4 overflow-hidden relative">
                  <img src={m.url} alt="Desk Snapshot" className="w-full h-full object-cover object-top" />
                </div>

                {/* Date & Note section */}
                <div className="flex-1 flex flex-col relative z-0 min-h-[100px]">
                  <div className="font-serif text-xs font-bold text-gray-400 mb-1">{m.date}</div>
                  <textarea 
                    value={m.note}
                    onChange={(e) => updateNote(m.id, e.target.value)}
                    className="w-full flex-1 bg-transparent border-none resize-none font-script text-3xl text-[#593922] focus:outline-none focus:ring-0 leading-[32px] placeholder-gray-300"
                    placeholder="Write a note about today..."
                    style={{
                      backgroundImage: 'linear-gradient(transparent, transparent 31px, #e6dac7 32px)',
                      backgroundSize: '100% 32px',
                    }}
                  />
                </div>

                {/* Delete button (hover) */}
                <button 
                  onClick={() => deleteMemory(m.id)}
                  className="absolute -top-3 -right-3 p-1.5 bg-red-400 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 transition-all shadow-sm z-20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

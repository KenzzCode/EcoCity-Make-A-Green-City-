import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Leaf, 
  Wind, 
  DollarSign, 
  Users, 
  Zap, 
  Building2, 
  Plus, 
  Minus,
  Info,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Award,
  Move,
  Trash2,
  Maximize2,
  Moon,
  Sun,
  Save,
  LogOut,
  Settings,
  Check
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { BUILDINGS, BuildingType, GameState, PlacedBuilding, BUILDINGS as BuildingDataMap, BuildingData, INITIAL_ACHIEVEMENTS, Achievement } from './types';
import { getCombinedAIContent } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const StatCard = ({ label, value, icon: Icon, color, suffix = "" }: { label: string, value: number | string, icon: any, color: string, suffix?: string }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl flex items-center gap-3 backdrop-blur-md">
    <div className={cn("p-2 rounded-lg", color)}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</p>
      <p className="text-lg font-mono font-bold text-white">{value}{suffix}</p>
    </div>
  </div>
);

const BuildingItem = ({ type, data, onSelect, disabled, isSelected }: any) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(type as BuildingType)}
      disabled={disabled}
      className={cn(
        "w-full p-3 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden group",
        isSelected ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600",
        disabled && "opacity-50 grayscale cursor-not-allowed"
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-2xl">{data.emoji}</span>
        <span className="font-mono text-xs font-bold text-emerald-400">${data.cost}</span>
      </div>
      <div className="text-left">
        <p className="font-bold text-sm text-zinc-200">{data.name}</p>
        <p className="text-[10px] text-zinc-500 line-clamp-1">{data.description}</p>
      </div>
      <div className="flex gap-2 mt-1">
        <span className={cn("text-[9px] px-1.5 rounded bg-zinc-800", data.ecoImpact > 0 ? "text-emerald-400" : "text-rose-400")}>
          Eco: {data.ecoImpact > 0 ? "+" : ""}{data.ecoImpact}
        </span>
        <span className="text-[9px] px-1.5 rounded bg-zinc-800 text-amber-400">
          In: +${data.income}
        </span>
      </div>
    </motion.button>
  );
};

// --- Main App ---

const INITIAL_STATE: GameState = {
  money: 1000,
  ecoHealth: 80,
  pollution: 20,
  population: 50,
  buildings: [],
  gridSize: 6,
  achievements: INITIAL_ACHIEVEMENTS,
  theme: 'dark',
  history: []
};

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('ecocity_save');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse save", e);
      }
    }
    return INITIAL_STATE;
  });

  const [news, setNews] = useState<string[]>(["Welcome to your EcoCity!", "Mulai membangun untuk masa depan hijau."]);
  const [advisorMsg, setAdvisorMsg] = useState<string>("Ready to build, Boss?");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [movingBuilding, setMovingBuilding] = useState<PlacedBuilding | null>(null);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(Date.now());

  // Autosave
  useEffect(() => {
    if (!isGameStarted) return;
    const interval = setInterval(() => {
      localStorage.setItem('ecocity_save', JSON.stringify(state));
      setLastSaveTime(Date.now());
    }, 10000); // Every 10s
    return () => clearInterval(interval);
  }, [state, isGameStarted]);

  // Derived Grid
  const grid = Array(state.gridSize).fill(null).map(() => Array(state.gridSize).fill(null));
  state.buildings.forEach(b => {
    if (b.y < state.gridSize && b.x < state.gridSize) {
      grid[b.y][b.x] = b.type;
    }
  });

  // Game Loop
  useEffect(() => {
    if (isGamePaused) return;

    const interval = setInterval(() => {
      setState(prev => {
        let income = 0;
        let ecoDelta = 0;
        let polDelta = 0;
        let popDelta = 0;

        prev.buildings.forEach(b => {
          const data = BuildingDataMap[b.type];
          if (!data) return; // Skip buildings that no longer exist in definitions (like ROAD)
          income += data.income;
          ecoDelta += data.ecoImpact / 10; // Slow change
          polDelta -= data.ecoImpact / 10;
          popDelta += (data.type === 'APARTMENT' ? 10 : 2);
        });

        // Natural decay/regrowth
        ecoDelta += prev.ecoHealth < 50 ? -0.1 : 0.05;
        
        const newMoney = prev.money + income;
        const newEco = Math.max(0, Math.min(100, prev.ecoHealth + ecoDelta));
        const newPol = Math.max(0, Math.min(100, prev.pollution + polDelta));
        const newPop = Math.max(0, prev.population + popDelta);

        const newHistory = [...prev.history, { 
          time: prev.history.length, 
          money: newMoney, 
          pollution: newPol, 
          ecoHealth: newEco 
        }].slice(-20);

        // Achievement Checks
        const updatedAchievements = prev.achievements.map(ach => {
          if (ach.completed) return ach;
          
          let currentValue = 0;
          switch (ach.type) {
            case 'POPULATION': currentValue = newPop; break;
            case 'MONEY': currentValue = newMoney; break;
            case 'ECO': currentValue = newEco; break;
            case 'BUILDINGS': currentValue = prev.buildings.length; break;
          }

          if (currentValue >= ach.target) {
            return { ...ach, current: currentValue, completed: true };
          }
          return { ...ach, current: currentValue };
        });

        return {
          ...prev,
          money: newMoney,
          ecoHealth: newEco,
          pollution: newPol,
          population: newPop,
          achievements: updatedAchievements,
          history: newHistory
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isGamePaused, state.buildings.length]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiFetch, setLastAiFetch] = useState(0);

  // AI Ticker Sync
  const fetchAIContent = useCallback(async (force = false) => {
    const now = Date.now();
    // Allow manual refresh but throttle automatic ones
    if (!force && (isAiLoading || now - lastAiFetch < 40000)) return;

    setIsAiLoading(true);
    try {
      const data = await getCombinedAIContent(stateRef.current);
      if (data) {
        if (data.headlines && data.headlines.length > 0) setNews(data.headlines);
        if (data.advice) setAdvisorMsg(data.advice);
        setLastAiFetch(Date.now());
      }
    } finally {
      setIsAiLoading(false);
    }
  }, [isAiLoading, lastAiFetch]);

  useEffect(() => {
    if (!isGameStarted || isGamePaused) return;
    
    // Initial fetch
    fetchAIContent(true);

    const tickerInterval = setInterval(() => {
      fetchAIContent();
    }, 45000); // 45s interval

    return () => clearInterval(tickerInterval);
  }, [isGameStarted, isGamePaused, fetchAIContent]);

  // Handle building placement or moving
  const handleCellClick = (x: number, y: number) => {
    if (isDeleteMode) {
      const existing = state.buildings.find(b => b.x === x && b.y === y);
      if (existing) {
        deleteBuilding(existing.id);
        setNews([`Bulldozed ${BuildingDataMap[existing.type]?.name || 'Building'}`, "Area cleared for new development."]);
      }
      return;
    }

    if (movingBuilding) {
      if (grid[y][x] !== null) return;
      
      setState(prev => ({
        ...prev,
        buildings: prev.buildings.map(b => 
          b.id === movingBuilding.id ? { ...b, x, y } : b
        )
      }));
      setMovingBuilding(null);
      return;
    }

    if (!selectedBuilding) {
      const existing = state.buildings.find(b => b.x === x && b.y === y);
      if (existing) {
        setMovingBuilding(existing);
      }
      return;
    }

    const data = BuildingDataMap[selectedBuilding];
    if (state.money < data.cost) return;

    if (grid[y][x] !== null) return;

    setState(prev => ({
      ...prev,
      money: prev.money - data.cost,
      buildings: [...prev.buildings, { id: Math.random().toString(36), type: selectedBuilding, x, y, createdAt: Date.now() }]
    }));

    setSelectedBuilding(null);
  };

  const claimAchievement = (id: string) => {
    setState(prev => {
      const ach = prev.achievements.find(a => a.id === id);
      if (!ach || !ach.completed || ach.claimed) return prev;

      const updatedAch = prev.achievements.map(a => 
        a.id === id ? { ...a, claimed: true } : a
      );

      return {
        ...prev,
        money: prev.money + ach.reward,
        achievements: updatedAch
      };
    });
  };

  const expandGrid = () => {
    const cost = state.gridSize * 1000;
    if (state.money < cost) {
      alert(`Butuh $${cost.toLocaleString()} untuk ekspansi!`);
      return;
    }

    setState(prev => ({
      ...prev,
      money: prev.money - cost,
      gridSize: prev.gridSize + 1
    }));
  };

  const minimizeGrid = () => {
    if (state.gridSize <= 4) {
      alert("Grid sudah ukuran minimum!");
      return;
    }
    
    // Check if any buildings are in the area being removed
    const hasBuildingsInEdge = state.buildings.some(b => b.x >= state.gridSize - 1 || b.y >= state.gridSize - 1);
    if (hasBuildingsInEdge) {
      if (!confirm("Beberapa gedung di pinggir area akan terhapus. Lanjutkan?")) return;
    }

    setState(prev => ({
      ...prev,
      gridSize: prev.gridSize - 1,
      buildings: prev.buildings.filter(b => b.x < prev.gridSize - 1 && b.y < prev.gridSize - 1)
    }));
  };

  const deleteBuilding = (id: string) => {
    setState(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== id)
    }));
    setMovingBuilding(null);
  };

  const toggleTheme = () => {
    setState(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  const resetGame = () => {
    if (confirm("Reset game? Semua progress akan hilang.")) {
      localStorage.removeItem('ecocity_save');
      setState(INITIAL_STATE);
      setIsGameStarted(true);
      setIsDeleteMode(false);
      setNews(["City has been reset.", "Mulai dari awal, buat lebih baik!"]);
      setAdvisorMsg("Lembaran baru, Manager. Ayo bangun!");
    }
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedBuilding(null);
    setMovingBuilding(null);
  };

  const manualSave = () => {
    localStorage.setItem('ecocity_save', JSON.stringify(state));
    setLastSaveTime(Date.now());
    // Visual feedback could be added here
  };

  return (
    <div className={cn(
      "h-screen flex flex-col font-sans selection:bg-emerald-500/30 overflow-hidden transition-colors duration-500",
      state.theme === 'dark' ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Top Header / Stats - Fixed Height */}
      <div className={cn(
        "h-20 border-b z-50 shrink-0 flex items-center",
        state.theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsGameStarted(false)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:shadow-emerald-500/50 transition-all">
              <Leaf size={24} className="text-black" />
            </div>
            <div className="hidden sm:block text-left">
              <h1 className="font-bold text-xl tracking-tight">EcoCity</h1>
              <p className="text-[10px] text-emerald-500 font-mono flex items-center gap-1 uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Balance
              </p>
            </div>
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mr-2">
              <StatCard label="Uang" value={state.money.toLocaleString()} color="bg-amber-500" icon={DollarSign} suffix="$" />
              <StatCard label="Eco" value={state.ecoHealth.toFixed(0)} color="bg-emerald-500" icon={TrendingUp} suffix="%" />
              <StatCard label="Polusi" value={state.pollution.toFixed(0)} color="bg-rose-500" icon={Wind} suffix="%" />
              <StatCard label="Warga" value={state.population.toLocaleString()} color="bg-indigo-500" icon={Users} />
            </div>

            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "p-3 rounded-xl border transition-all",
                state.theme === 'dark' ? "bg-zinc-900 border-zinc-800 hover:border-zinc-600" : "bg-white border-zinc-200 hover:border-zinc-300"
              )}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "absolute top-20 right-4 z-[60] w-64 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl space-y-4",
              state.theme === 'dark' ? "bg-zinc-900/90 border-zinc-800" : "bg-white/90 border-zinc-200"
            )}
          >
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/20">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Settings</span>
              <button onClick={() => setIsSettingsOpen(false)}><Plus size={16} className="rotate-45" /></button>
            </div>
            
            <div className="space-y-3">
              <button onClick={toggleTheme} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-500/10 transition-colors">
                <span className="text-sm">Theme Mode</span>
                {state.theme === 'dark' ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} className="text-amber-600" />}
              </button>

              <button onClick={manualSave} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-500/10 transition-colors text-emerald-500">
                <span className="text-sm font-bold">Manual Save</span>
                <Save size={18} />
              </button>
              
              <div className="pt-2 flex flex-col gap-2">
                <div className="text-[10px] text-zinc-500 flex justify-between uppercase">
                  <span>Last Autosave</span>
                  <span>{Math.floor((Date.now() - lastSaveTime)/1000)}s ago</span>
                </div>
                <button onClick={resetGame} className="flex items-center gap-2 p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors text-sm font-bold">
                  <LogOut size={18} /> Reset & Exit Game
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Sidebar: Buildings & Advisor - Independently Scrollable */}
        <div className={cn(
          "w-full lg:w-80 border-r flex flex-col shrink-0 z-40 transition-colors",
          state.theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          {/* Menu Header - Fixed */}
          <div className="p-4 border-b border-zinc-800/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Construction</h2>
              <button 
                onClick={toggleDeleteMode}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 border",
                  isDeleteMode 
                    ? "bg-rose-500 text-black border-rose-400 font-bold" 
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-rose-500/50"
                )}
              >
                <Trash2 size={14} />
                <span className="text-[10px] uppercase">Bulldoze</span>
              </button>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2">
                {(Object.keys(BUILDINGS) as BuildingType[]).map(type => {
                  const bData = BuildingDataMap[type];
                  return (
                    <BuildingItem 
                      key={type}
                      type={type} 
                      data={bData} 
                      onSelect={(t: BuildingType) => {
                        setSelectedBuilding(t);
                        setIsDeleteMode(false);
                        setMovingBuilding(null);
                      }}
                      disabled={state.money < bData.cost}
                      isSelected={selectedBuilding === type}
                    />
                  )
                })}
              </div>
            </div>

            <div className="pb-10">
               <div className={cn(
                 "p-4 rounded-2xl relative overflow-hidden group border",
                 state.theme === 'dark' ? "bg-emerald-950/20 border-emerald-900/50" : "bg-emerald-50 border-emerald-200"
               )}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold uppercase text-emerald-500">Eco-Advisor AI</span>
                    </div>
                    <button 
                      onClick={() => fetchAIContent(true)}
                      disabled={isAiLoading}
                      className={cn(
                        "p-1.5 rounded-lg transition-all flex items-center gap-1 border",
                        state.theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      )}
                    >
                      <TrendingUp size={12} className={cn(isAiLoading && "animate-spin")} />
                      <span className="text-[9px] font-bold">ANALYZE</span>
                    </button>
                  </div>
                  <p className={cn(
                    "text-sm italic font-medium leading-relaxed",
                    state.theme === 'dark' ? "text-emerald-100" : "text-emerald-900"
                  )}>
                    {isAiLoading ? "Sedang menganalisa kondisi kota..." : `"${advisorMsg}"`}
                  </p>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={80} className="text-emerald-400" />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Center Canvas Area: City Grid - Centered and Visible */}
        <div className={cn(
          "flex-1 relative overflow-auto flex items-center justify-center p-8 lg:p-20 transition-all duration-700",
          state.theme === 'dark' 
            ? "bg-[#09090b] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/10 via-zinc-950 to-black" 
            : "bg-zinc-100 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-50/30 via-zinc-100 to-zinc-200"
        )}>
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={cn(
              "absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20",
              state.theme === 'dark' ? "bg-emerald-500/20" : "bg-emerald-500/10"
            )} />
            <div className={cn(
              "absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20",
              state.theme === 'dark' ? "bg-blue-500/10" : "bg-blue-500/5"
            )} />
          </div>

          {/* Grid Blueprint Pattern */}
          <div className="absolute inset-0 opacity-[0.4] pointer-events-none" 
               style={{ 
                 backgroundImage: state.theme === 'dark' 
                  ? 'radial-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)' 
                  : 'radial-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px), linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)', 
                 backgroundSize: '40px 40px, 120px 120px, 120px 120px' 
               }} />
          
          <div className="relative transform scale-100 transition-all origin-center">
            <div 
              className={cn(
                "grid gap-2 p-6 rounded-[32px] backdrop-blur-xl border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10",
                state.theme === 'dark' ? "bg-zinc-900/40 border-white/5" : "bg-white/70 border-zinc-200"
              )}
              style={{ 
                gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((row, y) => row.map((cell, x) => (
                <motion.div
                  key={`${x}-${y}`}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleCellClick(x, y)}
                  className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group isolate",
                    cell === null 
                      ? (state.theme === 'dark' ? "bg-zinc-800/30 hover:bg-zinc-700/50" : "bg-zinc-200/50 hover:bg-zinc-300/50") 
                      : (state.theme === 'dark' ? "bg-zinc-700 shadow-lg" : "bg-white shadow-xl border border-zinc-100"),
                    (selectedBuilding || movingBuilding) && !cell && "ring-2 ring-emerald-500/50 ring-dashed",
                    movingBuilding?.x === x && movingBuilding?.y === y && "ring-2 ring-amber-500 ring-offset-4 ring-offset-black animate-pulse z-10"
                  )}
                >
                  {cell ? (
                    <motion.div 
                      layoutId={`building-${x}-${y}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl sm:text-3xl filter drop-shadow-md hover:scale-110 transition-transform"
                    >
                      {BuildingDataMap[cell]?.emoji || '❓'}
                    </motion.div>
                  ) : (
                    (selectedBuilding || movingBuilding) && (
                      <div className="text-xl opacity-20 group-hover:opacity-50">
                        {selectedBuilding ? BuildingDataMap[selectedBuilding]?.emoji : BuildingDataMap[movingBuilding!.type]?.emoji || '❓'}
                      </div>
                    )
                  )}
                  
                  {/* Building Info on Hover */}
                  {cell && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none scale-0 group-hover:scale-100 origin-bottom z-20 whitespace-nowrap shadow-2xl">
                      <p className="text-[10px] font-bold text-white uppercase tracking-tighter">{BuildingDataMap[cell]?.name || 'Unknown'}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] text-emerald-400 font-mono">+${BuildingDataMap[cell]?.income || 0}</span>
                        <span className="text-[8px] text-rose-400 font-mono">Pol: {BuildingDataMap[cell]?.ecoImpact || 0}</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-2 border border-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              )))}
            </div>

            {/* Grid Controls */}
            <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col gap-2 group">
              <button 
                onClick={expandGrid}
                className={cn(
                  "p-3 rounded-2xl border shadow-xl flex flex-col items-center gap-1 transition-all hover:scale-110",
                  state.theme === 'dark' ? "bg-emerald-500 text-black" : "bg-emerald-600 text-white"
                )}
              >
                <Maximize2 size={24} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Expand</span>
              </button>

              <button 
                onClick={minimizeGrid}
                className={cn(
                  "p-3 rounded-2xl border shadow-xl flex flex-col items-center gap-1 transition-all hover:scale-110",
                  state.theme === 'dark' ? "bg-zinc-800 text-white border-zinc-700" : "bg-white text-zinc-900 border-zinc-200"
                )}
              >
                <Minus size={24} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Small</span>
              </button>

              <div className="mt-2 px-2 py-1 bg-black text-emerald-400 text-[10px] rounded border border-emerald-500/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Next: ${(state.gridSize * 1000).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

          {/* Floating Action Tip */}
          <AnimatePresence>
            {(selectedBuilding || movingBuilding || isDeleteMode) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20"
              >
                <div className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-full text-xs shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  {selectedBuilding ? `Build ${BuildingDataMap[selectedBuilding]?.name || selectedBuilding}` : 
                   movingBuilding ? `Moving ${BuildingDataMap[movingBuilding!.type]?.name || movingBuilding!.type}` :
                   "Delete Mode Active"}
                </div>
                
                <button 
                  onClick={() => { setSelectedBuilding(null); setMovingBuilding(null); setIsDeleteMode(false); }}
                  className="p-2 bg-zinc-950 text-white rounded-full border border-zinc-800 hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="rotate-45" size={16} />
                </button>
                
                {movingBuilding && (
                  <button 
                    onClick={() => deleteBuilding(movingBuilding.id)}
                    className="p-2 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        {/* Right Sidebar: Real-time Graphs */}
        <div className={cn(
          "w-full lg:w-96 border-l flex flex-col overflow-hidden",
          state.theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          <div className="p-4 border-b border-zinc-800/20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500" /> Real-time Metrics
            </h2>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={state.history}>
                  <defs>
                    <linearGradient id="colorPol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEco" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      background: state.theme === 'dark' ? '#09090b' : '#fff', 
                      border: '1px solid #27272a', 
                      borderRadius: '8px',
                      color: state.theme === 'dark' ? '#fff' : '#000'
                    }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="pollution" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPol)" />
                  <Area type="monotone" dataKey="ecoHealth" stroke="#10b981" fillOpacity={1} fill="url(#colorEco)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2 px-2">
              <span className="text-[10px] text-emerald-500 font-mono">ECO-HEALTH</span>
              <span className="text-[10px] text-rose-500 font-mono">POLLUTION</span>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
            <div className={cn(
              "p-4 rounded-2xl border",
              state.theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <h3 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-3 tracking-wide uppercase">
                <Award size={14} className="text-amber-500" /> Milestones & Rewards
              </h3>
              <div className="space-y-2">
                 {state.achievements.map(ach => (
                   <div 
                    key={ach.id}
                    className={cn(
                      "p-3 rounded-xl text-xs transition-all relative overflow-hidden",
                      ach.claimed 
                        ? "bg-zinc-800/10 border border-zinc-800/30 text-zinc-600 grayscale" 
                        : ach.completed 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/20" 
                          : "bg-zinc-800/30 border border-zinc-700/30 text-zinc-500"
                    )}
                    onClick={() => ach.completed && !ach.claimed && claimAchievement(ach.id)}
                   >
                     <div className="flex justify-between items-center mb-1">
                       <span className="font-bold">{ach.title}</span>
                       {ach.claimed ? (
                         <Check size={14} className="text-emerald-500" />
                       ) : ach.completed ? (
                         <div className="flex items-center gap-1 bg-emerald-500 text-black px-2 py-0.5 rounded-full text-[8px] animate-bounce">CLAIM</div>
                       ) : (
                         <span className="text-[10px] text-amber-500 font-bold">+${ach.reward}</span>
                       )}
                     </div>
                     <p className="text-[10px] opacity-70 mb-2">{ach.description}</p>
                     
                     {!ach.claimed && (
                       <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (ach.current / ach.target) * 100)}%` }}
                          className={cn("h-full", ach.completed ? "bg-emerald-500" : "bg-zinc-600")}
                         />
                       </div>
                     )}
                   </div>
                 ))}
              </div>
            </div>

            {state.pollution > 70 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3"
              >
                <div className="mt-1">
                  <AlertTriangle size={18} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-rose-400 font-bold text-xs uppercase tracking-wider">Pollution Alert!</p>
                  <p className="text-[11px] text-rose-200/80">Warga mulai sakit batuk berdahak. Segera tanam pohon atau warga bakal minggat!</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom News Ticker */}
      <div className="bg-emerald-500 text-black h-8 flex items-center overflow-hidden font-bold text-[11px] uppercase tracking-tighter whitespace-nowrap z-50">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-12"
        >
          {news.map((n, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-black rounded-full" /> {n}
            </span>
          ))}
          {news.map((n, i) => (
            <span key={`dup-${i}`} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-black rounded-full" /> {n}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Tutorial Overlay (First Start) */}
      {!isGameStarted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-center overflow-hidden">
          {/* Animated Background Layers */}
          <div className="absolute inset-0 bg-zinc-950" />
          <div className="absolute inset-0 opacity-40">
            <img 
              referrerPolicy="no-referrer"
              src="https://images.unsplash.com/photo-1518005020250-675f042d3858?auto=format&fit=crop&q=80&w=2000" 
              alt="City Backdrop" 
              className="w-full h-full object-cover grayscale brightness-[0.2]"
            />
          </div>
          <div className="absolute inset-0 opacity-30" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle at 20% 30%, #10b981 0%, transparent 60%), radial-gradient(circle at 80% 70%, #3b82f6 0%, transparent 60%)',
                 filter: 'blur(80px)'
               }} 
          />
          <div className="absolute inset-0 opacity-[0.05]" 
               style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md space-y-8 relative z-10"
          >
            <motion.div 
              animate={{ 
                rotateY: [0, 10, -10, 0],
                y: [0, -10, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_20px_50px_rgba(16,185,129,0.4)]"
            >
              <Building2 size={48} className="text-black" />
            </motion.div>
            
            <div className="space-y-4">
              <motion.h2 
                initial={{ opacity: 0, tracking: "-0.1em" }}
                animate={{ opacity: 1, tracking: "-0.02em" }}
                className="text-5xl font-black italic tracking-tighter text-white leading-none"
              >
                ECO-CITY<br/>
                <span className="text-emerald-500">BALANCE.</span>
              </motion.h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                Anda terpilih sebagai City Manager. Bangun kota masa depan yang modern, makmur, dan tetap selaras dengan alam.
              </p>
            </div>

            <motion.div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setIsGameStarted(true);
                  // If fresh state, maybe set a default building
                  if (state.buildings.length === 0) setSelectedBuilding('APARTMENT');
                }}
                className="group relative px-8 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all uppercase tracking-widest text-xs shadow-xl active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {state.buildings.length > 0 ? "Lanjutkan Membangun" : "Mulai Membangun"} <ChevronRight size={16} />
                </span>
              </button>

              {state.buildings.length > 0 && (
                <button 
                  onClick={resetGame}
                  className="px-8 py-3 bg-zinc-900 text-zinc-400 font-bold rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-all uppercase tracking-widest text-[10px]"
                >
                  Mulai Game Baru (Reset)
                </button>
              )}
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-tighter">
                Version 1.0.4 • Powered by Google AI
              </p>
            </motion.div>
          </motion.div>

          {/* Decorative Elements */}
          <div className="absolute bottom-10 left-10 text-left hidden md:block">
             <p className="text-[10px] text-zinc-500 font-mono">SYSTEM_STATUS</p>
             <p className="text-xs text-emerald-500 font-bold">READY_TO_DEPLOY</p>
          </div>
          <div className="absolute top-10 right-10 text-right hidden md:block">
             <p className="text-[10px] text-zinc-500 font-mono">ECO_VIBE</p>
             <p className="text-xs text-blue-400 font-bold">BALANCED_FLOW</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Check,
  Volume2,
  VolumeX,
  Activity
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
  Area,
  PieChart,
  Pie,
  Cell as RechartsCell
} from 'recharts';
import { BUILDINGS, BuildingType, GameState, PlacedBuilding, BUILDINGS as BuildingDataMap, BuildingData, INITIAL_ACHIEVEMENTS, Achievement, BuildingCategory } from './types';
import { getCombinedAIContent } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const StatCard = ({ label, value, icon: Icon, color, suffix = "", subValue }: { label: string, value: number | string, icon: any, color: string, suffix?: string, subValue?: string }) => (
  <div className="bg-zinc-950/20 border border-white/10 p-2.5 px-3.5 rounded-2xl flex items-center gap-3 backdrop-blur-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] relative overflow-hidden group min-w-[130px] transition-all hover:bg-zinc-900/40 hover:border-emerald-500/30">
    <div className={cn("p-2 rounded-xl shrink-0 shadow-lg", color)}>
      <Icon size={14} className="text-white" />
    </div>
    <div className="z-10 min-w-0">
      <p className="text-[7px] uppercase tracking-[0.25em] text-zinc-500 font-black truncate mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-sm font-mono font-black text-white tracking-tight leading-none">{value}{suffix}</p>
        {subValue && <span className="text-[8px] text-zinc-500 font-mono italic opacity-60">{subValue}</span>}
      </div>
    </div>
    <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-500/10 transition-colors" />
  </div>
);

const BuildingItem = ({ type, data, onSelect, disabled, isSelected }: any) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(type as BuildingType)}
      disabled={disabled}
      className={cn(
        "w-full p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 relative overflow-hidden group",
        isSelected 
          ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50" 
          : "border-white/5 bg-zinc-900/30 hover:border-white/20 hover:bg-zinc-900/50",
        disabled && "opacity-30 grayscale cursor-not-allowed border-zinc-800"
      )}
    >
      <div className="flex justify-between items-center relative z-10">
        <div className="w-10 h-10 bg-zinc-800/80 rounded-xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
          {data.emoji}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black font-mono text-emerald-400 leading-none">${data.cost}</p>
          <div className="flex gap-1 mt-1 justify-end">
            <div className={cn("w-1 h-1 rounded-full", data.ecoImpact > 0 ? "bg-emerald-500" : "bg-rose-500")} />
            <div className="w-1 h-1 rounded-full bg-amber-500" />
          </div>
        </div>
      </div>
      <div className="text-left relative z-10">
        <p className="font-black text-xs text-white uppercase tracking-wider">{data.name}</p>
        <p className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5 font-medium italic">"{data.description}"</p>
      </div>
      
      {/* Decorative back-element */}
      <div className="absolute -right-4 -bottom-4 text-4xl opacity-[0.03] group-hover:opacity-[0.08] transition-all rotate-12">
        {data.emoji}
      </div>
    </motion.button>
  );
};

// --- Game Logic Helpers ---

const calculateBankruptcyRisk = (state: GameState): number => {
  let risk = 0;
  if (state.money < 0) risk += 40;
  if (state.ecoHealth < 20) risk += 30;
  if (state.pollution > 80) risk += 20;
  if (state.taxRate > 25) risk += (state.taxRate - 25) * 2;
  return Math.min(100, risk);
};

// --- Main App ---

const TRANSLATIONS = {
  id: {
    money: "Uang",
    eco: "Nature",
    pollution: "Polusi",
    citizens: "Warga",
    construction: "Konstruksi",
    bulldoze: "Hancurkan",
    taxRate: "Sistem Pajak",
    expand: "Perluas",
    shrink: "Kecilkan",
    advisor: "Diagnostic Center",
    scan: "Pindai",
    settings: "Pengaturan",
    welcome: "Selamat Datang di EcoCity Balance!",
    startNew: "Mulai Kota Baru",
    continue: "Lanjutkan Membangun",
    ecoAdvisor: "Pusat Analisa Lingkungan",
    syncing: "Sinkronisasi...",
    loggedAs: "Masuk Sebagai",
    newsDefault: ["Selamat datang di EcoCity!", "Masuk untuk simpan data di cloud."]
  },
  en: {
    money: "Money",
    eco: "Eco",
    pollution: "Pollution",
    citizens: "Citizens",
    construction: "Construction",
    bulldoze: "Bulldoze",
    taxRate: "Tax System",
    expand: "Expand",
    shrink: "Shrink",
    advisor: "Diagnostic Center",
    scan: "Scan",
    settings: "Settings",
    welcome: "Welcome to EcoCity Balance!",
    startNew: "Start New City",
    continue: "Continue Building",
    ecoAdvisor: "Eco-Analysis Center",
    syncing: "Syncing...",
    loggedAs: "Logged in As",
    newsDefault: ["Welcome to EcoCity!", "Log in to save your data."]
  },
  ar: {
    money: "المال",
    eco: "البيئة",
    pollution: "التلوث",
    citizens: "المواطنون",
    construction: "البناء",
    bulldoze: "هدم",
    taxRate: "نظام الضرائب",
    expand: "توسيع",
    shrink: "تصغير",
    advisor: "مركز التشخيص",
    scan: "فحص",
    settings: "الإعدادات",
    welcome: "مرحباً بكم في إيكو سيتي!",
    startNew: "بدء مدينة جديدة",
    continue: "مواصلة البناء",
    ecoAdvisor: "مركز التحليل البيئي",
    syncing: "جاري المزامنة...",
    loggedAs: "مسجل كـ",
    newsDefault: ["مرحباً بكم في إيكو سيتي!", "سجل الدخول لحفظ البيانات."]
  }
};

const INITIAL_STATE: GameState = {
  money: 1000,
  ecoHealth: 80,
  pollution: 20,
  population: 50,
  taxRate: 15,
  bankruptcyRisk: 0,
  buildings: [],
  gridSize: 4,
  achievements: INITIAL_ACHIEVEMENTS,
  theme: 'dark',
  language: 'id',
  gameSpeed: 1,
  history: []
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const prevUserRef = useRef<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  useEffect(() => {
    let unsubSnapshot: Unsubscribe | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      const wasLoggedIn = !!prevUserRef.current;
      setUser(u);
      setHasSynced(false);
      
      // Clear previous snapshot listener
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (u) {
        setIsSyncing(true);
        const ref = doc(db, 'cities', u.uid);
        unsubSnapshot = onSnapshot(ref, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setState({
              ...INITIAL_STATE,
              ...data,
              buildings: data.buildings || [],
              achievements: data.achievements || INITIAL_ACHIEVEMENTS,
              history: data.history || []
            } as GameState);
          }
          setIsSyncing(false);
          setHasSynced(true);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `cities/${u.uid}`);
          setIsSyncing(false);
          setHasSynced(true);
        });
      } else {
        // If they just logged out, reset. If it's just initial load, try to load local.
        if (wasLoggedIn) {
          setState(INITIAL_STATE);
          localStorage.removeItem('ecocity_save_v2');
        } else {
          const saved = localStorage.getItem('ecocity_save_v2');
          if (saved) {
            try {
              setState(JSON.parse(saved));
            } catch (e) {
              console.error("Local load failed", e);
            }
          }
        }
        setHasSynced(true);
      }
      prevUserRef.current = u;
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const saveToCloud = useCallback(async (newState: GameState) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'cities', user.uid), {
        ...newState,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `cities/${user.uid}`);
    }
  }, [user]);

  const [news, setNews] = useState<string[]>(["Welcome to EcoCity Balance!", "Log in to save your progress."]);
  const [advisorMsg, setAdvisorMsg] = useState<string>("Ready to build, Manager?");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BuildingCategory>('ENERGY');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [movingBuilding, setMovingBuilding] = useState<PlacedBuilding | null>(null);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(Date.now());
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [notifications, setNotifications] = useState<{id: string, text: string, type: 'protest' | 'info'}[]>([]);

  const t = TRANSLATIONS[state.language || 'id'];

  // Realistic Metrics Fluctuations (Visual only)
  const [metricJitter, setMetricJitter] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMetricJitter(Math.random() * 0.05 - 0.025);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const [newsIndex, setNewsIndex] = useState(0);
  const getDynamicNews = () => {
    const list = [...t.newsDefault];
    if (user) {
      if (state.language === 'id') {
        list.push(`Status: Terhubung ke EcoCloud (${user.email})`);
        if (state.ecoHealth < 50) list.push("DARURAT: Kualitas udara memburuk di sektor pusat!");
        if (state.taxRate > 25) list.push("Laporan: Warga mulai mengeluhkan biaya hidup tinggi.");
        if (state.population > 500) list.push("Headline: EcoCity menjadi destinasi hunian terpopuler tahun ini!");
      } else if (state.language === 'ar') {
        list.push(`الحالة: متصل بالسحابة (${user.email})`);
      } else {
        list.push(`Status: Cloud Synced (${user.email})`);
        if (state.ecoHealth < 50) list.push("ALERT: Air quality dropping in central sector!");
        if (state.population > 500) list.push("Flash: EcoCity named top sustainable destination!");
      }
    }
    return list;
  };
  
  const newsList = getDynamicNews();
  useEffect(() => {
    const interval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % newsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [newsList.length]);

  const toggleLanguage = () => {
    setState(prev => {
      const langs: ('id' | 'en' | 'ar')[] = ['id', 'en', 'ar'];
      const nextIdx = (langs.indexOf(prev.language || 'id') + 1) % langs.length;
      return { ...prev, language: langs[nextIdx] };
    });
  };

  useEffect(() => {
    if (isGameStarted && !isMusicPlaying) {
      setIsMusicPlaying(true);
    }
  }, [isGameStarted, isMusicPlaying]);

  useEffect(() => {
    if (isMusicPlaying) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/music/preview/mixkit-chill-step-loop-454.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0;
        audioRef.current.play().catch(e => console.log("User interaction needed for audio"));
        
        // Smooth fade in
        let vol = 0;
        const interval = setInterval(() => {
          if (audioRef.current && vol < 0.25) {
            vol += 0.01;
            audioRef.current.volume = vol;
          } else {
            clearInterval(interval);
          }
        }, 150);
      } else {
        audioRef.current.play().catch(e => console.log("Audio play blocked"));
      }
    } else {
      audioRef.current?.pause();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isMusicPlaying]);

  // Random Protests
  useEffect(() => {
    if (!isGameStarted || isGamePaused) return;
    const interval = setInterval(() => {
      const chance = Math.random();
      if (chance < 0.15) { // 15% chance every 25s
        let protest = "";
        if (state.pollution > 40) protest = state.language === 'ar' ? "المواطنون يحتجون على التلوث!" : "Warga memprotes tingkat polusi!";
        else if (state.money < 100) protest = state.language === 'ar' ? "المواطنون قلقون من الوضع المالي!" : "Warga khawatir krisis ekonomi!";
        else if (state.taxRate > 25) protest = state.language === 'ar' ? "تظاهرات ضد الضرائب المرتفعة!" : "Demonstrasi menolak pajak tinggi!";
        
        if (protest) {
          const id = Math.random().toString(36).substr(2, 9);
          setNotifications(prev => [...prev, { id, text: protest, type: 'protest' }]);
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
          }, 6000);
        }
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [isGameStarted, isGamePaused, state.pollution, state.money, state.taxRate, state.language]);

  // Autosave & Sync
  useEffect(() => {
    if (!isGameStarted || !hasSynced) return;
    const interval = setInterval(() => {
      localStorage.setItem('ecocity_save_v2', JSON.stringify(state));
      if (user) saveToCloud(state);
      setLastSaveTime(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [state, isGameStarted, user, saveToCloud, hasSynced]);

  // Derived Grid
  const grid = Array(state.gridSize).fill(null).map(() => Array(state.gridSize).fill(null));
  state.buildings.forEach(b => {
    if (b.y < state.gridSize && b.x < state.gridSize) {
      grid[b.y][b.x] = b.type;
    }
  });

  // Game Loop
  useEffect(() => {
    if (isGamePaused || !isGameStarted) return;

    const interval = setInterval(() => {
      setState(prev => {
        let income = 0;
        let ecoDelta = 0;
        let polDelta = 0;
        let popDelta = 0;

        prev.buildings.forEach(b => {
          const data = BuildingDataMap[b.type];
          if (!data) return;
          income += data.income;
          ecoDelta += data.ecoImpact / 20;
          polDelta -= data.ecoImpact / 20;
          popDelta += (data.category === 'RESIDENTIAL' ? 15 : 2);
        });

        // Natural decay
        ecoDelta += prev.ecoHealth < 40 ? -0.2 : 0.08;
        
        // Tax Collection Logic
        const taxPower = (income * prev.taxRate) / 50; 
        const totalIncome = income + taxPower;
        
        const newMoney = prev.money + totalIncome;
        const newEco = Math.max(0, Math.min(100, prev.ecoHealth + ecoDelta));
        const newPol = Math.max(0, Math.min(100, prev.pollution + polDelta));
        const newPop = Math.max(0, prev.population + popDelta);
        const newRisk = calculateBankruptcyRisk({ ...prev, money: newMoney, ecoHealth: newEco, pollution: newPol });

        // GameOver Check
        if (newRisk >= 100) {
          setNews(["CITY BANKRUPT!", "Your management has failed. Try again."]);
          setIsGamePaused(true);
        }

        const newHistory = [...prev.history, { 
          time: prev.history.length, 
          money: newMoney, 
          pollution: newPol, 
          ecoHealth: newEco 
        }].slice(-30);

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
          if (currentValue >= ach.target) return { ...ach, current: currentValue, completed: true };
          return { ...ach, current: currentValue };
        });

        return {
          ...prev,
          money: newMoney,
          ecoHealth: newEco,
          pollution: newPol,
          population: newPop,
          bankruptcyRisk: newRisk,
          achievements: updatedAchievements,
          history: newHistory
        };
      });
    }, 2000 / (state.gameSpeed || 1));

    return () => clearInterval(interval);
  }, [isGamePaused, isGameStarted, state.buildings.length, state.gameSpeed]);

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

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setNews(["Login cancelled.", "Akses ditutup oleh user. Coba lagi jika ingin sinkronisasi awan."]);
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Multiple popups attempted.");
      } else {
        console.error("Login failed", error);
        setNews(["Login Error", "Terjadi kesalahan saat masuk. Silakan coba lagi."]);
      }
    }
  };

  return (
    <div className={cn(
      "h-screen flex flex-col font-sans selection:bg-emerald-500/30 overflow-hidden transition-colors duration-500",
      state.theme === 'dark' ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Top Header / Stats - Fixed Height */}
      <div className={cn(
        "h-20 z-50 shrink-0 flex items-center px-6 relative",
        state.theme === 'dark' ? "bg-black/40 border-b border-white/5" : "bg-white/40 border-b border-zinc-200"
      )}>
        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between gap-6">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsGameStarted(false)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] group-hover:shadow-emerald-500/60 transition-all relative overflow-hidden">
              <Leaf size={22} className="text-black relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div className="hidden lg:block text-left">
              <h1 className="font-black text-xl tracking-tighter leading-none text-white">ECO<span className="text-emerald-500">CITY</span></h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                <p className="text-[8px] text-emerald-500 font-black uppercase tracking-[0.3em]">Operational</p>
              </div>
            </div>
          </motion.button>

          {/* Floating Bubble Advisor */}
          <div className="hidden md:flex flex-1 justify-center px-10">
            <motion.div 
              key={advisorMsg}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "px-6 py-2 rounded-full border flex items-center gap-4 shadow-2xl relative",
                state.theme === 'dark' ? "bg-zinc-900 border-emerald-500/30" : "bg-white border-emerald-200"
              )}
            >
              {/* Bubble Tail */}
              <div className={cn(
                "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r border-b",
                state.theme === 'dark' ? "bg-zinc-900 border-emerald-500/30" : "bg-white border-emerald-200"
              )} />

              <div className="relative">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30" />
              </div>
              <p className="text-xs font-bold text-zinc-300 max-w-[400px] truncate">
                {isAiLoading ? "Syncing..." : advisorMsg}
              </p>
              <button 
                 onClick={() => fetchAIContent(true)}
                 className="p-1 px-2.5 bg-emerald-500 text-black rounded-full text-[9px] font-black uppercase tracking-tighter hover:scale-105 transition-all"
              >
                Scan
              </button>
              
              {/* Notifications / Protests Overlay in bubble style */}
              <AnimatePresence>
                {notifications.map(n => (
                  <motion.div
                    key={n.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="absolute -bottom-12 left-0 right-0 bg-rose-500 text-white p-2 rounded-xl text-[10px] font-black text-center shadow-2xl border border-rose-400"
                  >
                    ⚠️ {n.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className={cn(
                "p-2.5 rounded-xl border transition-all shrink-0 font-black text-[10px] uppercase tracking-widest",
                state.theme === 'dark' ? "bg-zinc-900 border-white/5 hover:border-emerald-500/30 text-emerald-500" : "bg-white border-zinc-200 hover:border-emerald-500/30 text-emerald-600"
              )}
            >
              {state.language === 'id' ? 'ID' : state.language === 'en' ? 'EN' : 'AR'}
            </button>
            <div className="flex gap-2 p-2 bg-white/5 rounded-3xl backdrop-blur-2xl border border-white/5 overflow-x-auto scrollbar-hide">
              <StatCard label={t.money} value={(state.money + metricJitter).toLocaleString()} color="bg-amber-500" icon={DollarSign} suffix="$" />
              <StatCard label={t.eco} value={(state.ecoHealth + metricJitter).toFixed(2)} color="bg-emerald-500" icon={TrendingUp} suffix="%" />
              <StatCard label={t.pollution} value={(state.pollution + metricJitter).toFixed(2)} color="bg-rose-500" icon={Wind} suffix="%" />
              <StatCard label={t.citizens} value={Math.floor(state.population + (metricJitter > 0 ? 1 : 0)).toLocaleString()} color="bg-indigo-500" icon={Users} />
            </div>

            <button 
              onClick={() => setIsMusicPlaying(!isMusicPlaying)}
              className={cn(
                "p-2.5 rounded-xl border transition-all shrink-0",
                state.theme === 'dark' ? "bg-zinc-900 border-white/5 hover:border-zinc-600" : "bg-white border-zinc-200 hover:border-zinc-300",
                isMusicPlaying ? "text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-zinc-500"
              )}
            >
              {isMusicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "p-2.5 rounded-xl border transition-all shrink-0",
                state.theme === 'dark' ? "bg-zinc-900 border-white/5 hover:border-zinc-600" : "bg-white border-zinc-200 hover:border-zinc-300"
              )}
            >
              <Settings size={18} />
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
            
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Music Volume</span>
                  <span className="text-[10px] font-mono text-emerald-500">{audioRef.current ? Math.round(audioRef.current.volume * 100) : 0}%</span>
                </div>
                <input 
                  type="range"
                  min="0" max="1" step="0.05"
                  value={audioRef.current?.volume || 0}
                  onChange={(e) => {
                    if (audioRef.current) {
                      audioRef.current.volume = parseFloat(e.target.value);
                      setIsMusicPlaying(audioRef.current.volume > 0);
                    }
                  }}
                  className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Simulation Speed</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 4].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => setState(prev => ({ ...prev, gameSpeed: speed }))}
                      className={cn(
                        "flex-1 py-1 rounded text-[10px] font-bold transition-colors",
                        state.gameSpeed === speed ? "bg-emerald-500 text-black shadow-lg" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-zinc-800/50" />

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
        
        {/* Left Sidebar: Buildings & Advisor - Optimized HUD Style */}
        <div className={cn(
          "w-full lg:w-80 border-r flex flex-col shrink-0 z-40 transition-all duration-500",
          state.theme === 'dark' ? "bg-black/60 border-white/5" : "bg-zinc-50/80 border-zinc-200"
        )}>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{t.construction}</h2>
                <p className="text-xs font-bold text-zinc-300 mt-1">{state.language === 'id' ? 'Gedung Ramah Lingkungan' : 'Sustainable Buildings'}</p>
              </div>
              <button 
                onClick={toggleDeleteMode}
                className={cn(
                  "p-2 px-3 rounded-xl transition-all flex items-center gap-2 border shadow-lg",
                  isDeleteMode 
                    ? "bg-rose-500 text-black border-rose-400 font-black text-[9px] uppercase" 
                    : "bg-zinc-900/80 text-zinc-400 border-white/5 hover:border-rose-500/50 text-[9px] uppercase font-black"
                )}
              >
                <Trash2 size={12} />
                <span>{t.bulldoze}</span>
              </button>
            </div>

            <div className="p-4 bg-zinc-900/40 rounded-2xl border border-white/10 shadow-inner">
               <div className="flex justify-between text-[8px] font-black uppercase text-zinc-500 mb-3 tracking-[0.2em]">
                 <span>{t.taxRate}</span>
                 <span className={cn(state.taxRate > 25 ? "text-rose-500" : "text-emerald-400")}>{state.taxRate}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" max="50" 
                 value={state.taxRate} 
                 onChange={(e) => setState(prev => ({ ...prev, taxRate: parseInt(e.target.value) }))}
                 className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
               />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
               {(['ENERGY', 'ECONOMY', 'RESIDENTIAL', 'PUBLIC_SERVICE', 'ENVIRONMENT', 'CULTURAL', 'INFRASTRUCTURE'] as BuildingCategory[]).map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={cn(
                     "px-2 py-2 rounded-xl text-[8px] font-black uppercase transition-all border text-center leading-none tracking-widest",
                     selectedCategory === cat 
                       ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_5px_15px_rgba(16,185,129,0.3)]" 
                       : "bg-zinc-900/40 text-zinc-500 border-white/5 hover:text-zinc-300 hover:bg-zinc-800/60"
                   )}
                 >
                   {cat.split('_')[0]}
                 </button>
               ))}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(BUILDINGS) as BuildingType[])
                .filter(type => BUILDINGS[type].category === selectedCategory)
                .map(type => {
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

            <div className="pb-10 pt-4 flex flex-col items-center">
               <div className={cn(
                 "p-5 rounded-[2rem] relative overflow-hidden group border transition-all opacity-50 backdrop-blur-sm",
                 state.theme === 'dark' ? "bg-black/60 border-emerald-500/10" : "bg-white/40 border-emerald-200"
               )}>
                  <p className="text-[9px] font-black italic text-zinc-500 uppercase tracking-widest text-center px-4">
                    {state.language === 'ar' ? "نظام الذكاء الاصطناعي نشط في الأعلى" : "AI Core Active (HUD Above)"}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Center Canvas Area: City Grid - Centered and Visible */}
        <div className={cn(
          "flex-1 relative overflow-auto flex items-center justify-center p-4 lg:p-8 transition-all duration-700",
          state.theme === 'dark' 
            ? "bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-black" 
            : "bg-zinc-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/40 via-zinc-100 to-zinc-200"
        )}>
          {/* Enhanced Eco-Background with Image */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-20">
               <img 
                 src="https://images.unsplash.com/photo-1518005020250-675f042d3858?auto=format&fit=crop&q=80&w=2000" 
                 alt="Background" 
                 className="w-full h-full object-cover grayscale brightness-50 contrast-125"
               />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-black/80" />
            
            {/* Biological Mesh Grid */}
            <div className="absolute inset-0 opacity-[0.03]" 
                 style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {/* Moving Light Beams */}
            <motion.div 
              animate={{ 
                x: [-100, 100],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 bottom-0 w-32 bg-emerald-500/10 blur-[80px] -skew-x-12"
              style={{ left: '30%' }}
            />

            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -200, 0],
                  x: [0, i % 2 === 0 ? 80 : -80, 0],
                  opacity: [0, 0.4, 0],
                  scale: [0.5, 1.2, 0.5]
                }}
                transition={{
                  duration: 20 + i * 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 2
                }}
                className="absolute w-1 h-1 bg-emerald-400/40 rounded-full blur-[2px]"
                style={{
                  left: `${(i * 9) % 100}%`,
                  bottom: `${-5}%`
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className={cn(
                "absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full blur-[140px]",
                state.theme === 'dark' ? "bg-emerald-500/20" : "bg-emerald-500/10"
              )} 
            />
          </div>

          <div className="relative flex flex-col items-center gap-6 max-h-full overflow-visible py-12">
            <div 
              className={cn(
                "grid gap-2 p-4 sm:p-6 rounded-[48px] backdrop-blur-3xl border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-500",
                state.theme === 'dark' ? "bg-zinc-900/60 border-white/5 ring-1 ring-white/5" : "bg-white/80 border-zinc-200 ring-1 ring-zinc-200/50"
              )}
              style={{ 
                gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((row, y) => row.map((cell, x) => (
                <motion.div
                  key={`${x}-${y}`}
                  whileHover={{ 
                    scale: 1.05, 
                    backgroundColor: state.theme === 'dark' ? 'rgba(63, 63, 70, 0.8)' : 'rgba(228, 228, 231, 0.8)',
                  }}
                  onClick={() => handleCellClick(x, y)}
                  className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group isolate active:scale-95",
                    cell === null 
                      ? (state.theme === 'dark' ? "bg-zinc-950/30 hover:bg-zinc-800/40 shadow-inner" : "bg-zinc-200/40 hover:bg-zinc-300/60 shadow-inner") 
                      : (state.theme === 'dark' ? "bg-zinc-800 border border-white/5 shadow-lg" : "bg-white border border-zinc-100 shadow-lg"),
                    (selectedBuilding || movingBuilding) && !cell && "ring-2 ring-emerald-500/30 ring-inset animate-pulse",
                    movingBuilding?.x === x && movingBuilding?.y === y && "ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-900 z-20"
                  )}
                >
                  {cell ? (
                    <motion.div 
                      layoutId={`building-${cell}-${x}-${y}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl sm:text-3xl filter drop-shadow-md hover:scale-110 transition-transform"
                    >
                      {BuildingDataMap[cell]?.emoji || '❓'}
                    </motion.div>
                  ) : (
                    (selectedBuilding || movingBuilding) && (
                      <div className="text-xl opacity-10 group-hover:opacity-40 transition-opacity">
                        {selectedBuilding ? BuildingDataMap[selectedBuilding]?.emoji : BuildingDataMap[movingBuilding!.type]?.emoji || '❓'}
                      </div>
                    )
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none" />
                </motion.div>
              )))}
            </div>

            {/* Grid Controls */}
            <div className="flex items-center gap-3 p-1.5 bg-zinc-950/60 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl relative z-20">
              <button 
                onClick={expandGrid}
                className={cn(
                  "px-4 py-2 rounded-xl border flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 group",
                  state.theme === 'dark' ? "bg-emerald-500 text-black border-emerald-400" : "bg-emerald-600 text-white border-emerald-500"
                )}
              >
                <Maximize2 size={14} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.expand}</span>
                <span className="px-1.5 py-0.5 bg-black/10 rounded text-[8px] font-mono">
                  ${(state.gridSize * 1000).toLocaleString()}
                </span>
              </button>
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
                <Award size={14} className="text-amber-500" /> Dynamic Quests
              </h3>
              <div className="space-y-2">
                 {state.achievements
                   .filter(a => !a.claimed) // Only show unclaimed
                   .slice(0, 3) // Show only 3 active quests at a time
                   .map(ach => (
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

      {/* Bottom Ticker / News Bar */}
      <div className={cn(
        "h-8 border-t flex items-center px-4 overflow-hidden gap-6 z-50 transition-colors duration-500",
        state.theme === 'dark' ? "bg-black border-white/5" : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center gap-2.5 shrink-0 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,1)]" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">Live News</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p 
              key={newsIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className={cn(
                "text-[10px] font-bold whitespace-nowrap tracking-wide",
                state.theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
              )}
            >
              {newsList[newsIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="hidden sm:flex items-center gap-5 shrink-0 font-mono text-[8px] text-zinc-500 font-bold">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
            <span className="uppercase opacity-60">Engine: Pulse-V2</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={10} className="text-emerald-500" />
            <span>SYNC_STATE: {user ? 'CLOUD_ACTIVE' : 'LOCAL_ONLY'}</span>
          </div>
          <span className="opacity-40">{new Date().toLocaleTimeString([], { hour12: false })}</span>
        </div>
      </div>

      {/* Tutorial Overlay (First Start) - Redesigned Landing */}
      {!isGameStarted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-center overflow-hidden">
          {/* High-End Background */}
          <div className="absolute inset-0 bg-zinc-950" />
          <div className="absolute inset-0 opacity-40">
            <img 
              referrerPolicy="no-referrer"
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=2000" 
              alt="Sustainable City" 
              className="w-full h-full object-cover grayscale brightness-50"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
          
          <div className="absolute inset-0 opacity-[0.15]" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle at 10% 10%, #10b981 0%, transparent 40%), radial-gradient(circle at 90% 90%, #6366f1 0%, transparent 40%)',
                 filter: 'blur(100px)'
               }} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="max-w-xl space-y-12 relative z-10"
          >
            <div className="space-y-6">
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  filter: ["drop-shadow(0 0 10px rgba(16,185,129,0))", "drop-shadow(0 0 20px rgba(16,185,129,0.4))", "drop-shadow(0 0 10px rgba(16,185,129,0))"]
                 }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl"
              >
                <Leaf size={40} className="text-black" />
              </motion.div>
              
              <div className="space-y-2">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-7xl md:text-8xl font-black italic tracking-tighter text-white leading-none overflow-hidden"
                >
                  ECO<span className="text-emerald-500">CITY</span>
                </motion.h1>
                <p className="text-zinc-400 text-sm font-medium uppercase tracking-[0.4em] translate-y-[-10px]">
                  Civilization V2.0
                </p>
              </div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto font-medium"
              >
                {state.language === 'id' 
                  ? "Rancang masa depan yang berkelanjutan. Harmoni antara ekonomi, lingkungan, dan spiritualitas dalam satu simulasi."
                  : "Design a sustainable future. Harmony between economy, environment, and spirituality in one simulation."}
              </motion.p>
            </div>

            <motion.div className="flex flex-col gap-4 items-center">
              <button 
                onClick={() => {
                  setIsGameStarted(true);
                  setIsMusicPlaying(true);
                  if (state.buildings.length === 0) setSelectedBuilding('APARTMENT');
                }}
                className="group relative px-12 py-5 bg-emerald-500 text-black font-black rounded-2xl transition-all shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 flex items-center gap-4 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 uppercase tracking-widest text-xs">
                  {state.buildings.length > 0 ? t.continue : t.startNew}
                </span>
                <ChevronRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform" />
              </button>

              {!user ? (
                <button 
                  onClick={handleLogin}
                  className="w-full max-w-[280px] px-6 py-4 bg-zinc-900/50 backdrop-blur-xl text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all border border-white/5 uppercase tracking-widest text-[9px] shadow-2xl"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100" />
                  {state.language === 'id' ? "Hubungkan Cloud" : "Connect to Cloud"}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{t.loggedAs}</p>
                   <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{user.email}</p>
                   <button onClick={logout} className="text-[9px] text-zinc-600 hover:text-rose-500 uppercase font-bold tracking-widest transition-colors mt-2">Sign Out</button>
                </div>
              )}
            </motion.div>
          </motion.div>
          
          {/* Aesthetic Overlay */}
          <div className="absolute bottom-10 left-10 text-left opacity-20 hidden md:block">
             <p className="text-[10px] font-black font-mono text-zinc-500">SYSTEM_AUTH</p>
             <p className="text-xs text-white font-bold">{user ? "READY" : "STANDBY"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

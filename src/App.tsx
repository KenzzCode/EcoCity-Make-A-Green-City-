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
  Activity,
  Tablet,
  Phone,
  LayoutGrid,
  Target,
  Lock,
  Flame,
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
import { BUILDINGS, BuildingType, GameState, PlacedBuilding, BUILDINGS as BuildingDataMap, BuildingData, INITIAL_ACHIEVEMENTS, Achievement, BuildingCategory, MapData, Quest } from './types';
import { getCombinedAIContent } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

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

const StatCard = ({ label, value, icon: Icon, color, suffix = "", subValue, theme }: { label: string, value: number | string, icon: any, color: string, suffix?: string, subValue?: string, theme: 'dark' | 'light' }) => (
  <div className={cn(
    "p-2.5 px-3.5 rounded-2xl flex items-center gap-3 backdrop-blur-2xl relative overflow-hidden group min-w-[130px] transition-all border",
    theme === 'dark' 
      ? "bg-zinc-900/60 border-white/10 shadow-2xl" 
      : "bg-white border-zinc-200 shadow-lg"
  )}>
    <div className={cn("p-2 rounded-xl shrink-0 shadow-lg", color)}>
      <Icon size={14} className="text-white" />
    </div>
    <div className="z-10 min-w-0">
      <p className={cn(
        "text-[7px] uppercase tracking-[0.25em] font-black truncate mb-1",
        theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
      )}>{label}</p>
      <div className="flex items-baseline gap-1">
        <p className={cn(
          "text-sm font-mono font-black tracking-tight leading-none",
          theme === 'dark' ? "text-slate-50" : "text-zinc-900"
        )}>{value}{suffix}</p>
        {subValue && <span className={cn("text-[8px] font-mono italic opacity-60", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>{subValue}</span>}
      </div>
    </div>
    <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-500/10 transition-colors" />
  </div>
);

const BuildingItem = ({ type, data, onSelect, disabled, isSelected, theme, onDragStart, onDragEnd, onDrag }: any) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.05}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragStart={() => {
        setIsDragging(true);
        onDragStart(type);
      }}
      onDrag={(e) => onDrag(e)}
      onDragEnd={(e) => {
        setIsDragging(false);
        onDragEnd(e, type);
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      whileDrag={{ 
        scale: 1.1,
        zIndex: 1000,
        opacity: 0.8,
        filter: "brightness(1.2) drop-shadow(0 10px 30px rgba(16,185,129,0.4))",
      }}
      className={cn(
        "w-full cursor-grab active:cursor-grabbing p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 relative overflow-hidden group touch-none select-none",
        isSelected 
          ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/50" 
          : theme === 'dark' 
            ? "border-white/5 bg-zinc-900/40 hover:border-white/20"
            : "border-zinc-200 bg-white shadow-sm hover:border-zinc-300",
        disabled && "opacity-30 grayscale cursor-not-allowed",
        isDragging && "pointer-events-none"
      )}
    >
      <div className={cn("flex justify-between items-center relative z-10", isDragging && "justify-center")}>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-inner",
          theme === 'dark' ? "bg-zinc-800" : "bg-zinc-100",
          isDragging && "scale-[3.5]"
        )}>
          {data.emoji}
        </div>
        {!isDragging && (
          <div className="text-right">
            <p className={cn(
              "text-[10px] font-black font-mono leading-none",
              theme === 'dark' ? "text-emerald-400" : "text-emerald-600"
            )}>${data.cost}</p>
          </div>
        )}
      </div>
      {!isDragging && (
        <div className="text-left relative z-10">
          <p className={cn(
            "font-black text-xs uppercase tracking-wider",
            theme === 'dark' ? "text-white" : "text-zinc-900"
          )}>{data.name}</p>
        </div>
      )}
      {!isDragging && (
        <div className="absolute -right-4 -bottom-4 text-4xl opacity-[0.03] group-hover:opacity-[0.08] transition-all rotate-12">
          {data.emoji}
        </div>
      )}
    </motion.div>
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
    newsDefault: ["Selamat datang di EcoCity!", "Masuk untuk simpan data di cloud."],
    simulationSpeed: "Kecepatan Simulasi",
    themeMode: "Mode Tema",
    manualSave: "Simpan Manual",
    lastAutosave: "Autosave Terakhir",
    resetExit: "Reset & Keluar Game",
    analyticsTablet: "Tablet Analitik Kota",
    tabletSummary: "Ringkasan",
    tabletApps: "App Store",
    tabletMaps: "Pilih Wilayah",
    recommendedApps: "Aplikasi Penting",
    appDownload: "Unduh",
    appInstalled: "Terpasang",
    level: "Level",
    exp: "XP",
    quests: "Tugas Kota",
    fireAlert: "KEBAKARAN!",
    extinguish: "Padamkan",
    mapLocked: "Terkunci (Level {L})",
    realTimeMonitoring: "Analitik Kemajuan Kota",
    appEcoMonitor: "Monitor Ekologi",
    appEcoMonitorDesc: "Lacak data polusi real-time.",
    appDispatch: "Pusat Darurat",
    appDispatchDesc: "Panggil layanan keamanan cepat.",
    appTax: "Optimasi Pajak",
    appTaxDesc: "Sesuaikan rasio pajak kota.",
    appAi: "Asisten AI Kota",
    appAiDesc: "Saran cerdas untuk kotamu.",
    totalWealth: "Total Kekayaan",
    envIndex: "Indeks Lingkungan",
    pollutionLevel: "Tingkat Polusi",
    currentPop: "Populasi Saat Ini",
    connectCloud: "Hubungkan Cloud",
    slogan: "Rancang masa depan yang berkelanjutan. Harmoni antara ekonomi, lingkungan, dan sosial.",
    protestTitle: "WARGA PROTES!",
    protestSubtitle: "TENANGKAN WARGA DAN PANGGIL POLISI",
    callPolice: "PANGGIL POLISI",
    protests: {
      pollution: ["Turunkan Polusi! 🪧", "Sesak napas! 😷"],
      eco: ["Mana Pohon Kami? 🌳", "Panas banget.. 🌵"]
    },
    messages: {
      welcome: ["Selamat datang di EcoCity!", "Masuk untuk menyimpan progress."],
      krisis: ["KRISIS! WARGA MENGAMUK!", "Segera panggil polisi!"],
      bankrupt: ["KOTA BANGKRUT!", "Manajemen Anda gagal. Coba lagi."],
      placed: "Berhasil membangun",
      placedSub: "Pembangunan dimulai.",
      noFunds: ["Kekurangan dana!", "Uang tidak cukup untuk membangun ini."],
      bulldozed: "Telah meratakan",
      bulldozedSub: "Area telah dibersihkan.",
      expansionNeeded: "Butuh $",
      expansionNeededSub: "untuk ekspansi! Kumpulkan uang lebih banyak dulu.",
      reset: ["Kota telah direset.", "Mulai dari awal, buat lebih baik!"],
      saved: ["Progress tersimpan!", "Data tersimpan di browser."],
      auth: ["Otentikasi...", "Memeriksa kredensial cloud..."],
      loginSuccess: ["Login Berhasil!", "Progress city kamu sekarang tersinkronisasi."],
      loginCancelled: ["Login dibatalkan.", "Akses ditutup oleh user."],
      domainUnauthorized: ["Domain tidak diizinkan.", "Domain ini belum di-allow di Firebase."],
      loginFailed: ["Login Gagal", "Gagal masuk. Cek koneksi."],
      ready: "Siap membangun, Manager?",
      newLeaf: "Lembaran baru, Manager. Ayo bangun!"
    },
    achievements: {
      pop_1: { title: "Kampung Kecil", desc: "Capai 200 populasi" },
      pop_2: { title: "Kota Mandiri", desc: "Capai 500 populasi" },
      pop_3: { title: "Metropolis Hijau", desc: "Capai 1000 populasi" },
      eco_1: { title: "Pecinta Alam", desc: "Capai 95% Eco Health" },
      eco_2: { title: "Hutan Kota", desc: "Capai 98% Eco Health" },
      mon_1: { title: "Orang Kaya", desc: "Kumpulkan $5,000" },
      mon_2: { title: "Sultan Eco", desc: "Kumpulkan $15,000" },
      build_1: { title: "Arsitek Muda", desc: "Bangun 10 gedung" },
      build_2: { title: "Pembangun Pro", desc: "Bangun 25 gedung" },
      build_3: { title: "Master Planner", desc: "Bangun 50 gedung" }
    },
    categories: {
      ENERGY: "Energi",
      ECONOMY: "Ekonomi",
      RESIDENTIAL: "Hunian",
      PUBLIC_SERVICE: "Instansi",
      ENVIRONMENT: "Ekologi",
      CULTURAL: "Sosial",
      INFRASTRUCTURE: "Utilitas"
    },
    buildings: {
      COAL_PLANT: { name: "PLTU Batubara", desc: "Energi murah tapi polusi." },
      SOLAR_FARM: { name: "Ladang Surya", desc: "Energi bersih matahari." },
      WIND_TURBINE: { name: "Kincir Angin", desc: "Memanfaatkan tenaga angin." },
      NUCLEAR_PLANT: { name: "Reaktor Nuklir", desc: "Daya besar, risiko tinggi." },
      TRADITIONAL_MARKET: { name: "Pasar Rakyat", desc: "Pusat ekonomi warga." },
      VERTICAL_GARDEN: { name: "Taman Vertikal", desc: "Hutan di tengah beton." },
      TECH_STARTUP: { name: "Startup Teknologi", desc: "Ekonomi digital modern." },
      SHOPPING_MALL: { name: "Mall Mewah", desc: "Surga belanja & hiburan." },
      OFFICE_TOWER: { name: "Menara Kantor", desc: "Pusat bisnis global." },
      APARTMENT: { name: "Apartemen Eco", desc: "Hunian vertikal nyaman." },
      SMART_RESIDENCE: { name: "Perumahan Pintar", desc: "Rumah masa depan." },
      COMMUNITY_HUB: { name: "Balai Warga", desc: "Pusat interaksi sosial." },
      HOSPITAL: { name: "Rumah Sakit", desc: "Kesehatan prioritas kita." },
      PARK: { name: "Taman Kota", desc: "Tempat santai & asri." },
      RECYCLING_CENTER: { name: "Pusat Daur Ulang", desc: "Olah limbah jadi berkah." },
      POLICE_STATION: { name: "Kantor Polisi", desc: "Keamanan warga terjaga." },
      UNIVERSITY: { name: "Universitas", desc: "Mencetak generasi pintar." },
      ECO_STADIUM: { name: "Stadion Surya", desc: "Hiburan olahraga megah." },
      MOSQUE: { name: "Masjid Agung", desc: "Ketenangan spiritual." },
      CHURCH: { name: "Gereja Katedral", desc: "Harmoni dalam iman." },
      TEMPLE: { name: "Vihara/Pura", desc: "Keseimbangan batin." },
      FIRE_STATION: { name: "Damkar", desc: "Siaga darurat 24 jam." },
      CAR_DEALER: { name: "Dealer Mobil", desc: "Pusat otomotif kota." },
      RESIDENTIAL_GRID_CONTROLLER: { name: "Grid Residensial", desc: "Optimasi daya hunian." },
      MAYOR_OFFICE: { name: "Kantor Walikota", desc: "Pusat kebijakan kota." },
      GOVERNOR_OFFICE: { name: "Kantor Gubernur", desc: "Kebijakan tingkat tinggi." },
      PARLIAMENT: { name: "Gedung Dewan", desc: "Simbol suara rakyat." }
    }
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
    newsDefault: ["Welcome to EcoCity!", "Log in to save your data."],
    simulationSpeed: "Simulation Speed",
    themeMode: "Theme Mode",
    manualSave: "Manual Save",
    lastAutosave: "Last Autosave",
    resetExit: "Reset & Exit Game",
    analyticsTablet: "City Analytics Tablet",
    tabletSummary: "Summary",
    tabletApps: "App Store",
    tabletMaps: "Select Region",
    recommendedApps: "Important Apps",
    appDownload: "Download",
    appInstalled: "Installed",
    level: "Level",
    exp: "XP",
    quests: "City Quests",
    fireAlert: "FIRE ALERT!",
    extinguish: "Extinguish",
    mapLocked: "Locked (Level {L})",
    realTimeMonitoring: "City Progress Analytics",
    appEcoMonitor: "Eco Monitor",
    appEcoMonitorDesc: "Track real-time pollution data.",
    appDispatch: "Emergency Dispatch",
    appDispatchDesc: "Quick access to emergency services.",
    appTax: "Tax Optimizer",
    appTaxDesc: "Adjust city tax ratios.",
    appAi: "City AI Assistant",
    appAiDesc: "Smart advice for your city.",
    totalWealth: "Total Wealth",
    envIndex: "Environmental Index",
    pollutionLevel: "Pollution Level",
    currentPop: "Current Population",
    connectCloud: "Connect Cloud",
    slogan: "Design a sustainable future. Harmony between economy, environment, and social in one simulation.",
    protestTitle: "CITIZEN PROTEST!",
    protestSubtitle: "CALM THE CITIZENS AND CALL POLICE",
    callPolice: "CALL POLICE",
    protests: {
      pollution: ["Lower Pollution! 🪧", "Can't breathe! 😷"],
      eco: ["Where are our trees? 🌳", "It's so hot.. 🌵"]
    },
    messages: {
      welcome: ["Welcome to EcoCity!", "Log in to save your progress."],
      krisis: ["CRISIS! CITIZENS ANGRY!", "Call the police immediately!"],
      bankrupt: ["CITY BANKRUPT!", "Your management has failed. Try again."],
      placed: "Successfully placed",
      placedSub: "Construction started.",
      noFunds: ["Lack of funds!", "Not enough money to build this."],
      bulldozed: "Bulldozed",
      bulldozedSub: "Area cleared for new development.",
      expansionNeeded: "Need $",
      expansionNeededSub: "for expansion! Collect more money first.",
      reset: ["City has been reset.", "Start fresh, make it better!"],
      saved: ["Progress saved!", "Data saved in browser."],
      auth: ["Authenticating...", "Checking cloud credentials..."],
      loginSuccess: ["Login Success!", "Your city progress is now synced."],
      loginCancelled: ["Login cancelled.", "Access closed by user."],
      domainUnauthorized: ["Domain Unauthorized.", "This domain is not allowed on Firebase."],
      loginFailed: ["Login Failed", "Failed to sign in. Check connection."],
      ready: "Ready to build, Manager?",
      newLeaf: "A new leaf, Manager. Let's build!"
    },
    achievements: {
      pop_1: { title: "Small Village", desc: "Reach 200 population" },
      pop_2: { title: "Self-Sufficient City", desc: "Reach 500 population" },
      pop_3: { title: "Green Metropolis", desc: "Reach 1000 population" },
      eco_1: { title: "Nature Lover", desc: "Reach 95% Eco Health" },
      eco_2: { title: "Urban Forest", desc: "Reach 98% Eco Health" },
      mon_1: { title: "Rich Person", desc: "Collect $5,000" },
      mon_2: { title: "Eco Sultan", desc: "Collect $15,000" },
      build_1: { title: "Young Architect", desc: "Build 10 buildings" },
      build_2: { title: "Pro Builder", desc: "Build 25 buildings" },
      build_3: { title: "Master Planner", desc: "Build 50 buildings" }
    },
    categories: {
      ENERGY: "Energy",
      ECONOMY: "Economy",
      RESIDENTIAL: "Housing",
      PUBLIC_SERVICE: "Services",
      ENVIRONMENT: "Ecology",
      CULTURAL: "Social",
      INFRASTRUCTURE: "Utility"
    },
    buildings: {
      COAL_PLANT: { name: "Coal Plant", desc: "Cheap power, high pollution." },
      SOLAR_FARM: { name: "Solar Farm", desc: "Clean sun-based energy." },
      WIND_TURBINE: { name: "Wind Turbine", desc: "Harnessing the wind power." },
      NUCLEAR_PLANT: { name: "Nuclear Reactor", desc: "Huge power, high risk." },
      TRADITIONAL_MARKET: { name: "Traditional Market", desc: "Core of local economy." },
      VERTICAL_GARDEN: { name: "Vertical Garden", desc: "Forest in the city center." },
      TECH_STARTUP: { name: "Tech Startup", desc: "Modern digital economy." },
      SHOPPING_MALL: { name: "Luxury Mall", desc: "Shopping & entertainment." },
      OFFICE_TOWER: { name: "Office Tower", desc: "Global business hub." },
      APARTMENT: { name: "Eco Apartment", desc: "Cozy vertical living." },
      SMART_RESIDENCE: { name: "Smart Housing", desc: "Future smart homes." },
      COMMUNITY_HUB: { name: "Community Hub", desc: "Social interaction core." },
      HOSPITAL: { name: "City Hospital", desc: "Health is our priority." },
      PARK: { name: "Public Park", desc: "Green and relax space." },
      RECYCLING_CENTER: { name: "Recycling Center", desc: "Waste into resources." },
      POLICE_STATION: { name: "Police Station", desc: "Keeping citizens safe." },
      UNIVERSITY: { name: "University", desc: "Educating next generation." },
      ECO_STADIUM: { name: "Solar Stadium", desc: "Grand sports center." },
      MOSQUE: { name: "Grand Mosque", desc: "Spiritual serenity." },
      CHURCH: { name: "Cathedral", desc: "Harmony in faith." },
      TEMPLE: { name: "Temple", desc: "Inner peace balance." },
      FIRE_STATION: { name: "Fire Station", desc: "24/7 emergency alert." },
      CAR_DEALER: { name: "Car Dealer", desc: "Urban automotive center." },
      RESIDENTIAL_GRID_CONTROLLER: { name: "Residential Grid", desc: "Optimize housing power." },
      MAYOR_OFFICE: { name: "Mayor's Office", desc: "City policy center." },
      GOVERNOR_OFFICE: { name: "Governor's Office", desc: "Regional policy hub." },
      PARLIAMENT: { name: "Council Hall", desc: "Voice of the people." }
    }
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
    newsDefault: ["مرحباً بكم في إيكو سيتي!", "سجل الدخول لحفظ البيانات."],
    simulationSpeed: "سرعة المحاكاة",
    themeMode: "وضع السمة",
    manualSave: "حفظ يدوي",
    lastAutosave: "آخر حفظ تلقائي",
    resetExit: "إعادة تعيين وخروج",
    analyticsTablet: "جهاز التحليل المحلي",
    tabletSummary: "ملخص",
    tabletApps: "متجر التطبيقات",
    tabletMaps: "اختيار المنطقة",
    recommendedApps: "تطبيقات هامة",
    appDownload: "تحميل",
    appInstalled: "تم التثبيت",
    level: "المستوى",
    exp: "خبرة",
    quests: "مهام المدينة",
    fireAlert: "إنذار حريق!",
    extinguish: "إخماد",
    mapLocked: "مغلق (مستوى {L})",
    realTimeMonitoring: "تحليلات تقدم المدينة",
    appEcoMonitor: "مراقب البيئة",
    appEcoMonitorDesc: "تتبع بيانات التلوث في الوقت الحقيقي.",
    appDispatch: "مركز الطوارئ",
    appDispatchDesc: "الوصول السريع إلى خدمات الأمن.",
    appTax: "محسن الضرائب",
    appTaxDesc: "ضبط نسب الضرائب في المدينة.",
    appAi: "مساعد الذكاء الاصطراعي",
    appAiDesc: "نصائح ذكية لمدينتك.",
    totalWealth: "إجمالي الثروة",
    envIndex: "مؤشر البيئة",
    pollutionLevel: "مستوى التلوث",
    currentPop: "السكان الحاليون",
    connectCloud: "الاتصال بالسحابة",
    slogan: "صمم مستقبلاً مستداماً. الانسجام بين الاقتصاد والبيئة والمجتمع في محاكاة واحدة.",
    protestTitle: "احتجاج المواطنين!",
    protestSubtitle: "هدئ المواطنين واتصل بالشرطة",
    callPolice: "اتصل بالشرطة",
    protests: {
      pollution: ["قلل التلوث! 🪧", "لا أستطيع التنفس! 😷"],
      eco: ["أين أشجارنا؟ 🌳", "الجو حار جداً.. 🌵"]
    },
    messages: {
      welcome: ["مرحباً بكم في إيكو سيتي!", "سجل الدخول لحفظ تقدمك."],
      krisis: ["أزمة! المواطنون غاضبون!", "اتصل بالشرطة فوراً!"],
      bankrupt: ["إفلاس المدينة!", "فشلت إدارتك. حاول مرة أخرى."],
      placed: "تم وضع",
      placedSub: "بدأ البناء.",
      noFunds: ["نقص في الأموال!", "لا يوجد مال كافٍ لبناء هذا."],
      bulldozed: "تم هدم",
      bulldozedSub: "تم إخلاء المنطقة للتطوير الجديد.",
      expansionNeeded: "بحاجة إلى $",
      expansionNeededSub: "للتوسيع! اجمع المزيد من المال أولاً.",
      reset: ["تم إعادة تعيين المدينة.", "ابدأ من جديد، واجعلها أفضل!"],
      saved: ["تم حفظ التقدم!", "تم حفظ البيانات في المتصفح."],
      auth: ["جاري التحقق...", "فحص بيانات السحابة..."],
      loginSuccess: ["تم تسجيل الدخول بنجاح!", "تقدم مدينتك متزامن الآن."],
      loginCancelled: ["تم إلغاء الدخول.", "تم إغلاق الوصول من قبل المستخدم."],
      domainUnauthorized: ["النطاق غير مصرح به.", "هذا النطاق غير مسموح به في Firebase."],
      loginFailed: ["فشل تسجيل الدخول.", "فشل في الدخول. تحقق من الاتصال."],
      ready: "جاهز للبناء، أيها المدير؟",
      newLeaf: "بداية جديدة، أيها المدير. لنبنِ!"
    },
    achievements: {
      pop_1: { title: "قرية صغيرة", desc: "وصول 200 نسمة" },
      pop_2: { title: "مدينة مستقلة", desc: "وصول 500 نسمة" },
      pop_3: { title: "مدينة خضراء", desc: "وصول 1000 نسمة" },
      eco_1: { title: "محب للطبيعة", desc: "وصول 95% صحة بيئية" },
      eco_2: { title: "غابة حضرية", desc: "وصول 98% صحة بيئية" },
      mon_1: { title: "شخص غني", desc: "جمع $5,000" },
      mon_2: { title: "سلطان إيكو", desc: "جمع $15,000" },
      build_1: { title: "مهندس شاب", desc: "بناء 10 مبانٍ" },
      build_2: { title: "بناء محترف", desc: "بناء 25 مبنى" },
      build_3: { title: "مخطط بارع", desc: "بناء 50 مبنى" }
    },
    categories: {
      ENERGY: "طاقة",
      ECONOMY: "اقتصاد",
      RESIDENTIAL: "سكن",
      PUBLIC_SERVICE: "خدمات",
      ENVIRONMENT: "بيئة",
      CULTURAL: "ثقافة",
      INFRASTRUCTURE: "بنية"
    },
    buildings: {
      COAL_PLANT: { name: "محطة فحم", desc: "طاقة رخيصة، تلوث عالٍ." },
      SOLAR_FARM: { name: "مزرعة شمسية", desc: "طاقة شمسية نظيفة." },
      WIND_TURBINE: { name: "توربينات رياح", desc: "استخدام قوة الرياح." },
      NUCLEAR_PLANT: { name: "مفاعل نووي", desc: "طاقة هائلة، مخاطر عالية." },
      TRADITIONAL_MARKET: { name: "سوق شعبي", desc: "قلب الاقتصاد المحلي." },
      VERTICAL_GARDEN: { name: "حديقة عمودية", desc: "غابة في وسط المدينة." },
      TECH_STARTUP: { name: "شركة ناشئة", desc: "اقتصاد رقمي حديث." },
      SHOPPING_MALL: { name: "مول فاخر", desc: "تسوق وترفيه." },
      OFFICE_TOWER: { name: "برج مكاتب", desc: "مركز أعمال عالمي." },
      APARTMENT: { name: "شقة بيئية", desc: "حياة عمودية مريحة." },
      SMART_RESIDENCE: { name: "سكن ذكي", desc: "منازل ذكية مستقبلية." },
      COMMUNITY_HUB: { name: "مركز حي", desc: "قلب التفاعل الاجتماعي." },
      HOSPITAL: { name: "مستشفى المدينة", desc: "الصحة أولويتنا." },
      PARK: { name: "حديقة عامة", desc: "مساحة خضراء للاسترخاء." },
      RECYCLING_CENTER: { name: "مركز تدوير", desc: "النفايات إلى موارد." },
      POLICE_STATION: { name: "مركز شرطة", desc: "الحفاظ على سلامة السكان." },
      UNIVERSITY: { name: "جامعة", desc: "تعليم الجيل القادم." },
      ECO_STADIUM: { name: "ملعب شمسي", desc: "مركز رياضي ضخم." },
      MOSQUE: { name: "المسجد الكبير", desc: "هدوء روحي." },
      CHURCH: { name: "الكاتدرائية", desc: "انسجام في الإيمان." },
      TEMPLE: { name: "معبد", desc: "توازن السلام الداخلي." },
      FIRE_STATION: { name: "مركز إطفاء", desc: "تنبيه طوارئ 24/7." },
      CAR_DEALER: { name: "وكيل سيارات", desc: "مركز السيارات الحضري." },
      RESIDENTIAL_GRID_CONTROLLER: { name: "شبكة سكنية", desc: "تحسين طاقة السكن." },
      MAYOR_OFFICE: { name: "مكتب العمدة", desc: "مركز سياسة المدينة." },
      GOVERNOR_OFFICE: { name: "مكتب المحافظ", desc: "مركز السياسة الإقليمي." },
      PARLIAMENT: { name: "قاعة المجلس", desc: "صوت الشعب." }
    }
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
  level: 1,
  exp: 0,
  maxExp: 100,
  unlockedMaps: ['emerald_plains'],
  currentMapId: 'emerald_plains',
  downloadedApps: [],
  activeFires: [],
  quests: [
    { id: 'q1', title: 'Awal Baru', description: 'Bangun 5 gedung apa saja', target: 5, progress: 0, rewardExp: 50, rewardMoney: 500, isCompleted: false, type: 'BUILDINGS' },
    { id: 'q2', title: 'Ekspansi', description: 'Capai 500 populasi', target: 500, progress: 0, rewardExp: 100, rewardMoney: 1000, isCompleted: false, type: 'POPULATION' }
  ],
  history: {
    pop: [],
    money: [],
    eco: [],
    pol: [],
    labels: []
  },
  expansionCount: 0,
  isDemoActive: false
};

const MAPS: MapData[] = [
  { 
    id: 'emerald_plains', 
    name: 'Emerald Plains', 
    levelRequired: 1, 
    gridSize: 12, 
    description: 'Dataran hijau yang subur, cocok untuk pemula.', 
    color: 'emerald',
    gridBg: 'bg-emerald-950/20',
    gridBorder: 'border-emerald-500/20',
    cellBg: 'bg-emerald-900/10'
  },
  { 
    id: 'neon_bay', 
    name: 'Neon Bay', 
    levelRequired: 5, 
    gridSize: 15, 
    description: 'Area pesisir masa depan dengan gemerlap lampu.', 
    color: 'indigo',
    gridBg: 'bg-slate-950',
    gridBorder: 'border-indigo-500/30',
    cellBg: 'bg-indigo-500/5 shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]'
  },
  { 
    id: 'lava_valley', 
    name: 'Lava Valley', 
    levelRequired: 10, 
    gridSize: 20, 
    description: 'Tantangan ekstrem di lembah berapi.', 
    color: 'orange',
    gridBg: 'bg-zinc-950',
    gridBorder: 'border-orange-500/40',
    cellBg: 'bg-orange-950/10 shadow-[inner_0_0_20px_rgba(249,115,22,0.05)]'
  },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const prevUserRef = useRef<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const t = TRANSLATIONS[state.language || 'id'];

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
              history: (data.history && !Array.isArray(data.history)) ? data.history : INITIAL_STATE.history
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
              const parsed = JSON.parse(saved);
              setState(prev => ({
                ...prev,
                ...parsed,
                history: (parsed.history && !Array.isArray(parsed.history)) ? parsed.history : INITIAL_STATE.history
              }));
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

  const [news, setNews] = useState<string[]>(t.messages.welcome);
  const [advisorMsg, setAdvisorMsg] = useState<string>(t.messages.ready);
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
  const [floatingMoney, setFloatingMoney] = useState<{id: string, x: number, y: number, amount: number}[]>([]);
  const [protestBubbles, setProtestBubbles] = useState<{id: string, x: number, y: number, text: string}[]>([]);
  const [draggedBuilding, setDraggedBuilding] = useState<BuildingType | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [tabletTab, setTabletTab] = useState<'SUMMARY' | 'APPS' | 'MAPS'>('SUMMARY');
  const [dragHoveredCell, setDragHoveredCell] = useState<{x: number, y: number} | null>(null);
  const [showTablet, setShowTablet] = useState(false);
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState("");
  const [tabletRange, setTabletRange] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('DAY');

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
  const currentMap = MAPS.find(m => m.id === state.currentMapId);
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
        if (prev.isDemoActive && Math.random() < 0.7) return prev; 

        let income = 0;
        let ecoDelta = 0;
        let polDelta = 0;
        let popDelta = 0;
        let maintenance = 0;

        const newFloatingMoney: any[] = [];
        const newProtestBubbles: any[] = [];

        prev.buildings.forEach(b => {
          const data = BuildingDataMap[b.type];
          if (!data) return;
          
          const buildingIncome = data.income;
          income += buildingIncome;
          maintenance += data.cost * 0.02; // 2% maintenance cost

          ecoDelta += data.ecoImpact / 20;
          polDelta -= data.ecoImpact / 20;
          popDelta += (data.category === 'RESIDENTIAL' ? 15 : 2);

          // Random floating money popup
          if (Math.random() < 0.2) {
            newFloatingMoney.push({
              id: Math.random().toString(36).substr(2, 9),
              x: b.x,
              y: b.y,
              amount: buildingIncome
            });
          }

          // Administrative boost
          if (b.type === 'PARLIAMENT') income += 500; // Extra budget
          if (b.type === 'GOVERNOR_OFFICE') ecoDelta += 0.5; // Regional policy
        });

        // Demonstrations logic
        const mayorOffice = prev.buildings.find(b => b.type === 'MAYOR_OFFICE');
        if (mayorOffice && (prev.pollution > 50 || prev.ecoHealth < 40)) {
          if (Math.random() < 0.3) {
            newProtestBubbles.push({
              id: Math.random().toString(36).substr(2, 9),
              x: mayorOffice.x,
              y: mayorOffice.y,
              text: prev.pollution > 50 ? t.protests.pollution[0] : t.protests.eco[0]
            });
          }
        }

        // Crisis Trigger (Demo Mode)
        let newDemoState = prev.isDemoActive;
        if (!prev.isDemoActive && (prev.pollution > 85 || prev.ecoHealth < 20)) {
          if (Math.random() < 0.05) {
            newDemoState = true;
            setNews(t.messages.krisis);
          }
        }

        // Random individual protest bubble on bad condition (Only for Residential)
        if ((prev.pollution > 60 || prev.ecoHealth < 30)) {
          prev.buildings.forEach(b => {
            const bData = BuildingDataMap[b.type];
            if (bData?.category === 'RESIDENTIAL' && Math.random() < 0.04) {
               newProtestBubbles.push({
                 id: Math.random().toString(36).substr(2, 9),
                 x: b.x,
                 y: b.y,
                 text: prev.pollution > 60 ? t.protests.pollution[1] : t.protests.eco[1]
               });
            }
          });
        }

        if (newFloatingMoney.length > 0) {
          setFloatingMoney(curr => [...curr, ...newFloatingMoney].slice(-20));
          setTimeout(() => {
            setFloatingMoney(curr => curr.filter(f => !newFloatingMoney.find(nf => nf.id === f.id)));
          }, 1500);
        }

        if (newProtestBubbles.length > 0) {
          setProtestBubbles(curr => [...curr, ...newProtestBubbles].slice(-10));
          setTimeout(() => {
            setProtestBubbles(curr => curr.filter(p => !newProtestBubbles.find(nb => nb.id === p.id)));
          }, 3000);
        }

        // Natural decay
        ecoDelta += prev.ecoHealth < 40 ? -0.2 : 0.08;
        
        // Tax Collection Logic
        const taxPower = (income * prev.taxRate) / 50; 
        const netProfit = income + taxPower - maintenance;
        
        // Fire System (Random Chance)
        let newFires = [...(prev.activeFires || [])];
        if (prev.buildings.length > 5 && Math.random() < 0.05 && newFires.length < 3) {
          const randomBuilding = prev.buildings[Math.floor(Math.random() * prev.buildings.length)];
          if (!newFires.some(f => f.x === randomBuilding.x && f.y === randomBuilding.y)) {
            newFires.push({ x: randomBuilding.x, y: randomBuilding.y, intensity: 100 });
            setNews(["BAHAYA: KEBAKARAN!", "Segera padamkan api di kotamu!"]);
          }
        }

        if (newFires.length > 0) {
          popDelta -= (2 * newFires.length);
          ecoDelta -= (0.5 * newFires.length);
        }

        const newEco = Math.max(0, Math.min(100, prev.ecoHealth + ecoDelta));
        const newPol = Math.max(0, Math.min(100, prev.pollution + polDelta));
        const newPop = Math.max(0, prev.population + popDelta);
        let currentMoney = Math.max(0, prev.money + netProfit);

        // Quest and XP Progress
        let newExp = prev.exp;
        let newLevel = prev.level;
        const updatedQuests = prev.quests.map(quest => {
          if (quest.isCompleted) return quest;
          let currentProgress = quest.progress;
          switch (quest.type) {
            case 'POPULATION': currentProgress = newPop; break;
            case 'MONEY': currentProgress = currentMoney; break;
            case 'ECO': currentProgress = newEco; break;
            case 'BUILDINGS': currentProgress = prev.buildings.length; break;
          }
          if (currentProgress >= quest.target) {
            newExp += quest.rewardExp;
            currentMoney += quest.rewardMoney;
            setNews([`Quest Selesai: ${quest.title}`, `+${quest.rewardExp} XP, +$${quest.rewardMoney}`]);
            return { ...quest, progress: currentProgress, isCompleted: true };
          }
          return { ...quest, progress: currentProgress };
        });

        // Level Up Logic
        if (newExp >= prev.maxExp) {
          newLevel += 1;
          newExp -= prev.maxExp;
          const newMaxExp = Math.floor(prev.maxExp * 1.5);
          setNews([`CITY LEVEL UP!`, `Sekarang kamu Level ${newLevel}`]);
          MAPS.forEach(m => {
            if (newLevel >= m.levelRequired && !prev.unlockedMaps.includes(m.id)) {
              prev.unlockedMaps.push(m.id);
            }
          });
        }

        const newRisk = calculateBankruptcyRisk({ ...prev, money: currentMoney, ecoHealth: newEco, pollution: newPol });

        // GameOver Check
        if (newRisk >= 100) {
          setNews(t.messages.bankrupt);
          setIsGamePaused(true);
        }

        const now = new Date();
        const label = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        const safeHistory = prev.history || { pop: [], money: [], eco: [], pol: [], labels: [] };
        const newHistory = {
          pop: [...(safeHistory.pop || []), newPop].slice(-60),
          money: [...(safeHistory.money || []), currentMoney].slice(-60),
          eco: [...(safeHistory.eco || []), newEco].slice(-60),
          pol: [...(safeHistory.pol || []), newPol].slice(-60),
          labels: [...(safeHistory.labels || []), label].slice(-60),
        };

        // Achievement Checks
        const updatedAchievements = prev.achievements.map(ach => {
          if (ach.completed) return ach;
          let currentValue = 0;
          switch (ach.type) {
            case 'POPULATION': currentValue = newPop; break;
            case 'MONEY': currentValue = currentMoney; break;
            case 'ECO': currentValue = newEco; break;
            case 'BUILDINGS': currentValue = prev.buildings.length; break;
          }
          if (currentValue >= ach.target) return { ...ach, current: currentValue, completed: true };
          return { ...ach, current: currentValue };
        });

        return {
          ...prev,
          money: currentMoney,
          ecoHealth: newEco,
          pollution: newPol,
          population: newPop,
          level: newLevel,
          exp: newExp,
          maxExp: prev.maxExp,
          activeFires: newFires,
          quests: updatedQuests,
          bankruptcyRisk: newRisk,
          achievements: updatedAchievements,
          history: newHistory,
          isDemoActive: newDemoState
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
  const syncCityAIContent = useCallback(async (force = false) => {
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
    
    // Initial sync
    syncCityAIContent(true);

    const tickerInterval = setInterval(() => {
      syncCityAIContent();
    }, 45000); // 45s interval

    return () => clearInterval(tickerInterval);
  }, [isGameStarted, isGamePaused, syncCityAIContent]);

  const handleDrag = (event: any) => {
    const x = event.clientX || (event.touches?.[0]?.clientX);
    const y = event.clientY || (event.touches?.[0]?.clientY);
    
    if (x == null || y == null) return;
    
    const elements = document.elementsFromPoint(x, y);
    const cellElement = elements.find(el => el.hasAttribute('data-grid-cell'));
    
    if (cellElement) {
        const cx = parseInt(cellElement.getAttribute('data-cx') || '0');
        const cy = parseInt(cellElement.getAttribute('data-cy') || '0');
        if (dragHoveredCell?.x !== cx || dragHoveredCell?.y !== cy) {
            setDragHoveredCell({x: cx, y: cy});
        }
    } else if (dragHoveredCell !== null) {
        setDragHoveredCell(null);
    }
  };

  const extinguishFire = (x: number, y: number) => {
    setState(prev => ({
      ...prev,
      activeFires: prev.activeFires.filter(f => f.x !== x || f.y !== y),
      money: Math.max(0, prev.money - 50) // Cost to extinguish
    }));
    setNews(["Api padam!", "Warga kembali merasa aman."]);
  };

  const downloadApp = (appId: string) => {
    const cost = 500;
    if (state.money >= cost) {
       setState(prev => ({
         ...prev,
         money: prev.money - cost,
         downloadedApps: [...prev.downloadedApps, appId]
       }));
       setNews(["Aplikasi Terpasang", "Silakan cek fitur barumu."]);
    } else {
       setNews(t.messages.noFunds);
    }
  };

  const selectMap = (mapId: string) => {
    const map = MAPS.find(m => m.id === mapId);
    if (!map) return;
    if (state.level < map.levelRequired) return;

    if (window.confirm("Pindah wilayah akan mereset tata letak kota saat ini. Lanjutkan?")) {
      setState(prev => ({
        ...prev,
        currentMapId: mapId,
        gridSize: map.gridSize,
        buildings: [],
        activeFires: [],
        money: prev.money + 5000 // Moving bonus
      }));
      setNews([`Selamat Datang di ${map.name}`, map.description]);
    }
  };

  const handleDragEnd = (event: any, type: BuildingType) => {
    const x = event.clientX || (event.changedTouches?.[0]?.clientX);
    const y = event.clientY || (event.changedTouches?.[0]?.clientY);
    
    setDragHoveredCell(null);
    
    if (x == null || y == null) {
        setSelectedBuilding(null);
        setHoveredCell(null);
        return;
    }
    
    // Find the cell at this position
    const elements = document.elementsFromPoint(x, y);
    const cellElement = elements.find(el => el.hasAttribute('data-grid-cell'));
    
    if (cellElement) {
        const cx = parseInt(cellElement.getAttribute('data-cx') || '0');
        const cy = parseInt(cellElement.getAttribute('data-cy') || '0');
        
        // Place building
        const data = BuildingDataMap[type];
        if (state.money >= data.cost && grid[cy][cx] === null) {
            setState(prev => ({
                ...prev,
                money: prev.money - data.cost,
                buildings: [...prev.buildings, { id: Math.random().toString(36), type, x: cx, y: cy, createdAt: Date.now() }]
            }));
            setNews([`${t.messages.placed} ${t.buildings[type]?.name || data.name}!`, t.messages.placedSub]);
        } else if (state.money < data.cost) {
            setNews(t.messages.noFunds);
        }
    }
    setSelectedBuilding(null);
    setHoveredCell(null);
  };

  const handleCellClick = (x: number, y: number) => {
    if (isDeleteMode) {
      const existing = state.buildings.find(b => b.x === x && b.y === y);
      if (existing) {
        deleteBuilding(existing.id);
        setNews([`${t.messages.bulldozed} ${t.buildings[existing.type]?.name || BuildingDataMap[existing.type]?.name || 'Building'}`, t.messages.bulldozedSub]);
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

  // Expansion Cost Scaling
  const getExpansionCost = () => {
    return Math.floor(1000 * Math.pow(1.5, state.expansionCount || 0));
  };

  const expandGrid = () => {
    const cost = getExpansionCost();
    if (state.money < cost) {
      setNews([`${t.messages.expansionNeeded}${cost.toLocaleString()}${t.messages.expansionNeededSub}`, ""]);
      return;
    }

    setState(prev => ({
      ...prev,
      money: prev.money - cost,
      gridSize: prev.gridSize + 1,
      expansionCount: (prev.expansionCount || 0) + 1
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
      localStorage.removeItem('ecocity_save_v2');
      setState(INITIAL_STATE);
      setIsGameStarted(true);
      setIsDeleteMode(false);
      setNews(t.messages.reset);
      setAdvisorMsg(t.messages.newLeaf);
    }
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedBuilding(null);
    setMovingBuilding(null);
  };

  const manualSave = () => {
    localStorage.setItem('ecocity_save_v2', JSON.stringify(state));
    setLastSaveTime(Date.now());
    setNews(t.messages.saved);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2500);
  };

  const handleLogin = async () => {
    setNews(t.messages.auth);
    try {
      await loginWithGoogle();
      setNews(t.messages.loginSuccess);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setNews(t.messages.loginCancelled);
      } else if (error.code === 'auth/unauthorized-domain') {
        setNews(t.messages.domainUnauthorized);
      } else {
        console.error("Login failed", error);
        setNews(t.messages.loginFailed);
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
              <h1 className={cn(
                "font-black text-xl tracking-tighter leading-none",
                state.theme === 'dark' ? "text-white" : "text-zinc-900"
              )}>ECO<span className="text-emerald-500">CITY</span></h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                <p className="text-[8px] text-emerald-500 font-black uppercase tracking-[0.3em]">Operational</p>
              </div>
            </div>
          </motion.button>

          {/* Floating Bubble Advisor - Redesigned as a Chat Interface */}
          <div className="hidden md:flex flex-1 justify-center px-10">
            <motion.div 
              key={advisorMsg}
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "group px-5 py-2.5 rounded-2xl border flex items-center gap-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] relative transition-all hover:scale-[1.02]",
                state.theme === 'dark' 
                  ? "bg-zinc-900/80 border-emerald-500/20 backdrop-blur-xl" 
                  : "bg-white/80 border-emerald-100 backdrop-blur-xl"
              )}
            >
              {/* Status Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity" />

              <div className="relative flex items-center justify-center">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <Zap size={18} className="text-emerald-500 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
              </div>

              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500 opacity-70">AI Assistant</span>
                  <div className="h-1 w-1 rounded-full bg-zinc-700" />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">{isAiLoading ? 'Analyzing...' : 'Ready'}</span>
                </div>
                <p className={cn(
                  "text-xs font-bold max-w-[420px] leading-tight line-clamp-1",
                  state.theme === 'dark' ? "text-zinc-100" : "text-zinc-800"
                )}>
                  {isAiLoading ? "Processing city data modules..." : advisorMsg}
                </p>
              </div>

              <button 
                 onClick={() => syncCityAIContent(true)}
                 className="shrink-0 p-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition-all group/btn active:scale-90"
                 title="Force AI Refresh"
              >
                <Activity size={12} className="group-hover/btn:rotate-12 transition-transform" />
              </button>
              
              {/* Nested Pulse Notification */}
              <AnimatePresence>
                {notifications.length > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -right-2 -top-2 flex items-center justify-center"
                  >
                    <div className="bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-rose-500/40 border border-white/20">
                      {notifications.length}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stacked Notifications Tooltip */}
              <AnimatePresence>
                {notifications.length > 0 && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    className="absolute top-full mt-3 left-0 right-0 z-[110] pointer-events-none space-y-2"
                  >
                    {notifications.slice(0, 2).map((n, idx) => (
                      <motion.div
                        key={n.id}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className={cn(
                          "px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-2xl",
                          n.type === 'protest' 
                            ? "bg-rose-500/90 border-rose-400 text-white" 
                            : "bg-amber-500/90 border-amber-400 text-black"
                        )}
                        style={{ scale: 1 - idx * 0.05, translateY: idx * -4 }}
                      >
                        <AlertTriangle size={14} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wide leading-tight">{n.text}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
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
              <StatCard label={t.money} value={(state.money + metricJitter).toLocaleString()} color="bg-amber-500" icon={DollarSign} suffix="$" theme={state.theme} />
              <StatCard label={t.eco} value={(state.ecoHealth + metricJitter).toFixed(2)} color="bg-emerald-500" icon={TrendingUp} suffix="%" theme={state.theme} />
              <StatCard label={t.pollution} value={(state.pollution + metricJitter).toFixed(2)} color="bg-rose-500" icon={Wind} suffix="%" theme={state.theme} />
              <StatCard label={t.citizens} value={Math.floor(state.population + (metricJitter > 0 ? 1 : 0)).toLocaleString()} color="bg-indigo-500" icon={Users} theme={state.theme} />
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTablet(true)}
              className={cn(
                "p-2.5 rounded-xl border transition-all shrink-0 text-emerald-500",
                state.theme === 'dark' ? "bg-zinc-900 border-white/5 hover:border-emerald-500/30" : "bg-white border-zinc-200 hover:border-emerald-500/30"
              )}
              title="City Analytics Tablet"
            >
              <Tablet size={18} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={manualSave}
              className={cn(
                "p-2.5 rounded-xl border transition-all shrink-0 text-emerald-500",
                state.theme === 'dark' ? "bg-zinc-900 border-white/5 hover:border-emerald-500/30" : "bg-white border-zinc-200 hover:border-emerald-500/30"
              )}
              title="Manual Save"
            >
              <Save size={18} />
            </motion.button>

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
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t.settings}</span>
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
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{t.simulationSpeed}</span>
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
                <span className="text-sm">{t.themeMode}</span>
                {state.theme === 'dark' ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} className="text-amber-600" />}
              </button>

              <button onClick={manualSave} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-500/10 transition-colors text-emerald-500">
                <span className="text-sm font-bold">{t.manualSave}</span>
                <Save size={18} />
              </button>
              
              <div className="pt-2 flex flex-col gap-2">
                <div className="text-[10px] text-zinc-500 flex justify-between uppercase">
                  <span>{t.lastAutosave}</span>
                  <span>{Math.floor((Date.now() - lastSaveTime)/1000)}s ago</span>
                </div>
                <button onClick={resetGame} className="flex items-center gap-2 p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors text-sm font-bold">
                  <LogOut size={18} /> {t.resetExit}
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
          state.theme === 'dark' ? "bg-black/60 border-white/5" : "bg-white border-zinc-200 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)]"
        )}>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{t.construction}</h2>
                <p className={cn(
                  "text-xs font-bold mt-1",
                  state.theme === 'dark' ? "text-zinc-300" : "text-zinc-600"
                )}>{state.language === 'id' ? 'Gedung Ramah Lingkungan' : 'Sustainable Buildings'}</p>
              </div>
              <button 
                onClick={toggleDeleteMode}
                className={cn(
                  "p-2 px-3 rounded-xl transition-all flex items-center gap-2 border shadow-lg",
                  isDeleteMode 
                    ? "bg-rose-500 text-black border-rose-400 font-black text-[9px] uppercase" 
                    : state.theme === 'dark'
                      ? "bg-zinc-900/80 text-zinc-400 border-white/5 hover:border-rose-500/50 text-[9px] uppercase font-black"
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-rose-500/50 text-[9px] uppercase font-black"
                )}
              >
                <Trash2 size={12} />
                <span>{t.bulldoze}</span>
              </button>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border shadow-inner",
              state.theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-100/50 border-zinc-200"
            )}>
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
                     "px-2 py-2 rounded-xl text-[8px] font-black uppercase transition-all border text-center leading-none tracking-widest min-h-[36px] flex items-center justify-center",
                     selectedCategory === cat 
                       ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_5px_15px_rgba(16,185,129,0.3)]" 
                       : "bg-zinc-900/40 text-zinc-500 border-white/5 hover:text-zinc-300 hover:bg-zinc-800/60"
                   )}
                 >
                   {(t.categories as any)[cat] || cat}
                 </button>
               ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(BUILDINGS) as BuildingType[])
                .filter(type => BUILDINGS[type].category === selectedCategory)
                .map(type => (
                  <BuildingItem 
                    key={type}
                    type={type} 
                    data={{
                      ...BuildingDataMap[type], 
                      name: (t.buildings as any)[type]?.name || BuildingDataMap[type].name,
                      description: (t.buildings as any)[type]?.desc || BuildingDataMap[type].description
                    }} 
                    onSelect={(t: BuildingType) => {
                      setSelectedBuilding(t);
                      setIsDeleteMode(false);
                      setMovingBuilding(null);
                    }}
                    disabled={state.money < BuildingDataMap[type].cost}
                    isSelected={selectedBuilding === type}
                    theme={state.theme}
                    onDragStart={(t: any) => setSelectedBuilding(t)}
                    onDrag={(e: any) => handleDrag(e)}
                    onDragEnd={(e: any) => handleDragEnd(e, type)}
                  />
                ))}
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
            : "bg-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/60 via-zinc-50 to-stone-100"
        )}>
          {/* Enhanced Eco-Background with Image */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={cn(
              "absolute inset-0 opacity-20",
              state.theme === 'light' && "opacity-[0.08]"
            )}>
               <img 
                 src="https://images.unsplash.com/photo-1518005020250-675f042d3858?auto=format&fit=crop&q=80&w=2000" 
                 alt="Background" 
                 className={cn(
                   "w-full h-full object-cover grayscale contrast-125",
                   state.theme === 'dark' ? "brightness-50" : "brightness-100 contrast-75"
                 )}
               />
            </div>
            <div className={cn(
              "absolute inset-0",
              state.theme === 'dark' ? "bg-gradient-to-br from-black/80 via-black/40 to-black/80" : "bg-gradient-to-br from-white/90 via-white/40 to-white/90"
            )} />
            
            {/* Biological Mesh Grid */}
            <div className={cn(
              "absolute inset-0 opacity-[0.03]",
              state.theme === 'light' && "opacity-[0.05]"
            )} 
                 style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${state.theme === 'dark' ? '#10b981' : '#059669'} 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            
            {/* Moving Light Beams */}
            <motion.div 
              animate={{ 
                x: [-100, 100],
                opacity: state.theme === 'dark' ? [0.1, 0.3, 0.1] : [0.05, 0.2, 0.05]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className={cn(
                "absolute top-0 bottom-0 w-32 blur-[80px] -skew-x-12",
                state.theme === 'dark' ? "bg-emerald-500/10" : "bg-emerald-500/5"
              )}
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
                "grid gap-2 p-4 sm:p-6 rounded-[48px] backdrop-blur-3xl border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-1000",
                currentMap?.gridBg || (state.theme === 'dark' ? "bg-zinc-900/60 border-white/5 ring-1 ring-white/5" : "bg-white/80 border-zinc-200 ring-1 ring-zinc-200/50"),
                currentMap?.gridBorder || ""
              )}
              style={{ 
                gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))`,
              }}
            >
              {/* Decorative Elements per Map */}
              {state.currentMapId === 'neon_bay' && (
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,#6366f1_0%,transparent_70%)] animate-pulse" />
              )}
              {state.currentMapId === 'lava_valley' && (
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[conic-gradient(from_0deg_at_50%_50%,#f97316_0%,transparent_25%,#f97316_50%,transparent_75%,#f97316_100%)] blur-3xl animate-[spin_20s_linear_infinite]" />
              )}
              {grid.map((row, y) => row.map((cell, x) => {
                const building = state.buildings.find(b => b.x === x && b.y === y);
                const data = building ? BuildingDataMap[building.type] : null;

                // Popups for this specific cell
                const cellMoney = floatingMoney.filter(f => f.x === x && f.y === y);
                const cellProtests = protestBubbles.filter(p => p.x === x && p.y === y);

                return (
                  <motion.div
                    key={`${x}-${y}`}
                    data-grid-cell="true"
                    data-cx={x}
                    data-cy={y}
                    onMouseEnter={() => selectedBuilding && setHoveredCell({x, y})}
                    onMouseLeave={() => setHoveredCell(null)}
                    whileHover={{ 
                      scale: 1.05, 
                      backgroundColor: state.theme === 'dark' ? 'rgba(63, 63, 70, 0.8)' : 'rgba(228, 228, 231, 0.8)',
                    }}
                    onClick={() => handleCellClick(x, y)}
                    className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group isolate active:scale-95",
                      cell === null 
                        ? (currentMap?.cellBg || (state.theme === 'dark' ? "bg-zinc-950/30 hover:bg-zinc-800/40 shadow-inner" : "bg-zinc-200/40 hover:bg-zinc-300/60 shadow-inner")) 
                        : (state.theme === 'dark' ? "bg-zinc-800 border border-white/5 shadow-lg" : "bg-white border border-zinc-100 shadow-lg"),
                      (selectedBuilding || movingBuilding) && !cell && "ring-2 ring-emerald-500/30 ring-inset animate-pulse",
                      ((hoveredCell?.x === x && hoveredCell?.y === y) || (dragHoveredCell?.x === x && dragHoveredCell?.y === y)) && !cell && "ring-4 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10",
                      movingBuilding?.x === x && movingBuilding?.y === y && "ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-900 z-20"
                    )}
                  >
                    {/* Floating Effects - Polished Money Popups */}
                    <AnimatePresence>
                      {cellMoney.map(m => (
                        <motion.div
                          key={m.id}
                          initial={{ y: 0, opacity: 0, scale: 0.5 }}
                          animate={{ y: -60, opacity: 1, scale: 1.2 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute z-50 text-emerald-400 font-black text-sm pointer-events-none drop-shadow-[0_0_15px_rgba(52,211,153,0.6)] flex items-center gap-1"
                        >
                          <DollarSign size={10} className="mt-0.5" />
                          {m.amount}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <AnimatePresence>
                      {cellProtests.map(p => (
                        <motion.div
                          key={p.id}
                          initial={{ scale: 0.5, y: 10, opacity: 0 }}
                          animate={{ scale: 1, y: -55, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0, y: -70 }}
                          className={cn(
                            "absolute z-40 px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-[10px] font-black shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] border w-40 pointer-events-none text-center leading-tight flex items-center justify-center gap-2",
                            state.theme === 'dark' 
                              ? "bg-rose-600 text-white border-rose-400 shadow-rose-900/20" 
                              : "bg-white text-rose-600 border-rose-100 shadow-xl"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-lg flex items-center justify-center shrink-0",
                            state.theme === 'dark' ? "bg-black/20" : "bg-rose-50"
                          )}>
                             <Users size={12} />
                          </div>
                          <span className="flex-1">{p.text}</span>
                          <div className={cn(
                            "absolute -bottom-1 left-0 w-3 h-3 rotate-45 border-r border-b",
                            state.theme === 'dark' ? "bg-rose-600 border-rose-400" : "bg-white border-rose-100"
                          )} />
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {cell ? (
                      <motion.div 
                        layoutId={`building-${cell}-${x}-${y}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl sm:text-3xl filter drop-shadow-md hover:scale-110 transition-transform relative"
                      >
                        {BuildingDataMap[cell]?.emoji || '❓'}
                        
                        {/* Fire Overlay */}
                        {state.activeFires?.some(f => f.x === x && f.y === y) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-auto -mt-4">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              <Flame size={24} className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                            </motion.div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                extinguishFire(x, y);
                              }}
                              className="mt-1 px-2 py-0.5 bg-rose-500 text-[8px] font-black uppercase tracking-widest rounded-full text-white shadow-lg animate-pulse whitespace-nowrap"
                            >
                              {t.extinguish}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      (selectedBuilding || movingBuilding || (dragHoveredCell?.x === x && dragHoveredCell?.y === y)) && (
                        <div className="text-xl opacity-10 group-hover:opacity-40 transition-opacity">
                          {selectedBuilding ? BuildingDataMap[selectedBuilding]?.emoji : 
                           (dragHoveredCell?.x === x && dragHoveredCell?.y === y) ? BuildingDataMap[selectedBuilding!]?.emoji :
                           BuildingDataMap[movingBuilding!.type]?.emoji || '❓'}
                        </div>
                      )
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none" />
                  </motion.div>
                );
              }))}
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
                  ${getExpansionCost().toLocaleString()}
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
                  {selectedBuilding ? `${t.construction} ${t.buildings[selectedBuilding]?.name || selectedBuilding}` : 
                   movingBuilding ? `Moving ${t.buildings[movingBuilding!.type]?.name || movingBuilding!.type}` :
                   isDeleteMode ? t.bulldoze.toUpperCase() : ""}
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
          "w-full lg:w-96 border-l flex flex-col overflow-hidden transition-all duration-500",
          state.theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-2xl"
        )}>
          <div className={cn(
            "p-6 border-b",
            state.theme === 'dark' ? "border-zinc-800/20" : "border-zinc-100"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Target size={14} className="text-emerald-500" /> {t.realTimeMonitoring}
              </h2>
              <span className="text-[10px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded-md">{t.level} {state.level}</span>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase mb-2">
                <span>{t.exp} PROGRESS</span>
                <span>{state.exp} / {state.maxExp}</span>
              </div>
              <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(state.exp / state.maxExp) * 100}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>

            <div className="mt-8">
               <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <LayoutGrid size={12} /> {t.quests}
               </h3>
               <div className="space-y-3">
                 {state.quests.filter(q => !q.isCompleted).slice(0, 2).map((q) => (
                   <div key={q.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                     <p className="text-[11px] font-bold mb-1">{q.title}</p>
                     <p className="text-[9px] text-zinc-500 leading-tight mb-2">{q.description}</p>
                     <div className="flex items-center justify-between">
                        <div className="flex-1 h-1 bg-zinc-800 rounded-full mr-3 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
                        </div>
                        <span className="text-[8px] font-mono text-zinc-400">{q.progress}/{q.target}</span>
                     </div>
                   </div>
                 ))}
                 {state.quests.every(q => q.isCompleted) && (
                   <div className="text-center py-4 opacity-40">
                     <p className="text-[10px] font-bold uppercase">Semua Tugas Selesai!</p>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
            <div className={cn(
              "p-4 rounded-2xl border",
              state.theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <h3 className="text-xs font-bold text-zinc-400 flex items-center gap-2 mb-3 tracking-wide uppercase">
                <Award size={14} className="text-amber-500" /> Quests & Goals
              </h3>
              <div className="space-y-2">
                 {state.achievements
                   .filter(a => !a.claimed) // Only show unclaimed
                   .slice(0, 3) // Show only 3 active quests at a time
                   .map(ach => (
                   <div 
                    key={ach.id}
                    className={cn(
                      "p-3 rounded-xl text-xs transition-all relative overflow-hidden border",
                      ach.claimed 
                        ? (state.theme === 'dark' ? "bg-zinc-800/10 border-zinc-800/30 text-zinc-600 grayscale" : "bg-zinc-100 border-zinc-200 text-zinc-400 grayscale")
                        : ach.completed 
                          ? (state.theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-600 cursor-pointer hover:bg-emerald-100")
                          : (state.theme === 'dark' ? "bg-zinc-800/30 border-zinc-700/30 text-zinc-500" : "bg-zinc-50 border-zinc-100 text-zinc-600")
                    )}
                    onClick={() => ach.completed && !ach.claimed && claimAchievement(ach.id)}
                   >
                     <div className="flex justify-between items-center mb-1">
                       <span className="font-bold">{t.achievements?.[ach.id]?.title || ach.title}</span>
                       {ach.claimed ? (
                         <Check size={14} className="text-emerald-500" />
                       ) : ach.completed ? (
                         <div className="flex items-center gap-1 bg-emerald-500 text-black px-2 py-0.5 rounded-full text-[8px] animate-bounce">CLAIM</div>
                       ) : (
                         <span className="text-[10px] text-amber-500 font-bold">+${ach.reward}</span>
                       )}
                     </div>
                     <p className="text-[10px] opacity-70 mb-2">{t.achievements?.[ach.id]?.desc || ach.description}</p>
                     
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
                  <p className="text-rose-400 font-bold text-xs uppercase tracking-wider">{t.pollutionLevel} ALERT!</p>
                  <p className="text-[11px] text-rose-200/80">Warga mulai sakit batuk berdahak. Segera tanam pohon atau warga bakal minggat!</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Pop Chat / Notification System */}
      <div className="fixed bottom-12 right-6 z-[90] flex flex-col gap-3 w-72 pointer-events-none">
        <AnimatePresence>
          {news && news.length > 0 && (
            <motion.div
              key={news.join(',')}
              initial={{ x: 50, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 50, opacity: 0, scale: 0.9 }}
              className={cn(
                "p-4 rounded-2xl border shadow-2xl backdrop-blur-xl pointer-events-auto relative overflow-hidden group",
                state.theme === 'dark' 
                  ? "bg-zinc-900/90 border-emerald-500/30 text-white" 
                  : "bg-white/90 border-emerald-100 text-zinc-900 shadow-emerald-500/5"
              )}
            >
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Info size={16} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">System Intelligence</p>
                  <p className="text-xs font-black leading-tight mb-1">{news[0]}</p>
                  {news[1] && <p className="text-[10px] text-zinc-500 font-bold leading-snug">{news[1]}</p>}
                </div>
              </div>
              
              <button 
                onClick={() => setNews([])}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded-lg"
              >
                <Plus size={12} className="rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Quest Alerts (Optional addition to Pop Chat) */}
        <AnimatePresence>
          {state.quests.find(q => q.isCompleted && !q.claimed) && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-amber-500 text-black p-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto border border-amber-400"
            >
              <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center">
                <Award size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase">Quest Completed!</p>
                <p className="text-xs font-black">Claim your reward in Tablet</p>
              </div>
              <ChevronRight size={16} className="animate-bounce-x" />
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Analytics Tablet */}
      <AnimatePresence>
        {showTablet && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className={cn(
              "max-w-4xl w-full h-[80vh] rounded-[40px] border-8 shadow-2xl overflow-hidden flex flex-col relative",
              state.theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <div className="p-8 border-b border-zinc-800/10 flex justify-between items-center bg-zinc-900/10">
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Tablet size={32} className="text-emerald-500" />
                    {t.analyticsTablet}
                  </h2>
                  <div className="flex gap-4 mt-4">
                    <button 
                      onClick={() => setTabletTab('SUMMARY')}
                      className={cn(
                        "text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all",
                        tabletTab === 'SUMMARY' ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {t.tabletSummary}
                    </button>
                    <button 
                      onClick={() => setTabletTab('APPS')}
                      className={cn(
                        "text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all",
                        tabletTab === 'APPS' ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {t.tabletApps}
                    </button>
                    <button 
                      onClick={() => setTabletTab('MAPS')}
                      className={cn(
                        "text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all",
                        tabletTab === 'MAPS' ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {t.tabletMaps}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTablet(false)}
                  className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                >
                  <Plus className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {tabletTab === 'SUMMARY' ? (
                  <div className="space-y-8">
                    {/* Time range selector */}
                    <div className="flex gap-2">
                      {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(range => (
                        <button
                          key={range}
                          onClick={() => setTabletRange(range)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            tabletRange === range 
                              ? "bg-emerald-500 text-black" 
                              : state.theme === 'dark' ? "bg-zinc-900 text-zinc-500" : "bg-zinc-100 text-zinc-400"
                          )}
                        >
                          {range}
                        </button>
                      ))}
                    </div>

                    <div className={cn(
                      "p-6 rounded-3xl border h-80",
                      state.theme === 'dark' ? "bg-zinc-900/30 border-white/5" : "bg-zinc-50 border-zinc-200"
                    )}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(state.history && !Array.isArray(state.history) && state.history.pop) ? state.history.pop.map((_, i) => ({
                          name: state.history.labels[i] || '',
                          pop: state.history.pop[i] || 0,
                          money: state.history.money[i] || 0,
                          eco: state.history.eco[i] || 0,
                          pol: state.history.pol[i] || 0
                        })) : []}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Tooltip 
                              contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="pop" stroke="#10b981" fill="#10b98133" name="Population" />
                            <Area type="monotone" dataKey="money" stroke="#facc15" fill="#facc1533" name="Economy" />
                            <Area type="monotone" dataKey="pol" stroke="#f43f5e" fill="#f43f5e33" name="Pollution" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: t.currentPop, value: state.population, icon: Users, color: 'text-emerald-500' },
                        { label: t.totalWealth, value: `$${Math.floor(state.money)}`, icon: DollarSign, color: 'text-amber-500' },
                        { label: t.envIndex, value: `${Math.floor(state.ecoHealth)}%`, icon: Leaf, color: 'text-emerald-400' },
                        { label: t.pollutionLevel, value: `${Math.floor(state.pollution)}%`, icon: Wind, color: 'text-rose-500' }
                      ].map((stat, i) => (
                        <div key={i} className={cn("p-4 rounded-2xl border", state.theme === 'dark' ? "bg-zinc-900/50 border-white/5" : "bg-zinc-50 border-zinc-200")}>
                          <stat.icon size={16} className={stat.color} />
                          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-3 mb-1">{stat.label}</p>
                          <p className="text-xl font-black">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : tabletTab === 'APPS' ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-black italic tracking-tight">{t.recommendedApps}</h3>
                       <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                          <Activity size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">System Online</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {[
                         { 
                           id: 'eco', 
                           title: t.appEcoMonitor, 
                           desc: t.appEcoMonitorDesc, 
                           icon: Activity, 
                           color: 'text-emerald-500', 
                           bg: 'bg-emerald-500/10',
                         },
                         { 
                           id: 'dispatch', 
                           title: t.appDispatch, 
                           desc: t.appDispatchDesc, 
                           icon: Phone, 
                           color: 'text-rose-500', 
                           bg: 'bg-rose-500/10',
                         },
                         { 
                           id: 'tax', 
                           title: t.appTax, 
                           desc: t.appTaxDesc, 
                           icon: DollarSign, 
                           color: 'text-amber-500', 
                           bg: 'bg-amber-500/10',
                         },
                         { 
                           id: 'ai', 
                           title: t.appAi, 
                           desc: t.appAiDesc, 
                           icon: Zap, 
                           color: 'text-indigo-400', 
                           bg: 'bg-indigo-500/10',
                         }
                       ].map((app) => {
                         const isInstalled = state.downloadedApps.includes(app.id);
                         return (
                           <motion.div 
                             key={app.id}
                             whileHover={{ scale: 1.02 }}
                             className={cn(
                               "p-6 rounded-[32px] border flex flex-col justify-between h-52 relative overflow-hidden group transition-all",
                               state.theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm",
                               isInstalled ? "opacity-100" : "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                             )}
                           >
                             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110" />
                             
                             <div>
                               <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", app.bg)}>
                                 <app.icon size={24} className={app.color} />
                               </div>
                               <h4 className="text-lg font-black tracking-tight mb-1">{app.title}</h4>
                               <p className="text-xs text-zinc-500 font-medium leading-relaxed">{app.desc}</p>
                             </div>

                             <div className="flex items-center justify-between mt-4">
                                {isInstalled ? (
                                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full", app.bg, app.color)}>
                                    {t.appInstalled}
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => downloadApp(app.id)}
                                    className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 bg-emerald-500 text-black rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                                  >
                                    {t.appDownload} ($500)
                                  </button>
                                )}
                                <ChevronRight size={16} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
                             </div>
                           </motion.div>
                         );
                       })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-xl font-black italic tracking-tight mb-8">{t.tabletMaps}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {MAPS.map(m => {
                        const isUnlocked = state.level >= m.levelRequired;
                        const isCurrent = state.currentMapId === m.id;
                        return (
                          <motion.div
                            key={m.id}
                            whileHover={isUnlocked ? { scale: 1.02 } : {}}
                            className={cn(
                              "p-8 rounded-[40px] border relative overflow-hidden transition-all",
                              isCurrent ? "ring-2 ring-emerald-500 border-transparent" : "border-zinc-800",
                              state.theme === 'dark' ? "bg-zinc-900" : "bg-white",
                              !isUnlocked && "opacity-40 grayscale"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0 right-0 w-48 h-48 rounded-full -mr-20 -mt-20 opacity-10",
                              m.color === 'emerald' ? 'bg-emerald-500' : m.color === 'indigo' ? 'bg-indigo-500' : 'bg-orange-500'
                            )} />
                            
                            <h4 className="text-2xl font-black tracking-tighter mb-2">{m.name}</h4>
                            <p className="text-xs text-zinc-500 mb-6 font-medium">{m.description}</p>
                            
                            <div className="flex items-center justify-between">
                              {isUnlocked ? (
                                isCurrent ? (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Active</span>
                                ) : (
                                  <button 
                                    onClick={() => selectMap(m.id)}
                                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-all font-sans"
                                  >
                                    Switch Region
                                  </button>
                                )
                              ) : (
                                <div className="flex items-center gap-2 text-zinc-600">
                                  <Lock size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    {t.mapLocked.replace('{L}', m.levelRequired.toString())}
                                  </span>
                                </div>
                              )}
                              <span className="text-xs font-mono text-zinc-700">{m.gridSize}x{m.gridSize}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Home button circle */}
              <div className="h-16 flex justify-center items-center">
                <div 
                  onClick={() => setShowTablet(false)}
                  className="w-10 h-10 rounded-full border-2 border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-all" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo/Crisis Overlay */}
      <AnimatePresence>
        {state.isDemoActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-rose-950/95 flex flex-col items-center justify-center p-8 overflow-hidden"
          >
            {/* Flashing warning */}
            <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none" />
            
            <div className="text-center relative max-w-2xl w-full">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="mb-8 flex justify-center"
              >
                <div className="bg-white text-rose-600 p-8 rounded-full shadow-2xl relative">
                  <AlertTriangle size={80} strokeWidth={3} />
                  <div className="absolute -inset-4 border-4 border-white rounded-full animate-ping opacity-30" />
                </div>
              </motion.div>

              <h1 className="text-7xl font-black text-white italic mb-4 tracking-tighter leading-none">{t.protestTitle}</h1>
              <p className="text-2xl font-black text-red-200 uppercase mb-12 tracking-widest bg-black/40 px-6 py-3 rounded-2xl inline-block border-2 border-red-500">
                {t.protestSubtitle}
              </p>

              <div className="grid grid-cols-1 gap-6">
                {!showNumpad ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNumpad(true)}
                    className="flex items-center justify-center gap-4 bg-white text-rose-600 px-12 py-6 rounded-3xl font-black text-2xl shadow-[0_20px_50px_rgba(255,255,255,0.3)]"
                  >
                    <Phone size={32} />
                    {t.callPolice} (110)
                  </motion.button>
                ) : (
                  <div className="bg-black/80 backdrop-blur-xl p-8 rounded-[40px] border-4 border-white shadow-2xl">
                    <p className="text-xs font-black text-white/50 uppercase tracking-[0.3em] mb-6">Enter Rescue Code</p>
                    <div className="text-5xl font-black text-white mb-10 tracking-[0.5em] h-12 flex items-center justify-center font-mono">
                      {numpadValue.padEnd(3, '_')}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((num) => (
                        <button
                          key={num}
                          onClick={() => num !== '*' && num !== '#' && numpadValue.length < 3 && setNumpadValue(curr => curr + num)}
                          className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-black transition-all flex items-center justify-center text-3xl font-black shadow-lg"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-4">
                       <button 
                        onClick={() => setNumpadValue("")}
                        className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest"
                       >
                         Clear
                       </button>
                       <button 
                        onClick={() => {
                          if (numpadValue === "110" || numpadValue === "911") {
                            setState(prev => ({ ...prev, isDemoActive: false }));
                            setShowNumpad(false);
                            setNumpadValue("");
                            setNews(state.language === 'id' ? ["Polisi telah tiba!", "Warga kembali tenang."] : ["Police arrived!", "Citizens are calm now."]);
                          } else {
                            setNumpadValue("");
                            setNews(state.language === 'id' ? ["KODE SALAH!", "Coba cek nomor polisi (110)."] : ["WRONG CODE!", "Check police number (110)."]);
                          }
                        }}
                        className="flex-[2] py-4 bg-emerald-500 text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg"
                       >
                         {t.callPolice}
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Background Hazard Symbols */}
            <div className="absolute top-10 left-10 opacity-10 rotate-12 scale-150">
              <AlertTriangle size={200} />
            </div>
            <div className="absolute bottom-10 right-10 opacity-10 -rotate-12 scale-150">
              <AlertTriangle size={200} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {t.slogan}
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
                  {t.connectCloud}
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

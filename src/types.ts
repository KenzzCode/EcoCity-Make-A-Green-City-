/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BuildingCategory = 'ENERGY' | 'ECONOMY' | 'RESIDENTIAL' | 'PUBLIC_SERVICE' | 'ENVIRONMENT' | 'CULTURAL' | 'INFRASTRUCTURE';

export type BuildingType = 
  | 'COAL_PLANT' 
  | 'SOLAR_FARM' 
  | 'WIND_TURBINE'
  | 'NUCLEAR_PLANT'
  | 'TRADITIONAL_MARKET' 
  | 'VERTICAL_GARDEN' 
  | 'TECH_STARTUP' 
  | 'SHOPPING_MALL'
  | 'OFFICE_TOWER'
  | 'APARTMENT' 
  | 'SMART_RESIDENCE'
  | 'COMMUNITY_HUB'
  | 'HOSPITAL'
  | 'PARK'
  | 'RECYCLING_CENTER'
  | 'POLICE_STATION'
  | 'UNIVERSITY'
  | 'ECO_STADIUM'
  | 'MOSQUE'
  | 'CHURCH'
  | 'TEMPLE'
  | 'FIRE_STATION'
  | 'CAR_DEALER'
  | 'RESIDENTIAL_GRID_CONTROLLER';

export interface BuildingData {
  id: string;
  type: BuildingType;
  category: BuildingCategory;
  name: string;
  cost: number;
  income: number;
  ecoImpact: number; // Positive is good, negative is bad
  powerUsage: number;
  description: string;
  emoji: string;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  createdAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  claimed: boolean; // For tracking rewards
  type: 'POPULATION' | 'MONEY' | 'ECO' | 'BUILDINGS';
}

export interface GameState {
  money: number;
  ecoHealth: number; // 0-100
  pollution: number; // 0-100
  population: number;
  taxRate: number; // 0-100 (percentage)
  bankruptcyRisk: number; // 0-100 (percentage)
  buildings: PlacedBuilding[];
  gridSize: number;
  achievements: Achievement[];
  theme: 'dark' | 'light';
  language: 'id' | 'en' | 'ar';
  gameSpeed: number;
  history: {
    time: number;
    money: number;
    pollution: number;
    ecoHealth: number;
  }[];
  lastTaxCollection?: number;
}

export const BUILDINGS: Record<BuildingType, BuildingData> = {
  COAL_PLANT: {
    id: 'coal_plant',
    type: 'COAL_PLANT',
    category: 'ENERGY',
    name: 'Coal Power Plant',
    cost: 400,
    income: 100,
    ecoImpact: -20,
    powerUsage: -100, 
    description: 'Energi murah, tapi polusi parah. Hati-hati bro.',
    emoji: '🏭',
  },
  SOLAR_FARM: {
    id: 'solar_farm',
    type: 'SOLAR_FARM',
    category: 'ENERGY',
    name: 'Solar Farm',
    cost: 800,
    income: 30,
    ecoImpact: 8,
    powerUsage: -50,
    description: 'Energi bersih dari matahari. Investasi masa depan.',
    emoji: '☀️',
  },
  WIND_TURBINE: {
    id: 'wind_turbine',
    type: 'WIND_TURBINE',
    category: 'ENERGY',
    name: 'Wind Turbine',
    cost: 600,
    income: 20,
    ecoImpact: 10,
    powerUsage: -30,
    description: 'Memanfaatkan angin untuk daya bersih.',
    emoji: '🪁',
  },
  NUCLEAR_PLANT: {
    id: 'nuclear_plant',
    type: 'NUCLEAR_PLANT',
    category: 'ENERGY',
    name: 'Nuclear Reactor',
    cost: 5000,
    income: 500,
    ecoImpact: -5,
    powerUsage: -1000,
    description: 'Daya monster, risiko tinggi. Modern banget.',
    emoji: '☢️',
  },
  TRADITIONAL_MARKET: {
    id: 'market',
    type: 'TRADITIONAL_MARKET',
    category: 'ECONOMY',
    name: 'Traditional Market',
    cost: 200,
    income: 40,
    ecoImpact: -3,
    powerUsage: 5,
    description: 'Pusat ekonomi warga. Berisik tapi cuan.',
    emoji: '🏪',
  },
  VERTICAL_GARDEN: {
    id: 'vertical_garden',
    type: 'VERTICAL_GARDEN',
    category: 'ENVIRONMENT',
    name: 'Vertical Garden',
    cost: 500,
    income: 10,
    ecoImpact: 12,
    powerUsage: 3,
    description: 'Hutan di tengah beton. Paru-paru kota.',
    emoji: '🌿',
  },
  TECH_STARTUP: {
    id: 'tech_startup',
    type: 'TECH_STARTUP',
    category: 'ECONOMY',
    name: 'Tech Startup',
    cost: 1000,
    income: 180,
    ecoImpact: -1,
    powerUsage: 40,
    description: 'Ekonomi digital, butuh banyak listrik.',
    emoji: '🏢',
  },
  SHOPPING_MALL: {
    id: 'mall',
    type: 'SHOPPING_MALL',
    category: 'ECONOMY',
    name: 'Shopping Mall',
    cost: 2000,
    income: 450,
    ecoImpact: -15,
    powerUsage: 120,
    description: 'Surga belanja, neraka bagi lingkungan.',
    emoji: '🛍️',
  },
  OFFICE_TOWER: {
    id: 'office_tower',
    type: 'OFFICE_TOWER',
    category: 'ECONOMY',
    name: 'Skyscraper Office',
    cost: 4000,
    income: 1000,
    ecoImpact: -10,
    powerUsage: 300,
    description: 'Pusat bisnis global. Lambang kesuksesan.',
    emoji: '🏙️',
  },
  APARTMENT: {
    id: 'apartment',
    type: 'APARTMENT',
    category: 'RESIDENTIAL',
    name: 'Eco-Apartment',
    cost: 350,
    income: 60,
    ecoImpact: -2,
    powerUsage: 15,
    description: 'Hunian nyaman untuk warga barumu.',
    emoji: '🏘️',
  },
  SMART_RESIDENCE: {
    id: 'smart_residence',
    type: 'SMART_RESIDENCE',
    category: 'RESIDENTIAL',
    name: 'Smart Global Housing',
    cost: 1200,
    income: 200,
    ecoImpact: 5,
    powerUsage: 30,
    description: 'Rumah masa depan dengan panel surya terintegrasi.',
    emoji: '🏡',
  },
  COMMUNITY_HUB: {
    id: 'community_hub',
    type: 'COMMUNITY_HUB',
    category: 'RESIDENTIAL',
    name: 'Social Community Hub',
    cost: 800,
    income: 50,
    ecoImpact: 10,
    powerUsage: 20,
    description: 'Pusat interaksi warga di area hunian.',
    emoji: '🏟️',
  },
  HOSPITAL: {
    id: 'hospital',
    type: 'HOSPITAL',
    category: 'PUBLIC_SERVICE',
    name: 'City Hospital',
    cost: 1500,
    income: 80,
    ecoImpact: -2,
    powerUsage: 60,
    description: 'Kesehatan warga adalah investasi terbaik.',
    emoji: '🏥',
  },
  PARK: {
    id: 'park',
    type: 'PARK',
    category: 'ENVIRONMENT',
    name: 'Public Park',
    cost: 250,
    income: 5,
    ecoImpact: 10,
    powerUsage: 2,
    description: 'Tempat santai warga biar gak stres.',
    emoji: '🌳',
  },
  RECYCLING_CENTER: {
    id: 'recycling',
    type: 'RECYCLING_CENTER',
    category: 'ENVIRONMENT',
    name: 'Recycling Center',
    cost: 1200,
    income: 40,
    ecoImpact: 25,
    powerUsage: 30,
    description: 'Mengubah limbah menjadi berkah.',
    emoji: '♻️',
  },
  POLICE_STATION: {
    id: 'police',
    type: 'POLICE_STATION',
    category: 'PUBLIC_SERVICE',
    name: 'Police HQ',
    cost: 1000,
    income: 20,
    ecoImpact: 0,
    powerUsage: 40,
    description: 'Keamanan warga prioritas utama.',
    emoji: '👮',
  },
  UNIVERSITY: {
    id: 'university',
    type: 'UNIVERSITY',
    category: 'PUBLIC_SERVICE',
    name: 'Eco University',
    cost: 3000,
    income: 150,
    ecoImpact: 5,
    powerUsage: 150,
    description: 'Mencetak generasi cerdas dan hijau.',
    emoji: '🎓',
  },
  ECO_STADIUM: {
    id: 'stadium',
    type: 'ECO_STADIUM',
    category: 'PUBLIC_SERVICE',
    name: 'Solar Stadium',
    cost: 4500,
    income: 800,
    ecoImpact: 2,
    powerUsage: 250,
    description: 'Hiburan megah bertenaga surya.',
    emoji: '🏟️',
  },
  MOSQUE: {
    id: 'mosque',
    type: 'MOSQUE',
    category: 'CULTURAL',
    name: 'Masjid Agung',
    cost: 800,
    income: 10,
    ecoImpact: 15,
    powerUsage: 10,
    description: 'Pusat spiritual dan ketenangan warga.',
    emoji: '🕌',
  },
  CHURCH: {
    id: 'church',
    type: 'CHURCH',
    category: 'CULTURAL',
    name: 'Gereja Katedral',
    cost: 800,
    income: 10,
    ecoImpact: 15,
    powerUsage: 10,
    description: 'Kedamaian dalam harmoni komunitas.',
    emoji: '⛪',
  },
  TEMPLE: {
    id: 'temple',
    type: 'TEMPLE',
    category: 'CULTURAL',
    name: 'Vihara/Pura',
    cost: 800,
    income: 10,
    ecoImpact: 15,
    powerUsage: 10,
    description: 'Keseimbangan batin dan alam.',
    emoji: '🛕',
  },
  FIRE_STATION: {
    id: 'fire_station',
    type: 'FIRE_STATION',
    category: 'INFRASTRUCTURE',
    name: 'Pemadam Kebakaran',
    cost: 600,
    income: 0,
    ecoImpact: 0,
    powerUsage: 20,
    description: 'Layanan darurat siaga 24 jam.',
    emoji: '🚒',
  },
  CAR_DEALER: {
    id: 'car_dealer',
    type: 'CAR_DEALER',
    category: 'INFRASTRUCTURE',
    name: 'Dealer Mobil',
    cost: 1000,
    income: 300,
    ecoImpact: -30,
    powerUsage: 40,
    description: 'Pusat otomotif gaya hidup.',
    emoji: '🏎️',
  },
  RESIDENTIAL_GRID_CONTROLLER: {
    id: 'res_grid',
    type: 'RESIDENTIAL_GRID_CONTROLLER',
    category: 'INFRASTRUCTURE',
    name: 'Res-Grid Controller',
    cost: 1500,
    income: 100,
    ecoImpact: 5,
    powerUsage: 10,
    description: 'Optimasi distribusi daya untuk area hunian.',
    emoji: '🎮',
  },
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'pop_1', title: 'Kampung Kecil', description: 'Capai 200 populasi', target: 200, current: 0, reward: 500, completed: false, claimed: false, type: 'POPULATION' },
  { id: 'pop_2', title: 'Kota Mandiri', description: 'Capai 500 populasi', target: 500, current: 0, reward: 1200, completed: false, claimed: false, type: 'POPULATION' },
  { id: 'pop_3', title: 'Metropolis Hijau', description: 'Capai 1000 populasi', target: 1000, current: 0, reward: 3000, completed: false, claimed: false, type: 'POPULATION' },
  { id: 'eco_1', title: 'Pecinta Alam', description: 'Capai 95% Eco Health', target: 95, current: 0, reward: 1000, completed: false, claimed: false, type: 'ECO' },
  { id: 'eco_2', title: 'Hutan Kota', description: 'Capai 98% Eco Health', target: 98, current: 0, reward: 2500, completed: false, claimed: false, type: 'ECO' },
  { id: 'mon_1', title: 'Orang Kaya', description: 'Kumpulkan $5,000', target: 5000, current: 0, reward: 2000, completed: false, claimed: false, type: 'MONEY' },
  { id: 'mon_2', title: 'Sultan Eco', description: 'Kumpulkan $15,000', target: 15000, current: 0, reward: 5000, completed: false, claimed: false, type: 'MONEY' },
  { id: 'build_1', title: 'Arsitek Muda', description: 'Bangun 10 gedung', target: 10, current: 0, reward: 800, completed: false, claimed: false, type: 'BUILDINGS' },
  { id: 'build_2', title: 'Pembangun Pro', description: 'Bangun 25 gedung', target: 25, current: 0, reward: 2000, completed: false, claimed: false, type: 'BUILDINGS' },
  { id: 'build_3', title: 'Master Planner', description: 'Bangun 50 gedung', target: 50, current: 0, reward: 5000, completed: false, claimed: false, type: 'BUILDINGS' },
];

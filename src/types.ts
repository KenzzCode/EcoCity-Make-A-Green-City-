/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BuildingType = 
  | 'COAL_PLANT' 
  | 'SOLAR_FARM' 
  | 'WIND_TURBINE'
  | 'TRADITIONAL_MARKET' 
  | 'VERTICAL_GARDEN' 
  | 'TECH_STARTUP' 
  | 'SHOPPING_MALL'
  | 'APARTMENT' 
  | 'HOSPITAL'
  | 'PARK'
  | 'RECYCLING_CENTER';

export interface BuildingData {
  id: string;
  type: BuildingType;
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
  buildings: PlacedBuilding[];
  gridSize: number;
  achievements: Achievement[];
  theme: 'dark' | 'light';
  history: {
    time: number;
    money: number;
    pollution: number;
    ecoHealth: number;
  }[];
}

export const BUILDINGS: Record<BuildingType, BuildingData> = {
  COAL_PLANT: {
    id: 'coal_plant',
    type: 'COAL_PLANT',
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
    name: 'Wind Turbine',
    cost: 600,
    income: 20,
    ecoImpact: 10,
    powerUsage: -30,
    description: 'Memanfaatkan angin untuk daya bersih.',
    emoji: '🪁',
  },
  TRADITIONAL_MARKET: {
    id: 'market',
    type: 'TRADITIONAL_MARKET',
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
    name: 'Shopping Mall',
    cost: 2000,
    income: 450,
    ecoImpact: -15,
    powerUsage: 120,
    description: 'Surga belanja, neraka bagi lingkungan.',
    emoji: '🛍️',
  },
  APARTMENT: {
    id: 'apartment',
    type: 'APARTMENT',
    name: 'Eco-Apartment',
    cost: 350,
    income: 60,
    ecoImpact: -2,
    powerUsage: 15,
    description: 'Hunian nyaman untuk warga barumu.',
    emoji: '🏘️',
  },
  HOSPITAL: {
    id: 'hospital',
    type: 'HOSPITAL',
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
    name: 'Recycling Center',
    cost: 1200,
    income: 40,
    ecoImpact: 25,
    powerUsage: 30,
    description: 'Mengubah limbah menjadi berkah.',
    emoji: '♻️',
  },
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'pop_1', title: 'Kampung Kecil', description: 'Capai 200 populasi', target: 200, current: 0, reward: 500, completed: false, claimed: false, type: 'POPULATION' },
  { id: 'eco_1', title: 'Pecinta Alam', description: 'Capai 95% Eco Health', target: 95, current: 0, reward: 1000, completed: false, claimed: false, type: 'ECO' },
  { id: 'mon_1', title: 'Orang Kaya', description: 'Kumpulkan $5,000', target: 5000, current: 0, reward: 2000, completed: false, claimed: false, type: 'MONEY' },
  { id: 'build_1', title: 'Arsitek Muda', description: 'Bangun 10 gedung', target: 10, current: 0, reward: 800, completed: false, claimed: false, type: 'BUILDINGS' },
];

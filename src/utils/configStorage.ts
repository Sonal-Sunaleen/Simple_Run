import {
  GameCustomConfig,
  EnvironmentTheme,
  CharacterModelType,
  PetType,
  ShopItem,
  SkateboardConfig,
  RoadsideShopKeeperConfig,
  LevelUpRewardConfig,
  DailyMissionItem,
  DailyMissionType,
} from '../types/game';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const STORAGE_KEY = 'subway_princess_runner_config_v2';
export const STATS_KEY = 'subway_princess_runner_stats_v2';
export const FIRESTORE_COLLECTION = 'game_configs';
export const FIRESTORE_DOC = 'main_config';
export const FIRESTORE_ITEMS_COLLECTION = 'shop_items';

export const DEFAULT_SKATEBOARD: SkateboardConfig = {
  id: 'board_pink_classic',
  name: 'Classic Pink Cruiser',
  boardColor: '#ec4899',
  trimColor: '#38bdf8',
  thrusterColor: '#f59e0b',
  bonusBoards: 0,
};

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  // ================= CHARACTERS =================
  {
    id: 'char_aurora',
    category: 'character',
    name: 'Princess Aurora',
    nameBn: 'প্রিন্সেস অরোরা',
    description: 'Royal starter princess with golden blonde hair',
    descriptionBn: 'সোনালী চুলের রাজকীয় প্রিন্সেস (ফ্রি)',
    priceInr: 0,
    priceCoins: 0,
    unlockCode: 'FREE',
    isDefaultUnlocked: true,
    previewColors: ['#ec4899', '#eab308'],
    characterData: {
      name: 'Princess Aurora',
      modelType: 'royal',
      skinColor: '#fed7aa',
      hairColor: '#eab308',
      outfitColor: '#ec4899',
      outfitSecondaryColor: '#a855f7',
      crownColor: '#fbbf24',
      capeColor: '#f43f5e',
      hasCrown: true,
      hasCape: true,
    },
  },
  {
    id: 'char_cyber_nova',
    category: 'character',
    name: 'Cyber Nova',
    nameBn: 'সাইবার নোভা',
    description: 'Futuristic neon runner with electric cyan hair',
    descriptionBn: 'নিয়ন সাইবার স্যুট ও সায়ান চুলের সুপার রানার',
    priceInr: 29,
    priceCoins: 2500,
    unlockCode: 'NOVA29',
    isDefaultUnlocked: false,
    previewColors: ['#06b6d4', '#0f172a'],
    characterData: {
      name: 'Cyber Nova',
      modelType: 'cyber',
      skinColor: '#fce7f3',
      hairColor: '#06b6d4',
      outfitColor: '#0f172a',
      outfitSecondaryColor: '#22d3ee',
      crownColor: '#06b6d4',
      capeColor: '#38bdf8',
      hasCrown: true,
      hasCape: false,
    },
  },
  {
    id: 'char_sakura_aoi',
    category: 'character',
    name: 'Princess Aoi',
    nameBn: 'সাকুরা প্রিন্সেস আওই',
    description: 'Tokyo Blossom princess with sakura crown & cape',
    descriptionBn: 'টোকিও চেরি ব্লসম স্টাইলের রাজকন্যা',
    priceInr: 39,
    priceCoins: 3500,
    unlockCode: 'AOI39',
    isDefaultUnlocked: false,
    previewColors: ['#f472b6', '#312e81'],
    characterData: {
      name: 'Princess Aoi',
      modelType: 'sakura',
      skinColor: '#fff1f2',
      hairColor: '#312e81',
      outfitColor: '#f472b6',
      outfitSecondaryColor: '#fda4af',
      crownColor: '#fb7185',
      capeColor: '#f43f5e',
      hasCrown: true,
      hasCape: true,
    },
  },
  {
    id: 'char_rebel_maya',
    category: 'character',
    name: 'Street Rebel Maya',
    nameBn: 'স্ট্রিট রেবেল মায়া',
    description: 'High-speed street surfer with fiery red hair',
    descriptionBn: 'আগুনের মতো লাল চুলের স্ট্রিট সার্ফার প্রিন্সেস',
    priceInr: 49,
    priceCoins: 4500,
    unlockCode: 'MAYA49',
    isDefaultUnlocked: false,
    previewColors: ['#ea580c', '#dc2626'],
    characterData: {
      name: 'Street Rebel Maya',
      modelType: 'street',
      skinColor: '#d97706',
      hairColor: '#dc2626',
      outfitColor: '#ea580c',
      outfitSecondaryColor: '#171717',
      crownColor: '#e11d48',
      capeColor: '#fb923c',
      hasCrown: false,
      hasCape: false,
    },
  },
  {
    id: 'char_empress_zara',
    category: 'character',
    name: 'Golden Empress Zara',
    nameBn: 'গোল্ডেন সম্রাজ্ঞী জারা',
    description: 'VIP Royal Empress in pure gold & emerald attire',
    descriptionBn: 'খাঁটি সোনা ও পান্না রঙের ভিআইপি সম্রাজ্ঞী',
    priceInr: 59,
    priceCoins: 6000,
    unlockCode: 'ZARA59',
    isDefaultUnlocked: false,
    previewColors: ['#fbbf24', '#10b981'],
    characterData: {
      name: 'Empress Zara',
      modelType: 'royal',
      skinColor: '#fed7aa',
      hairColor: '#18181b',
      outfitColor: '#eab308',
      outfitSecondaryColor: '#059669',
      crownColor: '#fef08a',
      capeColor: '#10b981',
      hasCrown: true,
      hasCape: true,
    },
  },

  // ================= DRESSES / OUTFITS =================
  {
    id: 'dress_royal_pink',
    category: 'dress',
    name: 'Classic Royal Pink',
    nameBn: 'ক্লাসিক রয়্যাল পিঙ্ক ড্রেস',
    description: 'Default royal pink tunic with rose cape',
    descriptionBn: 'ডিফল্ট গোলাপি প্রিন্সেস ড্রেস (ফ্রি)',
    priceInr: 0,
    priceCoins: 0,
    unlockCode: 'FREE',
    isDefaultUnlocked: true,
    previewColors: ['#ec4899', '#a855f7'],
    dressData: {
      outfitColor: '#ec4899',
      outfitSecondaryColor: '#a855f7',
      capeColor: '#f43f5e',
      crownColor: '#fbbf24',
      hasCrown: true,
      hasCape: true,
    },
  },
  {
    id: 'dress_golden_queen',
    category: 'dress',
    name: '24K Golden Royal Gown',
    nameBn: '২৪ ক্যারেট গোল্ডেন গাউন',
    description: 'Shining gold dress with crimson royal cape & tiara',
    descriptionBn: 'ঝলমলে সোনালী পোশাক ও লাল রাজকীয় কেপ',
    priceInr: 19,
    priceCoins: 1500,
    unlockCode: 'GOLD19',
    isDefaultUnlocked: false,
    previewColors: ['#f59e0b', '#dc2626'],
    dressData: {
      outfitColor: '#f59e0b',
      outfitSecondaryColor: '#b91c1c',
      capeColor: '#ef4444',
      crownColor: '#fde047',
      hasCrown: true,
      hasCape: true,
    },
  },
  {
    id: 'dress_emerald_fairy',
    category: 'dress',
    name: 'Emerald Fairy Dress',
    nameBn: 'এমেরাল্ড ফেয়ারি ড্রেস',
    description: 'Enchanted emerald green outfit with gold trim',
    descriptionBn: 'জাদুকরী সবুজ পরী ড্রেস ও সোনালী মুকুট',
    priceInr: 25,
    priceCoins: 2200,
    unlockCode: 'FAIRY25',
    isDefaultUnlocked: false,
    previewColors: ['#10b981', '#047857'],
    dressData: {
      outfitColor: '#10b981',
      outfitSecondaryColor: '#065f46',
      capeColor: '#34d399',
      crownColor: '#fbbf24',
      hasCrown: true,
      hasCape: true,
    },
  },
  {
    id: 'dress_midnight_galaxy',
    category: 'dress',
    name: 'Midnight Galaxy Suit',
    nameBn: 'মিডনাইট গ্যালাক্সি পোশাক',
    description: 'Deep violet starlight suit with neon cyan cape',
    descriptionBn: 'রাতের আকাশের মতো বেগুনি ও নিয়ন সায়ান ড্রেস',
    priceInr: 35,
    priceCoins: 3000,
    unlockCode: 'GALAXY35',
    isDefaultUnlocked: false,
    previewColors: ['#6366f1', '#22d3ee'],
    dressData: {
      outfitColor: '#4f46e5',
      outfitSecondaryColor: '#1e1b4b',
      capeColor: '#06b6d4',
      crownColor: '#38bdf8',
      hasCrown: true,
      hasCape: true,
    },
  },

  // ================= SKATEBOARDS / HOVERBOARDS =================
  {
    id: 'board_pink_classic',
    category: 'skateboard',
    name: 'Pink Star Cruiser',
    nameBn: 'পিঙ্ক স্টার স্কেটবোর্ড',
    description: 'Standard hover-skateboard with neon blue rails',
    descriptionBn: 'সাধারণ গোলাপি স্কেটবোর্ড (ফ্রি)',
    priceInr: 0,
    priceCoins: 0,
    unlockCode: 'FREE',
    isDefaultUnlocked: true,
    previewColors: ['#ec4899', '#38bdf8'],
    skateboardData: {
      id: 'board_pink_classic',
      name: 'Pink Star Cruiser',
      boardColor: '#ec4899',
      trimColor: '#38bdf8',
      thrusterColor: '#f59e0b',
      bonusBoards: 0,
    },
  },
  {
    id: 'board_cyber_lightning',
    category: 'skateboard',
    name: 'Cyber Lightning Board',
    nameBn: 'সাইবার লাইটনিং স্কেটবোর্ড',
    description: '+2 Extra Starting Boards every run! Electric cyan deck',
    descriptionBn: 'প্রতি গেমে +২টি অতিরিক্ত বোর্ড ফ্রি! ইলেকট্রিক সায়ান ডেক',
    priceInr: 19,
    priceCoins: 1800,
    unlockCode: 'CYBER19',
    isDefaultUnlocked: false,
    previewColors: ['#06b6d4', '#fde047'],
    skateboardData: {
      id: 'board_cyber_lightning',
      name: 'Cyber Lightning Board',
      boardColor: '#0891b2',
      trimColor: '#fde047',
      thrusterColor: '#22d3ee',
      bonusBoards: 2,
    },
  },
  {
    id: 'board_royal_gold',
    category: 'skateboard',
    name: 'Royal Gold Chariot Board',
    nameBn: 'রয়্যাল গোল্ড স্কেটবোর্ড',
    description: '+4 Extra Starting Boards every run! 24K Gold deck',
    descriptionBn: 'প্রতি গেমে +৪টি অতিরিক্ত শিল্ড বোর্ড! খাঁটি সোনালী ডেক',
    priceInr: 29,
    priceCoins: 2800,
    unlockCode: 'BOARD29',
    isDefaultUnlocked: false,
    previewColors: ['#fbbf24', '#ef4444'],
    skateboardData: {
      id: 'board_royal_gold',
      name: 'Royal Gold Chariot Board',
      boardColor: '#eab308',
      trimColor: '#ef4444',
      thrusterColor: '#fef08a',
      bonusBoards: 4,
    },
  },
  {
    id: 'board_fire_dragon',
    category: 'skateboard',
    name: 'Fire Dragon Skateboard',
    nameBn: 'ফায়ার ড্রাগন স্কেটবোর্ড',
    description: '+6 Extra Starting Boards every run! Blazing lava deck',
    descriptionBn: 'প্রতি গেমে +৬টি অতিরিক্ত শিল্ড বোর্ড! আগুনের লাভা ডেক',
    priceInr: 45,
    priceCoins: 4200,
    unlockCode: 'DRAGON45',
    isDefaultUnlocked: false,
    previewColors: ['#dc2626', '#f97316'],
    skateboardData: {
      id: 'board_fire_dragon',
      name: 'Fire Dragon Skateboard',
      boardColor: '#dc2626',
      trimColor: '#fb923c',
      thrusterColor: '#fde047',
      bonusBoards: 6,
    },
  },

  // ================= PETS =================
  {
    id: 'pet_corgi_sparky',
    category: 'pet',
    name: 'Sparky Royal Corgi',
    nameBn: 'স্পার্কি কর্গি কুকুরছানা',
    description: '+25% Coin Magnet range & duration',
    descriptionBn: '+২৫% কয়েন ম্যাগনেট রেঞ্জ (ফ্রি)',
    priceInr: 0,
    priceCoins: 0,
    unlockCode: 'FREE',
    isDefaultUnlocked: true,
    previewColors: ['#d97706', '#fef3c7'],
    petData: {
      enabled: true,
      type: 'corgi',
      name: 'Sparky',
      color: '#d97706',
      secondaryColor: '#fef3c7',
      perk: 'magnet_boost',
      perkDescription: '+25% Coin Magnet range & duration',
    },
  },
  {
    id: 'pet_kitty_mochi',
    category: 'pet',
    name: 'Mochi Lucky Kitty',
    nameBn: 'মোচি লাকি বিড়ালছানা',
    description: '+20% Score multiplier bonus on all runs',
    descriptionBn: 'সব দৌড়ে +২০% অতিরিক্ত স্কোর বোনাস!',
    priceInr: 19,
    priceCoins: 1600,
    unlockCode: 'MOCHI19',
    isDefaultUnlocked: false,
    previewColors: ['#f43f5e', '#ffffff'],
    petData: {
      enabled: true,
      type: 'kitty',
      name: 'Mochi',
      color: '#f43f5e',
      secondaryColor: '#ffffff',
      perk: 'score_boost',
      perkDescription: '+20% Score multiplier bonus',
    },
  },
  {
    id: 'pet_fox_kitsune',
    category: 'pet',
    name: 'Kitsune Golden Fox',
    nameBn: 'কিৎসুনে গোল্ডেন ফক্স',
    description: '30% chance to double every gold coin collected!',
    descriptionBn: 'প্রতিটি কয়েন দ্বিগুণ (2X) হওয়ার ৩০% সুযোগ!',
    priceInr: 29,
    priceCoins: 2600,
    unlockCode: 'FOX29',
    isDefaultUnlocked: false,
    previewColors: ['#ea580c', '#ffffff'],
    petData: {
      enabled: true,
      type: 'fox',
      name: 'Kitsune',
      color: '#ea580c',
      secondaryColor: '#ffffff',
      perk: 'coin_doubler',
      perkDescription: '30% chance of double coins',
    },
  },
  {
    id: 'pet_dragon_draco',
    category: 'pet',
    name: 'Draco Baby Dragon',
    nameBn: 'ড্রাকো বেবি ড্রাগন',
    description: 'Flying dragon companion + Extra Hoverboard shield & Magnet',
    descriptionBn: 'উড়ন্ত ড্রাগন সঙ্গী + অতিরিক্ত শিল্ড ও ডাবল কয়েন!',
    priceInr: 49,
    priceCoins: 4500,
    unlockCode: 'DRACO49',
    isDefaultUnlocked: false,
    previewColors: ['#8b5cf6', '#38bdf8'],
    petData: {
      enabled: true,
      type: 'dragon',
      name: 'Draco',
      color: '#8b5cf6',
      secondaryColor: '#38bdf8',
      perk: 'coin_doubler',
      perkDescription: 'Dragon blessing: Double coin chance',
    },
  },
];

export const DEFAULT_CONFIG: GameCustomConfig = {
  version: 2,
  princess: {
    name: 'Princess Aurora',
    modelType: 'royal',
    skinColor: '#fed7aa',
    hairColor: '#eab308',
    outfitColor: '#ec4899',
    outfitSecondaryColor: '#a855f7',
    crownColor: '#fbbf24',
    capeColor: '#f43f5e',
    hasCrown: true,
    hasCape: true,
    skateboard: DEFAULT_SKATEBOARD,
  },
  pet: {
    enabled: true,
    type: 'corgi',
    name: 'Sparky',
    color: '#d97706',
    secondaryColor: '#fef3c7',
    perk: 'magnet_boost',
    perkDescription: '+25% Coin Magnet range & duration',
  },
  environment: {
    theme: 'neon_subway',
    themeName: 'Bright Sky Transit',
    skyColor: '#38bdf8',
    fogColor: '#bae6fd',
    trackColor: '#e2e8f0',
    railColor: '#ec4899',
    trainColor: '#2563eb',
    trainAccentColor: '#fbbf24',
    billboardImages: [],
    particleTheme: 'sparks',
    ambientLightColor: '#ffffff',
    directionalLightColor: '#fff9db',
    selectedScenerySet: 'set_neon_skyline',
    scenerySets: [
      {
        id: 'set_neon_skyline',
        name: 'Neon City Skyline',
        nameBn: '🌃 নিয়ন সিটি স্কাইলাইন',
        hasBuildings: true,
        hasMountains: true,
        hasTrees: true,
        buildingStyle: 'modern_neon',
        mountainStyle: 'soft_hills',
        treeStyle: 'neon_glow',
        sceneryDensity: 'high',
        sceneryColor: '#ec4899'
      },
      {
        id: 'set_royal_palace',
        name: 'Royal Palace Gardens',
        nameBn: '🏰 রাজপ্রাসাদ উদ্যান',
        hasBuildings: true,
        hasMountains: true,
        hasTrees: true,
        buildingStyle: 'royal_castle',
        mountainStyle: 'tall_peaks',
        treeStyle: 'forest_pine',
        sceneryDensity: 'high',
        sceneryColor: '#3b82f6'
      },
      {
        id: 'set_tokyo_cherry',
        name: 'Tokyo Cherry Hills',
        nameBn: '🌸 চেরি ব্লসম পাহাড়',
        hasBuildings: true,
        hasMountains: true,
        hasTrees: true,
        buildingStyle: 'cherry_pagoda',
        mountainStyle: 'soft_hills',
        treeStyle: 'cherry_blossom',
        sceneryDensity: 'high',
        sceneryColor: '#f472b6'
      },
      {
        id: 'set_sahara_dunes',
        name: 'Sahara Sand Dunes',
        nameBn: '🏜️ সোনালী সাহারা মরুভূমি',
        hasBuildings: true,
        hasMountains: true,
        hasTrees: true,
        buildingStyle: 'sandstone_pyramid',
        mountainStyle: 'desert_dunes',
        treeStyle: 'oasis_palm',
        sceneryDensity: 'medium',
        sceneryColor: '#f59e0b'
      }
    ]
  },
  gameplay: {
    baseSpeed: 28,
    maxSpeed: 56,
    acceleration: 0.6,
    jumpVelocity: 16.5,
    gravity: 38,
    magnetDuration: 10,
    multiplierDuration: 10,
    sneakersDuration: 10,
    jetpackDuration: 8,
    startingHoverboards: 3,
    soundVolume: 0.8,
    musicVolume: 0.5,
    language: 'bn',
    graphicsQuality: 'smooth',
  },
  upiConfig: {
    upiId: 'your-upi-id@ybl',
    merchantName: 'Subway Princess Store',
    qrCodeImageUrl: '',
    whatsappNumber: '',
    verificationMode: 'utr_or_code',
    adminPin: '1234',
  },
  shopItems: DEFAULT_SHOP_ITEMS,
  roadsideShopCharacters: [
    {
      id: 'shop_keeper_center',
      enabled: true,
      roleBn: '১. মূল শপকিপার (মাঝের কাউন্টার)',
      roleEn: '1. Main Shopkeeper (Center Counter)',
      pose: 'wave',
      name: 'Empress Zara',
      modelType: 'royal',
      skinColor: '#fed7aa',
      hairColor: '#18181b',
      outfitColor: '#eab308',
      outfitSecondaryColor: '#059669',
      crownColor: '#fef08a',
      capeColor: '#10b981',
      hasCrown: true,
      hasCape: true,
    },
    {
      id: 'shop_keeper_left',
      enabled: true,
      roleBn: '২. বাম পাশের শপ ক্যারেক্টার',
      roleEn: '2. Left Counter Shop Character',
      pose: 'dance',
      name: 'Princess Aoi',
      modelType: 'sakura',
      skinColor: '#fff1f2',
      hairColor: '#312e81',
      outfitColor: '#f472b6',
      outfitSecondaryColor: '#fda4af',
      crownColor: '#fb7185',
      capeColor: '#f43f5e',
      hasCrown: true,
      hasCape: true,
    },
    {
      id: 'shop_keeper_right',
      enabled: true,
      roleBn: '৩. ডান পাশের শপ ক্যারেক্টার',
      roleEn: '3. Right Counter Shop Character',
      pose: 'wave',
      name: 'Cyber Nova',
      modelType: 'cyber',
      skinColor: '#fce7f3',
      hairColor: '#06b6d4',
      outfitColor: '#0f172a',
      outfitSecondaryColor: '#22d3ee',
      crownColor: '#06b6d4',
      capeColor: '#38bdf8',
      hasCrown: true,
      hasCape: false,
    },
  ],
  levelUpRewards: [],
};

export const THEME_PRESETS: Record<EnvironmentTheme, Partial<GameCustomConfig['environment']>> = {
  neon_subway: {
    theme: 'neon_subway',
    themeName: 'Bright Sky Transit',
    skyColor: '#38bdf8',
    fogColor: '#bae6fd',
    trackColor: '#e2e8f0',
    railColor: '#ec4899',
    trainColor: '#2563eb',
    trainAccentColor: '#fbbf24',
    particleTheme: 'sparks',
    ambientLightColor: '#ffffff',
    directionalLightColor: '#fff9db',
  },
  royal_kingdom: {
    theme: 'royal_kingdom',
    themeName: 'Sunlit Palace Railway',
    skyColor: '#60a5fa',
    fogColor: '#dbeafe',
    trackColor: '#f1f5f9',
    railColor: '#f59e0b',
    trainColor: '#ec4899',
    trainAccentColor: '#34d399',
    particleTheme: 'stars',
    ambientLightColor: '#ffffff',
    directionalLightColor: '#fffbeb',
  },
  tokyo_sakura: {
    theme: 'tokyo_sakura',
    themeName: 'Spring Sakura Parkway',
    skyColor: '#fbcfe8',
    fogColor: '#ffe4e6',
    trackColor: '#cbd5e1',
    railColor: '#f43f5e',
    trainColor: '#f472b6',
    trainAccentColor: '#ffffff',
    particleTheme: 'petals',
    ambientLightColor: '#fff1f2',
    directionalLightColor: '#ffe4e6',
  },
  desert_express: {
    theme: 'desert_express',
    themeName: 'Golden Oasis Metro',
    skyColor: '#fdba74',
    fogColor: '#ffedd5',
    trackColor: '#f59e0b',
    railColor: '#fbbf24',
    trainColor: '#ea580c',
    trainAccentColor: '#10b981',
    particleTheme: 'dust',
    ambientLightColor: '#fff7ed',
    directionalLightColor: '#fed7aa',
  },
};

export const CHARACTER_PRESETS: Record<CharacterModelType, Partial<GameCustomConfig['princess']>> = {
  royal: {
    name: 'Princess Aurora',
    modelType: 'royal',
    skinColor: '#fed7aa',
    hairColor: '#eab308',
    outfitColor: '#ec4899',
    outfitSecondaryColor: '#a855f7',
    crownColor: '#fbbf24',
    capeColor: '#f43f5e',
    hasCrown: true,
    hasCape: true,
  },
  cyber: {
    name: 'Cyber Nova',
    modelType: 'cyber',
    skinColor: '#fce7f3',
    hairColor: '#06b6d4',
    outfitColor: '#0f172a',
    outfitSecondaryColor: '#22d3ee',
    crownColor: '#06b6d4',
    capeColor: '#38bdf8',
    hasCrown: true,
    hasCape: false,
  },
  sakura: {
    name: 'Princess Aoi',
    modelType: 'sakura',
    skinColor: '#fff1f2',
    hairColor: '#312e81',
    outfitColor: '#f472b6',
    outfitSecondaryColor: '#fda4af',
    crownColor: '#fb7185',
    capeColor: '#f43f5e',
    hasCrown: true,
    hasCape: true,
  },
  street: {
    name: 'Street Rebel Maya',
    modelType: 'street',
    skinColor: '#d97706',
    hairColor: '#dc2626',
    outfitColor: '#ea580c',
    outfitSecondaryColor: '#171717',
    crownColor: '#e11d48',
    capeColor: '#fb923c',
    hasCrown: false,
    hasCape: false,
  },
};

export const PET_PRESETS: Record<PetType, Partial<GameCustomConfig['pet']>> = {
  corgi: {
    type: 'corgi',
    name: 'Sparky',
    color: '#d97706',
    secondaryColor: '#fef3c7',
    perk: 'magnet_boost',
    perkDescription: '+25% Coin Magnet range & duration',
  },
  kitty: {
    type: 'kitty',
    name: 'Mochi',
    color: '#f43f5e',
    secondaryColor: '#ffffff',
    perk: 'score_boost',
    perkDescription: '+15% Score multiplier bonus',
  },
  dragon: {
    type: 'dragon',
    name: 'Draco',
    color: '#8b5cf6',
    secondaryColor: '#38bdf8',
    perk: 'shield_saver',
    perkDescription: '+1 Extra free Hoverboard per run',
  },
  fox: {
    type: 'fox',
    name: 'Kitsune',
    color: '#ea580c',
    secondaryColor: '#ffffff',
    perk: 'coin_doubler',
    perkDescription: 'Chance of double coins appearing',
  },
  panda: {
    type: 'panda',
    name: 'Bao Bao',
    color: '#18181b',
    secondaryColor: '#f4f4f5',
    perk: 'score_boost',
    perkDescription: 'Bamboo blessing: +20% score speed',
  },
};

export function loadGameConfig(): GameCustomConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let config: GameCustomConfig = DEFAULT_CONFIG;
    if (raw) {
      const parsed = JSON.parse(raw);
      config = {
        ...DEFAULT_CONFIG,
        ...parsed,
        princess: {
          ...DEFAULT_CONFIG.princess,
          ...(parsed.princess || {}),
          skateboard: {
            ...DEFAULT_SKATEBOARD,
            ...(parsed.princess?.skateboard || {}),
          },
        },
        pet: { ...DEFAULT_CONFIG.pet, ...(parsed.pet || {}) },
        environment: { ...DEFAULT_CONFIG.environment, ...(parsed.environment || {}) },
        gameplay: { ...DEFAULT_CONFIG.gameplay, ...(parsed.gameplay || {}) },
        upiConfig: { ...DEFAULT_CONFIG.upiConfig, ...(parsed.upiConfig || {}) },
        shopItems: Array.isArray(parsed.shopItems) && parsed.shopItems.length > 0
          ? parsed.shopItems
          : DEFAULT_SHOP_ITEMS,
        roadsideShopCharacters:
          Array.isArray(parsed.roadsideShopCharacters) && parsed.roadsideShopCharacters.length > 0
            ? parsed.roadsideShopCharacters
            : DEFAULT_CONFIG.roadsideShopCharacters,
        levelUpRewards: Array.isArray(parsed.levelUpRewards)
          ? parsed.levelUpRewards
          : DEFAULT_CONFIG.levelUpRewards,
      };
    }

    // Check URL parameters if standalone admin.html synced or shared a customized link
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const sharedUpi = params.get('upi');
      const sharedMn = params.get('mn');
      const sharedWa = params.get('wa');
      const sharedVmode = params.get('vmode');
      const sharedPin = params.get('pin');
      const sharedTheme = params.get('theme') as EnvironmentTheme | null;
      const sharedPname = params.get('pname');
      const sharedOc = params.get('oc');
      const sharedSc = params.get('sc');
      const sharedHc = params.get('hc');
      const sharedCc = params.get('cc');
      const sharedBc = params.get('bc');
      const sharedTc = params.get('tc');
      const sharedBb = params.get('bb');
      const sharedPet = params.get('pet') as PetType | null;
      const sharedPrices = params.get('prices');
      let updatedFromUrl = false;

      if (sharedUpi && sharedUpi.includes('@')) {
        config.upiConfig.upiId = sharedUpi;
        updatedFromUrl = true;
      }
      if (sharedMn) {
        config.upiConfig.merchantName = sharedMn;
        updatedFromUrl = true;
      }
      if (sharedWa !== null) {
        config.upiConfig.whatsappNumber = sharedWa;
        updatedFromUrl = true;
      }
      if (sharedVmode === 'utr_or_code' || sharedVmode === 'code_only') {
        config.upiConfig.verificationMode = sharedVmode;
        updatedFromUrl = true;
      }
      if (sharedPin) {
        config.upiConfig.adminPin = sharedPin;
        updatedFromUrl = true;
      }
      if (sharedTheme && THEME_PRESETS[sharedTheme]) {
        config.environment = {
          ...config.environment,
          ...THEME_PRESETS[sharedTheme],
          theme: sharedTheme,
        };
        updatedFromUrl = true;
      }
      if (sharedPname) {
        config.princess.name = sharedPname;
        updatedFromUrl = true;
      }
      if (sharedOc) {
        config.princess.outfitColor = sharedOc;
        updatedFromUrl = true;
      }
      if (sharedSc) {
        config.princess.outfitSecondaryColor = sharedSc;
        updatedFromUrl = true;
      }
      if (sharedHc) {
        config.princess.hairColor = sharedHc;
        updatedFromUrl = true;
      }
      if (sharedCc) {
        config.princess.capeColor = sharedCc;
        updatedFromUrl = true;
      }
      if (sharedBc && config.princess.skateboard) {
        config.princess.skateboard.boardColor = sharedBc;
        updatedFromUrl = true;
      }
      if (sharedTc && config.princess.skateboard) {
        config.princess.skateboard.trimColor = sharedTc;
        updatedFromUrl = true;
      }
      if (sharedBb !== null && config.princess.skateboard) {
        config.princess.skateboard.bonusBoards = Math.max(0, parseInt(sharedBb) || 0);
        updatedFromUrl = true;
      }
      if (sharedPet && PET_PRESETS[sharedPet]) {
        config.pet = {
          ...config.pet,
          ...PET_PRESETS[sharedPet],
          type: sharedPet,
          enabled: true,
        };
        updatedFromUrl = true;
      }
      if (sharedPrices) {
        // Format: id:priceInr:unlockCode,id2:priceInr:unlockCode
        const entries = sharedPrices.split(',');
        const map = new Map<string, { priceInr: number; unlockCode: string }>();
        entries.forEach((entry) => {
          const [id, pStr, code] = entry.split(':');
          if (id && pStr !== undefined && code) {
            map.set(id, { priceInr: Math.max(0, parseInt(pStr) || 0), unlockCode: code });
          }
        });
        if (map.size > 0) {
          config.shopItems = config.shopItems.map((item) => {
            const override = map.get(item.id);
            return override
              ? { ...item, priceInr: override.priceInr, unlockCode: override.unlockCode }
              : item;
          });
          updatedFromUrl = true;
        }
      }
      const sharedCustomItems = params.get('customItems');
      if (sharedCustomItems) {
        try {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedCustomItems))));
          if (Array.isArray(decoded) && decoded.length > 0) {
            const existingIds = new Set(config.shopItems.map((i) => i.id));
            const newOnes = decoded.filter((i: ShopItem) => i && i.id && !existingIds.has(i.id));
            config.shopItems = [...newOnes, ...config.shopItems];
            updatedFromUrl = true;
          }
        } catch {
          // ignore malformed customItems
        }
      }
      if (updatedFromUrl) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    }

    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

const CLOUD_SYNC_API = 'https://ais-pre-nwc7joq32dfcdjlvvxahlb-478239086659.asia-southeast1.run.app/api/config';

export function mergeConfigWithDefaults(srv: Partial<GameCustomConfig>, currentLocal: GameCustomConfig): GameCustomConfig {
  let mergedShopItems = currentLocal.shopItems;
  if (Array.isArray(srv.shopItems) && srv.shopItems.length > 0) {
    const srvMap = new Map<string, ShopItem>();
    srv.shopItems.forEach((it: ShopItem) => {
      if (it && it.id) srvMap.set(it.id, it);
    });
    const customFromServer = srv.shopItems.filter(
      (it: ShopItem) => it && it.id && !DEFAULT_SHOP_ITEMS.some((d) => d.id === it.id)
    );
    const updatedDefaults = DEFAULT_SHOP_ITEMS.map((defItem) => {
      const srvItem = srvMap.get(defItem.id);
      return srvItem ? { ...defItem, ...srvItem } : defItem;
    });
    mergedShopItems = [...customFromServer, ...updatedDefaults];
  }

  const merged: GameCustomConfig = {
    ...currentLocal,
    ...srv,
    upiConfig: {
      ...currentLocal.upiConfig,
      ...(srv.upiConfig || {}),
    },
    environment: {
      ...currentLocal.environment,
      ...(srv.environment || {}),
    },
    shopItems: mergedShopItems,
    roadsideShopCharacters:
      Array.isArray(srv.roadsideShopCharacters) && srv.roadsideShopCharacters.length > 0
        ? srv.roadsideShopCharacters
        : currentLocal.roadsideShopCharacters || DEFAULT_CONFIG.roadsideShopCharacters,
    levelUpRewards: Array.isArray(srv.levelUpRewards)
      ? srv.levelUpRewards
      : currentLocal.levelUpRewards || DEFAULT_CONFIG.levelUpRewards || [],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

function createSanitizedConfigForMainDoc(config: GameCustomConfig): Record<string, unknown> {
  const jsonStr = JSON.stringify(config);
  // If overall document payload is safely under 750KB, write directly
  if (jsonStr.length < 750000) {
    return config as unknown as Record<string, unknown>;
  }

  // Otherwise, sanitize shopItems in the main document to omit heavy base64 models (stored in shop_items collection)
  const sanitizedShopItems = (config.shopItems || []).map((item) => {
    const itemStr = JSON.stringify(item);
    if (itemStr.length > 150000) {
      const sanitizedItem: Record<string, unknown> = { ...item };
      if (
        sanitizedItem.customModelUrl &&
        typeof sanitizedItem.customModelUrl === 'string' &&
        sanitizedItem.customModelUrl.length > 500
      ) {
        sanitizedItem.customModelUrl = 'ref:shop_items/' + item.id;
      }
      if (sanitizedItem.characterData && typeof sanitizedItem.characterData === 'object') {
        const cd = { ...sanitizedItem.characterData } as Record<string, unknown>;
        if (cd.customModelUrl && typeof cd.customModelUrl === 'string' && cd.customModelUrl.length > 500) {
          cd.customModelUrl = 'ref:shop_items/' + item.id;
        }
        sanitizedItem.characterData = cd;
      }
      return sanitizedItem;
    }
    return item;
  });

  return {
    ...config,
    shopItems: sanitizedShopItems,
  };
}

export function subscribeToLiveFirestoreConfig(onUpdate: (config: GameCustomConfig) => void): () => void {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<GameCustomConfig>;
          if (data) {
            const currentLocal = loadGameConfig();
            // Fetch custom shop items from shop_items collection
            let extraItems: ShopItem[] = [];
            try {
              const snap = await getDocs(collection(db, FIRESTORE_ITEMS_COLLECTION));
              snap.forEach((d) => {
                if (d.exists()) extraItems.push(d.data() as ShopItem);
              });
            } catch {}

            if (extraItems.length > 0) {
              const existingMap = new Map((data.shopItems || []).map((i) => [i.id, i]));
              extraItems.forEach((ex) => {
                const existing = existingMap.get(ex.id);
                if (!existing || !existing.customModelUrl || existing.customModelUrl.startsWith('ref:')) {
                  existingMap.set(ex.id, ex);
                }
              });
              data.shopItems = Array.from(existingMap.values());
            }

            const merged = mergeConfigWithDefaults(data, currentLocal);
            onUpdate(merged);
          }
        }
      },
      () => {
        // Safe offline/preview fallback without noisy error logs
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not initialize Firestore listener:', err);
    return () => {};
  }
}

export async function fetchLiveServerConfig(currentLocal: GameCustomConfig): Promise<GameCustomConfig | null> {
  // 1. First try Firestore directly
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<GameCustomConfig>;
      if (data) {
        // Fetch custom shop items from shop_items collection
        try {
          const snap = await getDocs(collection(db, FIRESTORE_ITEMS_COLLECTION));
          const extraItems: ShopItem[] = [];
          snap.forEach((d) => {
            if (d.exists()) extraItems.push(d.data() as ShopItem);
          });
          if (extraItems.length > 0) {
            const existingMap = new Map((data.shopItems || []).map((i) => [i.id, i]));
            extraItems.forEach((ex) => {
              const existing = existingMap.get(ex.id);
              if (!existing || !existing.customModelUrl || existing.customModelUrl.startsWith('ref:')) {
                existingMap.set(ex.id, ex);
              }
            });
            data.shopItems = Array.from(existingMap.values());
          }
        } catch {}

        return mergeConfigWithDefaults(data, currentLocal);
      }
    }
  } catch (e) {
    // Fallback to REST endpoints
  }

  // 2. Fallback to REST endpoints
  const endpoints = ['/api/config', CLOUD_SYNC_API];
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;
      const data = await res.json();
      if (!data?.ok || !data?.config) continue;
      return mergeConfigWithDefaults(data.config, currentLocal);
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

export function saveGameConfig(config: GameCustomConfig, syncToRemote: boolean = true): void {
  try {
    // 1. Save to LocalStorage immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

    // 2. Broadcast to all open tabs and windows in real-time
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('subway_princess_sync');
      channel.postMessage({ type: 'CONFIG_UPDATED', config });
      channel.close();
    }

    // 3. Save to Firestore and cloud server if sync requested
    if (syncToRemote) {
      try {
        // Save each custom shop item into individual document in shop_items collection
        if (Array.isArray(config.shopItems)) {
          config.shopItems.forEach((item) => {
            if (item && item.id && (item.isExternalAsset || item.id.startsWith('custom_') || item.customModelUrl)) {
              try {
                const itemDocRef = doc(db, FIRESTORE_ITEMS_COLLECTION, item.id);
                setDoc(itemDocRef, item, { merge: true }).catch(() => {});
              } catch {}
            }
          });
        }

        // Save sanitized main config document (under 1MB size limit)
        const sanitized = createSanitizedConfigForMainDoc(config);
        const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
        setDoc(docRef, sanitized, { merge: true }).catch((err) => {
          console.warn('Firestore setDoc warning:', err);
        });
      } catch (err) {
        console.warn('Firestore save error:', err);
      }

      if (typeof window !== 'undefined') {
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config }),
        }).catch(() => {});
        fetch(CLOUD_SYNC_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config }),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

export function resetGameConfig(): GameCustomConfig {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_CONFIG;
}

export interface PlayerStats {
  highScore: number;
  totalCoins: number;
  totalGems: number;
  runsCount: number;
  unlockedItemIds: string[];
  equippedItems: {
    character: string;
    dress: string;
    skateboard: string;
    pet: string;
  };
  usedUtrNumbers: string[];
  level: number;
  xp: number;
  claimedLevelRewardIds: string[];
  dailyMissionsDate: string;
  dailyMissions: DailyMissionItem[];
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  return 200 + (safeLevel - 1) * 100;
}

export function createDailyMissionForType(type: DailyMissionType, tier: number = 1): DailyMissionItem {
  const safeTier = Math.max(1, Math.floor(tier || 1));
  switch (type) {
    case 'collect_coins': {
      const target = 100 * safeTier;
      return {
        id: `mission_coins_t${safeTier}`,
        type: 'collect_coins',
        titleEn: `Coin Hunter (Stage ${safeTier})`,
        titleBn: `কয়েন শিকারি (ধাপ ${safeTier})`,
        descEn: `Collect ${target.toLocaleString()} coins in runs`,
        descBn: `দৌড়ে মোট ${target.toLocaleString()}টি কয়েন সংগ্রহ করুন`,
        icon: '🪙',
        target,
        progress: 0,
        rewardXp: 120 + (safeTier - 1) * 35,
        rewardCoins: 200 + (safeTier - 1) * 60,
        claimed: false,
        tier: safeTier,
      };
    }
    case 'run_distance': {
      const target = 400 * safeTier;
      return {
        id: `mission_dist_t${safeTier}`,
        type: 'run_distance',
        titleEn: `Marathon Runner (Stage ${safeTier})`,
        titleBn: `ম্যারাথন রানার (ধাপ ${safeTier})`,
        descEn: `Run ${target.toLocaleString()}m total distance`,
        descBn: `ট্র্যাকে মোট ${target.toLocaleString()} মিটার দৌড়ান`,
        icon: '🏃‍♀️',
        target,
        progress: 0,
        rewardXp: 150 + (safeTier - 1) * 40,
        rewardCoins: 250 + (safeTier - 1) * 75,
        claimed: false,
        tier: safeTier,
      };
    }
    case 'reach_score': {
      const target = 2500 * safeTier;
      return {
        id: `mission_score_t${safeTier}`,
        type: 'reach_score',
        titleEn: `Score Legend (Stage ${safeTier})`,
        titleBn: `স্কোর চ্যাম্পিয়ন (ধাপ ${safeTier})`,
        descEn: `Earn ${target.toLocaleString()} total score points`,
        descBn: `দৌড়ে মোট ${target.toLocaleString()} স্কোর অর্জন করুন`,
        icon: '🏆',
        target,
        progress: 0,
        rewardXp: 160 + (safeTier - 1) * 45,
        rewardCoins: 300 + (safeTier - 1) * 80,
        claimed: false,
        tier: safeTier,
      };
    }
    case 'jump_or_slide': {
      const target = 10 * safeTier;
      return {
        id: `mission_acrobat_t${safeTier}`,
        type: 'jump_or_slide',
        titleEn: `Acrobat Reflex (Stage ${safeTier})`,
        titleBn: `সুপার জাম্প ও স্লাইড (ধাপ ${safeTier})`,
        descEn: `Jump or Slide ${target} times over barriers`,
        descBn: `দৌড়ানোর সময় ${target} বার জাম্প বা স্লাইড করুন`,
        icon: '⚡',
        target,
        progress: 0,
        rewardXp: 100 + (safeTier - 1) * 30,
        rewardCoins: 180 + (safeTier - 1) * 50,
        claimed: false,
        tier: safeTier,
      };
    }
    case 'use_powerups': {
      const target = 2 * safeTier;
      return {
        id: `mission_powerup_t${safeTier}`,
        type: 'use_powerups',
        titleEn: `Board & Power Master (Stage ${safeTier})`,
        titleBn: `হোভারবোর্ড ও পাওয়ার মাস্টার (ধাপ ${safeTier})`,
        descEn: `Use Hoverboard or collect Power-ups ${target} times`,
        descBn: `${target} বার হোভারবোর্ড বা পাওয়ার-আপ ব্যবহার করুন`,
        icon: '🛹',
        target,
        progress: 0,
        rewardXp: 140 + (safeTier - 1) * 40,
        rewardCoins: 240 + (safeTier - 1) * 70,
        claimed: false,
        tier: safeTier,
      };
    }
    case 'emote_or_shop':
    default: {
      const target = 2 * safeTier;
      return {
        id: `mission_emote_t${safeTier}`,
        type: 'emote_or_shop',
        titleEn: `Royal Emote & Bazaar (Stage ${safeTier})`,
        titleBn: `ইমোট ও শপ ভিজিট (ধাপ ${safeTier})`,
        descEn: `Play ${target} Emotes or visit the Roadside Shop`,
        descBn: `${target} বার ইমোট দিন বা রাস্তার শপে যান`,
        icon: '💃',
        target,
        progress: 0,
        rewardXp: 110 + (safeTier - 1) * 35,
        rewardCoins: 200 + (safeTier - 1) * 60,
        claimed: false,
        tier: safeTier,
      };
    }
  }
}

export function createInitialDailyMissions(tier: number = 1): DailyMissionItem[] {
  const types: DailyMissionType[] = [
    'collect_coins',
    'run_distance',
    'reach_score',
    'jump_or_slide',
    'use_powerups',
    'emote_or_shop',
  ];
  return types.map((t) => createDailyMissionForType(t, tier));
}

export const DEFAULT_STATS: PlayerStats = {
  highScore: 0,
  totalCoins: 0,
  totalGems: 0,
  runsCount: 0,
  unlockedItemIds: ['char_aurora', 'dress_royal_pink', 'board_pink_classic', 'pet_corgi_sparky'],
  equippedItems: {
    character: 'char_aurora',
    dress: 'dress_royal_pink',
    skateboard: 'board_pink_classic',
    pet: 'pet_corgi_sparky',
  },
  usedUtrNumbers: [],
  level: 1,
  xp: 0,
  claimedLevelRewardIds: [],
  dailyMissionsDate: getTodayDateString(),
  dailyMissions: createInitialDailyMissions(1),
};

export function loadPlayerStats(): PlayerStats {
  try {
    const today = getTodayDateString();
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS, dailyMissionsDate: today, dailyMissions: createInitialDailyMissions(1) };
    const parsed = JSON.parse(raw);
    const isSameDay = parsed.dailyMissionsDate === today;
    const loadedMissions =
      isSameDay && Array.isArray(parsed.dailyMissions) && parsed.dailyMissions.length > 0
        ? parsed.dailyMissions
        : createInitialDailyMissions(1);

    return {
      ...DEFAULT_STATS,
      ...parsed,
      unlockedItemIds: Array.isArray(parsed.unlockedItemIds)
        ? Array.from(new Set([...DEFAULT_STATS.unlockedItemIds, ...parsed.unlockedItemIds]))
        : DEFAULT_STATS.unlockedItemIds,
      equippedItems: {
        ...DEFAULT_STATS.equippedItems,
        ...(parsed.equippedItems || {}),
      },
      usedUtrNumbers: Array.isArray(parsed.usedUtrNumbers) ? parsed.usedUtrNumbers : [],
      level: typeof parsed.level === 'number' && parsed.level >= 1 ? Math.floor(parsed.level) : 1,
      xp: typeof parsed.xp === 'number' && parsed.xp >= 0 ? Math.floor(parsed.xp) : 0,
      claimedLevelRewardIds: Array.isArray(parsed.claimedLevelRewardIds) ? parsed.claimedLevelRewardIds : [],
      dailyMissionsDate: today,
      dailyMissions: loadedMissions,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function addDailyMissionProgress(
  stats: PlayerStats,
  updates: Partial<Record<DailyMissionType, number>>
): PlayerStats {
  const nextMissions = (stats.dailyMissions || []).map((m) => {
    const inc = updates[m.type] || 0;
    if (inc <= 0 || m.claimed) return m;
    return {
      ...m,
      progress: Math.min(m.target, m.progress + inc),
    };
  });
  const nextStats: PlayerStats = {
    ...stats,
    dailyMissions: nextMissions,
  };
  savePlayerStats(nextStats);
  return nextStats;
}

export function applyUnlockedAdminLevelRewards(
  stats: PlayerStats,
  config: GameCustomConfig
): {
  updatedStats: PlayerStats;
  newlyUnlockedRewards: LevelUpRewardConfig[];
} {
  const configuredRewards = Array.isArray(config.levelUpRewards)
    ? config.levelUpRewards.filter((r) => r && r.enabled !== false && r.level >= 1)
    : [];

  if (configuredRewards.length === 0) {
    return { updatedStats: stats, newlyUnlockedRewards: [] };
  }

  let nextCoins = stats.totalCoins;
  let nextGems = stats.totalGems;
  const nextUnlockedItemIds = new Set(stats.unlockedItemIds);
  const nextClaimedIds = new Set(stats.claimedLevelRewardIds || []);
  const newlyUnlockedRewards: LevelUpRewardConfig[] = [];

  configuredRewards.forEach((reward) => {
    if (stats.level >= reward.level && !nextClaimedIds.has(reward.id)) {
      nextClaimedIds.add(reward.id);
      newlyUnlockedRewards.push(reward);
      if (reward.rewardType === 'shop_item' && reward.shopItemId) {
        nextUnlockedItemIds.add(reward.shopItemId);
      } else if (reward.rewardType === 'coins') {
        nextCoins += Math.max(0, reward.amount || 500);
      } else if (reward.rewardType === 'gems') {
        nextGems += Math.max(0, reward.amount || 20);
      }
    }
  });

  if (newlyUnlockedRewards.length === 0) {
    return { updatedStats: stats, newlyUnlockedRewards: [] };
  }

  const updatedStats: PlayerStats = {
    ...stats,
    totalCoins: nextCoins,
    totalGems: nextGems,
    unlockedItemIds: Array.from(nextUnlockedItemIds),
    claimedLevelRewardIds: Array.from(nextClaimedIds),
  };
  savePlayerStats(updatedStats);
  return { updatedStats, newlyUnlockedRewards };
}

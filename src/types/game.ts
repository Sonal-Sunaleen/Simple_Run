/**
 * Subway Princess Runner - Type Definitions
 */

export type CharacterModelType = 'royal' | 'cyber' | 'sakura' | 'street';

export interface SkateboardConfig {
  id: string;
  name: string;
  boardColor: string;
  trimColor: string;
  thrusterColor: string;
  bonusBoards: number;
  presetType?: string;
  customModelUrl?: string;
  customTextureUrl?: string;
  modelScale?: number;
  modelYOffset?: number;
}

export interface PrincessConfig {
  name: string;
  modelType: CharacterModelType;
  skinColor: string;
  hairColor: string;
  outfitColor: string;
  outfitSecondaryColor: string;
  crownColor: string;
  capeColor: string;
  hasCrown: boolean;
  hasCape: boolean;
  presetType?: string;
  customAvatarUrl?: string;
  customModelUrl?: string;
  customModelType?: 'gltf' | 'glb' | 'obj' | 'procedural';
  customTextureUrl?: string;
  modelScale?: number;
  modelYOffset?: number;
  modelRotationY?: number;
  tintColor?: string;
  skateboard?: SkateboardConfig;
}

export type PetType = 'corgi' | 'kitty' | 'dragon' | 'fox' | 'panda';
export type PetPerk = 'magnet_boost' | 'score_boost' | 'shield_saver' | 'coin_doubler';

export interface PetConfig {
  enabled: boolean;
  type: PetType;
  name: string;
  color: string;
  secondaryColor: string;
  perk: PetPerk;
  perkDescription: string;
  presetType?: string;
  customModelUrl?: string;
  customModelType?: 'gltf' | 'glb' | 'obj' | 'procedural';
  customTextureUrl?: string;
  modelScale?: number;
  modelYOffset?: number;
  tintColor?: string;
}

export type EnvironmentTheme = 'neon_subway' | 'royal_kingdom' | 'tokyo_sakura' | 'desert_express';
export type ParticleTheme = 'sparks' | 'petals' | 'dust' | 'stars';

export interface ScenerySet {
  id: string;
  name: string;
  nameBn: string;
  hasBuildings: boolean;
  hasMountains: boolean;
  hasTrees: boolean;
  buildingStyle: 'modern_neon' | 'royal_castle' | 'cherry_pagoda' | 'sandstone_pyramid';
  mountainStyle: 'tall_peaks' | 'soft_hills' | 'volcanoes' | 'desert_dunes';
  treeStyle: 'cherry_blossom' | 'forest_pine' | 'oasis_palm' | 'neon_glow';
  sceneryDensity: 'low' | 'medium' | 'high';
  sceneryColor?: string;
}

export interface EnvironmentConfig {
  theme: EnvironmentTheme;
  themeName: string;
  skyColor: string;
  fogColor: string;
  trackColor: string;
  railColor: string;
  trainColor: string;
  trainAccentColor: string;
  billboardImages: string[];
  particleTheme: ParticleTheme;
  ambientLightColor: string;
  directionalLightColor: string;
  selectedScenerySet?: string;
  scenerySets?: ScenerySet[];
}

export interface GameplayConfig {
  baseSpeed: number;
  maxSpeed: number;
  acceleration: number;
  jumpVelocity: number;
  gravity: number;
  magnetDuration: number;
  multiplierDuration: number;
  sneakersDuration: number;
  jetpackDuration: number;
  startingHoverboards: number;
  soundVolume: number;
  musicVolume: number;
  language: 'bn' | 'en';
  graphicsQuality: 'smooth' | 'high';
}

export type ShopCategory = 'character' | 'dress' | 'skateboard' | 'pet';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  priceInr: number; // Indian Rupees (₹), 0 = Free
  priceCoins?: number; // Optional in-game coins price
  unlockCode: string; // Secret code admin can give after UPI payment
  isDefaultUnlocked?: boolean;
  previewColors: [string, string];
  isExternalAsset?: boolean;
  presetType?: string;
  customModelUrl?: string;
  customModelType?: 'gltf' | 'glb' | 'obj' | 'procedural';
  customTextureUrl?: string;
  modelScale?: number;
  modelYOffset?: number;
  modelRotationY?: number;
  tintColor?: string;
  // Payload applied when equipped
  characterData?: Partial<PrincessConfig>;
  dressData?: {
    outfitColor: string;
    outfitSecondaryColor: string;
    capeColor: string;
    crownColor: string;
    hasCrown: boolean;
    hasCape: boolean;
    customTextureUrl?: string;
  };
  skateboardData?: SkateboardConfig;
  petData?: Partial<PetConfig>;
}

export interface UpiPaymentConfig {
  upiId: string;
  merchantName: string;
  qrCodeImageUrl: string; // Optional base64 or image URL uploaded by admin
  whatsappNumber: string; // Optional WhatsApp number for sending payment screenshot
  verificationMode: 'utr_or_code' | 'code_only';
  adminPin: string; // PIN to protect admin.html
}

export interface RoadsideShopKeeperConfig extends PrincessConfig {
  id: string;
  enabled: boolean;
  roleBn: string;
  roleEn: string;
  pose: 'wave' | 'dance' | 'royal_bow' | 'idle';
}

export type LevelRewardType = 'shop_item' | 'coins' | 'gems' | 'hoverboards';

export interface LevelUpRewardConfig {
  id: string;
  level: number;
  rewardType: LevelRewardType;
  shopItemId?: string;
  itemCategory?: ShopCategory;
  itemName: string;
  itemNameBn: string;
  amount?: number;
  enabled: boolean;
}

export type DailyMissionType =
  | 'collect_coins'
  | 'run_distance'
  | 'reach_score'
  | 'jump_or_slide'
  | 'use_powerups'
  | 'emote_or_shop';

export interface DailyMissionItem {
  id: string;
  type: DailyMissionType;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  icon: string;
  target: number;
  progress: number;
  rewardXp: number;
  rewardCoins: number;
  claimed: boolean;
  tier: number;
}

export interface GameCustomConfig {
  version: number;
  princess: PrincessConfig;
  pet: PetConfig;
  environment: EnvironmentConfig;
  gameplay: GameplayConfig;
  upiConfig: UpiPaymentConfig;
  shopItems: ShopItem[];
  roadsideShopCharacters?: RoadsideShopKeeperConfig[];
  levelUpRewards?: LevelUpRewardConfig[];
}

export type ObstacleType = 
  | 'train_stopped'
  | 'train_moving'
  | 'low_barrier'
  | 'high_barrier'
  | 'buffer_stop'
  | 'construction_cone';

export type PowerupType = 
  | 'magnet'
  | 'multiplier'
  | 'sneakers'
  | 'jetpack'
  | 'hoverboard';

export interface ActivePowerups {
  magnet: number;
  multiplier: number;
  sneakers: number;
  jetpack: number;
  hoverboard: boolean;
}

export interface GameScoreState {
  score: number;
  highScore: number;
  coins: number;
  totalCoins: number;
  gems: number;
  totalGems: number;
  distance: number;
  hoverboardsRemaining: number;
}

export interface CompanionBannerState {
  name: string;
  nameBn: string;
  cheer: string;
  cheerBn: string;
  color: string;
  avatar: string;
  active: boolean;
  isPullingAhead: boolean;
}

export type StationEmoteType = 'wave' | 'dance' | 'spin' | 'jump_cheer' | 'royal_bow';

export type InGameTradeItemType =
  | 'gem'
  | 'hoverboard'
  | 'magnet'
  | 'multiplier'
  | 'sneakers'
  | 'jetpack';

export type CollectedItemsInventory = Record<InGameTradeItemType, number>;

export type RoadsideShopVisitPhase =
  | 'none'
  | 'approaching'
  | 'standing_in_front'
  | 'facing_shop'
  | 'at_counter'
  | 'returning';

export interface RoadsideShopState {
  phase: RoadsideShopVisitPhase;
  distanceToShop: number;
  shopZ: number;
  inventory: CollectedItemsInventory;
}




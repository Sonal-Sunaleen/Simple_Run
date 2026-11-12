import * as THREE from 'three';
import {
  EnvironmentConfig,
  EnvironmentTheme,
  ObstacleType,
  PowerupType,
  RoadsideShopKeeperConfig,
  ScenerySet,
} from '../types/game';
import { PrincessCharacter } from './CharacterModel';

export const LANE_WIDTH = 3.0;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
export const FORK_DIVERGE_OFFSET = 26.0;

export interface ObstacleEntity {
  group: THREE.Group;
  laneIndex: number;
  type: ObstacleType;
  box: THREE.Box3;
  z: number;
  height: number;
  canSlideUnder: boolean;
  canJumpOver: boolean;
  isTrain: boolean;
  roofY?: number;
  hasRamp?: boolean;
  trainLength?: number;
  rampStartPosZ?: number;
  rampEndPosZ?: number;
}

export interface CollectibleEntity {
  group: THREE.Group;
  type: 'coin' | 'gem' | PowerupType;
  laneIndex: number;
  z: number;
  y: number;
  collected: boolean;
  mesh: THREE.Mesh;
}

export interface ActiveForkInfo {
  zPos: number;
  direction: 'left' | 'right';
  targetTheme: EnvironmentTheme;
  labelEn: string;
  labelBn: string;
  accentColor: string;
  baseTrackX: number;
  newTrackX: number;
  triggered?: boolean;
  committed?: boolean;
}

export class EnvironmentManager {
  public scene: THREE.Scene;
  private config: EnvironmentConfig;

  // World X center of the currently active 3-lane track (shifts permanently by ±15m each time player takes a diverging side-road!)
  public trackCenterX: number = 0;

  private trackChunks: THREE.Group[] = [];
  private chunkSceneryGroups: THREE.Group[] = [];
  private currentScenerySetId: string = '';
  private readonly chunkLength = 60;
  private readonly totalChunks = 4;

  // Pooled Diverging Side-Road & New Track Starter (built ONCE, repositioned infinitely with zero lag)
  public activeFork: ActiveForkInfo | null = null;
  private nextForkSpawnZ: number = -550;
  private readonly forkIntervalZ: number = 750;
  private forkRoadGroup!: THREE.Group;
  private forkAccentMat!: THREE.MeshBasicMaterial;
  private forkVeilMat!: THREE.MeshBasicMaterial;
  private forkRoadbedMat!: THREE.MeshLambertMaterial;
  private forkCurbMat!: THREE.MeshBasicMaterial;
  private forkMainSignMat!: THREE.MeshBasicMaterial;
  private forkPreSignMat!: THREE.MeshBasicMaterial;
  private forkPreSignGroup!: THREE.Group;
  private forkArchSignGroup!: THREE.Group;
  private forkSignTextures: Map<string, THREE.CanvasTexture> = new Map();
  private animatedIndicators: THREE.Mesh[] = [];

  public obstacles: ObstacleEntity[] = [];
  public collectibles: CollectibleEntity[] = [];

  // Grand Starting Terminal Station (গেম শুরুর আইকনিক সাবওয়ে ডিপার্চার প্ল্যাটফর্ম ও আর্চওয়ে)
  private startStationGroup!: THREE.Group;
  private stationSignTex: THREE.CanvasTexture | null = null;
  public stationSwingPivot: THREE.Group | null = null;
  public stationSwingSeat: THREE.Group | null = null;

  // Roadside In-Game Item Buy & Sell Shop (রাস্তার পাশে কয়েন দিয়ে আইটেম কেনা ও বিক্রির দোকান)
  // Spaced at 1.5x to 2x distance intervals (285m to 370m apart, first shop at -225m)
  public roadsideShopGroup!: THREE.Group;
  public activeShopZ: number = -225;
  private nextShopSpawnZ: number = -560;
  private readonly shopIntervalMinZ: number = 285;
  private readonly shopIntervalMaxZ: number = 370;
  private shopSignTex: THREE.CanvasTexture | null = null;
  private shopAdvanceSignTex: THREE.CanvasTexture | null = null;
  private shopDisplayMeshes: THREE.Mesh[] = [];
  private shopkeeperArmPivot: THREE.Group | null = null;
  private roadsideShopKeepersGroup: THREE.Group = new THREE.Group();
  private roadsideShopKeeperConfigs: RoadsideShopKeeperConfig[] = [];
  private roadsideShopKeepers: { char: PrincessCharacter; config: RoadsideShopKeeperConfig }[] = [];

  // Grand Panoramic Horizon & Sky Vista (ওভার-অল ব্যাকগ্রাউন্ডকে আরও মনোমুগ্ধকর করার দৃশ্যমান প্যানোরামা)
  private horizonVistaGroup!: THREE.Group;
  private ferrisWheelRimGroup: THREE.Group | null = null;
  private ferrisGondolas: THREE.Group[] = [];
  private hotAirBalloons: { group: THREE.Group; baseX: number; baseY: number; baseZ: number; phase: number; speed: number }[] = [];
  private skyBirdFlocks: { group: THREE.Group; wingsL: THREE.Mesh[]; wingsR: THREE.Mesh[]; baseX: number; baseY: number; baseZ: number; phase: number }[] = [];

  // Object Pools for 60 FPS Zero-Lag Gameplay & Immediate Memory Reuse
  private trainPoolWithRamp: ObstacleEntity[] = [];
  private trainPoolNoRamp: ObstacleEntity[] = [];
  private lowBarrierPool: ObstacleEntity[] = [];
  private highBarrierPool: ObstacleEntity[] = [];
  private coinPool: CollectibleEntity[] = [];
  private gemPool: CollectibleEntity[] = [];
  private powerupPools: Record<PowerupType, CollectibleEntity[]> = {
    magnet: [],
    multiplier: [],
    hoverboard: [],
    sneakers: [],
    jetpack: [],
  };

  private nextSpawnZ: number = -45;
  private readonly waveSpacing: number = 38;

  // ALL geometries pre-allocated once statically -> Zero GPU memory leak, 60 FPS smooth
  private static coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 8);
  private static gemGeo = new THREE.OctahedronGeometry(0.4);
  private static sleeperGeo = new THREE.BoxGeometry(2.4, 0.1, 0.35);
  private static lowBarGeo = new THREE.BoxGeometry(2.44, 0.34, 0.2);
  private static lowBottomBarGeo = new THREE.BoxGeometry(2.36, 0.14, 0.14);
  private static lowStripeGeo = new THREE.BoxGeometry(0.28, 0.35, 0.23);
  private static postGeo = new THREE.CylinderGeometry(0.08, 0.095, 0.96, 8);
  private static barrierFootGeo = new THREE.BoxGeometry(0.28, 0.2, 0.72);
  private static barrierBeaconGeo = new THREE.SphereGeometry(0.11, 8, 8);
  private static magnetGeo = new THREE.TorusGeometry(0.32, 0.1, 6, 12, Math.PI);
  private static starGeo = new THREE.DodecahedronGeometry(0.38);
  private static boardPowerupGeo = new THREE.BoxGeometry(0.3, 0.08, 0.65);
  private static sneakerPowerupGeo = new THREE.BoxGeometry(0.35, 0.28, 0.55);
  private static jetpackPowerupGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.55, 6);

  // Train & High Barrier shared geometries (100% Grounded Archway & Full-Hypotenuse Ramp)
  private static trainBodyGeo = new THREE.BoxGeometry(2.1, 3.2, 16);
  private static trainRoofGeo = new THREE.BoxGeometry(2.2, 0.2, 16);
  private static trainNoseGeo = new THREE.BoxGeometry(2.1, 0.6, 0.5);
  private static trainBumperGeo = new THREE.BoxGeometry(2.3, 0.4, 0.4);
  private static trainLightGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
  private static trainWinGeo = new THREE.PlaneGeometry(1.4, 0.8);
  private static trainRampGeo = new THREE.BoxGeometry(2.12, 0.22, 5.38);
  private static trainRampRailGeo = new THREE.BoxGeometry(0.12, 0.18, 5.38);
  private static trainRampStrutGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.65, 6);
  private static trainArrowGeo = new THREE.BoxGeometry(2.1, 0.08, 0.4);
  private static highPillarGeo = new THREE.CylinderGeometry(0.095, 0.115, 3.38, 8);
  private static highHeaderBeamGeo = new THREE.BoxGeometry(2.68, 0.24, 0.28);
  private static highSignGeo = new THREE.BoxGeometry(2.22, 1.08, 0.18);
  private static cautionBandGeo = new THREE.BoxGeometry(2.26, 0.22, 0.21);
  private static highStripeGeo = new THREE.BoxGeometry(0.32, 0.62, 0.21);
  private static highClampGeo = new THREE.BoxGeometry(0.24, 0.22, 0.24);
  private static chainGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.52, 6);

  // Track & Roadside shared geometries
  private static groundGeo = new THREE.BoxGeometry(13.5, 0.35, 60);
  private static grassGeo = new THREE.BoxGeometry(18.0, 0.4, 60);
  private static railGeo = new THREE.BoxGeometry(0.08, 0.1, 60);
  private static hedgeSegGeo = new THREE.BoxGeometry(0.7, 2.2, 16);
  private static cloudSphere1Geo = new THREE.SphereGeometry(2.4, 6, 6);
  private static cloudSphere2Geo = new THREE.SphereGeometry(1.6, 6, 6);
  private static cloudSphere3Geo = new THREE.SphereGeometry(1.7, 6, 6);
  private static gantryTopGeo = new THREE.BoxGeometry(14, 0.3, 0.3);
  private static gantryPostGeo = new THREE.BoxGeometry(0.3, 5.0, 0.3);
  private static billboardPlaneGeo = new THREE.PlaneGeometry(5.5, 1.8);
  private static lampPoleGeo = new THREE.CylinderGeometry(0.09, 0.13, 4.4, 6);
  private static lampArmGeo = new THREE.BoxGeometry(1.1, 0.1, 0.1);
  private static lampBulbGeo = new THREE.SphereGeometry(0.24, 6, 6);
  private static lampHaloGeo = new THREE.SphereGeometry(0.52, 6, 6);
  private static barricadeRailGeo = new THREE.BoxGeometry(0.18, 0.35, 2.6);
  private static barricadeLegGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);
  private static bush1Geo = new THREE.DodecahedronGeometry(0.85);
  private static bush2Geo = new THREE.DodecahedronGeometry(0.6);
  private static silhouetteGeo = new THREE.BoxGeometry(6.0, 18.0, 5.5);

  // Shared fast materials (dynamically tinted across themes with zero reallocation)
  private trackMaterial!: THREE.MeshLambertMaterial;
  private railMaterial!: THREE.MeshLambertMaterial;
  private sleeperMaterial!: THREE.MeshBasicMaterial;
  private trainMaterial!: THREE.MeshLambertMaterial;
  private trainAccentMat!: THREE.MeshLambertMaterial;
  private rampMat!: THREE.MeshLambertMaterial;
  private coinMaterial!: THREE.MeshLambertMaterial;
  private gemMaterial!: THREE.MeshLambertMaterial;
  private lowBarMat!: THREE.MeshLambertMaterial;
  private postMat!: THREE.MeshLambertMaterial;
  private bumperMat!: THREE.MeshBasicMaterial;
  private lightMat!: THREE.MeshBasicMaterial;
  private winMat!: THREE.MeshBasicMaterial;
  private frameMat!: THREE.MeshBasicMaterial;
  private cautionMat!: THREE.MeshBasicMaterial;
  private chainMat!: THREE.MeshBasicMaterial;
  private magnetMat!: THREE.MeshBasicMaterial;
  private starMat!: THREE.MeshBasicMaterial;
  private boardMat!: THREE.MeshBasicMaterial;
  private sneakerMat!: THREE.MeshBasicMaterial;
  private jetpackMat!: THREE.MeshBasicMaterial;
  private hedgeMaterial!: THREE.MeshLambertMaterial;
  private grassMaterial!: THREE.MeshLambertMaterial;
  private cloudMaterial!: THREE.MeshLambertMaterial;
  private gantryBeamMat!: THREE.MeshBasicMaterial;

  // Dynamic theme roadside shared materials
  private lampPoleMat!: THREE.MeshLambertMaterial;
  private lampBulbMat!: THREE.MeshBasicMaterial;
  private lampHaloMat!: THREE.MeshBasicMaterial;
  private barricadeMat!: THREE.MeshLambertMaterial;
  private bushMat!: THREE.MeshLambertMaterial;
  private silhouetteMat!: THREE.MeshLambertMaterial;

  private billboardMaterials: THREE.MeshBasicMaterial[] = [];

  private particlePoints!: THREE.Points;
  private particleCoords: Float32Array = new Float32Array(0);

  constructor(
    scene: THREE.Scene,
    config: EnvironmentConfig,
    roadsideShopCharacters?: RoadsideShopKeeperConfig[]
  ) {
    this.scene = scene;
    this.config = config;
    this.roadsideShopKeeperConfigs = roadsideShopCharacters || [];
    this.currentScenerySetId = config.selectedScenerySet || 'set_neon_skyline';
    this.initMaterials();
    this.createBillboardsFromImages();
    this.prebuildForkSignTextures();
    this.initForkedSideRoadPool();
    this.initStartStation();
    this.initRoadsideShop();
    this.initHorizonVista();
    this.createTrackChunks();
    this.initParticles();
  }

  public getLaneWorldX(laneIdx: number): number {
    return this.trackCenterX + LANES[laneIdx];
  }

  private initMaterials() {
    this.trackMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.trackColor),
    });

    this.railMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.railColor),
      emissive: new THREE.Color(this.config.railColor).multiplyScalar(0.2),
    });

    this.sleeperMaterial = new THREE.MeshBasicMaterial({ color: 0x27272a });
    this.trainMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color(this.config.trainColor) });
    this.trainAccentMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(this.config.trainAccentColor) });
    this.rampMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0x78350f });
    this.coinMaterial = new THREE.MeshLambertMaterial({ color: 0xfbbf24, emissive: 0xd97706 });
    this.gemMaterial = new THREE.MeshLambertMaterial({ color: 0xf43f5e, emissive: 0xbe123c });
    this.lowBarMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    this.postMat = new THREE.MeshLambertMaterial({ color: 0xe4e4e7 });

    this.bumperMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.frameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.cautionMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    this.chainMat = new THREE.MeshBasicMaterial({ color: 0x71717a });

    this.magnetMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.starMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.boardMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    this.sneakerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    this.jetpackMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    this.hedgeMaterial = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    this.grassMaterial = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
    this.cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.gantryBeamMat = new THREE.MeshBasicMaterial({ color: 0x3f3f46 });

    // Shared roadside prop materials
    this.lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    this.lampBulbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.lampHaloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
    });
    this.barricadeMat = new THREE.MeshLambertMaterial({ color: 0xec4899 });
    this.bushMat = new THREE.MeshLambertMaterial({ color: 0x10b981, flatShading: true });
    this.silhouetteMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.55,
    });

    this.applyThemePaletteToMaterials(this.config.theme, 1.0);
  }

  private applyThemePaletteToMaterials(theme: EnvironmentTheme, lerpFactor: number) {
    let targetHedge = new THREE.Color(0x22c55e);
    let targetGrass = new THREE.Color(0x4ade80);
    let poleColor = new THREE.Color(0x334155);
    let lampGlowColor = new THREE.Color(0x38bdf8);
    let barricadeColor = new THREE.Color(0xec4899);
    let bushColor = new THREE.Color(0x10b981);
    let silhouetteColor = new THREE.Color(0x1e293b);
    let lowBarColor = new THREE.Color(0xf43f5e);
    let postColor = new THREE.Color(0x334155);
    let highSignColor = new THREE.Color(0x0ea5e9);
    let cautionBandColor = new THREE.Color(0xfde047);
    let structSupportColor = new THREE.Color(0x475569);

    if (theme === 'royal_kingdom') {
      targetHedge.set(0x16a34a);
      targetGrass.set(0x86efac);
      poleColor.set(0xb45309);
      lampGlowColor.set(0xfef08a);
      barricadeColor.set(0xf59e0b);
      bushColor.set(0x16a34a);
      silhouetteColor.set(0x3b82f6);
      lowBarColor.set(0xe11d48);
      postColor.set(0xd97706);
      highSignColor.set(0x7c3aed);
      cautionBandColor.set(0xfbbf24);
      structSupportColor.set(0xb45309);
    } else if (theme === 'tokyo_sakura') {
      targetHedge.set(0xfca5a5);
      targetGrass.set(0xfecdd3);
      poleColor.set(0x7c2d12);
      lampGlowColor.set(0xfda4af);
      barricadeColor.set(0xf43f5e);
      bushColor.set(0xf9a8d4);
      silhouetteColor.set(0x9d174d);
      lowBarColor.set(0xe11d48);
      postColor.set(0x881337);
      highSignColor.set(0xbe123c);
      cautionBandColor.set(0xfef08a);
      structSupportColor.set(0x7c2d12);
    } else if (theme === 'desert_express') {
      targetHedge.set(0xd97706);
      targetGrass.set(0xfef3c7);
      poleColor.set(0x92400e);
      lampGlowColor.set(0xfde047);
      barricadeColor.set(0xd97706);
      bushColor.set(0x65a30d);
      silhouetteColor.set(0xb45309);
      lowBarColor.set(0xd97706);
      postColor.set(0x78350f);
      highSignColor.set(0xb45309);
      cautionBandColor.set(0xfde047);
      structSupportColor.set(0x92400e);
    }

    this.hedgeMaterial.color.lerp(targetHedge, lerpFactor);
    this.grassMaterial.color.lerp(targetGrass, lerpFactor);
    this.lampPoleMat.color.lerp(poleColor, lerpFactor);
    this.lampBulbMat.color.lerp(lampGlowColor, lerpFactor);
    this.lampHaloMat.color.lerp(lampGlowColor, lerpFactor);
    this.barricadeMat.color.lerp(barricadeColor, lerpFactor);
    this.bushMat.color.lerp(bushColor, lerpFactor);
    this.silhouetteMat.color.lerp(silhouetteColor, lerpFactor);
    this.lowBarMat.color.lerp(lowBarColor, lerpFactor);
    this.postMat.color.lerp(postColor, lerpFactor);
    this.frameMat.color.lerp(highSignColor, lerpFactor);
    this.cautionMat.color.lerp(cautionBandColor, lerpFactor);
    this.chainMat.color.lerp(structSupportColor, lerpFactor);
  }

  private createBillboardsFromImages() {
    this.billboardMaterials.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
    this.billboardMaterials = [];
    const images = this.config.billboardImages;

    if (images && images.length > 0) {
      const loader = new THREE.TextureLoader();
      images.forEach((imgSrc) => {
        try {
          const tex = loader.load(imgSrc);
          this.billboardMaterials.push(new THREE.MeshBasicMaterial({ map: tex }));
        } catch {
          // ignore
        }
      });
    }

    if (this.billboardMaterials.length === 0) {
      const posters = [
        { title: 'SUBWAY PRINCESS', sub: 'VIP SHOP & SKATEBOARDS', bg: '#ec4899', fg: '#ffffff' },
        { title: 'ROYAL EXPRESS', sub: 'COLLECT COINS & GEMS!', bg: '#8b5cf6', fg: '#fde047' },
      ];

      posters.forEach((p) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 244, 116);

        ctx.fillStyle = p.fg;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.title, 128, 55);
        ctx.font = '14px sans-serif';
        ctx.fillText(p.sub, 128, 88);

        const tex = new THREE.CanvasTexture(canvas);
        this.billboardMaterials.push(new THREE.MeshBasicMaterial({ map: tex }));
      });
    }
  }

  private prebuildForkSignTextures() {
    const themeMeta: Record<EnvironmentTheme, { en: string; bn: string; color: string }> = {
      neon_subway: { en: 'CITY ZONE', bn: '🌃 নিওন সিটি ট্র্যাক', color: '#06b6d4' },
      royal_kingdom: { en: 'PALACE ROUTE', bn: '🏰 রাজপ্রাসাদ ট্র্যাক', color: '#f59e0b' },
      tokyo_sakura: { en: 'SAKURA ZONE', bn: '🌸 সাকুরা গার্ডেন ট্র্যাক', color: '#f43f5e' },
      desert_express: { en: 'TUNNEL & OASIS', bn: '🏜️ টানেল ও মরূদ্যান ট্র্যাক', color: '#eab308' },
    };

    (['neon_subway', 'royal_kingdom', 'tokyo_sakura', 'desert_express'] as EnvironmentTheme[]).forEach((theme) => {
      (['left', 'right'] as const).forEach((dir) => {
        const meta = themeMeta[theme];
        const title = dir === 'left' ? `⬅ ${meta.en}` : `${meta.en} ➔`;
        const subMain = `${meta.bn} • NEW TRACK`;
        const texMain = this.createSignboardTexture(title, subMain, meta.color);
        const texPre = this.createSignboardTexture(title, meta.bn, meta.color);
        this.forkSignTextures.set(`${theme}_${dir}_main`, texMain);
        this.forkSignTextures.set(`${theme}_${dir}_pre`, texPre);
      });
    });
  }

  private createSignboardTexture(titleEn: string, subBn: string, borderColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 160);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 144);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleEn, 256, 74);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(subBn, 256, 122);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Builds a True Diverging Side-Road (আলাদা হয়ে এগিয়ে যাওয়া নতুন ট্র্যাক) that branches outward
   * from x = +3.0 (at localZ = +24) to x = +15.0 (at localZ = -24) and continues forward as a
   * brand-new 3-lane track (localZ = -24 to -84) without ever returning to the old track!
   */
  private initForkedSideRoadPool() {
    this.forkRoadGroup = new THREE.Group();
    this.forkRoadGroup.visible = false;

    const accentCol = new THREE.Color(0x06b6d4);
    this.forkRoadbedMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    this.forkAccentMat = new THREE.MeshBasicMaterial({ color: accentCol });
    this.forkCurbMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    this.forkVeilMat = new THREE.MeshBasicMaterial({
      color: accentCol,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    this.forkMainSignMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.forkPreSignMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

    // PART A: Deep, Dramatic Sweeping S-Curve from localZ = +26 (x = 3.0) to localZ = -34 (x = 26.0)
    const segCount = 24;
    const startZ = 26;
    const endZ = -34;
    const totalLen = startZ - endZ; // 60m sweeping curve
    const segLen = totalLen / segCount;

    const slabGeo = new THREE.BoxGeometry(4.4, 0.34, segLen + 0.55);
    const railSegGeo = new THREE.BoxGeometry(0.09, 0.12, segLen + 0.4);
    const curbSegGeo = new THREE.BoxGeometry(0.18, 0.45, segLen + 0.45);

    for (let s = 0; s < segCount; s++) {
      const t0 = s / segCount;
      const t1 = (s + 1) / segCount;
      const tMid = (t0 + t1) / 2;

      const z0 = startZ - t0 * totalLen;
      const z1 = startZ - t1 * totalLen;
      const zMid = (z0 + z1) / 2;

      // Cosine S-curve: sweeps dramatically from x = 3.0 to x = 26.0 (FORK_DIVERGE_OFFSET)
      const ease0 = 0.5 - 0.5 * Math.cos(t0 * Math.PI);
      const ease1 = 0.5 - 0.5 * Math.cos(t1 * Math.PI);
      const easeMid = 0.5 - 0.5 * Math.cos(tMid * Math.PI);

      const x0 = 3.0 + ease0 * (FORK_DIVERGE_OFFSET - 3.0);
      const x1 = 3.0 + ease1 * (FORK_DIVERGE_OFFSET - 3.0);
      const xMid = 3.0 + easeMid * (FORK_DIVERGE_OFFSET - 3.0);

      const yaw = Math.atan2(x1 - x0, z1 - z0);

      const segGroup = new THREE.Group();
      segGroup.position.set(xMid, 0, zMid);
      segGroup.rotation.y = yaw;

      const slab = new THREE.Mesh(slabGeo, this.forkRoadbedMat);
      slab.position.y = -0.17;
      segGroup.add(slab);

      const sleeper = new THREE.Mesh(EnvironmentManager.sleeperGeo, this.sleeperMaterial);
      sleeper.position.set(0, 0.05, 0);
      segGroup.add(sleeper);

      const railL = new THREE.Mesh(railSegGeo, this.forkAccentMat);
      railL.position.set(-0.95, 0.13, 0);
      const railR = new THREE.Mesh(railSegGeo, this.forkAccentMat);
      railR.position.set(0.95, 0.13, 0);
      segGroup.add(railL, railR);

      const curbL = new THREE.Mesh(curbSegGeo, this.forkCurbMat);
      curbL.position.set(-1.95, 0.22, 0);
      const curbR = new THREE.Mesh(curbSegGeo, this.forkCurbMat);
      curbR.position.set(1.95, 0.22, 0);
      segGroup.add(curbL, curbR);

      this.forkRoadGroup.add(segGroup);
    }

    // PART B: Brand-New 3-Lane Track Lead-In Section at x = FORK_DIVERGE_OFFSET (26.0), localZ = -34 to -94 (60m long)
    // This makes the diverging road visibly expand into a full permanent 3-lane track continuing straight ahead!
    const newTrackLeadGroup = new THREE.Group();
    newTrackLeadGroup.position.set(FORK_DIVERGE_OFFSET, -0.01, -64); // Spans localZ = -34 to -94

    const leadGround = new THREE.Mesh(EnvironmentManager.groundGeo, this.forkRoadbedMat);
    leadGround.position.y = -0.18;
    newTrackLeadGroup.add(leadGround);

    const leadGrassR = new THREE.Mesh(EnvironmentManager.grassGeo, this.grassMaterial);
    leadGrassR.position.set(15.5, -0.16, 0);
    newTrackLeadGroup.add(leadGrassR);

    LANES.forEach((laneX) => {
      for (let s = 0; s < 12; s++) {
        const lz = -30 + (s * 60) / 12;
        const sleeper = new THREE.Mesh(EnvironmentManager.sleeperGeo, this.sleeperMaterial);
        sleeper.position.set(laneX, 0.04, lz);
        newTrackLeadGroup.add(sleeper);
      }
      const rL = new THREE.Mesh(EnvironmentManager.railGeo, this.forkAccentMat);
      rL.position.set(laneX - 0.9, 0.12, 0);
      const rR = new THREE.Mesh(EnvironmentManager.railGeo, this.forkAccentMat);
      rR.position.set(laneX + 0.9, 0.12, 0);
      newTrackLeadGroup.add(rL, rR);
    });

    [-1, 1].forEach((side) => {
      const wFront = new THREE.Mesh(EnvironmentManager.hedgeSegGeo, this.hedgeMaterial);
      wFront.position.set(side * 6.8, 1.1, 20);
      const wBack = new THREE.Mesh(EnvironmentManager.hedgeSegGeo, this.hedgeMaterial);
      wBack.position.set(side * 6.8, 1.1, -20);
      newTrackLeadGroup.add(wFront, wBack);
    });

    this.forkRoadGroup.add(newTrackLeadGroup);

    // PART C: Glowing Directional Chevron Indicators curving from the outer lane into the sweeping side-road
    const wingGeo = new THREE.BoxGeometry(0.95, 0.06, 0.24);
    for (let a = 0; a < 8; a++) {
      const progress = a / 7; // 0 to 0.5 along the 60m S-curve (up to Portal Arch)
      const indZ = 26 - progress * 29;
      const ease = 0.5 - 0.5 * Math.cos(progress * 0.52 * Math.PI);
      const indX = 3.0 + ease * (FORK_DIVERGE_OFFSET - 3.0);

      const chevronGroup = new THREE.Group();
      const arrowMat = new THREE.MeshBasicMaterial({
        color: a % 2 === 0 ? 0x06b6d4 : 0xfef08a,
        transparent: true,
        opacity: 0.92,
      });

      const wingL = new THREE.Mesh(wingGeo, arrowMat);
      wingL.position.set(-0.34, 0.08, 0);
      wingL.rotation.y = 0.55;

      const wingR = new THREE.Mesh(wingGeo, arrowMat);
      wingR.position.set(0.34, 0.08, 0);
      wingR.rotation.y = -0.55;

      chevronGroup.add(wingL, wingR);
      chevronGroup.position.set(indX, 0.04, indZ);
      chevronGroup.rotation.y = -0.45 * Math.sin(progress * 0.52 * Math.PI);
      this.forkRoadGroup.add(chevronGroup);
      this.animatedIndicators.push(wingL, wingR);
    }

    // PART D: Advance Roadside Signpost at localZ = +20, x = 5.6
    this.forkPreSignGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), this.lampPoleMat);
    pole.position.y = 1.6;
    this.forkPreSignGroup.add(pole);

    const smallBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.15), this.forkPreSignMat);
    smallBoard.position.set(0, 2.8, 0.08);
    this.forkPreSignGroup.add(smallBoard);
    this.forkPreSignGroup.position.set(5.6, 0, 20);
    this.forkRoadGroup.add(this.forkPreSignGroup);

    // PART E: Grand Portal Arch (গেইট/আর্চ) & Destination Signboard at the S-curve midpoint (localZ = -4, x = 14.5)
    const archGroup = new THREE.Group();
    archGroup.position.set(14.5, 0, -4);
    archGroup.rotation.y = -0.52; // Angled along the deeper diverging curve tangent

    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.3, 5.2, 10);
    const pillarL = new THREE.Mesh(pillarGeo, this.lampPoleMat);
    pillarL.position.set(-1.95, 2.6, 0);
    const pillarR = new THREE.Mesh(pillarGeo, this.lampPoleMat);
    pillarR.position.set(1.95, 2.6, 0);
    archGroup.add(pillarL, pillarR);

    const ringGeo = new THREE.TorusGeometry(0.32, 0.06, 8, 16);
    [1.2, 2.6, 4.0].forEach((ry) => {
      const rL = new THREE.Mesh(ringGeo, this.forkAccentMat);
      rL.position.set(-1.95, ry, 0);
      rL.rotation.x = Math.PI / 2;
      const rR = new THREE.Mesh(ringGeo, this.forkAccentMat);
      rR.position.set(1.95, ry, 0);
      rR.rotation.x = Math.PI / 2;
      archGroup.add(rL, rR);
    });

    const archCrown = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.22, 10, 24, Math.PI),
      this.forkAccentMat
    );
    archCrown.position.set(0, 5.0, 0);
    archGroup.add(archCrown);

    const portalVeil = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.8), this.forkVeilMat);
    portalVeil.position.set(0, 2.5, 0);
    archGroup.add(portalVeil);
    this.animatedIndicators.push(portalVeil);

    this.forkArchSignGroup = new THREE.Group();
    this.forkArchSignGroup.position.set(0, 5.6, 0);
    const signFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.45, 0.16), this.forkAccentMat);
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.28), this.forkMainSignMat);
    signFace.position.z = 0.1;
    this.forkArchSignGroup.add(signFrame, signFace);
    archGroup.add(this.forkArchSignGroup);

    this.forkRoadGroup.add(archGroup);

    // PART F: Picturesque Median Island Scenery Between the Two Roads (দুই রাস্তার মাঝের মনোরম দৃশ্য!)
    // Fills the wide V-shaped valley between the main road (x ≈ 6.8) and the sweeping new road (x ≈ 19.2)
    const medianParkGroup = new THREE.Group();

    // F1. V-Split Junction Chevron Barrier & Twin Ornamental Lamps at (x = 7.4, z = +6)
    const splitMonument = new THREE.Group();
    splitMonument.position.set(7.4, 0, 6);
    const splitBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.45, 8), this.lampPoleMat);
    splitBase.position.y = 0.22;
    const splitSign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.22), this.barricadeMat);
    splitSign.position.y = 1.1;
    splitSign.rotation.y = -0.25;
    const splitGlow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), this.forkAccentMat);
    splitGlow.position.y = 1.95;
    splitMonument.add(splitBase, splitSign, splitGlow);
    medianParkGroup.add(splitMonument);

    // F2. Grand Glowing Crystal Fountain & Marble Plaza in the heart of the median (x = 11.2, z = -22)
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(11.2, 0, -22);

    const plazaDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.6, 0.25, 12),
      new THREE.MeshLambertMaterial({ color: 0xe2e8f0 })
    );
    plazaDisc.position.y = 0.12;
    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.7, 0.32, 12),
      this.forkAccentMat
    );
    waterPool.position.y = 0.22;
    const upperBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.1, 0.35, 10),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc })
    );
    upperBasin.position.y = 1.45;
    const centerPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.65, 2.6, 8),
      new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
    );
    centerPillar.position.y = 1.3;
    const crystalSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.75), this.forkCurbMat);
    crystalSpire.position.y = 3.1;
    fountainGroup.add(plazaDisc, waterPool, centerPillar, upperBasin, crystalSpire);

    // 4 Glowing Garden Lanterns around the Fountain Plaza
    for (let l = 0; l < 4; l++) {
      const ang = (l * Math.PI) / 2 + Math.PI / 4;
      const lx = Math.cos(ang) * 3.1;
      const lz = Math.sin(ang) * 3.1;
      const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), this.lampPoleMat);
      lPole.position.set(lx, 1.1, lz);
      const lOrb = new THREE.Mesh(EnvironmentManager.lampBulbGeo, this.lampBulbMat);
      lOrb.position.set(lx, 2.3, lz);
      fountainGroup.add(lPole, lOrb);
    }
    medianParkGroup.add(fountainGroup);

    // F3. Scenic Multi-Roof Pavilion / Pagoda Tower between the parallel tracks (x = 13.0, z = -54)
    const pavilionGroup = new THREE.Group();
    pavilionGroup.position.set(13.0, 0, -54);
    const pavBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.5, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xd6d3d1 })
    );
    pavBase.position.y = 0.25;
    const pavBody1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.6, 2.4, 6),
      new THREE.MeshLambertMaterial({ color: 0xfef3c7 })
    );
    pavBody1.position.y = 1.7;
    const pavRoof1 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 6), this.barricadeMat);
    pavRoof1.position.y = 3.3;
    const pavBody2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.1, 1.6, 6),
      new THREE.MeshLambertMaterial({ color: 0xfef3c7 })
    );
    pavBody2.position.y = 4.3;
    const pavRoof2 = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 6), this.barricadeMat);
    pavRoof2.position.y = 5.5;
    const pavSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.2, 6), this.coinMaterial);
    pavSpire.position.y = 6.5;
    pavilionGroup.add(pavBase, pavBody1, pavRoof1, pavBody2, pavRoof2, pavSpire);
    medianParkGroup.add(pavilionGroup);

    // F4. Gently Rolling Scenic Hills & Rock Formations in the median valley
    const hillSpots = [
      { x: 9.8, z: -37, r: 3.4, h: 2.6 },
      { x: 15.2, z: -44, r: 3.8, h: 3.1 },
      { x: 12.6, z: -72, r: 4.2, h: 3.4 },
    ];
    hillSpots.forEach((hs) => {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(hs.r, hs.h, 6),
        this.hedgeMaterial
      );
      hill.position.set(hs.x, hs.h / 2 - 0.15, hs.z);
      medianParkGroup.add(hill);
    });

    // F5. Lush Ornamental Trees & Colorful Flowerbed Clusters along the entire median island
    const treePlacements = [
      { x: 8.2, z: -6, scale: 1.1 },
      { x: 9.4, z: -13, scale: 1.35 },
      { x: 8.5, z: -29, scale: 1.25 },
      { x: 14.5, z: -28, scale: 1.2 },
      { x: 12.2, z: -39, scale: 1.4 },
      { x: 9.2, z: -48, scale: 1.15 },
      { x: 16.4, z: -52, scale: 1.3 },
      { x: 9.6, z: -64, scale: 1.35 },
      { x: 15.8, z: -66, scale: 1.25 },
      { x: 12.8, z: -82, scale: 1.4 },
    ];
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.8, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const canopyGeo1 = new THREE.DodecahedronGeometry(1.25);
    const canopyGeo2 = new THREE.DodecahedronGeometry(0.95);

    treePlacements.forEach((tp, idx) => {
      const tGroup = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.9;
      const c1 = new THREE.Mesh(
        canopyGeo1,
        idx % 2 === 0 ? this.bushMat : this.hedgeMaterial
      );
      c1.position.y = 2.1;
      const c2 = new THREE.Mesh(
        canopyGeo2,
        idx % 3 === 0 ? this.barricadeMat : this.bushMat
      );
      c2.position.set(0.35, 2.95, 0.2);
      tGroup.add(trunk, c1, c2);
      tGroup.scale.setScalar(tp.scale);
      tGroup.position.set(tp.x, 0, tp.z);
      medianParkGroup.add(tGroup);
    });

    this.forkRoadGroup.add(medianParkGroup);
    this.scene.add(this.forkRoadGroup);
  }

  /**
   * Builds the iconic Grand Starting Terminal Station (গেম শুরুর আইকনিক সাবওয়ে ডিপার্চার প্ল্যাটফর্ম ও আর্চওয়ে)
   * An elevated passenger platform on the side of the tracks where the Princess and companions dance & chat!
   */
  private initStartStation() {
    this.startStationGroup = new THREE.Group();

    const platformMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const concourseTileMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });
    const tileTrimMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const cautionStripeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const railingMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const benchIronMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const canopyGlassMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    const canopySteelMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const wallBrickMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

    // 1. Elevated Right Passenger Platform (x = 4.5 to 13.0, y = 0.65, z = -14 to +28)
    // The Princess and her friends stand comfortably on this raised platform beside the tracks!
    const platWidth = 8.5;
    const platLen = 42;
    const platFloorGeo = new THREE.BoxGeometry(platWidth, 0.65, platLen);
    const rightPlatform = new THREE.Mesh(platFloorGeo, concourseTileMat);
    rightPlatform.position.set(4.5 + platWidth / 2, 0.325, 7);
    this.startStationGroup.add(rightPlatform);

    // Platform edge vertical curb drop-off facing the tracks (at x = 4.5)
    const curbGeo = new THREE.BoxGeometry(0.2, 0.66, platLen);
    const platformCurb = new THREE.Mesh(curbGeo, tileTrimMat);
    platformCurb.position.set(4.5, 0.33, 7);
    this.startStationGroup.add(platformCurb);

    // Bright yellow safety tactile warning line along platform edge (at x = 4.7)
    const cautionGeo = new THREE.BoxGeometry(0.35, 0.67, platLen);
    const cautionLine = new THREE.Mesh(cautionGeo, cautionStripeMat);
    cautionLine.position.set(4.75, 0.335, 7);
    this.startStationGroup.add(cautionLine);

    // Back safety railing along the right outer edge of platform (at x = 12.9)
    const backRailGeo = new THREE.BoxGeometry(0.08, 0.95, platLen);
    const backRail = new THREE.Mesh(backRailGeo, railingMat);
    backRail.position.set(12.9, 0.95, 7);
    this.startStationGroup.add(backRail);

    // 2. Left Platform across the tracks (x = -13.0 to -4.5, y = 0.65, z = -14 to +28)
    const leftPlatform = new THREE.Mesh(platFloorGeo, platformMat);
    leftPlatform.position.set(-4.5 - platWidth / 2, 0.325, 7);
    this.startStationGroup.add(leftPlatform);

    const leftCurb = new THREE.Mesh(curbGeo, tileTrimMat);
    leftCurb.position.set(-4.5, 0.33, 7);
    this.startStationGroup.add(leftCurb);

    const leftCaution = new THREE.Mesh(cautionGeo, cautionStripeMat);
    leftCaution.position.set(-4.75, 0.335, 7);
    this.startStationGroup.add(leftCaution);

    const leftBackRail = new THREE.Mesh(backRailGeo, railingMat);
    leftBackRail.position.set(-12.9, 0.95, 7);
    this.startStationGroup.add(leftBackRail);

    // 3. Cathedral Steel Arch Canopy spanning across platforms & tracks
    const archZPositions = [-12, -4, 4, 12, 20, 26];
    archZPositions.forEach((rz) => {
      // Grand Arched Truss
      const trussArch = new THREE.Mesh(
        new THREE.TorusGeometry(13.2, 0.28, 8, 24, Math.PI),
        canopySteelMat
      );
      trussArch.position.set(0, 0.5, rz);
      this.startStationGroup.add(trussArch);

      // Flanking support columns
      const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 9.5, 8), canopySteelMat);
      colL.position.set(-13.0, 4.75, rz);
      const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 9.5, 8), canopySteelMat);
      colR.position.set(13.0, 4.75, rz);
      this.startStationGroup.add(colL, colR);

      // Translucent Glass Roof Ribs over concourse
      if (rz > -10 && rz < 26) {
        const glassRib = new THREE.Mesh(
          new THREE.TorusGeometry(13.0, 0.08, 4, 24, Math.PI),
          canopyGlassMat
        );
        glassRib.position.set(0, 0.55, rz);
        this.startStationGroup.add(glassRib);

        // Hanging Vintage Station Chandelier / Pendant Lamp
        const dropChain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), canopySteelMat);
        dropChain.position.set(0, 7.8, rz);
        const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), lampGlowMat);
        lampBulb.position.set(0, 6.2, rz);
        const lampCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.2, 0.35, 8), canopySteelMat);
        lampCrown.position.set(0, 6.6, rz);
        this.startStationGroup.add(dropChain, lampBulb, lampCrown);
      }
    });

    // 4. Back Station Hall Façade & Tall Arched Windows at z = +28
    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(0, 0, 28);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(26.5, 11, 0.8), wallBrickMat);
    backWall.position.y = 5.5;
    backWallGroup.add(backWall);

    // Arched Victorian Station Windows
    [-8, 0, 8].forEach((wx) => {
      const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 7.2), canopyGlassMat);
      windowGlass.position.set(wx, 6.2, -0.45);
      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, 0.3), canopySteelMat);
      windowFrame.position.set(wx, 6.2, -0.4);
      backWallGroup.add(windowGlass, windowFrame);
    });
    this.startStationGroup.add(backWallGroup);

    // 5. Grand Overhead Departure Display Board at z = +20
    const departureArch = new THREE.Group();
    departureArch.position.set(0, 0, 20);

    this.stationSignTex = this.createStationDepartureTexture();
    const signMat = new THREE.MeshBasicMaterial({ map: this.stationSignTex });
    const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 2.4), signMat);
    signBoard.position.set(0, 6.8, -0.2);
    departureArch.add(signBoard);

    // Vintage Two-Faced Station Clock hanging underneath
    const clockDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.22, 16),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    clockDisc.rotation.x = Math.PI / 2;
    clockDisc.position.set(0, 4.9, 0);
    const clockFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.08, 6, 16),
      canopySteelMat
    );
    clockFrame.position.set(0, 4.9, 0);
    departureArch.add(clockDisc, clockFrame);

    this.startStationGroup.add(departureArch);

    // 6. Platform Passenger Benches & Station Street Lamps on the Outer Platform Edges (well behind camera)
    for (let bz = -8; bz <= 20; bz += 14) {
      // Wooden Bench with Iron Legs along the far back edge of the platform
      const benchGroup = new THREE.Group();
      benchGroup.position.set(11.6, 0.65, bz);
      benchGroup.rotation.y = -Math.PI / 2;

      const bSeat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 3.2), benchWoodMat);
      bSeat.position.y = 0.45;
      const bBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 3.2), benchWoodMat);
      bBack.position.set(-0.45, 0.85, 0);
      const bLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.12), benchIronMat);
      bLeg1.position.set(0, 0.22, -1.2);
      const bLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.12), benchIronMat);
      bLeg2.position.set(0, 0.22, 1.2);

      benchGroup.add(bSeat, bBack, bLeg1, bLeg2);
      this.startStationGroup.add(benchGroup);

      // Platform Double-Globe Lamp Post placed along outer railing (x = 12.2, never blocking camera)
      const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 4.2, 8), canopySteelMat);
      lampPost.position.set(12.2, 2.75, bz - 3.5);
      const lampArm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), canopySteelMat);
      lampArm.position.set(12.2, 4.65, bz - 3.5);
      const orb1 = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), lampGlowMat);
      orb1.position.set(11.6, 4.55, bz - 3.5);
      const orb2 = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), lampGlowMat);
      orb2.position.set(12.8, 4.55, bz - 3.5);

      this.startStationGroup.add(lampPost, lampArm, orb1, orb2);
    }

    // 7. Royal Station Swing (প্ল্যাটফর্মের সুন্দর দোলনা) on Near Platform
    // Positioned slightly down the platform at (8.5, 0.65, -2.2) so it never blocks the camera or main character
    const swingGroup = new THREE.Group();
    swingGroup.position.set(8.5, 0.65, -2.2);
    swingGroup.rotation.y = -Math.PI / 2 + 0.35;

    const swingWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const swingGoldMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const swingVelvetMat = new THREE.MeshLambertMaterial({ color: 0xec4899 });
    const swingFlowerMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });

    // A-frame side support legs
    [-1.15, 1.15].forEach((sx) => {
      // Front leg
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), swingWoodMat);
      leg1.position.set(sx, 1.65, 0.45);
      leg1.rotation.x = 0.22;
      // Back leg
      const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), swingWoodMat);
      leg2.position.set(sx, 1.65, -0.45);
      leg2.rotation.x = -0.22;
      // Cross brace
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.75), swingWoodMat);
      brace.position.set(sx, 0.9, 0);
      // Gold corner brackets
      const bracket = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), swingGoldMat);
      bracket.position.set(sx, 3.25, 0);

      // Rose vine wrapping around legs
      for (let v = 0.4; v <= 3.0; v += 0.5) {
        const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), swingFlowerMat);
        blossom.position.set(sx + (Math.random() - 0.5) * 0.08, v, (v % 1.0 > 0.5 ? 0.35 : -0.35));
        swingGroup.add(blossom);
      }

      swingGroup.add(leg1, leg2, brace, bracket);
    });

    // Top horizontal crossbar & carved crown pediment
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.65, 8), swingWoodMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 3.25, 0);
    swingGroup.add(crossbar);

    const pediment = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.12), swingGoldMat);
    pediment.position.set(0, 3.45, 0);
    const pedimentFinial = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 6), swingGoldMat);
    pedimentFinial.position.set(0, 3.65, 0);
    swingGroup.add(pediment, pedimentFinial);

    // Pivot group at the top crossbar for smooth pendulum swing oscillation
    this.stationSwingPivot = new THREE.Group();
    this.stationSwingPivot.position.set(0, 3.25, 0);
    swingGroup.add(this.stationSwingPivot);

    // Golden hanging ropes / chains
    const ropeLen = 2.55;
    [-0.58, 0.58].forEach((rx) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ropeLen, 6), swingGoldMat);
      rope.position.set(rx, -ropeLen / 2, 0);
      this.stationSwingPivot!.add(rope);

      // Flower vine on rope
      for (let f = 0.4; f <= ropeLen - 0.2; f += 0.45) {
        const roseBud = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), swingFlowerMat);
        roseBud.position.set(rx, -f, 0.04);
        this.stationSwingPivot!.add(roseBud);
      }
    });

    // Swing Seat Group: anchored at the bottom of the ropes
    this.stationSwingSeat = new THREE.Group();
    this.stationSwingSeat.position.set(0, -ropeLen, 0);

    // Velvet cushioned seat base
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.58), swingVelvetMat);
    seatBase.position.y = 0.05;
    const seatFrame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.06, 0.62), swingGoldMat);
    seatFrame.position.y = 0;
    // Ergonomic curved backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 0.08), swingVelvetMat);
    backrest.position.set(0, 0.32, -0.26);
    const backFrame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.46, 0.06), swingWoodMat);
    backFrame.position.set(0, 0.32, -0.28);
    // Armrests
    [-0.68, 0.68].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), swingGoldMat);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(ax, 0.22, 0);
      this.stationSwingSeat!.add(arm);
    });

    this.stationSwingSeat.add(seatBase, seatFrame, backrest, backFrame);
    this.stationSwingPivot.add(this.stationSwingSeat);

    this.startStationGroup.add(swingGroup);

    // 8. Right Track Signal Post with Green & Amber Signals at station exit (z = -13.5)
    const signalPost = new THREE.Group();
    signalPost.position.set(LANE_WIDTH + 1.3, 0, -13.5);
    const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6), canopySteelMat);
    sPole.position.y = 2.25;
    const sBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.3), canopySteelMat);
    sBox.position.set(0, 3.8, 0);
    const sGreen = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    sGreen.position.set(0, 4.1, 0.18);
    const sAmber = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    sAmber.position.set(0, 3.6, 0.18);
    signalPost.add(sPole, sBox, sGreen, sAmber);
    this.startStationGroup.add(signalPost);

    this.scene.add(this.startStationGroup);
  }

  /**
   * Builds the 3D Roadside Item Shop Pavilion (রাস্তার পাশে কয়েন দিয়ে গেমের আইটেম কেনা ও বিক্রির শপ)
   * Positioned along the right side of the track so players can stop in front of it, turn toward it,
   * walk up to the counter, and buy or sell any in-game items using Coins!
   */
  private initRoadsideShop() {
    this.roadsideShopGroup = new THREE.Group();
    this.shopDisplayMeshes = [];

    const deckWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const deckTrimMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const carpetMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const counterBodyMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const counterTopMat = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });
    const pillarGoldMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const roofPinkMat = new THREE.MeshLambertMaterial({ color: 0xec4899 });
    const roofCyanMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Welcoming Walkway & Carpet connecting Right Lane (x = 3.0) to Shop Deck (x = 4.4 to 8.4)
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 4.8), deckWoodMat);
    walkway.position.set(4.5, 0.08, 0);
    this.roadsideShopGroup.add(walkway);

    const carpet = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.19, 3.2), carpetMat);
    carpet.position.set(4.5, 0.09, 0);
    this.roadsideShopGroup.add(carpet);

    const carpetBorder = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 3.5), deckTrimMat);
    carpetBorder.position.set(4.5, 0.085, 0);
    this.roadsideShopGroup.add(carpetBorder);

    // 2. Main Raised Shop Pavilion Deck (x = 5.2 to 9.2, z = -4.8 to +4.8)
    const shopDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.36, 9.6), deckWoodMat);
    shopDeck.position.set(7.2, 0.18, 0);
    this.roadsideShopGroup.add(shopDeck);

    const shopDeckTrim = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 9.7), deckTrimMat);
    shopDeckTrim.position.set(7.2, 0.34, 0);
    this.roadsideShopGroup.add(shopDeckTrim);

    // 3. Four Golden Corner Pillars & Striped Royal Bazaar Canopy Roof
    const pillarPositions = [
      [5.4, -4.2],
      [5.4, 4.2],
      [8.8, -4.2],
      [8.8, 4.2],
    ];
    pillarPositions.forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.2, 8), pillarGoldMat);
      col.position.set(px, 2.3, pz);
      this.roadsideShopGroup.add(col);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lanternGlowMat);
      lantern.position.set(px - 0.25, 3.85, pz);
      this.roadsideShopGroup.add(lantern);
    });

    // Striped Awning Roof Segments
    for (let s = 0; s < 6; s++) {
      const segZ = -3.75 + s * 1.5;
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.35, 1.48),
        s % 2 === 0 ? roofPinkMat : roofCyanMat
      );
      awning.position.set(7.0, 4.45, segZ);
      awning.rotation.z = 0.18;
      this.roadsideShopGroup.add(awning);
    }

    // 4. Shop Counter & Pedestals with 3D Rotating In-Game Collectibles (Gem, Hoverboard, Magnet, 2X Star, Sneakers, Jetpack)
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 7.6), counterBodyMat);
    counter.position.set(5.85, 0.88, 0);
    this.roadsideShopGroup.add(counter);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.12, 7.8), counterTopMat);
    counterTop.position.set(5.85, 1.45, 0);
    this.roadsideShopGroup.add(counterTop);

    const displayConfigs: { geo: THREE.BufferGeometry; mat: THREE.Material; z: number }[] = [
      { geo: EnvironmentManager.gemGeo, mat: this.gemMaterial, z: -3.0 },
      { geo: EnvironmentManager.boardPowerupGeo, mat: this.boardMat, z: -1.8 },
      { geo: EnvironmentManager.magnetGeo, mat: this.magnetMat, z: -0.6 },
      { geo: EnvironmentManager.starGeo, mat: this.starMat, z: 0.6 },
      { geo: EnvironmentManager.sneakerPowerupGeo, mat: this.sneakerMat, z: 1.8 },
      { geo: EnvironmentManager.jetpackPowerupGeo, mat: this.jetpackMat, z: 3.0 },
    ];

    displayConfigs.forEach((dc) => {
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 8), deckTrimMat);
      pedestal.position.set(5.85, 1.56, dc.z);
      this.roadsideShopGroup.add(pedestal);

      const itemMesh = new THREE.Mesh(dc.geo, dc.mat);
      itemMesh.position.set(5.85, 1.98, dc.z);
      this.roadsideShopGroup.add(itemMesh);
      this.shopDisplayMeshes.push(itemMesh);
    });

    // 5. Customizable 3D Shop Characters Standing Behind the Counter (Facing the Track at -X)
    // Configurable directly from the Admin Panel!
    this.roadsideShopKeepersGroup = new THREE.Group();
    this.roadsideShopGroup.add(this.roadsideShopKeepersGroup);
    this.rebuildRoadsideShopKeepers();

    // 6. Overhead Shop Signboard with Grounded Roof Mounting Struts facing BOTH oncoming players (+Z) and players facing the shop (-X)
    this.shopSignTex = this.createSignboardTexture(
      '🏪 ROYAL ITEM SHOP',
      'কয়েন দিয়ে আইটেম কেনা ও বিক্রি শপ!',
      '#f59e0b'
    );
    const shopSignMat = new THREE.MeshBasicMaterial({ map: this.shopSignTex, side: THREE.DoubleSide });

    // Signboard facing oncoming runner (+Z) with golden mounting struts bolted to the roof
    const frontSign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.5), shopSignMat);
    frontSign.position.set(6.8, 5.35, 4.4);
    const frontStrutL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.15, 6), pillarGoldMat);
    frontStrutL.position.set(5.4, 4.55, 4.2);
    const frontStrutR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.15, 6), pillarGoldMat);
    frontStrutR.position.set(8.2, 4.55, 4.2);
    this.roadsideShopGroup.add(frontSign, frontStrutL, frontStrutR);

    // Signboard facing the track (-X) with golden mounting struts bolted to the front pillars & roof
    const sideSign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.65), shopSignMat);
    sideSign.position.set(5.1, 5.35, 0);
    sideSign.rotation.y = -Math.PI / 2;
    const sideStrutL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.15, 6), pillarGoldMat);
    sideStrutL.position.set(5.2, 4.55, -2.4);
    const sideStrutR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.15, 6), pillarGoldMat);
    sideStrutR.position.set(5.2, 4.55, 2.4);
    this.roadsideShopGroup.add(sideSign, sideStrutL, sideStrutR);

    // 7. Advance Roadside Signpost at localZ = +18 so player sees the shop ahead
    this.shopAdvanceSignTex = this.createSignboardTexture(
      '🛍️ ITEM SHOP AHEAD',
      'সামনে দোকান • দাঁড়াতে প্রস্তুতি নিন',
      '#ec4899'
    );
    const advSignGroup = new THREE.Group();
    advSignGroup.position.set(5.6, 0, 18);
    const advPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.0, 8), pillarGoldMat);
    advPole.position.y = 1.5;
    const advBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.15),
      new THREE.MeshBasicMaterial({ map: this.shopAdvanceSignTex, side: THREE.DoubleSide })
    );
    advBoard.position.set(0, 2.7, 0.08);
    advSignGroup.add(advPole, advBoard);
    this.roadsideShopGroup.add(advSignGroup);

    this.roadsideShopGroup.position.set(0, 0, this.activeShopZ);
    this.scene.add(this.roadsideShopGroup);
  }

  private getDefaultRoadsideShopCharacters(): RoadsideShopKeeperConfig[] {
    return [
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
    ];
  }

  private rebuildRoadsideShopKeepers() {
    if (!this.roadsideShopKeepersGroup) return;
    while (this.roadsideShopKeepersGroup.children.length > 0) {
      this.roadsideShopKeepersGroup.remove(this.roadsideShopKeepersGroup.children[0]);
    }
    this.roadsideShopKeepers = [];

    const activeConfigs =
      this.roadsideShopKeeperConfigs && this.roadsideShopKeeperConfigs.length > 0
        ? this.roadsideShopKeeperConfigs
        : this.getDefaultRoadsideShopCharacters();

    const slotPlacements = [
      { x: 7.15, y: 0.36, z: 0.0, rotY: -Math.PI / 2 },
      { x: 7.35, y: 0.36, z: -2.6, rotY: -Math.PI / 2 + 0.18 },
      { x: 7.35, y: 0.36, z: 2.6, rotY: -Math.PI / 2 - 0.18 },
    ];

    activeConfigs.slice(0, 3).forEach((cfg, idx) => {
      const char = new PrincessCharacter(cfg);
      const slot = slotPlacements[idx] || slotPlacements[0];
      char.group.position.set(slot.x, slot.y, slot.z);
      char.group.rotation.set(0, slot.rotY, 0);
      char.setHoverboard(false);
      char.group.visible = cfg.enabled !== false;
      this.roadsideShopKeepersGroup.add(char.group);
      this.roadsideShopKeepers.push({ char, config: cfg });
    });
  }

  public updateRoadsideShopCharacters(configs?: RoadsideShopKeeperConfig[]) {
    if (!configs || configs.length === 0) return;
    this.roadsideShopKeeperConfigs = configs;
    if (this.roadsideShopKeepers.length === configs.slice(0, 3).length) {
      const slotPlacements = [
        { x: 7.15, y: 0.36, z: 0.0, rotY: -Math.PI / 2 },
        { x: 7.35, y: 0.36, z: -2.6, rotY: -Math.PI / 2 + 0.18 },
        { x: 7.35, y: 0.36, z: 2.6, rotY: -Math.PI / 2 - 0.18 },
      ];
      configs.slice(0, 3).forEach((cfg, idx) => {
        const entry = this.roadsideShopKeepers[idx];
        const slot = slotPlacements[idx] || slotPlacements[0];
        entry.config = cfg;
        entry.char.updateConfig(cfg);
        entry.char.group.position.set(slot.x, slot.y, slot.z);
        entry.char.group.rotation.set(0, slot.rotY, 0);
        entry.char.group.visible = cfg.enabled !== false;
      });
    } else {
      this.rebuildRoadsideShopKeepers();
    }
  }

  /**
   * Builds the Grand Panoramic Horizon & Sky Vista (সুদূর দিগন্তের রংধনু, হট এয়ার বেলুন, ঘূর্ণায়মান ফেরিস হুইল, ঝুলন্ত সেতু, তুষারাবৃত পাহাড় ও উড়ন্ত পাখি)
   * Moves smoothly with the active track and playerZ so the distant background is always breathtaking without ever blocking the track or menu camera!
   */
  private initHorizonVista() {
    this.horizonVistaGroup = new THREE.Group();
    this.ferrisGondolas = [];
    this.hotAirBalloons = [];
    this.skyBirdFlocks = [];

    // 1. Shimmering 7-Band Rainbow Arc across the Distant Sky (সপ্তরঙা রংধনু)
    const rainbowGroup = new THREE.Group();
    rainbowGroup.position.set(0, -6, -118);
    const rainbowColors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x38bdf8, 0x6366f1, 0xa855f7];
    rainbowColors.forEach((col, idx) => {
      const radius = 72 - idx * 1.15;
      const arcGeo = new THREE.TorusGeometry(radius, 0.58, 6, 40, Math.PI);
      const arcMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.24,
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      rainbowGroup.add(arcMesh);
    });
    this.horizonVistaGroup.add(rainbowGroup);

    // 2. Majestic Distant Snow-Capped Mountain Range along the Horizon (তুষারাবৃত সুউচ্চ পর্বতমালা)
    const mountainVistaGroup = new THREE.Group();
    mountainVistaGroup.position.set(0, -0.5, -124);
    const peakConfigs = [
      { x: -78, r: 24, h: 32, col: 0x475569 },
      { x: -52, r: 28, h: 38, col: 0x334155 },
      { x: -26, r: 22, h: 27, col: 0x64748b },
      { x: 26, r: 22, h: 28, col: 0x64748b },
      { x: 52, r: 29, h: 40, col: 0x334155 },
      { x: 78, r: 25, h: 33, col: 0x475569 },
    ];
    const snowCapMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.88 });
    peakConfigs.forEach((pk) => {
      const mGroup = new THREE.Group();
      mGroup.position.set(pk.x, 0, 0);
      const mMat = new THREE.MeshLambertMaterial({
        color: pk.col,
        flatShading: true,
        transparent: true,
        opacity: 0.78,
      });
      const baseCone = new THREE.Mesh(new THREE.ConeGeometry(pk.r, pk.h, 6), mMat);
      baseCone.position.y = pk.h / 2;
      mGroup.add(baseCone);

      // Gleaming Snow Cap on top 32% of each peak
      const capH = pk.h * 0.34;
      const capR = pk.r * 0.345;
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(capR, capH, 6), snowCapMat);
      snowCap.position.y = pk.h - capH / 2 + 0.08;
      mGroup.add(snowCap);

      mountainVistaGroup.add(mGroup);
    });
    this.horizonVistaGroup.add(mountainVistaGroup);

    // 3. Giant Illuminated Rotating Ferris Wheel on the Left Scenic Vista (ঘূর্ণায়মান আলোকিত ফেরিস হুইল)
    const ferrisBaseGroup = new THREE.Group();
    ferrisBaseGroup.position.set(-44, 0, -84);
    ferrisBaseGroup.rotation.y = 0.28;

    const steelSupportMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const neonRimMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const neonInnerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hubGoldMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

    // Twin A-frame support legs anchored to ground
    [-1.4, 1.4].forEach((zOff) => {
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 17, 6), steelSupportMat);
      legL.position.set(-4.2, 8.0, zOff);
      legL.rotation.z = -0.26;
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 17, 6), steelSupportMat);
      legR.position.set(4.2, 8.0, zOff);
      legR.rotation.z = 0.26;
      ferrisBaseGroup.add(legL, legR);
    });

    this.ferrisWheelRimGroup = new THREE.Group();
    this.ferrisWheelRimGroup.position.set(0, 15.8, 0);

    const outerWheel = new THREE.Mesh(new THREE.TorusGeometry(12.5, 0.26, 8, 28), neonRimMat);
    const innerWheel = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.16, 6, 24), neonInnerMat);
    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.8, 12), hubGoldMat);
    centerHub.rotation.x = Math.PI / 2;
    this.ferrisWheelRimGroup.add(outerWheel, innerWheel, centerHub);

    const gondolaColors = [0xf43f5e, 0xf59e0b, 0x10b981, 0x06b6d4, 0x8b5cf6, 0xec4899];
    const spokeCount = 10;
    for (let s = 0; s < spokeCount; s++) {
      const ang = (s / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 25.0, 6), hubGoldMat);
      spoke.rotation.z = ang;
      if (s < spokeCount / 2) {
        this.ferrisWheelRimGroup.add(spoke);
      }

      // Suspended Passenger Gondola Cabin around the rim
      const gondolaPivot = new THREE.Group();
      gondolaPivot.position.set(Math.cos(ang) * 12.5, Math.sin(ang) * 12.5, 0);

      const gColor = gondolaColors[s % gondolaColors.length];
      const cabin = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 8, 8),
        new THREE.MeshBasicMaterial({ color: gColor })
      );
      cabin.position.y = -0.85;
      const cabinRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 0.55, 8),
        hubGoldMat
      );
      cabinRoof.position.y = -0.15;
      gondolaPivot.add(cabin, cabinRoof);

      this.ferrisWheelRimGroup.add(gondolaPivot);
      this.ferrisGondolas.push(gondolaPivot);
    }

    ferrisBaseGroup.add(this.ferrisWheelRimGroup);
    this.horizonVistaGroup.add(ferrisBaseGroup);

    // 4. Grand Golden Suspension Bridge & Twin Towers on the Right Horizon Vista (সুদৃশ্য ঝুলন্ত সেতু)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(48, 0, -88);
    bridgeGroup.rotation.y = -0.32;

    const bridgeTowerMat = new THREE.MeshLambertMaterial({ color: 0xf43f5e });
    const bridgeCableMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const bridgeDeckMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 0.65, 3.2), bridgeDeckMat);
    deckMesh.position.y = 6.5;
    bridgeGroup.add(deckMesh);

    [-10, 10].forEach((tx) => {
      const tPillar1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 21, 0.9), bridgeTowerMat);
      tPillar1.position.set(tx, 10.5, -1.1);
      const tPillar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 21, 0.9), bridgeTowerMat);
      tPillar2.position.set(tx, 10.5, 1.1);
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.8), bridgeTowerMat);
      cross1.position.set(tx, 13.5, 0);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.8), bridgeTowerMat);
      cross2.position.set(tx, 18.5, 0);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bridgeCableMat);
      beacon.position.set(tx, 21.4, 0);
      bridgeGroup.add(tPillar1, tPillar2, cross1, cross2, beacon);
    });

    // Illuminated Suspension Lights along the Bridge Deck
    for (let lx = -16; lx <= 16; lx += 3.2) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), bridgeCableMat);
      lamp.position.set(lx, 7.2, 1.5);
      bridgeGroup.add(lamp);
    }
    this.horizonVistaGroup.add(bridgeGroup);

    // 5. Floating Colorful Hot Air Balloons Drifting in the Sky (রঙিন হট এয়ার বেলুন)
    const balloonSpecs = [
      { x: -29, y: 24, z: -68, col1: 0xf43f5e, col2: 0xfde047, scale: 1.15, phase: 0.0, speed: 1.2 },
      { x: 27, y: 27, z: -74, col1: 0x06b6d4, col2: 0xec4899, scale: 1.25, phase: 1.8, speed: 1.0 },
      { x: -16, y: 31, z: -96, col1: 0x8b5cf6, col2: 0x38bdf8, scale: 1.0, phase: 3.4, speed: 1.35 },
      { x: 38, y: 22, z: -60, col1: 0xf59e0b, col2: 0x10b981, scale: 0.95, phase: 4.9, speed: 1.15 },
    ];

    const basketMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const burnerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    balloonSpecs.forEach((bs) => {
      const bGroup = new THREE.Group();

      // Main Envelope Sphere
      const envGeo = new THREE.SphereGeometry(2.2, 12, 10);
      const envMat = new THREE.MeshLambertMaterial({ color: bs.col1, flatShading: true });
      const envMesh = new THREE.Mesh(envGeo, envMat);
      envMesh.scale.set(1.0, 1.22, 1.0);
      envMesh.position.y = 2.8;
      bGroup.add(envMesh);

      // Decorative Equatorial Accent Band
      const bandMesh = new THREE.Mesh(
        new THREE.TorusGeometry(2.16, 0.28, 6, 16),
        new THREE.MeshBasicMaterial({ color: bs.col2 })
      );
      bandMesh.rotation.x = Math.PI / 2;
      bandMesh.position.y = 2.85;
      bGroup.add(bandMesh);

      // Lower Tapered Throat Cone
      const throatMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 0.55, 1.3, 10),
        new THREE.MeshLambertMaterial({ color: bs.col2, flatShading: true })
      );
      throatMesh.position.y = 1.1;
      bGroup.add(throatMesh);

      // Glowing Burner Flame inside the throat
      const flameMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), burnerMat);
      flameMesh.position.y = 0.42;
      bGroup.add(flameMesh);

      // Woven Passenger Basket
      const basketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.85), basketMat);
      basketMesh.position.y = -0.25;
      bGroup.add(basketMesh);

      bGroup.scale.setScalar(bs.scale);
      bGroup.position.set(bs.x, bs.y, bs.z);
      this.horizonVistaGroup.add(bGroup);

      this.hotAirBalloons.push({
        group: bGroup,
        baseX: bs.x,
        baseY: bs.y,
        baseZ: bs.z,
        phase: bs.phase,
        speed: bs.speed,
      });
    });

    // 6. Graceful Soaring Sky Bird V-Flocks (আকাশে উড়ন্ত পাখির ঝাঁক)
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const wingGeo = new THREE.BoxGeometry(0.65, 0.04, 0.22);
    const flockConfigs = [
      { x: -11, y: 19.5, z: -56, phase: 0 },
      { x: 14, y: 22.5, z: -72, phase: 2.4 },
    ];

    flockConfigs.forEach((fc) => {
      const flockGroup = new THREE.Group();
      const wingsL: THREE.Mesh[] = [];
      const wingsR: THREE.Mesh[] = [];

      const vOffsets = [
        [0, 0, 0],
        [-1.4, 0.3, 1.1],
        [1.4, 0.3, 1.1],
        [-2.8, 0.6, 2.2],
        [2.8, 0.6, 2.2],
      ];

      vOffsets.forEach(([ox, oy, oz]) => {
        const bird = new THREE.Group();
        bird.position.set(ox, oy, oz);

        const wL = new THREE.Mesh(wingGeo, birdMat);
        wL.position.x = -0.3;
        const wR = new THREE.Mesh(wingGeo, birdMat);
        wR.position.x = 0.3;

        bird.add(wL, wR);
        flockGroup.add(bird);
        wingsL.push(wL);
        wingsR.push(wR);
      });

      flockGroup.position.set(fc.x, fc.y, fc.z);
      this.horizonVistaGroup.add(flockGroup);
      this.skyBirdFlocks.push({
        group: flockGroup,
        wingsL,
        wingsR,
        baseX: fc.x,
        baseY: fc.y,
        baseZ: fc.z,
        phase: fc.phase,
      });
    });

    this.scene.add(this.horizonVistaGroup);
  }

  /**
   * Moves the Roadside Shop directly to targetZ and clears obstacles in the right lane
   * (used if the player manually taps the top-bar Shop button while far from the next scheduled shop)
   */
  public summonRoadsideShopAt(targetZ: number) {
    this.activeShopZ = targetZ;
    const nextInterval =
      this.shopIntervalMinZ +
      Math.floor(Math.random() * (this.shopIntervalMaxZ - this.shopIntervalMinZ + 1));
    this.nextShopSpawnZ = targetZ - nextInterval;
    if (this.roadsideShopGroup) {
      this.roadsideShopGroup.position.set(this.trackCenterX, 0, this.activeShopZ);
      this.roadsideShopGroup.visible = true;
    }
    this.clearObstaclesNearShop(targetZ);
    this.updateShopClearance();
  }

  public clearObstaclesNearShop(targetZ: number = this.activeShopZ) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (Math.abs(obs.z - targetZ) < 22) {
        this.recycleObstacle(obs);
        this.obstacles.splice(i, 1);
      }
    }
  }

  public updateShopClearance() {
    for (let i = 0; i < this.trackChunks.length; i++) {
      const chunk = this.trackChunks[i];
      const rightProps = chunk.userData.rightSideProps as
        | { obj: THREE.Object3D; localZ: number; halfSpan: number }[]
        | undefined;
      if (!rightProps) continue;
      for (let p = 0; p < rightProps.length; p++) {
        const item = rightProps[p];
        const worldZ = chunk.position.z + item.localZ;
        const overlapsShop =
          worldZ >= this.activeShopZ - 12 - item.halfSpan &&
          worldZ <= this.activeShopZ + 22 + item.halfSpan;
        item.obj.visible = !overlapsShop;
      }
    }
  }

  private createStationDepartureTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#fde047';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUBWAY PRINCESS CENTRAL', 256, 52);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⚡ PLATFORM DEPARTURE • TRACK 1-3 • RUN! ⚡', 256, 96);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Repositions the pooled Diverging Side-Road ahead of the player relative to the current trackCenterX.
   */
  private activateForkAhead(zPos: number) {
    const direction: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
    const side = direction === 'left' ? -1 : 1;
    const allThemes: EnvironmentTheme[] = ['neon_subway', 'royal_kingdom', 'tokyo_sakura', 'desert_express'];
    const otherThemes = allThemes.filter((t) => t !== this.config.theme);
    const targetTheme = otherThemes[Math.floor(Math.random() * otherThemes.length)];

    const themeMeta: Record<EnvironmentTheme, { en: string; bn: string; color: string }> = {
      neon_subway: { en: 'CITY ZONE', bn: '🌃 নিওন সিটি ট্র্যাক', color: '#06b6d4' },
      royal_kingdom: { en: 'PALACE ROUTE', bn: '🏰 রাজপ্রাসাদ ট্র্যাক', color: '#f59e0b' },
      tokyo_sakura: { en: 'SAKURA ZONE', bn: '🌸 সাকুরা গার্ডেন ট্র্যাক', color: '#f43f5e' },
      desert_express: { en: 'TUNNEL & OASIS', bn: '🏜️ টানেল ও মরূদ্যান ট্র্যাক', color: '#eab308' },
    };

    const meta = themeMeta[targetTheme];
    const baseTrackX = this.trackCenterX;
    const newTrackX = baseTrackX + side * FORK_DIVERGE_OFFSET;

    this.activeFork = {
      zPos,
      direction,
      targetTheme,
      labelEn: meta.en,
      labelBn: meta.bn,
      accentColor: meta.color,
      baseTrackX,
      newTrackX,
      triggered: false,
      committed: false,
    };

    const accentCol = new THREE.Color(meta.color);
    this.forkAccentMat.color.copy(accentCol);
    this.forkVeilMat.color.copy(accentCol);
    this.forkRoadbedMat.color.copy(new THREE.Color(this.config.trackColor).lerp(accentCol, 0.18));
    this.forkCurbMat.color.copy(accentCol.clone().lerp(new THREE.Color(0xffffff), 0.35));

    const mainTex = this.forkSignTextures.get(`${targetTheme}_${direction}_main`);
    const preTex = this.forkSignTextures.get(`${targetTheme}_${direction}_pre`);
    if (mainTex) {
      this.forkMainSignMat.map = mainTex;
      this.forkMainSignMat.needsUpdate = true;
    }
    if (preTex) {
      this.forkPreSignMat.map = preTex;
      this.forkPreSignMat.needsUpdate = true;
    }

    const sideScale = direction === 'left' ? -1 : 1;
    this.forkRoadGroup.position.set(baseTrackX, 0, zPos);
    this.forkRoadGroup.scale.set(sideScale, 1, 1);
    this.forkPreSignGroup.scale.x = sideScale;
    this.forkArchSignGroup.scale.x = sideScale;
    this.forkRoadGroup.visible = true;
  }

  /**
   * Called as soon as the player swipes into the Diverging Side-Road!
   * Permanently shifts the upcoming main track chunks, obstacles, and collectibles to the NEW track X
   * so the player never returns to the old track and continues infinitely on the newly branched track!
   */
  public commitToForkBranch() {
    if (!this.activeFork || this.activeFork.committed) return;
    this.activeFork.committed = true;

    const oldTrackX = this.activeFork.baseTrackX;
    const newTrackX = this.activeFork.newTrackX;
    const deltaX = newTrackX - oldTrackX;
    const forkZ = this.activeFork.zPos;

    this.trackCenterX = newTrackX;

    // Shift all main track chunks that lie ahead of the diverging curve (z < forkZ - 32) onto the new track alignment!
    for (let i = 0; i < this.trackChunks.length; i++) {
      const chunk = this.trackChunks[i];
      if (chunk.position.z < forkZ - 32) {
        chunk.position.x = newTrackX;
      }
    }

    // Clear any obstacles right at the curve landing zone (forkZ - 52 to forkZ - 14) and shift upcoming obstacles onto the new track!
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.z <= forkZ - 14 && obs.z >= forkZ - 52) {
        this.recycleObstacle(obs);
        this.obstacles.splice(i, 1);
      } else if (obs.z < forkZ - 52) {
        obs.group.position.x += deltaX;
      }
    }

    for (let i = 0; i < this.collectibles.length; i++) {
      const col = this.collectibles[i];
      if (col.z < forkZ - 32) {
        col.group.position.x += deltaX;
      }
    }

    if (this.roadsideShopGroup && this.activeShopZ < forkZ - 32) {
      this.roadsideShopGroup.position.x = newTrackX;
    }
  }

  private createTrackChunks() {
    for (let i = 0; i < this.totalChunks; i++) {
      const chunk = this.buildStaticTrackChunk(i);
      chunk.position.set(0, 0, -i * this.chunkLength);
      this.scene.add(chunk);
      this.trackChunks.push(chunk);
    }
  }

  private deterministicRand(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  private buildStaticTrackChunk(chunkIndex: number = 0): THREE.Group {
    const chunk = new THREE.Group();
    const halfLen = this.chunkLength / 2;

    // 1. Center track road
    const ground = new THREE.Mesh(EnvironmentManager.groundGeo, this.trackMaterial);
    ground.position.y = -0.18;
    chunk.add(ground);

    // 2. Sleepers and Rails on main 3 lanes (always visible, including inside the Starting Station)
    const sleeperCount = 12;
    LANES.forEach((laneX) => {
      for (let s = 0; s < sleeperCount; s++) {
        const localZ = -halfLen + (s * this.chunkLength) / sleeperCount;
        const sleeper = new THREE.Mesh(EnvironmentManager.sleeperGeo, this.sleeperMaterial);
        sleeper.position.set(laneX, 0.04, localZ);
        chunk.add(sleeper);
      }

      const leftRail = new THREE.Mesh(EnvironmentManager.railGeo, this.railMaterial);
      leftRail.position.set(laneX - 0.9, 0.12, 0);
      const rightRail = new THREE.Mesh(EnvironmentManager.railGeo, this.railMaterial);
      rightRail.position.set(laneX + 0.9, 0.12, 0);
      chunk.add(leftRail, rightRail);
    });

    // 3. Roadside Props Group: hidden when chunk is at z = 0 inside the Starting Station
    // so zero hedges, poles, trees, bushes, or gantries ever block the station platform or menu camera!
    const roadsidePropsGroup = new THREE.Group();
    roadsidePropsGroup.visible = chunkIndex !== 0;
    chunk.userData.roadsideProps = roadsidePropsGroup;
    const rightSideProps: { obj: THREE.Object3D; localZ: number; halfSpan: number }[] = [];
    chunk.userData.rightSideProps = rightSideProps;
    chunk.add(roadsidePropsGroup);

    // 3A. Sunlit grassy/themed margins on left & right sides
    const grassL = new THREE.Mesh(EnvironmentManager.grassGeo, this.grassMaterial);
    grassL.position.set(-15.5, -0.16, 0);
    const grassR = new THREE.Mesh(EnvironmentManager.grassGeo, this.grassMaterial);
    grassR.position.set(15.5, -0.16, 0);
    roadsidePropsGroup.add(grassL, grassR);

    // 4. Segmented side hedges
    [-1, 1].forEach((side) => {
      const wallFront = new THREE.Mesh(EnvironmentManager.hedgeSegGeo, this.hedgeMaterial);
      wallFront.position.set(side * 6.8, 1.1, 22);
      const wallBack = new THREE.Mesh(EnvironmentManager.hedgeSegGeo, this.hedgeMaterial);
      wallBack.position.set(side * 6.8, 1.1, -22);
      roadsidePropsGroup.add(wallFront, wallBack);
      if (side === 1) {
        rightSideProps.push({ obj: wallFront, localZ: 22, halfSpan: 8 });
        rightSideProps.push({ obj: wallBack, localZ: -22, halfSpan: 8 });
      }
    });

    // 5. Theme-Matched 3D Roadside Props (Streetlights, Barricades, Bushes, Horizon Silhouettes)
    for (let z = -halfLen + 7.5; z < halfLen; z += 15) {
      [-1, 1].forEach((side) => {
        const lampGroup = new THREE.Group();
        const vPole = new THREE.Mesh(EnvironmentManager.lampPoleGeo, this.lampPoleMat);
        vPole.position.y = 2.2;
        const arm = new THREE.Mesh(EnvironmentManager.lampArmGeo, this.lampPoleMat);
        arm.position.set(-side * 0.45, 4.3, 0);
        const bulb = new THREE.Mesh(EnvironmentManager.lampBulbGeo, this.lampBulbMat);
        bulb.position.set(-side * 0.85, 4.15, 0);
        const halo = new THREE.Mesh(EnvironmentManager.lampHaloGeo, this.lampHaloMat);
        halo.position.set(-side * 0.85, 4.15, 0);
        lampGroup.add(vPole, arm, bulb, halo);
        lampGroup.position.set(side * 6.35, 0, z);
        roadsidePropsGroup.add(lampGroup);
        if (side === 1) {
          rightSideProps.push({ obj: lampGroup, localZ: z, halfSpan: 2 });
        }

        if (Math.abs(z) > 16) {
          const barricade = new THREE.Group();
          const rail = new THREE.Mesh(EnvironmentManager.barricadeRailGeo, this.barricadeMat);
          rail.position.y = 0.7;
          const leg1 = new THREE.Mesh(EnvironmentManager.barricadeLegGeo, this.lampPoleMat);
          leg1.position.set(0, 0.35, -1.0);
          const leg2 = new THREE.Mesh(EnvironmentManager.barricadeLegGeo, this.lampPoleMat);
          leg2.position.set(0, 0.35, 1.0);
          barricade.add(rail, leg1, leg2);
          barricade.position.set(side * 6.2, 0, z + 4.5);
          roadsidePropsGroup.add(barricade);
          if (side === 1) {
            rightSideProps.push({ obj: barricade, localZ: z + 4.5, halfSpan: 2 });
          }
        }

        const bushGroup = new THREE.Group();
        const b1 = new THREE.Mesh(EnvironmentManager.bush1Geo, this.bushMat);
        b1.position.y = 0.75;
        const b2 = new THREE.Mesh(EnvironmentManager.bush2Geo, this.bushMat);
        b2.position.set(0.6, 0.55, 0.3);
        // Colorful Roadside Blossoms on the bushes (রাস্তার দুই পাশে রঙিন ফুলের সমারোহ)
        const blossom1 = new THREE.Mesh(
          EnvironmentManager.lampBulbGeo,
          z % 30 === 0 ? this.gemMaterial : this.coinMaterial
        );
        blossom1.scale.setScalar(0.65);
        blossom1.position.set(0.15, 1.38, 0.15);

        const blossom2 = new THREE.Mesh(
          EnvironmentManager.lampBulbGeo,
          this.lampBulbMat
        );
        blossom2.scale.setScalar(0.5);
        blossom2.position.set(0.65, 1.02, 0.35);

        bushGroup.add(b1, b2, blossom1, blossom2);
        bushGroup.position.set(side * 9.8, 0, z + 3.0);
        roadsidePropsGroup.add(bushGroup);
        if (side === 1) {
          rightSideProps.push({ obj: bushGroup, localZ: z + 3.0, halfSpan: 2.5 });
        }
      });
    }

    for (let s = 0; s < 2; s++) {
      const sz = -15 + s * 30;
      [-1, 1].forEach((side) => {
        const towerGroup = new THREE.Group();
        const sil = new THREE.Mesh(EnvironmentManager.silhouetteGeo, this.silhouetteMat);
        sil.position.y = 8.7;
        towerGroup.add(sil);

        // Stepped Architectural Crown & Glowing Beacon on Skyline Silhouette Towers
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 3.2, 3.6),
          this.silhouetteMat
        );
        crown.position.y = 19.1;
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.18, 3.6, 6),
          this.lampPoleMat
        );
        spire.position.y = 22.4;
        const beacon = new THREE.Mesh(EnvironmentManager.lampBulbGeo, this.lampBulbMat);
        beacon.position.y = 24.3;
        // Glowing vertical neon/gold window strip facing the track
        const winStrip = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 14.5),
          this.lampBulbMat
        );
        winStrip.position.set(-side * 3.05, 9.2, 0);
        winStrip.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

        towerGroup.add(crown, spire, beacon, winStrip);
        towerGroup.position.set(side * 37, 0, sz);
        roadsidePropsGroup.add(towerGroup);
      });
    }

    // 6. Overhead fluffy low-poly clouds (deterministic placement)
    for (let c = 0; c < 2; c++) {
      const cloudGroup = new THREE.Group();
      const r1 = this.deterministicRand(chunkIndex * 11 + c * 3 + 1);
      const r2 = this.deterministicRand(chunkIndex * 11 + c * 3 + 2);
      const r3 = this.deterministicRand(chunkIndex * 11 + c * 3 + 3);
      const zOffset = -halfLen + (c * this.chunkLength) / 2 + (r1 - 0.5) * 12;
      const xOffset = (c % 2 === 0 ? -1 : 1) * (14 + r2 * 6);
      const yHeight = 16 + r3 * 4;

      const p1 = new THREE.Mesh(EnvironmentManager.cloudSphere1Geo, this.cloudMaterial);
      const p2 = new THREE.Mesh(EnvironmentManager.cloudSphere2Geo, this.cloudMaterial);
      p2.position.set(-1.8, -0.4, 0);
      const p3 = new THREE.Mesh(EnvironmentManager.cloudSphere3Geo, this.cloudMaterial);
      p3.position.set(1.8, -0.3, 0);

      cloudGroup.add(p1, p2, p3);
      cloudGroup.position.set(xOffset, yHeight, zOffset);
      chunk.add(cloudGroup);
    }

    // 7. Gantry with glowing theme accent trim
    const gantry = new THREE.Group();
    const topBeam = new THREE.Mesh(EnvironmentManager.gantryTopGeo, this.gantryBeamMat);
    topBeam.position.y = 5.0;
    const topGlowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(13.6, 0.12, 0.48),
      this.lampBulbMat
    );
    topGlowStrip.position.y = 5.26;
    const postL = new THREE.Mesh(EnvironmentManager.gantryPostGeo, this.gantryBeamMat);
    postL.position.set(-6.6, 2.5, 0);
    const postR = new THREE.Mesh(EnvironmentManager.gantryPostGeo, this.gantryBeamMat);
    postR.position.set(6.6, 2.5, 0);
    gantry.add(topBeam, topGlowStrip, postL, postR);

    if (this.billboardMaterials.length > 0) {
      const mat = this.billboardMaterials[chunkIndex % this.billboardMaterials.length];
      const board = new THREE.Mesh(EnvironmentManager.billboardPlaneGeo, mat);
      board.position.set(0, 4.0, -0.2);
      board.rotation.y = Math.PI;
      gantry.add(board);
    }
    roadsidePropsGroup.add(gantry);
    rightSideProps.push({ obj: gantry, localZ: 0, halfSpan: 2 });

    // 8. Distant Background Scenery Set Group
    const sceneryGroup = new THREE.Group();
    sceneryGroup.userData.chunkIndex = chunkIndex;
    this.populateSceneryGroup(sceneryGroup);
    roadsidePropsGroup.add(sceneryGroup);
    this.chunkSceneryGroups.push(sceneryGroup);

    return chunk;
  }

  private populateSceneryGroup(sceneryGroup: THREE.Group) {
    this.disposeGroupChildren(sceneryGroup);

    const chunkIdx = sceneryGroup.userData.chunkIndex || 0;
    const scenery = this.getActiveScenerySet();
    let itemCount = 3;
    if (scenery.sceneryDensity === 'medium') itemCount = 3;
    if (scenery.sceneryDensity === 'high') itemCount = 4;

    const halfLen = this.chunkLength / 2;
    const step = this.chunkLength / itemCount;
    const sceneryTint = scenery.sceneryColor ? new THREE.Color(scenery.sceneryColor) : new THREE.Color(0xffffff);

    for (let i = 0; i < itemCount; i++) {
      const seedBase = chunkIdx * 100 + i * 17;
      const itemZPos = -halfLen + i * step + (this.deterministicRand(seedBase + 1) - 0.5) * (step * 0.35);
      [-1, 1].forEach((side, sIdx) => {
        const sSeed = seedBase + sIdx * 7;
        const xOffset = side * (24 + this.deterministicRand(sSeed + 2) * 8);
        const elementGroup = new THREE.Group();

        if (scenery.hasMountains) {
          const mStyle = scenery.mountainStyle;
          let mountMesh: THREE.Mesh | null = null;

          if (mStyle === 'tall_peaks') {
            const baseH = 11 + this.deterministicRand(sSeed + 3) * 7;
            const radius = 6.8 + this.deterministicRand(sSeed + 4) * 3.5;
            const mat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
            mat.color.lerp(sceneryTint, 0.22);
            mountMesh = new THREE.Mesh(new THREE.ConeGeometry(radius, baseH, 6), mat);
            mountMesh.position.y = baseH / 2 - 0.2;
            // Gleaming snow cap on tall mountain peak
            const snowCap = new THREE.Mesh(
              new THREE.ConeGeometry(radius * 0.38, baseH * 0.36, 6),
              new THREE.MeshBasicMaterial({ color: 0xf8fafc })
            );
            snowCap.position.y = baseH * 0.33;
            mountMesh.add(snowCap);
          } else if (mStyle === 'soft_hills') {
            const baseH = 4.5 + this.deterministicRand(sSeed + 3) * 3.2;
            const radius = 8.5 + this.deterministicRand(sSeed + 4) * 4;
            const baseHillCol =
              scenery.buildingStyle === 'cherry_pagoda'
                ? 0xfda4af
                : scenery.buildingStyle === 'modern_neon'
                ? 0x0f766e
                : 0x22c55e;
            const mat = new THREE.MeshLambertMaterial({ color: baseHillCol, flatShading: true });
            mat.color.lerp(sceneryTint, 0.18);
            mountMesh = new THREE.Mesh(
              new THREE.SphereGeometry(radius, 7, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
              mat
            );
            mountMesh.scale.set(1.1, baseH / radius, 1.0);
          } else if (mStyle === 'volcanoes') {
            const baseH = 7 + this.deterministicRand(sSeed + 3) * 4;
            const radius = 6 + this.deterministicRand(sSeed + 4) * 3;
            const mat = new THREE.MeshLambertMaterial({ color: 0x3f3f46, flatShading: true });
            mat.color.lerp(sceneryTint, 0.2);
            mountMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.25, radius, baseH, 6), mat);
            mountMesh.position.y = baseH / 2 - 0.2;
          } else if (mStyle === 'desert_dunes') {
            const baseH = 4.2 + this.deterministicRand(sSeed + 3) * 3.4;
            const radius = 9.5 + this.deterministicRand(sSeed + 4) * 5;
            const mat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true });
            mat.color.lerp(new THREE.Color(0xfde047), 0.25);
            mountMesh = new THREE.Mesh(
              new THREE.SphereGeometry(radius, 7, 6, 0, Math.PI * 2, 0, Math.PI * 0.45),
              mat
            );
            mountMesh.scale.set(1.65, baseH / radius, 0.75);
          }

          if (mountMesh) {
            mountMesh.position.x = side * 6.5;
            elementGroup.add(mountMesh);
          }
        }

        if (scenery.hasBuildings) {
          const bStyle = scenery.buildingStyle;
          const baseW = 3.8;
          const baseH = 9.5 + this.deterministicRand(sSeed + 5) * 8;
          const baseD = 3.8;

          if (bStyle === 'modern_neon') {
            const towerColor = sIdx === 0 ? 0x1e293b : 0x1e1b4b;
            const mat = new THREE.MeshLambertMaterial({ color: towerColor });
            const bMesh = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), mat);
            bMesh.position.y = baseH / 2 - 0.25;

            // Glowing Neon Penthouse Crown, Horizontal Light Bands & Window Strip
            const neonTrimMat = new THREE.MeshBasicMaterial({
              color: sIdx === 0 ? 0x06b6d4 : 0xf472b6,
            });
            const goldWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
            const penthouse = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.72, 1.8, baseD * 0.72), mat);
            penthouse.position.y = baseH / 2 + 0.9;
            const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(baseW + 0.18, 0.3, baseD + 0.18), neonTrimMat);
            roofTrim.position.y = baseH / 2 - 0.1;
            const midBand = new THREE.Mesh(new THREE.BoxGeometry(baseW + 0.12, 0.22, baseD + 0.12), goldWindowMat);
            midBand.position.y = 0;
            const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2.5, 6), neonTrimMat);
            spire.position.y = baseH / 2 + 2.8;
            const winFace = new THREE.Mesh(
              new THREE.PlaneGeometry(0.75, baseH * 0.72),
              neonTrimMat
            );
            winFace.position.set(-side * (baseW / 2 + 0.04), 0, 0);
            winFace.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

            bMesh.add(penthouse, roofTrim, midBand, spire, winFace);
            elementGroup.add(bMesh);
          } else if (bStyle === 'royal_castle') {
            const towerR = 1.95;
            // Gleaming ivory-white marble palace tower (never muddied!)
            const marbleMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true });
            const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(towerR, towerR * 1.12, baseH, 8), marbleMat);
            bMesh.position.y = baseH / 2 - 0.25;

            const roofColor = sIdx === 0 ? 0xec4899 : 0x2563eb;
            const roof = new THREE.Mesh(
              new THREE.ConeGeometry(towerR * 1.35, 3.2, 8),
              new THREE.MeshLambertMaterial({ color: roofColor })
            );
            roof.position.y = baseH / 2 + 1.6;
            const goldRing = new THREE.Mesh(
              new THREE.CylinderGeometry(towerR * 1.18, towerR * 1.18, 0.38, 8),
              new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
            );
            goldRing.position.y = baseH / 2;
            const midGoldRing = new THREE.Mesh(
              new THREE.CylinderGeometry(towerR * 1.08, towerR * 1.08, 0.25, 8),
              new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
            );
            midGoldRing.position.y = 0;
            const pennantPole = new THREE.Mesh(
              new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6),
              new THREE.MeshBasicMaterial({ color: 0xfde047 })
            );
            pennantPole.position.y = baseH / 2 + 3.5;
            const pennantFlag = new THREE.Mesh(
              new THREE.PlaneGeometry(0.95, 0.45),
              new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
            );
            pennantFlag.position.set(0.48, baseH / 2 + 3.95, 0);

            // Flanking Royal Side Turret with Golden Dome
            const sideTurretH = baseH * 0.58;
            const sideTurret = new THREE.Mesh(
              new THREE.CylinderGeometry(1.1, 1.2, sideTurretH, 6),
              new THREE.MeshLambertMaterial({ color: 0xfef3c7, flatShading: true })
            );
            sideTurret.position.set(-side * 1.6, -baseH / 2 + sideTurretH / 2, 1.2);
            const sideDome = new THREE.Mesh(
              new THREE.SphereGeometry(1.18, 8, 6),
              new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
            );
            sideDome.position.y = sideTurretH / 2 + 0.2;
            sideTurret.add(sideDome);

            bMesh.add(roof, goldRing, midGoldRing, pennantPole, pennantFlag, sideTurret);
            elementGroup.add(bMesh);
          } else if (bStyle === 'cherry_pagoda') {
            // Authentic Japanese Multi-Tiered Pagoda & Vermilion Torii Shrine Gate
            const wallMat = new THREE.MeshLambertMaterial({ color: 0xfff1f2 });
            const pHeight = baseH * 0.74;
            const bMesh = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.82, pHeight, baseD * 0.82), wallMat);
            bMesh.position.y = pHeight / 2;

            const roofMat = new THREE.MeshLambertMaterial({ color: 0xbe123c, flatShading: true });
            const goldEaveMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
            const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

            const roof1 = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.92, 1.25, 4), roofMat);
            roof1.rotation.y = Math.PI / 4;
            roof1.position.y = -pHeight * 0.12;
            const roof2 = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.8, 1.3, 4), roofMat);
            roof2.rotation.y = Math.PI / 4;
            roof2.position.y = pHeight * 0.22;
            const roof3 = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.68, 1.4, 4), roofMat);
            roof3.rotation.y = Math.PI / 4;
            roof3.position.y = pHeight / 2 + 0.65;

            const finial = new THREE.Mesh(
              new THREE.CylinderGeometry(0.05, 0.12, 1.6, 6),
              goldEaveMat
            );
            finial.position.y = pHeight / 2 + 1.95;

            // Glowing Japanese Paper Lanterns hanging at the front corners
            [-1.1, 1.1].forEach((lx) => {
              const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), lanternMat);
              lantern.position.set(lx, pHeight * 0.15, -side * 1.2);
              bMesh.add(lantern);
            });

            bMesh.add(roof1, roof2, roof3, finial);
            elementGroup.add(bMesh);

            // Traditional Vermilion Torii Gate (鳥居) standing gracefully beside the Pagoda
            const toriiGroup = new THREE.Group();
            const toriiMat = new THREE.MeshLambertMaterial({ color: 0xe11d48 });
            const tPillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 6), toriiMat);
            tPillarL.position.set(-1.1, 1.6, 0);
            const tPillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 6), toriiMat);
            tPillarR.position.set(1.1, 1.6, 0);
            const kasagi = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.24, 0.28), toriiMat);
            kasagi.position.set(0, 3.2, 0);
            const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.2), toriiMat);
            nuki.position.set(0, 2.55, 0);
            toriiGroup.add(tPillarL, tPillarR, kasagi, nuki);
            toriiGroup.position.set(-side * 3.2, 0, 2.4);
            toriiGroup.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            elementGroup.add(toriiGroup);
          } else if (bStyle === 'sandstone_pyramid') {
            // Grand Golden Sandstone Pyramid with 24K Gold Capstone & Twin Obelisks
            const mat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true });
            const pyrH = baseH * 0.85;
            const pyr = new THREE.Mesh(new THREE.ConeGeometry(baseW * 1.32, pyrH, 4), mat);
            pyr.position.y = pyrH / 2 - 0.25;
            pyr.rotation.y = Math.PI / 4;

            const capstone = new THREE.Mesh(
              new THREE.ConeGeometry(baseW * 0.36, pyrH * 0.28, 4),
              new THREE.MeshBasicMaterial({ color: 0xfef08a })
            );
            capstone.position.y = pyrH * 0.37;
            pyr.add(capstone);
            elementGroup.add(pyr);

            // Twin Golden Oasis Obelisks flanking the Pyramid
            const obeliskMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
            const obeliskTipMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
            [-1.8, 1.8].forEach((oz) => {
              const obShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.8, 4), obeliskMat);
              obShaft.position.set(-side * 3.4, 1.9, oz);
              const obTip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 4), obeliskTipMat);
              obTip.position.y = 2.2;
              obShaft.add(obTip);
              elementGroup.add(obShaft);
            });
          }
        }

        if (scenery.hasTrees) {
          const tStyle = scenery.treeStyle;
          const treeGroup = new THREE.Group();

          if (tStyle === 'oasis_palm') {
            // Lush Desert Oasis Palm Tree with Radiating Emerald Fronds, Golden Coconuts & Turquoise Water Pool!
            const oasisPool = new THREE.Mesh(
              new THREE.CylinderGeometry(2.1, 2.3, 0.14, 8),
              new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
            );
            oasisPool.position.set(0, 0.06, 0);
            const sandRim = new THREE.Mesh(
              new THREE.CylinderGeometry(2.45, 2.6, 0.08, 8),
              new THREE.MeshLambertMaterial({ color: 0xfde68a })
            );
            sandRim.position.set(0, 0.03, 0);
            treeGroup.add(sandRim, oasisPool);

            const trunk = new THREE.Mesh(
              new THREE.CylinderGeometry(0.13, 0.24, 2.8, 6),
              new THREE.MeshLambertMaterial({ color: 0x78350f })
            );
            trunk.position.y = 1.4;
            trunk.rotation.z = -side * 0.12;
            treeGroup.add(trunk);

            const frondMat1 = new THREE.MeshLambertMaterial({ color: 0x10b981, flatShading: true });
            const frondMat2 = new THREE.MeshLambertMaterial({ color: 0x059669, flatShading: true });
            const frondGeo = new THREE.BoxGeometry(1.55, 0.12, 0.42);
            for (let f = 0; f < 6; f++) {
              const ang = (f * Math.PI) / 3;
              const frondPivot = new THREE.Group();
              frondPivot.position.set(-side * 0.16, 2.75, 0);
              frondPivot.rotation.y = ang;
              const leaf = new THREE.Mesh(frondGeo, f % 2 === 0 ? frondMat1 : frondMat2);
              leaf.position.set(0.72, -0.1, 0);
              leaf.rotation.z = -0.28;
              frondPivot.add(leaf);
              treeGroup.add(frondPivot);
            }

            const coconut = new THREE.Mesh(
              new THREE.SphereGeometry(0.22, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
            );
            coconut.position.set(-side * 0.16, 2.62, 0);
            treeGroup.add(coconut);
          } else if (tStyle === 'forest_pine') {
            // Royal Layered Evergreen Cypress / Pine Tree with Golden Fairy Blossoms
            const trunk = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.24, 1.5, 6),
              new THREE.MeshLambertMaterial({ color: 0x78350f })
            );
            trunk.position.y = 0.75;
            const pineMat1 = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
            const pineMat2 = new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true });
            const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.7, 6), pineMat1);
            tier1.position.y = 1.8;
            const tier2 = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.5, 6), pineMat2);
            tier2.position.y = 2.65;
            const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 6), pineMat1);
            tier3.position.y = 3.4;
            const starTop = new THREE.Mesh(
              new THREE.SphereGeometry(0.18, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xfde047 })
            );
            starTop.position.y = 4.08;
            treeGroup.add(trunk, tier1, tier2, tier3, starTop);
          } else {
            // Sakura Cherry Blossom or Luminous Neon Glow Tree
            const trunk = new THREE.Mesh(
              new THREE.CylinderGeometry(0.15, 0.22, 1.7, 6),
              new THREE.MeshLambertMaterial({
                color: tStyle === 'cherry_blossom' ? 0x5c2415 : 0x334155,
              })
            );
            trunk.position.y = 0.85;
            treeGroup.add(trunk);

            const crownColor = tStyle === 'cherry_blossom' ? 0xfbcfe8 : 0x06b6d4;
            const accentCrownColor = tStyle === 'cherry_blossom' ? 0xf472b6 : 0x38bdf8;
            const highlightColor = tStyle === 'cherry_blossom' ? 0xfff1f2 : 0xf472b6;

            const crownMat = new THREE.MeshLambertMaterial({ color: crownColor, flatShading: true });
            const accentCrownMat = new THREE.MeshLambertMaterial({ color: accentCrownColor, flatShading: true });
            const highlightMat = new THREE.MeshBasicMaterial({ color: highlightColor });

            const crownMain = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25), crownMat);
            crownMain.position.y = 2.05;
            const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.92), accentCrownMat);
            crownTop.position.set(0.28, 2.82, 0.18);
            const crownSide = new THREE.Mesh(new THREE.DodecahedronGeometry(0.84), crownMat);
            crownSide.position.set(-0.45, 2.2, -0.22);
            const crownSparkle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), highlightMat);
            crownSparkle.position.set(-0.15, 3.15, 0.12);

            // Petal carpet or neon ring around the tree base
            const baseRing = new THREE.Mesh(
              new THREE.CylinderGeometry(1.15, 1.25, 0.06, 8),
              new THREE.MeshBasicMaterial({
                color: tStyle === 'cherry_blossom' ? 0xfda4af : 0x22d3ee,
              })
            );
            baseRing.position.y = 0.03;

            treeGroup.add(crownMain, crownTop, crownSide, crownSparkle, baseRing);
          }

          treeGroup.position.set(
            (this.deterministicRand(sSeed + 6) - 0.5) * 3,
            0,
            (this.deterministicRand(sSeed + 7) - 0.5) * 3
          );
          elementGroup.add(treeGroup);
        }

        elementGroup.position.set(xOffset, 0, itemZPos);
        sceneryGroup.add(elementGroup);
      });
    }
  }

  private disposeGroupChildren(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
    }
  }

  private getActiveScenerySet(): ScenerySet {
    if (this.config.scenerySets && this.config.selectedScenerySet) {
      const found = this.config.scenerySets.find((s) => s.id === this.config.selectedScenerySet);
      if (found) {
        return {
          ...found,
          hasMountains: true,
          sceneryDensity: found.sceneryDensity === 'low' ? 'medium' : found.sceneryDensity,
        };
      }
    }
    return {
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
    };
  }

  private initParticles() {
    const count = 36;
    const geo = new THREE.BufferGeometry();
    this.particleCoords = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.particleCoords[i * 3] = (Math.random() - 0.5) * 16;
      this.particleCoords[i * 3 + 1] = Math.random() * 6;
      this.particleCoords[i * 3 + 2] = -Math.random() * 120;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.particleCoords, 3));

    let pColor = 0xfde047;
    if (this.config.particleTheme === 'petals') pColor = 0xf472b6;
    if (this.config.particleTheme === 'sparks') pColor = 0x38bdf8;
    if (this.config.particleTheme === 'dust') pColor = 0xf59e0b;

    const pMat = new THREE.PointsMaterial({
      color: pColor,
      size: 0.16,
      transparent: true,
      opacity: 0.6,
    });

    this.particlePoints = new THREE.Points(geo, pMat);
    this.scene.add(this.particlePoints);
  }

  public updateTheme(newConfig: EnvironmentConfig, lerpFactor: number = 1.0) {
    const prevSceneryId = this.currentScenerySetId;
    this.config = newConfig;

    this.trackMaterial.color.lerp(new THREE.Color(this.config.trackColor), lerpFactor);
    this.railMaterial.color.lerp(new THREE.Color(this.config.railColor), lerpFactor);
    this.railMaterial.emissive.lerp(
      new THREE.Color(this.config.railColor).multiplyScalar(0.22),
      lerpFactor
    );
    this.trainMaterial.color.lerp(new THREE.Color(this.config.trainColor), lerpFactor);
    this.trainAccentMat.color.lerp(new THREE.Color(this.config.trainAccentColor), lerpFactor);

    this.applyThemePaletteToMaterials(this.config.theme, lerpFactor);

    if (this.particlePoints) {
      const pMat = this.particlePoints.material as THREE.PointsMaterial;
      let pColor = 0xfde047;
      if (this.config.particleTheme === 'petals') pColor = 0xf472b6;
      if (this.config.particleTheme === 'sparks') pColor = 0x38bdf8;
      if (this.config.particleTheme === 'dust') pColor = 0xf59e0b;
      pMat.color.lerp(new THREE.Color(pColor), lerpFactor);
    }

    const nextSceneryId = this.config.selectedScenerySet || 'set_neon_skyline';
    if (lerpFactor >= 0.99 && nextSceneryId !== prevSceneryId) {
      this.currentScenerySetId = nextSceneryId;
      this.chunkSceneryGroups.forEach((sg) => this.populateSceneryGroup(sg));
    }
  }

  public generateAhead(playerZ: number) {
    // 1. Spawn or recycle the Diverging Side-Road ahead at regular intervals
    if (!this.activeFork && playerZ <= this.nextForkSpawnZ + 115) {
      this.activateForkAhead(this.nextForkSpawnZ);
      this.nextForkSpawnZ -= this.forkIntervalZ;
    }

    // 2. Spawn obstacle waves ahead on the active track
    while (this.nextSpawnZ > playerZ - 110) {
      this.spawnObstacleWave(this.nextSpawnZ);
      this.nextSpawnZ -= this.waveSpacing;
    }

    // 3. Recycle & position Roadside Item Shop ahead when passed (1.5x to 2x distance interval: 285m to 370m)
    if (playerZ < this.activeShopZ - 24) {
      let candidateZ = this.nextShopSpawnZ;
      if (this.activeFork && Math.abs(candidateZ - this.activeFork.zPos) < 65) {
        candidateZ -= 75;
      }
      this.activeShopZ = candidateZ;
      const nextInterval =
        this.shopIntervalMinZ +
        Math.floor(Math.random() * (this.shopIntervalMaxZ - this.shopIntervalMinZ + 1));
      this.nextShopSpawnZ = candidateZ - nextInterval;
      if (this.roadsideShopGroup) {
        this.roadsideShopGroup.position.set(this.trackCenterX, 0, this.activeShopZ);
        this.roadsideShopGroup.visible = true;
      }
    }
  }

  private spawnObstacleWave(atZ: number) {
    // Keep all lanes completely clear of trains & barriers right in front of the Roadside Shop so player & 360° camera are never blocked!
    if (Math.abs(atZ - this.activeShopZ) < 22) {
      this.spawnCollectiblesTrail(0, atZ);
      this.spawnCollectiblesTrail(1, atZ);
      this.spawnCollectiblesTrail(2, atZ + 8);
      this.spawnRareOrPowerup(2, atZ - 4);
      return;
    }
    if (this.activeFork && Math.abs(atZ - this.activeFork.zPos) < 28) {
      const forkLane = this.activeFork.direction === 'left' ? 0 : 2;
      const oppositeLane = this.activeFork.direction === 'left' ? 2 : 0;
      const side = this.activeFork.direction === 'left' ? -1 : 1;

      this.spawnTrain(oppositeLane, atZ, true);
      this.spawnLowBarrier(1, atZ);
      this.spawnCollectiblesTrail(forkLane, atZ + 10);

      // Trail of bonus coins curving along the 60m Diverging Side-Road right onto the New Track!
      for (let cz = 24; cz >= -32; cz -= 4) {
        const progress = (26 - cz) / 60;
        const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
        const curveX = this.activeFork.baseTrackX + side * (3.0 + ease * (FORK_DIVERGE_OFFSET - 3.0));
        this.createCoinAtWorldPos(curveX, 0.85, this.activeFork.zPos + cz, forkLane);
      }
      return;
    }

    const patternType = Math.floor(Math.random() * 6);

    if (patternType === 0) {
      const trainLane = Math.random() < 0.5 ? 0 : 2;
      const hurdleLane = 1;
      const openLane = trainLane === 0 ? 2 : 0;

      this.spawnTrain(trainLane, atZ, true);
      this.spawnLowBarrier(hurdleLane, atZ);
      this.spawnCollectiblesTrail(openLane, atZ);
    } else if (patternType === 1) {
      const trainLane = Math.floor(Math.random() * 3);
      const remainingLanes = [0, 1, 2].filter((l) => l !== trainLane);
      const barrierLane = remainingLanes[0];
      const openLane = remainingLanes[1];

      this.spawnTrain(trainLane, atZ, false);
      this.spawnHighBarrier(barrierLane, atZ);
      this.spawnCollectiblesTrail(openLane, atZ);
    } else if (patternType === 2) {
      const openLane = Math.floor(Math.random() * 3);
      [0, 1, 2]
        .filter((l) => l !== openLane)
        .forEach((l) => {
          this.spawnLowBarrier(l, atZ);
        });
      this.spawnRareOrPowerup(openLane, atZ);
    } else if (patternType === 3) {
      const openLane = Math.floor(Math.random() * 3);
      [0, 1, 2]
        .filter((l) => l !== openLane)
        .forEach((l) => {
          this.spawnHighBarrier(l, atZ);
        });
      this.spawnCollectiblesTrail(openLane, atZ);
    } else if (patternType === 4) {
      this.spawnTrain(0, atZ, true);
      this.spawnTrain(2, atZ, false);
      this.spawnCollectiblesTrail(1, atZ);
    } else {
      this.spawnRareOrPowerup(1, atZ);
      for (let c = -4; c <= 4; c += 2) {
        this.createCoin(0, atZ + c, 0.75);
        this.createCoin(2, atZ + c, 0.75);
      }
    }
  }

  public spawnTrain(laneIdx: number, zPos: number, hasRamp: boolean) {
    const laneX = this.getLaneWorldX(laneIdx);
    const trainLength = 16;
    const trainHeight = 3.2;
    const trainWidth = 2.1;
    const roofY = 3.35;
    const rampLength = 4.2;

    const rampStartPosZ = hasRamp ? zPos + trainLength / 2 + rampLength : zPos + trainLength / 2;
    const rampEndPosZ = zPos + trainLength / 2;

    const pool = hasRamp ? this.trainPoolWithRamp : this.trainPoolNoRamp;
    let entity = pool.pop();

    if (entity) {
      entity.laneIndex = laneIdx;
      entity.z = zPos;
      entity.rampStartPosZ = rampStartPosZ;
      entity.rampEndPosZ = rampEndPosZ;
      entity.group.position.set(laneX, 0, zPos);
      entity.group.visible = true;
    } else {
      const group = new THREE.Group();

      const body = new THREE.Mesh(EnvironmentManager.trainBodyGeo, this.trainMaterial);
      body.position.y = trainHeight / 2 + 0.15;
      group.add(body);

      const roof = new THREE.Mesh(EnvironmentManager.trainRoofGeo, this.trainAccentMat);
      roof.position.y = roofY;
      group.add(roof);

      const nose = new THREE.Mesh(EnvironmentManager.trainNoseGeo, this.trainAccentMat);
      nose.position.set(0, trainHeight + 0.1, trainLength / 2);
      group.add(nose);

      const bumper = new THREE.Mesh(EnvironmentManager.trainBumperGeo, this.bumperMat);
      bumper.position.set(0, 0.2, trainLength / 2 + 0.2);
      group.add(bumper);

      const lightL = new THREE.Mesh(EnvironmentManager.trainLightGeo, this.lightMat);
      lightL.position.set(0.65, 1.1, trainLength / 2 + 0.05);
      const lightR = new THREE.Mesh(EnvironmentManager.trainLightGeo, this.lightMat);
      lightR.position.set(-0.65, 1.1, trainLength / 2 + 0.05);
      group.add(lightL, lightR);

      for (let w = -trainLength / 2 + 2.5; w < trainLength / 2 - 2; w += 3.2) {
        const winL = new THREE.Mesh(EnvironmentManager.trainWinGeo, this.winMat);
        winL.position.set(trainWidth / 2 + 0.02, 2.2, w);
        winL.rotation.y = Math.PI / 2;
        const winR = new THREE.Mesh(EnvironmentManager.trainWinGeo, this.winMat);
        winR.position.set(-trainWidth / 2 - 0.02, 2.2, w);
        winR.rotation.y = -Math.PI / 2;
        group.add(winL, winR);
      }

      if (hasRamp) {
        const rampAngle = Math.atan2(roofY, rampLength);
        const rampCenterZ = trainLength / 2 + rampLength / 2;
        const rampMesh = new THREE.Mesh(EnvironmentManager.trainRampGeo, this.rampMat);
        rampMesh.position.set(0, roofY / 2, rampCenterZ);
        rampMesh.rotation.x = rampAngle;
        group.add(rampMesh);

        // Side safety curb rails along the boarding ramp
        const rampRailL = new THREE.Mesh(EnvironmentManager.trainRampRailGeo, this.trainAccentMat);
        rampRailL.position.set(0.98, roofY / 2 + 0.08, rampCenterZ);
        rampRailL.rotation.x = rampAngle;
        const rampRailR = new THREE.Mesh(EnvironmentManager.trainRampRailGeo, this.trainAccentMat);
        rampRailR.position.set(-0.98, roofY / 2 + 0.08, rampCenterZ);
        rampRailR.rotation.x = rampAngle;
        group.add(rampRailL, rampRailR);

        // Grounded structural steel support struts under the middle of the ramp so it never floats!
        const strutL = new THREE.Mesh(EnvironmentManager.trainRampStrutGeo, this.postMat);
        strutL.position.set(0.85, 0.82, rampCenterZ);
        const strutR = new THREE.Mesh(EnvironmentManager.trainRampStrutGeo, this.postMat);
        strutR.position.set(-0.85, 0.82, rampCenterZ);
        group.add(strutL, strutR);

        const arrowSign = new THREE.Mesh(EnvironmentManager.trainArrowGeo, this.lightMat);
        arrowSign.position.set(0, 0.12, trainLength / 2 + rampLength - 0.15);
        group.add(arrowSign);
      }

      group.position.set(laneX, 0, zPos);
      this.scene.add(group);

      entity = {
        group,
        laneIndex: laneIdx,
        type: 'train_stopped',
        box: new THREE.Box3(),
        z: zPos,
        height: trainHeight,
        canSlideUnder: false,
        canJumpOver: false,
        isTrain: true,
        roofY,
        hasRamp,
        trainLength,
        rampStartPosZ,
        rampEndPosZ,
      };
    }

    if (hasRamp) {
      for (let r = rampLength - 0.5; r >= 0.5; r -= 1.8) {
        const t = (rampLength - r) / rampLength;
        this.createCoin(laneIdx, zPos + trainLength / 2 + r, t * roofY + 0.7);
      }
    }

    for (let c = -trainLength / 2 + 2.5; c <= trainLength / 2 - 2; c += 2.8) {
      this.createCoin(laneIdx, zPos + c, roofY + 0.75);
    }

    this.obstacles.push(entity);
  }

  public spawnLowBarrier(laneIdx: number, zPos: number) {
    const laneX = this.getLaneWorldX(laneIdx);
    let entity = this.lowBarrierPool.pop();

    if (entity) {
      entity.laneIndex = laneIdx;
      entity.z = zPos;
      entity.group.position.set(laneX, 0, zPos);
      entity.group.visible = true;
    } else {
      const group = new THREE.Group();

      // 1. Weighted A-Frame Ground Base Feet resting firmly on the railway track bed (y = 0.10)
      const footL = new THREE.Mesh(EnvironmentManager.barrierFootGeo, this.chainMat);
      footL.position.set(1.08, 0.1, 0);
      const footR = new THREE.Mesh(EnvironmentManager.barrierFootGeo, this.chainMat);
      footR.position.set(-1.08, 0.1, 0);
      group.add(footL, footR);

      // 2. Sturdy Left, Center & Right Vertical Stanchions anchored into the ground feet
      const postL = new THREE.Mesh(EnvironmentManager.postGeo, this.postMat);
      postL.position.set(1.08, 0.52, 0);
      const postR = new THREE.Mesh(EnvironmentManager.postGeo, this.postMat);
      postR.position.set(-1.08, 0.52, 0);
      const postCenter = new THREE.Mesh(EnvironmentManager.chainGeo, this.postMat);
      postCenter.position.set(0, 0.36, 0);
      group.add(postL, postR, postCenter);

      // 3. Upper Striped Hazard Cross-Plank (y = 0.74) & Lower Guard Rail Crossbar (y = 0.32)
      const bar = new THREE.Mesh(EnvironmentManager.lowBarGeo, this.lowBarMat);
      bar.position.y = 0.74;
      const bottomBar = new THREE.Mesh(EnvironmentManager.lowBottomBarGeo, this.postMat);
      bottomBar.position.y = 0.32;
      group.add(bar, bottomBar);

      // 4. High-Contrast Caution Stripes across the Jump Hurdle
      [-0.68, 0, 0.68].forEach((sx) => {
        const stripe = new THREE.Mesh(EnvironmentManager.lowStripeGeo, this.cautionMat);
        stripe.position.set(sx, 0.74, 0);
        group.add(stripe);
      });

      // 5. Glowing Warning Beacon Caps on top of the left & right stanchions
      const beaconL = new THREE.Mesh(EnvironmentManager.barrierBeaconGeo, this.lightMat);
      beaconL.position.set(1.08, 1.04, 0);
      const beaconR = new THREE.Mesh(EnvironmentManager.barrierBeaconGeo, this.lightMat);
      beaconR.position.set(-1.08, 1.04, 0);
      group.add(beaconL, beaconR);

      group.position.set(laneX, 0, zPos);
      this.scene.add(group);

      entity = {
        group,
        laneIndex: laneIdx,
        type: 'low_barrier',
        box: new THREE.Box3(),
        z: zPos,
        height: 0.95,
        canSlideUnder: false,
        canJumpOver: true,
        isTrain: false,
      };
    }

    [-1.8, 0, 1.8].forEach((offsetZ, i) => {
      this.createCoin(laneIdx, zPos + offsetZ, i === 1 ? 2.3 : 1.6);
    });

    this.obstacles.push(entity);
  }

  public spawnHighBarrier(laneIdx: number, zPos: number) {
    const laneX = this.getLaneWorldX(laneIdx);
    let entity = this.highBarrierPool.pop();

    if (entity) {
      entity.laneIndex = laneIdx;
      entity.z = zPos;
      entity.group.position.set(laneX, 0, zPos);
      entity.group.visible = true;
    } else {
      const group = new THREE.Group();

      // 1. Heavy Grounded Plinth Base Blocks resting flat on the track bed (x = ±1.16, y = 0.14)
      const baseFootL = new THREE.Mesh(EnvironmentManager.barrierFootGeo, this.chainMat);
      baseFootL.position.set(1.16, 0.14, 0);
      const baseFootR = new THREE.Mesh(EnvironmentManager.barrierFootGeo, this.chainMat);
      baseFootR.position.set(-1.16, 0.14, 0);
      group.add(baseFootL, baseFootR);

      // 2. Full-Height Vertical Support Columns rising from the ground (y = 0) up to y = 3.40
      // (Never hanging in mid-air! Anchored firmly to the ground with clear 2.1m slide-under opening between them)
      const pillarL = new THREE.Mesh(EnvironmentManager.highPillarGeo, this.postMat);
      pillarL.position.set(1.16, 1.72, 0);
      const pillarR = new THREE.Mesh(EnvironmentManager.highPillarGeo, this.postMat);
      pillarR.position.set(-1.16, 1.72, 0);
      group.add(pillarL, pillarR);

      // 3. Overhead Structural Arch Header Crossbeam (y = 3.36) connecting both ground pillars
      const topHeaderBeam = new THREE.Mesh(EnvironmentManager.highHeaderBeamGeo, this.chainMat);
      topHeaderBeam.position.set(0, 3.36, 0);
      group.add(topHeaderBeam);

      // 4. Twin Glowing Warning Beacons on top of the left & right pillars (y = 3.56)
      const beaconL = new THREE.Mesh(EnvironmentManager.barrierBeaconGeo, this.lightMat);
      beaconL.position.set(1.16, 3.56, 0);
      const beaconR = new THREE.Mesh(EnvironmentManager.barrierBeaconGeo, this.lightMat);
      beaconR.position.set(-1.16, 3.56, 0);
      group.add(beaconL, beaconR);

      // 5. Overhead Slide-Under Barrier Board (y = 2.38, leaving y = 0 to 1.84 open underneath to slide under!)
      const signBoard = new THREE.Mesh(EnvironmentManager.highSignGeo, this.frameMat);
      signBoard.position.y = 2.38;
      group.add(signBoard);

      // Top & bottom caution bands and high-contrast hazard stripes on the barrier board
      const cautionBandTop = new THREE.Mesh(EnvironmentManager.cautionBandGeo, this.cautionMat);
      cautionBandTop.position.y = 2.78;
      const cautionBandBottom = new THREE.Mesh(EnvironmentManager.cautionBandGeo, this.cautionMat);
      cautionBandBottom.position.y = 1.98;
      group.add(cautionBandTop, cautionBandBottom);

      [-0.65, 0, 0.65].forEach((sx) => {
        const stripe = new THREE.Mesh(EnvironmentManager.highStripeGeo, this.cautionMat);
        stripe.position.set(sx, 2.38, 0);
        group.add(stripe);
      });

      // 6. Side Mounting Clamps bolting the board into the ground pillars + Hanger Struts connecting to the Top Header Beam
      const clampL = new THREE.Mesh(EnvironmentManager.highClampGeo, this.chainMat);
      clampL.position.set(1.12, 2.38, 0);
      const clampR = new THREE.Mesh(EnvironmentManager.highClampGeo, this.chainMat);
      clampR.position.set(-1.12, 2.38, 0);
      const hangerL = new THREE.Mesh(EnvironmentManager.chainGeo, this.postMat);
      hangerL.position.set(0.78, 3.12, 0);
      const hangerR = new THREE.Mesh(EnvironmentManager.chainGeo, this.postMat);
      hangerR.position.set(-0.78, 3.12, 0);
      group.add(clampL, clampR, hangerL, hangerR);

      group.position.set(laneX, 0, zPos);
      this.scene.add(group);

      entity = {
        group,
        laneIndex: laneIdx,
        type: 'high_barrier',
        box: new THREE.Box3(),
        z: zPos,
        height: 3.0,
        canSlideUnder: true,
        canJumpOver: false,
        isTrain: false,
      };
    }

    [-1.5, 0, 1.5].forEach((offsetZ) => {
      this.createCoin(laneIdx, zPos + offsetZ, 0.35);
    });

    this.obstacles.push(entity);
  }

  private spawnCollectiblesTrail(laneIdx: number, atZ: number) {
    for (let c = -3.5; c <= 3.5; c += 2.2) {
      this.createCoin(laneIdx, atZ + c, 0.75);
    }
  }

  private spawnRareOrPowerup(laneIdx: number, atZ: number) {
    const rand = Math.random();
    if (rand < 0.45) {
      const powerups: PowerupType[] = ['magnet', 'multiplier', 'hoverboard', 'sneakers', 'jetpack'];
      const chosen = powerups[Math.floor(Math.random() * powerups.length)];
      this.createPowerup(laneIdx, atZ, chosen);
    } else {
      this.createGem(laneIdx, atZ);
    }
    this.createCoin(laneIdx, atZ - 3, 0.75);
    this.createCoin(laneIdx, atZ + 3, 0.75);
  }

  private createCoin(laneIdx: number, zPos: number, yPos: number) {
    this.createCoinAtWorldPos(this.getLaneWorldX(laneIdx), yPos, zPos, laneIdx);
  }

  private createCoinAtWorldPos(xPos: number, yPos: number, zPos: number, laneIdx: number = 1) {
    let entity = this.coinPool.pop();
    if (entity) {
      entity.laneIndex = laneIdx;
      entity.z = zPos;
      entity.y = yPos;
      entity.collected = false;
      entity.group.position.set(xPos, yPos, zPos);
      entity.group.visible = true;
    } else {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(EnvironmentManager.coinGeo, this.coinMaterial);
      mesh.rotation.x = Math.PI / 2;
      group.add(mesh);
      group.position.set(xPos, yPos, zPos);
      this.scene.add(group);

      entity = {
        group,
        type: 'coin',
        laneIndex: laneIdx,
        z: zPos,
        y: yPos,
        collected: false,
        mesh,
      };
    }

    this.collectibles.push(entity);
  }

  private createGem(laneIdx: number, zPos: number) {
    const laneX = this.getLaneWorldX(laneIdx);
    let entity = this.gemPool.pop();
    if (entity) {
      entity.laneIndex = laneIdx;
      entity.z = zPos;
      entity.y = 1.2;
      entity.collected = false;
      entity.group.position.set(laneX, 1.2, zPos);
      entity.group.visible = true;
    } else {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(EnvironmentManager.gemGeo, this.gemMaterial);
      group.add(mesh);
      group.position.set(laneX, 1.2, zPos);
      this.scene.add(group);

      entity = {
        group,
        type: 'gem',
        laneIndex: laneIdx,
        z: zPos,
        y: 1.2,
        collected: false,
        mesh,
      };
    }

    this.collectibles.push(entity);
  }

  private createPowerup(laneIdx: number, zPos: number, type: PowerupType) {
    const laneX = this.getLaneWorldX(laneIdx);
    const pool = this.powerupPools[type];
    let entity = pool.pop();

    if (entity) {
      entity.laneIndex = laneIdx;
      entity.z = zPos;
      entity.y = 1.2;
      entity.collected = false;
      entity.group.position.set(laneX, 1.2, zPos);
      entity.group.visible = true;
    } else {
      const group = new THREE.Group();
      let mesh: THREE.Mesh;

      if (type === 'magnet') {
        mesh = new THREE.Mesh(EnvironmentManager.magnetGeo, this.magnetMat);
        mesh.rotation.z = Math.PI;
      } else if (type === 'multiplier') {
        mesh = new THREE.Mesh(EnvironmentManager.starGeo, this.starMat);
      } else if (type === 'hoverboard') {
        mesh = new THREE.Mesh(EnvironmentManager.boardPowerupGeo, this.boardMat);
      } else if (type === 'sneakers') {
        mesh = new THREE.Mesh(EnvironmentManager.sneakerPowerupGeo, this.sneakerMat);
      } else {
        mesh = new THREE.Mesh(EnvironmentManager.jetpackPowerupGeo, this.jetpackMat);
      }

      group.add(mesh);
      group.position.set(laneX, 1.2, zPos);
      this.scene.add(group);

      entity = {
        group,
        type,
        laneIndex: laneIdx,
        z: zPos,
        y: 1.2,
        collected: false,
        mesh,
      };
    }

    this.collectibles.push(entity);
  }

  private recycleObstacle(obs: ObstacleEntity) {
    obs.group.visible = false;
    if (obs.isTrain) {
      if (obs.hasRamp) {
        this.trainPoolWithRamp.push(obs);
      } else {
        this.trainPoolNoRamp.push(obs);
      }
    } else if (obs.type === 'low_barrier') {
      this.lowBarrierPool.push(obs);
    } else if (obs.type === 'high_barrier') {
      this.highBarrierPool.push(obs);
    }
  }

  private recycleCollectible(col: CollectibleEntity) {
    col.group.visible = false;
    if (col.type === 'coin') {
      this.coinPool.push(col);
    } else if (col.type === 'gem') {
      this.gemPool.push(col);
    } else {
      this.powerupPools[col.type].push(col);
    }
  }

  public update(delta: number, playerZ: number) {
    // Hide the start station once the player has dashed well past it
    if (this.startStationGroup && this.startStationGroup.visible && playerZ < -68) {
      this.startStationGroup.visible = false;
    }

    // 1. Hide & clear activeFork once the player has completely passed the diverging road and its 60m lead-in
    if (this.activeFork && playerZ < this.activeFork.zPos - 95) {
      this.forkRoadGroup.visible = false;
      this.activeFork = null;
    }

    // 1B. Animate 3D Roadside Shop display items & customizable 3D Shop Characters
    if (this.roadsideShopGroup && this.roadsideShopGroup.visible) {
      const nowSec = performance.now() * 0.001;
      for (let i = 0; i < this.shopDisplayMeshes.length; i++) {
        const m = this.shopDisplayMeshes[i];
        m.rotation.y += delta * 2.4;
        m.position.y = 1.98 + Math.sin(nowSec * 3.5 + i) * 0.08;
      }
      for (let k = 0; k < this.roadsideShopKeepers.length; k++) {
        const keeper = this.roadsideShopKeepers[k];
        if (!keeper.char.group.visible) continue;
        const pose = keeper.config.pose || 'wave';
        if (pose === 'dance') {
          keeper.char.animateDance(delta);
        } else if (pose === 'royal_bow') {
          const bowProg = (nowSec * 0.45 + k * 0.3) % 1.0;
          keeper.char.animateStationEmote(delta, 'royal_bow', bowProg, nowSec);
        } else if (pose === 'idle') {
          keeper.char.animatePlatformStanding(delta, nowSec + k * 1.2);
        } else {
          keeper.char.animateStationChat(delta, true, k * 1.4);
        }
      }
    }

    // 1C. Animate Grand Panoramic Horizon Vista (Ferris Wheel, Hot Air Balloons, Soaring Birds)
    this.updateHorizonVista(delta, playerZ);
    if (this.forkRoadGroup.visible && this.animatedIndicators.length > 0) {
      const pulse = 0.5 + 0.45 * Math.sin(performance.now() * 0.008);
      for (let i = 0; i < this.animatedIndicators.length; i++) {
        const mat = this.animatedIndicators[i].material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity =
            this.animatedIndicators[i].geometry.type === 'PlaneGeometry'
              ? 0.18 + pulse * 0.22
              : 0.45 + pulse * 0.5;
        }
      }
    }

    // 3. Infinite Track recycling aligned to the current active trackCenterX
    for (let i = 0; i < this.trackChunks.length; i++) {
      const chunk = this.trackChunks[i];
      if (chunk.position.z > playerZ + 32) {
        chunk.position.z -= this.totalChunks * this.chunkLength;
        chunk.position.x = this.trackCenterX;
        if (chunk.userData.roadsideProps) {
          chunk.userData.roadsideProps.visible = true;
        }
      }
    }
    this.updateShopClearance();

    // 4. Immediate recycle of passed/collected collectibles into Object Pool
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      if (col.collected || col.group.position.z > playerZ + 12) {
        this.recycleCollectible(col);
        this.collectibles.splice(i, 1);
        continue;
      }
      col.mesh.rotation.y += delta * 3.0;
    }

    // 5. Immediate recycle of passed trains & barriers into Object Pool
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.group.position.z > playerZ + 16) {
        this.recycleObstacle(obs);
        this.obstacles.splice(i, 1);
      }
    }

    // 6. Update atmospheric particles centered around the active track
    if (this.particlePoints) {
      this.particlePoints.position.x = this.trackCenterX;
      const posAttr = this.particlePoints.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      const count = array.length / 3;

      for (let i = 0; i < count; i++) {
        array[i * 3 + 1] -= delta * 0.4;
        if (array[i * 3 + 1] < 0) array[i * 3 + 1] = 6;
        if (array[i * 3 + 2] > playerZ + 15) {
          array[i * 3 + 2] = playerZ - 100 - Math.random() * 30;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public updateHorizonVista(delta: number, playerZ: number) {
    if (!this.horizonVistaGroup) return;

    this.horizonVistaGroup.position.x = THREE.MathUtils.lerp(
      this.horizonVistaGroup.position.x,
      this.trackCenterX,
      delta * 4
    );
    this.horizonVistaGroup.position.z = playerZ;

    const nowSec = performance.now() * 0.001;

    // Rotate the Giant Illuminated Ferris Wheel & keep passenger gondolas upright
    if (this.ferrisWheelRimGroup) {
      this.ferrisWheelRimGroup.rotation.z += delta * 0.22;
      const wheelRot = this.ferrisWheelRimGroup.rotation.z;
      for (let i = 0; i < this.ferrisGondolas.length; i++) {
        this.ferrisGondolas[i].rotation.z = -wheelRot;
      }
    }

    // Float & bob the Colorful Hot Air Balloons across the sky
    for (let i = 0; i < this.hotAirBalloons.length; i++) {
      const b = this.hotAirBalloons[i];
      b.group.position.y = b.baseY + Math.sin(nowSec * b.speed + b.phase) * 1.45;
      b.group.position.x = b.baseX + Math.cos(nowSec * 0.35 + b.phase) * 2.2;
      b.group.rotation.y = Math.sin(nowSec * 0.5 + b.phase) * 0.18;
    }

    // Animate flapping wings & gliding path of Soaring Sky Bird V-Flocks
    for (let i = 0; i < this.skyBirdFlocks.length; i++) {
      const flock = this.skyBirdFlocks[i];
      flock.group.position.x = flock.baseX + Math.sin(nowSec * 0.45 + flock.phase) * 6.5;
      flock.group.position.y = flock.baseY + Math.cos(nowSec * 0.8 + flock.phase) * 0.9;
      const flapAngle = Math.sin(nowSec * 9.5 + flock.phase) * 0.48;
      for (let w = 0; w < flock.wingsL.length; w++) {
        const phaseOffset = Math.sin(nowSec * 9.5 + flock.phase - w * 0.35) * 0.48;
        flock.wingsL[w].rotation.z = phaseOffset;
        flock.wingsR[w].rotation.z = -phaseOffset;
      }
      void flapAngle;
    }
  }

  public reset(startZ: number = 0) {
    this.trackCenterX = 0;

    for (let i = 0; i < this.obstacles.length; i++) {
      this.recycleObstacle(this.obstacles[i]);
    }
    this.obstacles = [];

    for (let i = 0; i < this.collectibles.length; i++) {
      this.recycleCollectible(this.collectibles[i]);
    }
    this.collectibles = [];

    this.activeFork = null;
    if (this.forkRoadGroup) {
      this.forkRoadGroup.visible = false;
    }
    if (this.startStationGroup) {
      this.startStationGroup.position.set(0, 0, startZ);
      this.startStationGroup.visible = true;
    }
    this.nextForkSpawnZ = startZ - 550;
    this.activeShopZ = startZ - 225;
    this.nextShopSpawnZ = startZ - 560;
    if (this.roadsideShopGroup) {
      this.roadsideShopGroup.position.set(0, 0, this.activeShopZ);
      this.roadsideShopGroup.visible = true;
    }
    if (this.horizonVistaGroup) {
      this.horizonVistaGroup.position.set(0, 0, startZ);
    }

    this.trackChunks.forEach((chunk, i) => {
      chunk.position.set(0, 0, startZ - i * this.chunkLength);
      if (chunk.userData.roadsideProps) {
        chunk.userData.roadsideProps.visible = i !== 0;
      }
    });
    this.updateShopClearance();

    if (this.particlePoints) {
      this.particlePoints.position.x = 0;
    }

    this.nextSpawnZ = startZ - 45;
  }

  public updateStationSwing(swingAngle: number) {
    if (this.stationSwingPivot) {
      this.stationSwingPivot.rotation.x = swingAngle;
    }
  }

  public getStationSwingSeatWorldPosition(target: THREE.Vector3) {
    if (this.stationSwingSeat) {
      this.stationSwingSeat.getWorldPosition(target);
    } else {
      target.set(6.8, 0.65, 3.8);
    }
  }

  public dispose() {
    if (this.stationSignTex) {
      this.stationSignTex.dispose();
      this.stationSignTex = null;
    }
    if (this.shopSignTex) {
      this.shopSignTex.dispose();
      this.shopSignTex = null;
    }
    if (this.shopAdvanceSignTex) {
      this.shopAdvanceSignTex.dispose();
      this.shopAdvanceSignTex = null;
    }
    this.forkSignTextures.forEach((tex) => tex.dispose());
    this.forkSignTextures.clear();
    this.billboardMaterials.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
    this.chunkSceneryGroups.forEach((sg) => this.disposeGroupChildren(sg));
  }
}

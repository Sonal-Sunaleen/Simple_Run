import * as THREE from 'three';
import {
  GameCustomConfig,
  ActivePowerups,
  PowerupType,
  EnvironmentTheme,
  EnvironmentConfig,
  SkateboardConfig,
  PrincessConfig,
  CompanionBannerState,
  StationEmoteType,
  InGameTradeItemType,
  CollectedItemsInventory,
  RoadsideShopVisitPhase,
  RoadsideShopState,
} from '../types/game';
import { PrincessCharacter } from './CharacterModel';
import { PetCompanion } from './PetModel';
import { EnvironmentManager, LANES, FORK_DIVERGE_OFFSET } from './EnvironmentManager';
import { soundManager } from './soundEffects';
import { THEME_PRESETS, loadPlayerStats, savePlayerStats } from '../utils/configStorage';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, coins: number, gems: number, distance: number) => void;
  onPowerupUpdate: (powerups: ActivePowerups) => void;
  onGameOver: (score: number, coins: number, gems: number, distance: number) => void;
  onHoverboardChange: (count: number, active: boolean) => void;
  onCompanionEncounter?: (info: CompanionBannerState) => void;
  onRoadsideShopUpdate?: (state: RoadsideShopState) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private config: GameCustomConfig;
  private callbacks: GameEngineCallbacks;

  // Three.js Core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private sunMesh!: THREE.Mesh;
  private skyDomeMesh: THREE.Mesh | null = null;
  private skyDomeMat: THREE.MeshBasicMaterial | null = null;
  private skyDomeCanvas: HTMLCanvasElement | null = null;
  private skyDomeTex: THREE.CanvasTexture | null = null;
  private hudUpdateTimer: number = 0;

  // Dynamic Camera Curve Yaw, LookAt & Banking
  private currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 1.8, -12);
  private currentCamRoll: number = 0;

  // Smooth Theme Transition State (triggered ONLY when player swipes into a Forked Side-Road)
  private targetThemeConfig: EnvironmentConfig | null = null;
  private themeTransitionProgress: number = 1.0;
  private tempColorSky = new THREE.Color();
  private tempColorFog = new THREE.Color();
  private tempColorAmb = new THREE.Color();
  private tempColorDir = new THREE.Color();
  private tempColorTrack = new THREE.Color();

  // Models
  private princess!: PrincessCharacter;
  private pet!: PetCompanion;
  private environment!: EnvironmentManager;

  // Station Friends & Companions (dancing & cheering in the background at the platform!)
  private stationFriends: PrincessCharacter[] = [];
  private stationFriendsGroup: THREE.Group = new THREE.Group();

  // Dedicated In-Game Companion Runners (separate from stationFriendsGroup so they are NEVER hidden during the run!)
  private companionRunners: PrincessCharacter[] = [];
  private companionRunnersGroup: THREE.Group = new THREE.Group();

  // In-Game Sprint Companion Encounter (দৌড়ানোর সময় আগে এগিয়ে থাকা ক্যারেক্টারের সঙ্গ নেওয়া, একসাথে দৌড়ানো ও এগিয়ে যাওয়া)
  private activeCompanion: {
    friendIndex: number;
    lane: number;
    timer: number;
    duration: number;
    sideBySideTriggered: boolean;
    pullAheadTriggered: boolean;
    name: string;
    nameBn: string;
    cheer: string;
    cheerBn: string;
    color: string;
    avatar: string;
  } | null = null;
  private nextCompanionDist: number = 65;
  private companionThemeIndex: number = 0;

  // Roadside Item Shop Visit & Collected Item Inventory State (রাস্তার পাশে দাঁড়িয়ে, ঘুরে, দোকানে গিয়ে কেনা-বেচা)
  private shopVisitPhase: RoadsideShopVisitPhase = 'none';
  private shopCamYaw: number = Math.PI;
  private shopCamTargetYaw: number = Math.PI;
  private shopCamPitch: number = 0.0;
  private shopCamTargetPitch: number = 0.0;
  private shopOrbitRadius: number = 4.5;
  private collectedInventory: CollectedItemsInventory = {
    gem: 1,
    hoverboard: 3,
    magnet: 1,
    multiplier: 1,
    sneakers: 1,
    jetpack: 1,
  };
  private lastPassedShopZ: number = 9999;

  // Start Sprint Cutscene: turns from facing camera & sprints from station concourse onto the tracks!
  private isStartingRun: boolean = false;
  private startRunProgress: number = 0;

  // Interactive Platform Emote State (ইউজাররা প্লাটফর্মে থাকাকালীন ট্যাপ করে দেখতে পারবে)
  private activeStationEmote: {
    type: StationEmoteType;
    timer: number;
    duration: number;
  } | null = null;
  private emoteCycleIndex: number = 0;

  // Animation frame
  private animationFrameId: number | null = null;
  private idleFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Player State
  private currentLane: number = 1;
  private playerX: number = 0;
  private playerY: number = 0;
  private playerZ: number = 0;
  private velocityY: number = 0;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private slideTimer: number = 0;
  private currentSpeed: number = 0;
  private invulnerableTimer: number = 0;

  // Stats
  private score: number = 0;
  private coins: number = 0;
  private gems: number = 0;
  private distance: number = 0;
  private hoverboardsRemaining: number = 3;

  // Active Power-ups
  private activePowerups: ActivePowerups = {
    magnet: 0,
    multiplier: 0,
    sneakers: 0,
    jetpack: 0,
    hoverboard: false,
  };

  // Dynamic cycling list of all skateboards unlocked by the user
  private unlockedSkateboards: SkateboardConfig[] = [];
  private skateboardCycleIndex: number = 0;

  private playerPosVec: THREE.Vector3 = new THREE.Vector3();

  constructor(container: HTMLElement, config: GameCustomConfig, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.config = config;
    this.callbacks = callbacks;
    this.hoverboardsRemaining = config.gameplay.startingHoverboards;

    this.initThree();
    this.initModels();
    this.setupEventListeners();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.environment.skyColor);
    // Reduced fog density to let the gorgeous bright sky and clouds be visible in the distance
    this.scene.fog = new THREE.FogExp2(this.config.environment.fogColor, 0.009);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 160);
    this.camera.rotation.order = 'YXZ';
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(0, 4.2, 7.2);
    this.camera.lookAt(0, 1.8, -10);
    this.camera.rotation.z = 0;

    const isSmooth = this.config.gameplay.graphicsQuality === 'smooth';

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSmooth,
      powerPreference: 'high-performance',
      precision: isSmooth ? 'mediump' : 'highp',
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isSmooth ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !isSmooth;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Beautiful Glowing Gradient Sky Dome (Skybox)!
    try {
      const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false });
      this.skyDomeMat = skyMat;
      this.updateSkyDomeGradient(this.config.environment.skyColor, this.config.environment.fogColor);
      const skyDome = new THREE.Mesh(new THREE.SphereGeometry(145, 24, 12), skyMat);
      this.skyDomeMesh = skyDome;
      this.scene.add(skyDome);
    } catch (e) {
      console.warn("Could not create sky dome gradient:", e);
    }

    // Warm, beautiful daylight ambient light setup
    this.ambientLight = new THREE.AmbientLight(this.config.environment.ambientLightColor, 1.1);
    this.scene.add(this.ambientLight);

    // Natural daylight sky-to-ground shading
    this.hemiLight = new THREE.HemisphereLight(
      this.config.environment.skyColor,
      this.config.environment.trackColor,
      0.8
    );
    this.scene.add(this.hemiLight);

    // Warm directional sunshine
    this.dirLight = new THREE.DirectionalLight(this.config.environment.directionalLightColor, 1.45);
    this.dirLight.position.set(12, 25, 15);
    this.dirLight.castShadow = !isSmooth;
    if (this.dirLight.castShadow) {
      this.dirLight.shadow.mapSize.width = 512;
      this.dirLight.shadow.mapSize.height = 512;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 40;
    }
    this.scene.add(this.dirLight);

    // Beautiful Glowing Sun with Double Solar Corona Halo high in the sky!
    const sunGeo = new THREE.SphereGeometry(3.8, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.96,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    const coronaInner = new THREE.Mesh(
      new THREE.SphereGeometry(5.6, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.32,
      })
    );
    const coronaOuter = new THREE.Mesh(
      new THREE.SphereGeometry(8.2, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.14,
      })
    );
    this.sunMesh.add(coronaInner, coronaOuter);
    this.sunMesh.position.set(24, 30, -75);
    this.scene.add(this.sunMesh);
  }

  private initModels() {
    this.environment = new EnvironmentManager(
      this.scene,
      this.config.environment,
      this.config.roadsideShopCharacters
    );

    // Main Player Character: Standing centered on the starting platform, facing directly toward the camera!
    const faceCamAngle = Math.atan2(8.6 - 5.8, 7.6 - 4.0);
    this.princess = new PrincessCharacter(this.config.princess);
    this.princess.group.position.set(5.8, 0.65, 4.0);
    this.princess.group.rotation.set(0, faceCamAngle, 0);
    this.scene.add(this.princess.group);

    // Pet Companion: Standing happily beside the Princess on the starting platform, also facing the camera!
    this.pet = new PetCompanion(this.config.pet);
    this.pet.group.position.set(6.65, 0.65, 3.35);
    this.pet.group.rotation.set(0, faceCamAngle, 0);
    this.scene.add(this.pet.group);

    // Background Station Friends: standing on the OPPOSITE platform across the railway tracks!
    // Facing across the tracks towards our Princess & camera, chatting, playing & dancing!
    this.scene.add(this.stationFriendsGroup);
    const friendConfigs: PrincessConfig[] = [
      {
        name: 'Sakura Princess',
        modelType: 'sakura',
        skinColor: '#fbcfe8',
        hairColor: '#1e1b4b',
        outfitColor: '#f472b6',
        outfitSecondaryColor: '#f43f5e',
        crownColor: '#fbbf24',
        capeColor: '#fda4af',
        hasCrown: true,
        hasCape: false,
        modelScale: 1.0,
        modelYOffset: 0,
      },
      {
        name: 'Royal Queen',
        modelType: 'royal',
        skinColor: '#fed7aa',
        hairColor: '#facc15',
        outfitColor: '#8b5cf6',
        outfitSecondaryColor: '#c084fc',
        crownColor: '#fbbf24',
        capeColor: '#7c3aed',
        hasCrown: true,
        hasCape: true,
        modelScale: 1.0,
        modelYOffset: 0,
      },
      {
        name: 'Cyber Star',
        modelType: 'cyber',
        skinColor: '#e0f2fe',
        hairColor: '#94a3b8',
        outfitColor: '#06b6d4',
        outfitSecondaryColor: '#38bdf8',
        crownColor: '#38bdf8',
        capeColor: '#0284c7',
        hasCrown: false,
        hasCape: false,
        modelScale: 1.0,
        modelYOffset: 0,
      },
    ];

    const friendPositions = [
      { pos: new THREE.Vector3(-6.0, 0.65, -1.2), rotY: Math.atan2(8.6 - -6.0, 7.6 - -1.2) },
      { pos: new THREE.Vector3(-7.2, 0.65, -4.6), rotY: Math.atan2(8.6 - -7.2, 7.6 - -4.6) },
      { pos: new THREE.Vector3(-6.0, 0.65, -8.0), rotY: Math.atan2(8.6 - -6.0, 7.6 - -8.0) },
    ];

    friendConfigs.forEach((fc, idx) => {
      const friend = new PrincessCharacter(fc);
      const fp = friendPositions[idx];
      friend.group.position.copy(fp.pos);
      friend.group.rotation.set(0, fp.rotY, 0);
      this.stationFriends.push(friend);
      this.stationFriendsGroup.add(friend.group);

      // Dedicated in-game runner instance on main scene (starts hidden, becomes visible when we catch up!)
      const runner = new PrincessCharacter(fc);
      runner.group.visible = false;
      this.companionRunners.push(runner);
      this.companionRunnersGroup.add(runner.group);
    });
    this.scene.add(this.companionRunnersGroup);

    this.currentSpeed = this.config.gameplay.baseSpeed;
    soundManager.setVolumes(this.config.gameplay.soundVolume, this.config.gameplay.musicVolume);

    this.startIdleLoop();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isRunning || this.isPaused) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.moveLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.moveRight();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
      this.jump();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      this.slide();
    } else if (e.key === 'f' || e.key === 'F' || e.key === 'h' || e.key === 'H') {
      this.activateHoverboard();
    } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
      this.advanceRoadsideShopStep();
    } else if (this.isAtRoadsideShop() && ['1', '2', '3', '4', '5'].includes(e.key)) {
      const emotes: StationEmoteType[] = ['wave', 'dance', 'spin', 'royal_bow', 'jump_cheer'];
      this.triggerStationEmote(emotes[parseInt(e.key, 10) - 1]);
    }
  };

  // Prevent walking into the side of a train & allow voluntary swipe into Diverging Forked Side-Roads!
  public moveLeft() {
    if (this.isAtRoadsideShop()) {
      // Rotate 360° shop camera to the left when stopped at the shop!
      this.rotateShopCameraByStep(-0.45);
      return;
    }

    // If on a diverging branch road, only allow lane switching once arriving on the new track
    if (this.currentLane === -1 || this.currentLane === 3) {
      const fork = this.environment.activeFork;
      if (fork && this.playerZ - fork.zPos < -18) {
        this.currentLane = 0; // Left lane of the NEW track
        soundManager.playSlide();
      }
      return;
    }

    // Check if player is in leftmost lane (0) and swipes Left into a Left Diverging Side-Road!
    if (this.currentLane === 0) {
      const fork = this.environment.activeFork;
      if (fork && fork.direction === 'left') {
        const distToFork = this.playerZ - fork.zPos;
        if (distToFork >= -6 && distToFork <= 36) {
          this.currentLane = -1; // Enter Left Diverging Side-Road -> New Track!
          this.environment.commitToForkBranch();
          soundManager.playSlide();
          return;
        }
      }
      return;
    }

    if (this.currentLane > 0) {
      const targetLane = this.currentLane - 1;
      if (this.isLaneBlockedByTrain(targetLane)) {
        soundManager.playSlide();
        return; // Train wall blocks lane change!
      }
      this.currentLane = targetLane;
      soundManager.playSlide();
    }
  }

  public moveRight() {
    // Rotate 360° shop camera to the right (toward the shop and all around!) when stopped at the Roadside Shop!
    if (this.isAtRoadsideShop()) {
      this.rotateShopCameraByStep(0.45);
      return;
    }

    // If player is in right lane (2) approaching the Roadside Shop and swipes Right, stop in front of the shop!
    const distToShop = this.playerZ - this.environment.activeShopZ;
    if (this.currentLane === 2 && distToShop >= -8 && distToShop <= 26 && this.shopVisitPhase !== 'returning') {
      this.stopAtRoadsideShop();
      return;
    }

    // If on a diverging branch road, only allow lane switching once arriving on the new track
    if (this.currentLane === -1 || this.currentLane === 3) {
      const fork = this.environment.activeFork;
      if (fork && this.playerZ - fork.zPos < -18) {
        this.currentLane = 2; // Right lane of the NEW track
        soundManager.playSlide();
      }
      return;
    }

    // Check if player is in rightmost lane (2) and swipes Right into a Right Diverging Side-Road!
    if (this.currentLane === 2) {
      const fork = this.environment.activeFork;
      if (fork && fork.direction === 'right') {
        const distToFork = this.playerZ - fork.zPos;
        if (distToFork >= -6 && distToFork <= 36) {
          this.currentLane = 3; // Enter Right Diverging Side-Road -> New Track!
          this.environment.commitToForkBranch();
          soundManager.playSlide();
          return;
        }
      }
      return;
    }

    if (this.currentLane < 2) {
      const targetLane = this.currentLane + 1;
      if (this.isLaneBlockedByTrain(targetLane)) {
        soundManager.playSlide();
        return;
      }
      this.currentLane = targetLane;
      soundManager.playSlide();
    }
  }

  private isLaneBlockedByTrain(targetLane: number): boolean {
    if (this.playerY >= 3.0) return false; // Jumping high or on roof
    return this.environment.obstacles.some((o) => {
      if (!o.isTrain || o.laneIndex !== targetLane) return false;
      const frontZ = o.z + 8.0;
      const rearZ = o.z - 8.0;
      return this.playerZ < frontZ && this.playerZ > rearZ;
    });
  }

  public jump() {
    if (this.isAtRoadsideShop()) {
      this.triggerStationEmote('jump_cheer');
      return;
    }
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      this.princess.setSliding(false);
      this.princess.setJumping(true);

      const boost = this.activePowerups.sneakers > 0 ? 1.4 : 1.0;
      this.velocityY = this.config.gameplay.jumpVelocity * boost;
      soundManager.playJump();
    }
  }

  public slide() {
    if (this.isAtRoadsideShop()) {
      this.triggerStationEmote('dance');
      return;
    }
    if (!this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.8;
      this.princess.setSliding(true);
      if (this.isJumping) {
        this.velocityY = -22;
      }
      soundManager.playSlide();
    }
  }

  public activateHoverboard() {
    if (this.activePowerups.hoverboard) return;

    if (this.hoverboardsRemaining > 0) {
      this.hoverboardsRemaining--;
      this.activePowerups.hoverboard = true;

      // Cycle to the next unlocked skateboard each time the player activates a board!
      if (this.unlockedSkateboards.length > 0) {
        const nextBoard = this.unlockedSkateboards[this.skateboardCycleIndex];
        this.skateboardCycleIndex = (this.skateboardCycleIndex + 1) % this.unlockedSkateboards.length;
        this.princess.updateSkateboard(nextBoard);
      }

      this.princess.setHoverboard(true);
      soundManager.playHoverboard();
      this.callbacks.onHoverboardChange(this.hoverboardsRemaining, true);
      this.callbacks.onPowerupUpdate(this.activePowerups);
    }
  }

  private refreshUnlockedSkateboards() {
    try {
      const stats = loadPlayerStats();
      const unlockedSet = new Set(stats.unlockedItemIds || []);
      const boards: SkateboardConfig[] = [];

      (this.config.shopItems || []).forEach((item) => {
        if (item.category === 'skateboard' && (item.isDefaultUnlocked || unlockedSet.has(item.id))) {
          const baseBoard = item.skateboardData || {
            id: item.id,
            name: item.name,
            boardColor: item.previewColors?.[0] || '#ec4899',
            trimColor: item.previewColors?.[1] || '#38bdf8',
            thrusterColor: '#f59e0b',
            bonusBoards: 0,
          };
          boards.push({
            ...baseBoard,
            presetType: item.presetType || baseBoard.presetType,
            customModelUrl: item.customModelUrl || baseBoard.customModelUrl,
            customTextureUrl: item.customTextureUrl || baseBoard.customTextureUrl,
            modelScale: item.modelScale || baseBoard.modelScale,
            modelYOffset: item.modelYOffset || baseBoard.modelYOffset,
          });
        }
      });

      // If no shop skateboards were matched, ensure at least default board is available
      if (boards.length === 0) {
        boards.push({
          id: 'board_pink_classic',
          name: 'Pink Star Cruiser',
          boardColor: '#ec4899',
          trimColor: '#38bdf8',
          thrusterColor: '#f59e0b',
          bonusBoards: 0,
        });
      }

      this.unlockedSkateboards = boards;

      // Start the cycle on the currently equipped skateboard if present
      const equippedId = stats.equippedItems?.skateboard || this.config.princess.skateboard?.id;
      const foundIdx = boards.findIndex((b) => b.id === equippedId);
      this.skateboardCycleIndex = foundIdx >= 0 ? foundIdx : 0;
    } catch {
      this.unlockedSkateboards = [];
      this.skateboardCycleIndex = 0;
    }
  }

  public start() {
    this.stopIdleLoop();
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();

    // Trigger smooth sprint start transition from inside the station onto the tracks!
    this.isStartingRun = true;
    this.startRunProgress = 0;

    soundManager.startMusic();
    this.tick(this.lastTime);
  }

  public pause() {
    this.isPaused = true;
    soundManager.stopMusic();
  }

  public resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      soundManager.startMusic();
      this.tick(this.lastTime);
    }
  }

  /**
   * Restores the canonical Starting Station & Track Theme so that regardless of what theme
   * was played in the previous run, the platform and tracks behind it are 100% identical every single time!
   */
  private restoreStationCanonicalTheme() {
    const preset = THEME_PRESETS.neon_subway;
    const canonicalEnv: EnvironmentConfig = {
      ...this.config.environment,
      ...preset,
      theme: 'neon_subway',
      selectedScenerySet: 'set_neon_skyline',
    };
    this.targetThemeConfig = null;
    this.themeTransitionProgress = 1.0;

    this.environment.updateTheme(canonicalEnv, 1.0);
    this.scene.background = new THREE.Color(canonicalEnv.skyColor);
    if (this.scene.fog) {
      this.scene.fog.color = new THREE.Color(canonicalEnv.fogColor);
    }
    this.ambientLight.color = new THREE.Color(canonicalEnv.ambientLightColor);
    this.dirLight.color = new THREE.Color(canonicalEnv.directionalLightColor);
    if (this.hemiLight) {
      this.hemiLight.color.set(canonicalEnv.skyColor);
      this.hemiLight.groundColor.set(canonicalEnv.trackColor);
    }
    this.updateSkyDomeGradient(canonicalEnv.skyColor, canonicalEnv.fogColor);

    if (this.skyDomeMesh) {
      this.skyDomeMesh.position.set(0, -10, 0);
    }
    if (this.sunMesh) {
      this.sunMesh.position.set(24, 30, -75);
    }
    if (this.dirLight) {
      this.dirLight.position.set(6, 15, 10);
    }
  }

  /**
   * Triggers a 3D Emote on the Starting Platform when the player taps an emote button or character!
   */
  public triggerStationEmote(emoteType?: StationEmoteType): StationEmoteType {
    const allEmotes: StationEmoteType[] = ['wave', 'dance', 'spin', 'jump_cheer', 'royal_bow'];
    const chosen = emoteType || allEmotes[this.emoteCycleIndex % allEmotes.length];
    if (!emoteType) {
      this.emoteCycleIndex = (this.emoteCycleIndex + 1) % allEmotes.length;
    }

    const durations: Record<StationEmoteType, number> = {
      wave: 2.3,
      dance: 3.0,
      spin: 2.2,
      jump_cheer: 2.3,
      royal_bow: 2.5,
    };

    this.activeStationEmote = {
      type: chosen,
      timer: 0,
      duration: durations[chosen] || 2.4,
    };

    if (chosen === 'jump_cheer' || chosen === 'spin') {
      soundManager.playJump();
    } else if (chosen === 'dance') {
      soundManager.playPowerup();
    } else {
      soundManager.playGem();
    }

    return chosen;
  }

  public stop() {
    this.isRunning = false;
    this.isStartingRun = false;
    this.activeCompanion = null;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    soundManager.stopMusic();
    this.reset();
    this.startIdleLoop();
  }

  public startIdleLoop() {
    if (this.isRunning || this.idleFrameId !== null) return;
    this.restoreStationCanonicalTheme();
    this.environment.reset(0);
    this.stationFriendsGroup.visible = true;
    this.stationFriends.forEach((f) => {
      f.group.visible = true;
    });
    this.princess.group.visible = true;
    this.princess.setHoverboard(false);
    this.princess.setJumping(false);
    this.princess.setSliding(false);

    this.lastTime = performance.now();
    // Exact angle from Character (5.8, 4.0) straight to Camera (8.6, 7.6) so her face points 100% into the camera lens!
    const faceCamAngle = Math.atan2(8.6 - 5.8, 7.6 - 4.0);

    const render = (time: number) => {
      if (this.isRunning) {
        this.idleFrameId = null;
        return;
      }
      const delta = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      const idleTime = time * 0.001;
      const swingAngle = Math.sin(idleTime * 4.2) * 0.25;
      this.environment.updateStationSwing(swingAngle);

      // 1. Main Character: Standing centered on the starting platform (5.8, 0.65, 4.0), facing directly toward the camera!
      let charX = 5.8;
      let charY = 0.65;
      const charZ = 4.0;
      let rotY = faceCamAngle;

      if (this.activeStationEmote) {
        this.activeStationEmote.timer += delta;
        const prog = Math.min(1.0, this.activeStationEmote.timer / this.activeStationEmote.duration);
        const emType = this.activeStationEmote.type;

        if (emType === 'spin') {
          const spinPhase = Math.min(1.0, prog / 0.78);
          const easeSpin = 0.5 - 0.5 * Math.cos(spinPhase * Math.PI);
          rotY = faceCamAngle + easeSpin * Math.PI * 2;
        } else if (emType === 'dance') {
          charX = 5.8 + Math.sin(idleTime * 8.5) * 0.16;
        }

        this.princess.group.position.set(charX, charY, charZ);
        this.princess.group.rotation.set(0, rotY, 0);
        this.princess.animateStationEmote(delta, emType, prog, idleTime);

        if (this.activeStationEmote.timer >= this.activeStationEmote.duration) {
          this.activeStationEmote = null;
        }
      } else {
        this.princess.group.position.set(charX, charY, charZ);
        this.princess.group.rotation.set(0, faceCamAngle, 0);
        this.princess.animatePlatformStanding(delta, idleTime);
      }

      // 2. Friends chatting, dancing and waving across the open tracks on the OPPOSITE platform!
      const isFriendCheering = this.activeStationEmote !== null;
      if (this.stationFriends.length >= 3) {
        this.stationFriends[0].group.visible = true;
        this.stationFriends[0].group.position.set(-6.0, 0.65, -1.2);
        this.stationFriends[0].group.rotation.set(0, Math.atan2(8.6 - -6.0, 7.6 - -1.2), 0);
        this.stationFriends[0].animateStationChat(delta, isFriendCheering, 0);

        this.stationFriends[1].group.visible = true;
        this.stationFriends[1].group.position.set(-7.2, 0.65, -4.6);
        this.stationFriends[1].group.rotation.set(0, Math.atan2(8.6 - -7.2, 7.6 - -4.6), 0);
        this.stationFriends[1].animateStationChat(delta, isFriendCheering, 1.4);

        this.stationFriends[2].group.visible = true;
        this.stationFriends[2].group.position.set(-6.0, 0.65, -8.0);
        this.stationFriends[2].group.rotation.set(0, Math.atan2(8.6 - -6.0, 7.6 - -8.0), 0);
        this.stationFriends[2].animateStationChat(delta, isFriendCheering, 2.8);
      }

      // 3. Cute pet companion standing & bouncing beside the Princess on the starting platform, facing the camera!
      if (this.pet && this.config.pet.enabled) {
        this.pet.group.position.set(6.65, 0.65, 3.35);
        this.pet.group.rotation.set(0, faceCamAngle, 0);
        this.pet.animate(delta, isFriendCheering ? 6.0 : 1.0, true, 0.65);
      }

      // 4. Animate the distant Horizon Vista (Ferris wheel, floating hot air balloons, soaring birds) behind the station!
      this.environment.updateHorizonVista(delta, 0);

      // Menu Camera: Positioned backward at (8.6, 2.15, 7.6) looking along the collinear ray through (5.8, 1.85, 4.0) to (-1.2, 1.15, -5.0).
      // Centers the Main Character on the starting platform facing directly toward the camera, with open tracks & opposite platform behind!
      this.camera.position.set(8.6, 2.15, 7.6);
      this.camera.lookAt(-1.2, 1.15, -5.0);
      this.camera.rotation.z = 0;
      this.renderer.render(this.scene, this.camera);

      this.idleFrameId = requestAnimationFrame(render);
    };
    this.idleFrameId = requestAnimationFrame(render);
  }

  public stopIdleLoop() {
    if (this.idleFrameId !== null) {
      cancelAnimationFrame(this.idleFrameId);
      this.idleFrameId = null;
    }
  }

  public reset() {
    const faceCamAngle = Math.atan2(8.6 - 5.8, 7.6 - 4.0);
    this.playerX = 5.8;
    this.playerY = 0.65;
    this.playerZ = 4.0;
    this.currentLane = 1;
    this.velocityY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.invulnerableTimer = 0;

    this.score = 0;
    this.coins = 0;
    this.gems = 0;
    this.distance = 0;
    this.currentSpeed = this.config.gameplay.baseSpeed;
    this.refreshUnlockedSkateboards();
    const bonusBoards = this.config.princess.skateboard?.bonusBoards || 0;
    this.hoverboardsRemaining = this.config.gameplay.startingHoverboards + bonusBoards;

    this.activePowerups = {
      magnet: 0,
      multiplier: 0,
      sneakers: 0,
      jetpack: 0,
      hoverboard: false,
    };

    this.activeCompanion = null;
    this.activeStationEmote = null;
    this.nextCompanionDist = 65;
    this.companionThemeIndex = 0;
    this.shopVisitPhase = 'none';
    this.lastPassedShopZ = 9999;

    this.companionRunners.forEach((r) => {
      r.group.visible = false;
    });

    this.collectedInventory = {
      gem: 1,
      hoverboard: this.hoverboardsRemaining,
      magnet: 1,
      multiplier: 1,
      sneakers: 1,
      jetpack: 1,
    };
    this.emitRoadsideShopState();

    // Always restore canonical station & track theme so the platform and tracks behind it are identical every time!
    this.restoreStationCanonicalTheme();

    this.princess.group.visible = true;
    this.princess.setHoverboard(false);
    this.princess.setJumping(false);
    this.princess.setSliding(false);
    this.princess.group.position.set(5.8, 0.65, 4.0);
    this.princess.group.rotation.set(0, faceCamAngle, 0);

    if (this.pet && this.config.pet.enabled) {
      this.pet.group.position.set(6.65, 0.65, 3.35);
      this.pet.group.rotation.set(0, faceCamAngle, 0);
    }

    if (this.stationFriends.length >= 3) {
      this.stationFriends[0].group.visible = true;
      this.stationFriends[0].group.position.set(-6.0, 0.65, -1.2);
      this.stationFriends[0].group.rotation.set(0, Math.atan2(8.6 - -6.0, 7.6 - -1.2), 0);

      this.stationFriends[1].group.visible = true;
      this.stationFriends[1].group.position.set(-7.2, 0.65, -4.6);
      this.stationFriends[1].group.rotation.set(0, Math.atan2(8.6 - -7.2, 7.6 - -4.6), 0);

      this.stationFriends[2].group.visible = true;
      this.stationFriends[2].group.position.set(-6.0, 0.65, -8.0);
      this.stationFriends[2].group.rotation.set(0, Math.atan2(8.6 - -6.0, 7.6 - -8.0), 0);
    }

    this.stationFriendsGroup.visible = true;
    this.environment.reset(0);
    this.currentLookAt.set(-1.2, 1.15, -5.0);
    this.currentCamRoll = 0;
    this.camera.position.set(8.6, 2.15, 7.6);
    this.camera.lookAt(this.currentLookAt);
    this.camera.rotation.z = 0;

    this.callbacks.onHoverboardChange(this.hoverboardsRemaining, false);
    this.callbacks.onPowerupUpdate(this.activePowerups);
    this.callbacks.onScoreUpdate(0, 0, 0, 0);
  }

  public updateConfig(newConfig: GameCustomConfig) {
    this.config = newConfig;
    this.refreshUnlockedSkateboards();
    this.princess.updateConfig(newConfig.princess);
    this.pet.updateConfig(newConfig.pet);
    this.environment.updateRoadsideShopCharacters(newConfig.roadsideShopCharacters);

    const isSmooth = newConfig.gameplay.graphicsQuality === 'smooth';
    this.renderer.setPixelRatio(isSmooth ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !isSmooth;

    if (!this.isRunning) {
      // While on the platform, keep the canonical station & track theme identical every time!
      this.restoreStationCanonicalTheme();
    } else {
      this.environment.updateTheme(newConfig.environment);
      this.scene.background = new THREE.Color(newConfig.environment.skyColor);
      if (this.scene.fog) {
        this.scene.fog.color = new THREE.Color(newConfig.environment.fogColor);
      }
      this.ambientLight.color = new THREE.Color(newConfig.environment.ambientLightColor);
      this.dirLight.color = new THREE.Color(newConfig.environment.directionalLightColor);
      if (this.hemiLight) {
        this.hemiLight.color.set(newConfig.environment.skyColor);
        this.hemiLight.groundColor.set(newConfig.environment.trackColor);
      }
      this.updateSkyDomeGradient(newConfig.environment.skyColor, newConfig.environment.fogColor);
    }

    soundManager.setVolumes(newConfig.gameplay.soundVolume, newConfig.gameplay.musicVolume);
  }

  private updateSkyDomeGradient(skyHex: string, fogHex: string) {
    if (!this.skyDomeMat) return;
    try {
      if (!this.skyDomeCanvas) {
        this.skyDomeCanvas = document.createElement('canvas');
        this.skyDomeCanvas.width = 4;
        this.skyDomeCanvas.height = 512;
      }
      const ctx = this.skyDomeCanvas.getContext('2d')!;
      const zenithCol = new THREE.Color(skyHex).lerp(new THREE.Color('#1e3a8a'), 0.28);
      const upperCol = new THREE.Color(skyHex);
      const midCol = new THREE.Color(skyHex).lerp(new THREE.Color('#ffffff'), 0.14);
      const warmBandCol = new THREE.Color(skyHex).lerp(new THREE.Color('#fde68a'), 0.35);
      const horizonGlowCol = new THREE.Color(fogHex).lerp(new THREE.Color('#fef08a'), 0.18);
      const horizonCol = new THREE.Color(fogHex);

      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0.0, `#${zenithCol.getHexString()}`);
      gradient.addColorStop(0.28, `#${upperCol.getHexString()}`);
      gradient.addColorStop(0.52, `#${midCol.getHexString()}`);
      gradient.addColorStop(0.74, `#${warmBandCol.getHexString()}`);
      gradient.addColorStop(0.88, `#${horizonGlowCol.getHexString()}`);
      gradient.addColorStop(1.0, `#${horizonCol.getHexString()}`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 4, 512);

      if (!this.skyDomeTex) {
        this.skyDomeTex = new THREE.CanvasTexture(this.skyDomeCanvas);
        this.skyDomeMat.map = this.skyDomeTex;
      } else {
        this.skyDomeTex.needsUpdate = true;
      }
      this.skyDomeMat.needsUpdate = true;
    } catch {}
  }

  /**
   * In-Game Companion Sprint Encounter (দৌড়ানোর সময় আগে এগিয়ে থাকা ক্যারেক্টারের সঙ্গ নেওয়া ও একসাথে দৌড়ানো)
   * 1. Catch-Up Phase: Companion was running ahead (not always visible); becomes visible 26m ahead as our Princess catches up!
   * 2. Side-by-Side Phase: Runs right alongside our Princess in an adjacent lane for ~5.8s, cheering & chatting!
   * 3. Pull-Ahead Phase: Our Princess accelerates ahead while the companion falls behind and vanishes!
   */
  public triggerCompanionSprint(profileIndex: number) {
    if (this.activeCompanion || this.companionRunners.length < 3 || !this.isRunning || this.isStartingRun) return;
    if (
      this.shopVisitPhase === 'standing_in_front' ||
      this.shopVisitPhase === 'facing_shop' ||
      this.shopVisitPhase === 'at_counter'
    ) {
      return;
    }

    const companionProfiles = [
      {
        index: 0,
        name: 'Sakura Princess',
        nameBn: 'সাকুরা প্রিন্সেস',
        cheer: '🌸 Sakura Princess: "You caught up! Let\'s run together!"',
        cheerBn: '🌸 সাকুরা প্রিন্সেস: "তুমি সঙ্গ নিয়েছো! চলো একসাথে দৌড়াই!"',
        color: '#f472b6',
        avatar: '🌸',
      },
      {
        index: 1,
        name: 'Royal Queen',
        nameBn: 'রয়্যাল কুইন',
        cheer: '👑 Royal Queen: "Side by side! Splendid royal stride!"',
        cheerBn: '👑 রয়্যাল কুইন: "পাশাপাশি রাজকীয় স্প্রিন্ট! চালিয়ে যাও!"',
        color: '#8b5cf6',
        avatar: '👑',
      },
      {
        index: 2,
        name: 'Cyber Star',
        nameBn: 'সাইবার স্টার',
        cheer: '⚡ Cyber Star: "Running together at turbo speed!"',
        cheerBn: '⚡ সাইবার স্টার: "একসাথে টার্বো স্পিডে এগিয়ে চলো!"',
        color: '#06b6d4',
        avatar: '⚡',
      },
    ];

    const profile = companionProfiles[profileIndex % companionProfiles.length];
    const runner = this.companionRunners[profile.index];
    if (!runner) return;

    // Pick a clear adjacent lane relative to player:
    let chosenLane = 1;
    if (this.currentLane === 0) chosenLane = 1;
    else if (this.currentLane === 2) chosenLane = 1;
    else {
      const leftBlocked = this.isLaneBlockedByTrain(0);
      const rightBlocked = this.isLaneBlockedByTrain(2);
      if (leftBlocked && !rightBlocked) chosenLane = 2;
      else if (rightBlocked && !leftBlocked) chosenLane = 0;
      else chosenLane = Math.random() > 0.5 ? 0 : 2;
    }

    const startX = this.environment.getLaneWorldX(chosenLane);
    // Start 26m AHEAD of the player so the player sees her ahead and catches up to her!
    runner.group.position.set(startX, 0, this.playerZ - 26);
    runner.group.rotation.set(0, Math.PI, 0);
    this.companionRunnersGroup.visible = true;
    runner.group.visible = true;

    this.companionRunners.forEach((r, idx) => {
      if (idx !== profile.index) r.group.visible = false;
    });

    this.activeCompanion = {
      friendIndex: profile.index,
      lane: chosenLane,
      timer: 0,
      duration: 10.4,
      sideBySideTriggered: false,
      pullAheadTriggered: false,
      name: profile.name,
      nameBn: profile.nameBn,
      cheer: profile.cheer,
      cheerBn: profile.cheerBn,
      color: profile.color,
      avatar: profile.avatar,
    };

    soundManager.playPowerup();
    this.callbacks.onCompanionEncounter?.({
      name: profile.name,
      nameBn: profile.nameBn,
      cheer: `${profile.avatar} ${profile.name} spotted running ahead! Catching up...`,
      cheerBn: `${profile.avatar} ${profile.nameBn} সামনে দৌড়াচ্ছে! আমাদের ক্যারেক্টার সঙ্গ নিচ্ছে...`,
      color: profile.color,
      avatar: profile.avatar,
      active: true,
      isPullingAhead: false,
    });
  }

  /**
   * Computes ground/roof/vault height for the companion runner so she smoothly climbs trains and jumps barriers!
   */
  private getCompanionGroundY(laneIdx: number, zPos: number): number {
    let groundY = 0;
    for (let i = 0; i < this.environment.obstacles.length; i++) {
      const obs = this.environment.obstacles[i];
      if (obs.laneIndex !== laneIdx) continue;
      if (obs.isTrain) {
        const frontZ = obs.z + 8.5;
        const rearZ = obs.z - 8.5;
        if (obs.hasRamp && obs.rampStartPosZ && obs.rampEndPosZ && zPos <= obs.rampStartPosZ && zPos >= obs.rampEndPosZ) {
          const t = (obs.rampStartPosZ - zPos) / (obs.rampStartPosZ - obs.rampEndPosZ);
          groundY = Math.max(groundY, Math.min(obs.roofY || 3.3, t * (obs.roofY || 3.3)));
        } else if (zPos <= frontZ && zPos >= rearZ) {
          groundY = Math.max(groundY, obs.roofY || 3.3);
        }
      } else if (Math.abs(obs.z - zPos) < 2.2) {
        const jumpArc = Math.cos(((obs.z - zPos) / 2.2) * (Math.PI / 2));
        groundY = Math.max(groundY, jumpArc * 1.35);
      }
    }
    return groundY;
  }

  /**
   * Roadside Item Shop Controls (রাস্তার পাশে দোকানের সামনে দাঁড়ানো -> ৩৬০° ক্যামেরা ঘোরানো বা ট্যাপ করে মুখ ঘোরানো -> ইমোট -> কেনাকাটা)
   */
  public isAtRoadsideShop(): boolean {
    return (
      this.shopVisitPhase === 'standing_in_front' ||
      this.shopVisitPhase === 'facing_shop' ||
      this.shopVisitPhase === 'at_counter'
    );
  }

  private normalizeAngle(angle: number): number {
    let a = (angle + Math.PI) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a - Math.PI;
  }

  private lerpAngle(current: number, target: number, t: number): number {
    const diff = this.normalizeAngle(target - current);
    return current + diff * Math.min(1, t);
  }

  /**
   * Rotates the 360° camera horizontally to ANY side while stopped at the Roadside Shop,
   * while keeping vertical (up/down) tilt strictly limited to a very slight, natural range!
   */
  public rotateShopCamera(deltaX: number, deltaY: number) {
    if (!this.isAtRoadsideShop()) return;
    // Full 360° horizontal rotation to any side
    this.shopCamTargetYaw -= deltaX * 0.0095;

    // Very slight vertical tilt only when dragging vertically (slightly up to +0.18, barely down to -0.04)
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.45) {
      this.shopCamTargetPitch = THREE.MathUtils.clamp(
        this.shopCamTargetPitch - deltaY * 0.0018,
        -0.04,
        0.18
      );
    }

    const angleToShop = Math.abs(this.normalizeAngle(this.shopCamTargetYaw - Math.PI / 2));
    if (this.shopVisitPhase === 'standing_in_front' && angleToShop < 0.72) {
      this.shopVisitPhase = 'facing_shop';
      soundManager.playGem();
      this.emitRoadsideShopState();
    }
  }

  public rotateShopCameraByStep(yawStep: number, pitchStep: number = 0) {
    if (!this.isAtRoadsideShop()) return;
    this.shopCamTargetYaw -= yawStep;
    this.shopCamTargetPitch = THREE.MathUtils.clamp(
      this.shopCamTargetPitch + pitchStep,
      -0.04,
      0.18
    );

    const angleToShop = Math.abs(this.normalizeAngle(this.shopCamTargetYaw - Math.PI / 2));
    if (this.shopVisitPhase === 'standing_in_front' && angleToShop < 0.72) {
      this.shopVisitPhase = 'facing_shop';
      soundManager.playGem();
      this.emitRoadsideShopState();
    }
  }

  private emitRoadsideShopState() {
    const distToShop = this.environment ? this.playerZ - this.environment.activeShopZ : 999;
    this.callbacks.onRoadsideShopUpdate?.({
      phase: this.shopVisitPhase,
      distanceToShop: Math.max(0, Math.round(distToShop)),
      shopZ: this.environment ? this.environment.activeShopZ : -225,
      inventory: {
        ...this.collectedInventory,
        gem: Math.max(this.collectedInventory.gem, this.gems),
        hoverboard: this.hoverboardsRemaining,
      },
    });
  }

  public advanceRoadsideShopStep() {
    if (!this.isRunning || this.isStartingRun) return;
    if (this.shopVisitPhase === 'approaching' || this.shopVisitPhase === 'none') {
      const dist = this.playerZ - this.environment.activeShopZ;
      if (dist >= -10 && dist <= 42) {
        this.stopAtRoadsideShop();
      }
    } else if (this.shopVisitPhase === 'standing_in_front') {
      this.turnTowardRoadsideShop();
    } else if (this.shopVisitPhase === 'facing_shop') {
      this.walkToRoadsideShop();
    }
  }

  public stopAtRoadsideShop() {
    if (!this.isRunning || this.isStartingRun) return;
    // If player clicked the top-bar shop button while the next scheduled shop is still far ahead,
    // summon the shop right beside them so they don't warp across the track!
    if (Math.abs(this.playerZ - this.environment.activeShopZ) > 52) {
      this.environment.summonRoadsideShopAt(this.playerZ - 4);
    } else {
      this.environment.clearObstaclesNearShop(this.environment.activeShopZ);
      this.environment.updateShopClearance();
    }
    this.shopVisitPhase = 'standing_in_front';
    this.shopCamYaw = Math.PI;
    this.shopCamTargetYaw = Math.PI;
    this.shopCamPitch = 0.0;
    this.shopCamTargetPitch = 0.0;
    this.shopOrbitRadius = 4.5;
    this.activeStationEmote = null;
    this.currentLane = 2;
    this.isJumping = false;
    this.isSliding = false;
    this.velocityY = 0;
    this.princess.setJumping(false);
    this.princess.setSliding(false);
    soundManager.playSlide();
    this.emitRoadsideShopState();
  }

  public turnTowardRoadsideShop() {
    if (!this.isRunning) return;
    this.shopVisitPhase = 'facing_shop';
    // Turn camera & character smoothly 90° right (+Math.PI / 2) to face the Roadside Shop (+X)!
    const diff = this.normalizeAngle(Math.PI / 2 - this.shopCamYaw);
    this.shopCamTargetYaw = this.shopCamYaw + diff;
    this.shopCamTargetPitch = 0.03;
    soundManager.playGem();
    this.emitRoadsideShopState();
  }

  public walkToRoadsideShop() {
    if (!this.isRunning) return;
    this.shopVisitPhase = 'at_counter';
    const diff = this.normalizeAngle(Math.PI / 2 - this.shopCamYaw);
    this.shopCamTargetYaw = this.shopCamYaw + diff;
    this.shopCamTargetPitch = 0.03;
    soundManager.playPowerup();
    this.emitRoadsideShopState();
  }

  public leaveRoadsideShop() {
    if (!this.isRunning) return;
    this.shopVisitPhase = 'none';
    this.activeStationEmote = null;
    this.currentLane = 2;
    this.playerX = this.environment.getLaneWorldX(2);
    this.playerY = 0;
    this.princess.group.rotation.set(0, Math.PI, 0);
    this.invulnerableTimer = 2.0;
    this.lastPassedShopZ = this.environment.activeShopZ;
    soundManager.playJump();
    this.emitRoadsideShopState();
  }

  public buyRoadsideItem(itemType: InGameTradeItemType, costCoins: number): { success: boolean; messageBn: string; messageEn: string } {
    const stats = loadPlayerStats();
    const totalAvailableCoins = stats.totalCoins + this.coins;
    if (totalAvailableCoins < costCoins) {
      return {
        success: false,
        messageBn: `পর্যাপ্ত কয়েন নেই! আরও ${costCoins - totalAvailableCoins} 🪙 প্রয়োজন।`,
        messageEn: `Not enough coins! Need ${costCoins - totalAvailableCoins} more 🪙.`,
      };
    }

    // Deduct from current run coins first, then wallet coins if needed
    if (this.coins >= costCoins) {
      this.coins -= costCoins;
    } else {
      const remainder = costCoins - this.coins;
      this.coins = 0;
      stats.totalCoins = Math.max(0, stats.totalCoins - remainder);
      savePlayerStats(stats);
    }

    this.collectedInventory[itemType] = (this.collectedInventory[itemType] || 0) + 1;

    if (itemType === 'gem') {
      this.gems += 1;
      this.score += 500;
    } else if (itemType === 'hoverboard') {
      this.hoverboardsRemaining += 1;
      this.activePowerups.hoverboard = true;
      this.princess.setHoverboard(true);
      this.callbacks.onHoverboardChange(this.hoverboardsRemaining, true);
    } else if (itemType === 'magnet') {
      this.activePowerups.magnet = Math.max(this.activePowerups.magnet, this.config.gameplay.magnetDuration);
    } else if (itemType === 'multiplier') {
      this.activePowerups.multiplier = Math.max(this.activePowerups.multiplier, this.config.gameplay.multiplierDuration);
    } else if (itemType === 'sneakers') {
      this.activePowerups.sneakers = Math.max(this.activePowerups.sneakers, this.config.gameplay.sneakersDuration);
    } else if (itemType === 'jetpack') {
      this.activePowerups.jetpack = Math.max(this.activePowerups.jetpack, this.config.gameplay.jetpackDuration);
    }

    soundManager.playPowerup();
    this.callbacks.onPowerupUpdate(this.activePowerups);
    this.callbacks.onScoreUpdate(this.score, this.coins, this.gems, Math.floor(this.distance));
    this.emitRoadsideShopState();

    return {
      success: true,
      messageBn: `🎉 সফলভাবে কেনা হয়েছে! (-${costCoins} 🪙)`,
      messageEn: `🎉 Purchased successfully! (-${costCoins} 🪙)`,
    };
  }

  public sellRoadsideItem(itemType: InGameTradeItemType, rewardCoins: number): { success: boolean; messageBn: string; messageEn: string } {
    const currentCount =
      itemType === 'hoverboard'
        ? this.hoverboardsRemaining
        : itemType === 'gem'
        ? Math.max(this.collectedInventory.gem, this.gems)
        : this.collectedInventory[itemType] || 0;

    if (currentCount <= 0) {
      return {
        success: false,
        messageBn: 'বিক্রি করার মতো এই আইটেমটি আপনার কাছে নেই!',
        messageEn: 'You do not have any of this item to sell!',
      };
    }

    if (itemType === 'hoverboard') {
      this.hoverboardsRemaining = Math.max(0, this.hoverboardsRemaining - 1);
      this.collectedInventory.hoverboard = this.hoverboardsRemaining;
      this.callbacks.onHoverboardChange(this.hoverboardsRemaining, this.activePowerups.hoverboard);
    } else if (itemType === 'gem') {
      this.gems = Math.max(0, this.gems - 1);
      this.collectedInventory.gem = Math.max(0, currentCount - 1);
    } else {
      this.collectedInventory[itemType] = Math.max(0, currentCount - 1);
      if (this.collectedInventory[itemType] === 0 && this.activePowerups[itemType] > 0) {
        this.activePowerups[itemType] = 0;
        this.callbacks.onPowerupUpdate(this.activePowerups);
      }
    }

    this.coins += rewardCoins;
    this.score += rewardCoins * 5;
    soundManager.playCoin();
    this.callbacks.onScoreUpdate(this.score, this.coins, this.gems, Math.floor(this.distance));
    this.emitRoadsideShopState();

    return {
      success: true,
      messageBn: `🪙 আইটেম বিক্রি করে +${rewardCoins} কয়েন পেয়েছেন!`,
      messageEn: `🪙 Sold item for +${rewardCoins} Coins!`,
    };
  }

  private triggerSmoothThemeTransition(targetTheme: EnvironmentTheme) {
    const preset = THEME_PRESETS[targetTheme];
    if (!preset) return;

    const themeToSceneryMap: Record<EnvironmentTheme, string> = {
      neon_subway: 'set_neon_skyline',
      royal_kingdom: 'set_royal_palace',
      tokyo_sakura: 'set_tokyo_cherry',
      desert_express: 'set_sahara_dunes',
    };

    this.targetThemeConfig = {
      ...this.config.environment,
      ...preset,
      theme: targetTheme,
      selectedScenerySet: themeToSceneryMap[targetTheme] || this.config.environment.selectedScenerySet,
    };
    this.config.environment = this.targetThemeConfig;
    this.themeTransitionProgress = 0;

    // Each new theme brings a heartwarming companion encounter with one of her friends!
    const themeToIndex: Record<EnvironmentTheme, number> = {
      tokyo_sakura: 0,
      royal_kingdom: 1,
      neon_subway: 2,
      desert_express: 0,
    };
    const desiredIndex = themeToIndex[targetTheme] ?? 0;
    setTimeout(() => {
      if (this.isRunning && !this.activeCompanion) {
        this.triggerCompanionSprint(desiredIndex);
      }
    }, 1600);
  }

  private tick = (currentTime: number) => {
    if (!this.isRunning || this.isPaused) return;

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.updateGame(delta);
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private updateGame(delta: number) {
    // 0. Smooth Start Sequence: Princess turns from facing camera towards track, hops down off platform onto center track & sprints!
    if (this.isStartingRun) {
      this.startRunProgress += delta / 1.1;
      const t = Math.min(1.0, this.startRunProgress);
      const faceCamAngle = Math.atan2(8.6 - 5.8, 7.6 - 4.0);

      // Phase A: Turn smoothly from facing camera (+0.66 rad) towards the tracks (-Math.PI / 2) and down the track (-Math.PI)
      const turnT = Math.min(1.0, t / 0.42);
      const curAngle = THREE.MathUtils.lerp(faceCamAngle, -Math.PI, turnT);
      this.princess.group.rotation.set(0, curAngle, 0);

      // Phase B: Hop down off starting platform (x = 5.8, y = 0.65, z = 4.0) onto center track (x = 0, y = 0, z = 0)
      const stepT = THREE.MathUtils.clamp((t - 0.15) / 0.8, 0, 1);
      const easeHop = 0.5 - 0.5 * Math.cos(stepT * Math.PI);
      const curX = THREE.MathUtils.lerp(5.8, 0.0, easeHop);
      const jumpArc = Math.sin(stepT * Math.PI) * 0.45;
      const curY = THREE.MathUtils.lerp(0.65, 0.0, easeHop) + jumpArc;
      const curZ = THREE.MathUtils.lerp(4.0, 0.0, stepT);

      this.playerX = curX;
      this.playerY = curY;
      this.playerZ = curZ;
      this.princess.group.position.set(curX, curY, curZ);

      if (stepT < 0.85 && jumpArc > 0.08) {
        this.princess.setJumping(true);
      } else {
        this.princess.setJumping(false);
        this.princess.animate(delta, 14, curY);
      }

      if (this.config.pet.enabled) {
        const petX = THREE.MathUtils.lerp(6.65, -1.3, easeHop);
        const petY = THREE.MathUtils.lerp(0.65, 0.0, easeHop) + jumpArc * 0.8;
        this.pet.group.position.set(petX, petY, curZ + 1.1);
        this.pet.group.rotation.set(0, curAngle, 0);
        this.pet.animate(delta, 14, false, petY);
      }

      // Background friends across on the opposite platform cheer and wave excitedly!
      if (this.stationFriends.length >= 3) {
        this.stationFriends[0].animateStationChat(delta, true, 0);
        this.stationFriends[1].animateStationChat(delta, true, 1.0);
        this.stationFriends[2].animateStationChat(delta, true, 2.0);
      }

      // Camera smoothly sweeps from platform menu angle into behind-the-runner chase view!
      const startCam = new THREE.Vector3(8.6, 2.15, 7.6);
      const startLook = new THREE.Vector3(-1.2, 1.15, -5.0);
      const runCam = new THREE.Vector3(0, 4.2, curZ + 6.8);
      const runLook = new THREE.Vector3(0, 1.8, curZ - 12);

      const camT = THREE.MathUtils.smoothstep(t, 0, 1);
      this.camera.position.lerpVectors(startCam, runCam, camT);
      this.currentLookAt.lerpVectors(startLook, runLook, camT);
      this.camera.lookAt(this.currentLookAt);
      this.camera.rotation.z = 0;

      if (this.startRunProgress >= 1.0) {
        this.isStartingRun = false;
        this.playerZ = 0;
        this.playerX = 0;
        this.playerY = 0;
        this.currentLane = 1;
        this.princess.setJumping(false);
        this.princess.group.rotation.set(0, Math.PI, 0);
        this.princess.group.position.set(0, 0, 0);
        this.stationFriendsGroup.visible = false;
      }
      return;
    }

    // 0B. Roadside Item Shop Interactive Visit Sequence (দোকানের সামনে দাঁড়ানো -> ৩৬০° ক্যামেরা ঘোরানো বা ট্যাপ করে মুখ ঘোরানো -> ইমোট -> কেনাকাটা)
    if (
      this.shopVisitPhase === 'standing_in_front' ||
      this.shopVisitPhase === 'facing_shop' ||
      this.shopVisitPhase === 'at_counter'
    ) {
      const shopZ = this.environment.activeShopZ;
      const trackX = this.environment.trackCenterX;
      const rightLaneX = this.environment.getLaneWorldX(2);
      const idleSec = performance.now() * 0.001;

      this.playerZ = THREE.MathUtils.lerp(this.playerZ, shopZ, delta * 12);
      const targetY = this.shopVisitPhase === 'at_counter' ? 0.1 : 0;
      this.playerY = THREE.MathUtils.lerp(this.playerY, targetY, delta * 14);

      const targetPlayerX = this.shopVisitPhase === 'at_counter' ? trackX + 4.35 : rightLaneX;
      const distToTargetX = Math.abs(targetPlayerX - this.playerX);
      this.playerX = THREE.MathUtils.lerp(this.playerX, targetPlayerX, delta * 8);

      // Smoothly interpolate 360° Free Orbit Camera Yaw & Pitch
      this.shopCamYaw = this.lerpAngle(this.shopCamYaw, this.shopCamTargetYaw, delta * 12);
      this.shopCamPitch = THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(this.shopCamPitch, this.shopCamTargetPitch, delta * 12),
        -0.04,
        0.18
      );

      // If the user rotated the camera toward the Roadside Shop (+Math.PI / 2), automatically unlock 'facing_shop'!
      const angleToShop = Math.abs(this.normalizeAngle(this.shopCamYaw - Math.PI / 2));
      if (this.shopVisitPhase === 'standing_in_front' && angleToShop < 0.68) {
        this.shopVisitPhase = 'facing_shop';
        soundManager.playGem();
        this.emitRoadsideShopState();
      }

      // 360° Horizontal Spherical Orbit Camera around the Princess with YXZ Euler order (100% immune to upside-down flips!)
      const lookDirX = Math.sin(this.shopCamYaw);
      const lookDirZ = Math.cos(this.shopCamYaw);

      const baseRadius = this.shopVisitPhase === 'at_counter' ? 3.8 : 4.5;
      const dynamicRadius = baseRadius - Math.max(0, -lookDirX) * 1.35;
      this.shopOrbitRadius = THREE.MathUtils.lerp(
        this.shopOrbitRadius,
        dynamicRadius,
        Math.min(1, delta * 12)
      );

      const camX = this.playerX - lookDirX * this.shopOrbitRadius;
      const camY = this.playerY + 2.05 - this.shopCamPitch * 0.22;
      const camZ = this.playerZ - lookDirZ * this.shopOrbitRadius;

      const lookAheadDist = 2.8;
      const lookX = this.playerX + lookDirX * lookAheadDist;
      const lookY = this.playerY + 1.48 + this.shopCamPitch * 1.85;
      const lookZ = this.playerZ + lookDirZ * lookAheadDist;

      this.camera.position.set(camX, camY, camZ);
      this.currentLookAt.set(lookX, lookY, lookZ);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(
        -0.105 + this.shopCamPitch,
        this.normalizeAngle(this.shopCamYaw - Math.PI),
        0
      );

      // Angle from Princess directly toward the Camera lens (so emotes face the viewer!)
      const faceCamAngle = Math.atan2(
        this.camera.position.x - this.playerX,
        this.camera.position.z - this.playerZ
      );

      if (this.activeStationEmote) {
        this.activeStationEmote.timer += delta;
        const prog = Math.min(1.0, this.activeStationEmote.timer / this.activeStationEmote.duration);
        const emType = this.activeStationEmote.type;

        let emoteX = this.playerX;
        let emoteRotY = this.lerpAngle(this.princess.group.rotation.y, faceCamAngle, delta * 14);

        if (emType === 'spin') {
          const spinPhase = Math.min(1.0, prog / 0.78);
          const easeSpin = 0.5 - 0.5 * Math.cos(spinPhase * Math.PI);
          emoteRotY = faceCamAngle + easeSpin * Math.PI * 2;
        } else if (emType === 'dance') {
          emoteX = this.playerX + Math.sin(idleSec * 8.5) * 0.14;
        }

        this.princess.group.position.set(emoteX, this.playerY, this.playerZ);
        this.princess.group.rotation.set(0, emoteRotY, 0);
        this.princess.animateStationEmote(delta, emType, prog, idleSec);

        if (this.activeStationEmote.timer >= this.activeStationEmote.duration) {
          this.activeStationEmote = null;
        }
      } else {
        // Turn character smoothly in the direction the camera is looking (faces +X shop at Math.PI / 2!)
        this.princess.group.position.set(this.playerX, this.playerY, this.playerZ);
        this.princess.group.rotation.y = this.lerpAngle(
          this.princess.group.rotation.y,
          this.shopCamYaw,
          delta * 12
        );
        this.princess.group.rotation.z = 0;

        if (distToTargetX > 0.12) {
          this.princess.animate(delta, 9, this.playerY);
        } else {
          this.princess.animatePlatformStanding(delta, idleSec);
        }
      }

      if (this.config.pet.enabled) {
        const isCheering = this.activeStationEmote !== null;
        this.pet.group.position.set(this.playerX - 0.85, this.playerY, this.playerZ + 0.9);
        this.pet.group.rotation.y = isCheering ? faceCamAngle : this.princess.group.rotation.y;
        this.pet.animate(delta, isCheering ? 6.0 : 2.0, isCheering, this.playerY);
      }

      // Keep SkyDome & Sun aligned while stopped at the shop so 360° camera rotation shows a seamless sky!
      if (this.skyDomeMesh) {
        this.skyDomeMesh.position.x = this.playerX;
        this.skyDomeMesh.position.z = this.playerZ;
      }

      this.environment.update(delta, this.playerZ);
      return;
    }

    // 1. Advance Speed and Distance
    if (this.currentSpeed < this.config.gameplay.maxSpeed) {
      this.currentSpeed += delta * (this.config.gameplay.acceleration * 0.1);
    }

    const moveZ = this.currentSpeed * delta;
    this.playerZ -= moveZ;
    this.distance += moveZ;

    let multiplier = this.activePowerups.multiplier > 0 ? 2 : 1;
    if (this.config.pet.enabled && this.config.pet.perk === 'score_boost') {
      multiplier *= 1.2;
    }
    this.score += Math.floor(moveZ * 1.5 * multiplier);

    // Check Roadside Shop proximity to show "Stand in Front of Shop" prompt when approaching!
    const distToShop = this.playerZ - this.environment.activeShopZ;
    if (
      distToShop <= 42 &&
      distToShop >= -8 &&
      this.lastPassedShopZ !== this.environment.activeShopZ
    ) {
      if (this.shopVisitPhase !== 'approaching') {
        this.shopVisitPhase = 'approaching';
      }
      this.emitRoadsideShopState();
    } else if (this.shopVisitPhase === 'approaching') {
      this.shopVisitPhase = 'none';
      this.emitRoadsideShopState();
    }

    // In-Game Companion Sprint Encounter Check (দৌড়ানোর সময় বন্ধুদের সাথে দেখা ও একসাথে দৌড়ানো)
    if (this.distance >= this.nextCompanionDist && !this.activeCompanion && !this.isStartingRun) {
      this.triggerCompanionSprint(this.companionThemeIndex);
      this.companionThemeIndex = (this.companionThemeIndex + 1) % 3;
      this.nextCompanionDist = this.distance + 185 + Math.random() * 45;
    }

    // Update active companion sprint (3-Phase Choreography: Catch Up From Behind -> Run Side-by-Side -> Pull Ahead & Vanish!)
    if (this.activeCompanion) {
      const comp = this.activeCompanion;
      const runner = this.companionRunners[comp.friendIndex];
      comp.timer += delta;

      // Ensure companion stays in an adjacent lane beside our character
      if (comp.lane === this.currentLane) {
        comp.lane = this.currentLane === 1 ? (comp.lane === 0 ? 2 : 0) : 1;
      }
      const targetCompX = this.environment.getLaneWorldX(comp.lane);
      runner.group.position.x = THREE.MathUtils.lerp(runner.group.position.x, targetCompX, delta * 12);
      this.companionRunnersGroup.visible = true;
      runner.group.visible = true;

      if (comp.timer < 2.2) {
        // Phase 1: Companion was ahead on the track (-26m) and became visible as our Princess catches up to her!
        const catchT = Math.min(1.0, comp.timer / 2.2);
        const easeCatch = 1 - Math.pow(1 - catchT, 2.2);
        const zOffset = THREE.MathUtils.lerp(-26, 0, easeCatch);
        const runnerZ = this.playerZ + zOffset;
        const compY = this.getCompanionGroundY(comp.lane, runnerZ);

        runner.group.position.z = runnerZ;
        runner.group.position.y = THREE.MathUtils.lerp(runner.group.position.y, compY, delta * 16);
        runner.group.rotation.set(0, Math.PI, 0);
        runner.animateCompanionRun(delta, this.currentSpeed * 0.92, comp.lane > this.currentLane);
      } else if (comp.timer < 8.0) {
        // Phase 2: Our Princess caught up! Both characters run side-by-side in adjacent lanes!
        if (!comp.sideBySideTriggered) {
          comp.sideBySideTriggered = true;
          soundManager.playGem();
          this.callbacks.onCompanionEncounter?.({
            name: comp.name,
            nameBn: comp.nameBn,
            cheer: comp.cheer,
            cheerBn: comp.cheerBn,
            color: comp.color,
            avatar: comp.avatar,
            active: true,
            isPullingAhead: false,
          });
        }
        const bobZ = Math.sin((comp.timer - 2.2) * 2.8) * 0.25;
        const runnerZ = this.playerZ + bobZ;
        const compY = this.getCompanionGroundY(comp.lane, runnerZ);

        runner.group.position.z = runnerZ;
        runner.group.position.y = THREE.MathUtils.lerp(runner.group.position.y, compY, delta * 16);
        runner.group.rotation.set(0, Math.PI, 0);
        runner.animateCompanionRun(delta, this.currentSpeed, comp.lane > this.currentLane);
        this.score += Math.floor(delta * 15);
      } else if (comp.timer < comp.duration) {
        // Phase 3: Our Princess accelerates ahead! The companion falls behind us and then vanishes!
        if (!comp.pullAheadTriggered) {
          comp.pullAheadTriggered = true;
          this.callbacks.onCompanionEncounter?.({
            name: comp.name,
            nameBn: comp.nameBn,
            cheer:
              this.config.gameplay.language === 'bn'
                ? `🚀 আমরা এগিয়ে যাচ্ছি! ${comp.nameBn} পেছনে পড়ে গেলো!`
                : `🚀 We pulled ahead of ${comp.name}! Full speed ahead!`,
            cheerBn: `🚀 আমরা এগিয়ে যাচ্ছি! ${comp.nameBn} পেছনে পড়ে গেলো!`,
            color: comp.color,
            avatar: '🚀',
            active: true,
            isPullingAhead: true,
          });
          soundManager.playJump();
        }
        const pullProgress = (comp.timer - 8.0) / (comp.duration - 8.0);
        const runnerZ = this.playerZ + pullProgress * pullProgress * 22;
        const compY = this.getCompanionGroundY(comp.lane, runnerZ);

        runner.group.position.z = runnerZ;
        runner.group.position.y = THREE.MathUtils.lerp(runner.group.position.y, compY, delta * 16);
        runner.group.rotation.set(0, Math.PI, 0);
        runner.animateCompanionRun(delta, this.currentSpeed * 0.82, comp.lane > this.currentLane);
      } else {
        // Encounter concluded: companion is now behind the camera and becomes invisible again!
        runner.group.visible = false;
        this.callbacks.onCompanionEncounter?.({
          name: comp.name,
          nameBn: comp.nameBn,
          cheer: '',
          cheerBn: '',
          color: comp.color,
          avatar: '',
          active: false,
          isPullingAhead: false,
        });
        this.activeCompanion = null;
      }
    }

    // 2. Snappy Lane Transition & Diverging Side-Road -> Brand-New Track Mechanics
    let targetX = this.environment.getLaneWorldX(1);
    let curveYaw = 0;
    const fork = this.environment.activeFork;

    if (this.currentLane === -1 || this.currentLane === 3) {
      const side = this.currentLane === -1 ? -1 : 1;
      if (fork) {
        if (!fork.committed) {
          this.environment.commitToForkBranch();
        }
        const localZ = this.playerZ - fork.zPos;
        // Follow the smooth 60m Cosine S-Curve from localZ = +26 (old outer lane) to localZ = -34 (center of NEW 3-lane track!)
        const progress = THREE.MathUtils.clamp((26 - localZ) / 60, 0, 1);
        const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
        targetX = fork.baseTrackX + side * (3.0 + ease * (FORK_DIVERGE_OFFSET - 3.0));

        // Calculate natural turning angle along the deeper S-curve so Princess & Pet bank smoothly into the new track
        const derivative = Math.sin(progress * Math.PI);
        curveYaw = side * derivative * 0.42;

        // Trigger voluntary Theme Transition when entering/passing through the Portal Arch at localZ ≈ -4!
        if (!fork.triggered && localZ <= 4.0) {
          fork.triggered = true;
          this.triggerSmoothThemeTransition(fork.targetTheme);
          this.score += 300;
          soundManager.playPowerup();
        }

        // At the end of the diverging S-curve (localZ <= -31), seamlessly become Lane 1 (Center) of the NEW Track!
        // Never return to the old track!
        if (localZ <= -31) {
          this.currentLane = 1;
          targetX = this.environment.getLaneWorldX(1);
          curveYaw = 0;
        }
      } else {
        this.currentLane = 1;
        targetX = this.environment.getLaneWorldX(1);
      }
    } else {
      targetX = this.environment.getLaneWorldX(this.currentLane);
    }

    this.playerX = THREE.MathUtils.lerp(this.playerX, targetX, delta * 20);

    // 2B. Smooth Theme Transition interpolation (when triggered via Forked Side-Road Portal Arch)
    if (this.targetThemeConfig && this.themeTransitionProgress < 1.0) {
      this.themeTransitionProgress = Math.min(1.0, this.themeTransitionProgress + delta * 0.65);
      const stepFactor = Math.min(1.0, delta * 3.2);

      this.tempColorSky.set(this.targetThemeConfig.skyColor);
      this.tempColorFog.set(this.targetThemeConfig.fogColor);
      this.tempColorAmb.set(this.targetThemeConfig.ambientLightColor);
      this.tempColorDir.set(this.targetThemeConfig.directionalLightColor);
      this.tempColorTrack.set(this.targetThemeConfig.trackColor);

      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(this.tempColorSky, stepFactor);
      }
      if (this.scene.fog) {
        this.scene.fog.color.lerp(this.tempColorFog, stepFactor);
      }
      this.ambientLight.color.lerp(this.tempColorAmb, stepFactor);
      this.dirLight.color.lerp(this.tempColorDir, stepFactor);
      if (this.hemiLight) {
        this.hemiLight.color.lerp(this.tempColorSky, stepFactor);
        this.hemiLight.groundColor.lerp(this.tempColorTrack, stepFactor);
      }

      this.environment.updateTheme(this.targetThemeConfig, stepFactor);

      if (this.themeTransitionProgress >= 1.0) {
        this.updateSkyDomeGradient(this.targetThemeConfig.skyColor, this.targetThemeConfig.fogColor);
      }
    }

    // 3. Jetpack flight override
    if (this.activePowerups.jetpack > 0) {
      this.playerY = THREE.MathUtils.lerp(this.playerY, 5.5, delta * 8);
      this.velocityY = 0;
      this.isJumping = false;
    } else {
      // 4. Ground & Train Roof / Ramp Physics
      let minGround = 0;

      // Check for train underneath player in current lane
      for (let i = 0; i < this.environment.obstacles.length; i++) {
        const obs = this.environment.obstacles[i];
        if (!obs.isTrain || obs.laneIndex !== this.currentLane) continue;

        const frontZ = obs.z + 8.0;
        const rearZ = obs.z - 8.0;

        // A. Running up Ramp
        if (obs.hasRamp && obs.rampStartPosZ && obs.rampEndPosZ) {
          if (this.playerZ <= obs.rampStartPosZ && this.playerZ >= obs.rampEndPosZ) {
            const t = (obs.rampStartPosZ - this.playerZ) / (obs.rampStartPosZ - obs.rampEndPosZ);
            minGround = Math.max(0, Math.min(obs.roofY!, t * obs.roofY!));
            break;
          }
        }

        // B. Running on Train Roof
        if (this.playerZ <= frontZ && this.playerZ >= rearZ) {
          if (this.playerY >= obs.roofY! - 0.5) {
            minGround = obs.roofY!;
            break;
          }
        }
      }

      // Apply Gravity & Jumping
      if (this.isJumping || this.playerY > minGround) {
        this.playerY += this.velocityY * delta;
        this.velocityY -= this.config.gameplay.gravity * delta;

        if (this.playerY <= minGround) {
          this.playerY = minGround;
          this.velocityY = 0;
          this.isJumping = false;
          this.princess.setJumping(false);
        }
      } else {
        this.playerY = minGround;
      }
    }

    // 5. Sliding Timer
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.princess.setSliding(false);
      }
    }

    // Invulnerability timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      this.princess.group.visible = Math.floor(Date.now() / 80) % 2 === 0;
    } else {
      this.princess.group.visible = true;
    }

    // 6. Update Princess position & animation (facing forward down the track & banking into diverging curves)
    this.princess.group.position.set(this.playerX, this.playerY, this.playerZ);
    const laneDiff = targetX - this.playerX;
    this.princess.group.rotation.y = Math.PI - laneDiff * 0.12 - curveYaw;
    this.princess.group.rotation.z = laneDiff * 0.08 + curveYaw * 0.25;
    this.princess.animate(delta, this.currentSpeed, this.playerY);

    // 7. Update Pet Companion position & animation (facing forward down the track)
    if (this.config.pet.enabled) {
      this.pet.group.position.set(
        this.playerX - 1.3,
        this.playerY,
        this.playerZ + 1.1
      );
      this.pet.group.rotation.y = Math.PI - laneDiff * 0.08 - curveYaw;
      this.pet.animate(delta, this.currentSpeed, this.isJumping, this.playerY);
    }

    // Hide station background friends once player runs past z < -68
    if (this.stationFriendsGroup && this.stationFriendsGroup.visible && this.playerZ < -68) {
      this.stationFriendsGroup.visible = false;
    }

    // 8. Update Camera: follow Princess & active track with dynamic Curve Yaw & Banking!
    const isPortrait = this.camera.aspect < 1;
    const trackX = this.environment.trackCenterX;
    const relPlayerX = this.playerX - trackX;
    const isOnBranch = this.currentLane === -1 || this.currentLane === 3;
    const camDist = isPortrait ? 7.2 : 6.4;

    let camTargetX = 0;
    let camTargetY = Math.max(3.8, this.playerY + 3.6);
    let camTargetZ = 0;
    let lookTargetX = 0;
    let lookTargetY = this.playerY * 0.35 + 1.6;
    let lookTargetZ = 0;
    let targetRoll = 0;

    if (isOnBranch && fork) {
      const side = this.currentLane === -1 ? -1 : 1;
      // Geometric look-ahead along the curving branch road:
      // The camera points directly forward into the bend along the road's true geometry!
      const aheadLocalZ = (this.playerZ - 16) - fork.zPos;
      const aheadProg = THREE.MathUtils.clamp((26 - aheadLocalZ) / 60, 0, 1);
      const aheadEase = 0.5 - 0.5 * Math.cos(aheadProg * Math.PI);
      const roadAheadX = aheadLocalZ <= -34
        ? fork.newTrackX
        : fork.baseTrackX + side * (3.0 + aheadEase * (FORK_DIVERGE_OFFSET - 3.0));

      // Camera follows behind on the road geometry
      const behindLocalZ = (this.playerZ + camDist) - fork.zPos;
      const behindProg = THREE.MathUtils.clamp((26 - behindLocalZ) / 60, 0, 1);
      const behindEase = 0.5 - 0.5 * Math.cos(behindProg * Math.PI);
      const roadBehindX = behindLocalZ >= 26
        ? fork.baseTrackX + side * 3.0
        : fork.baseTrackX + side * (3.0 + behindEase * (FORK_DIVERGE_OFFSET - 3.0));

      lookTargetX = roadAheadX;
      lookTargetZ = this.playerZ - 16;
      camTargetX = roadBehindX;
      camTargetZ = this.playerZ + camDist;

      // Natural banking into the bend
      targetRoll = -curveYaw * 0.35;
    } else {
      // Normal straight running centered on the active track
      camTargetX = trackX + relPlayerX * (isPortrait ? 0.85 : 0.6);
      camTargetZ = this.playerZ + (isPortrait ? 7.5 : 6.6);
      lookTargetX = trackX + relPlayerX * (isPortrait ? 0.72 : 0.3);
      lookTargetZ = this.playerZ - 12;
      targetRoll = -laneDiff * 0.04;
    }

    const lerpPosFactor = isOnBranch ? Math.min(1.0, delta * 16) : Math.min(1.0, delta * 14);
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, camTargetX, lerpPosFactor);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, camTargetY, delta * 12);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, camTargetZ, lerpPosFactor);

    this.currentLookAt.x = THREE.MathUtils.lerp(this.currentLookAt.x, lookTargetX, lerpPosFactor);
    this.currentLookAt.y = THREE.MathUtils.lerp(this.currentLookAt.y, lookTargetY, delta * 12);
    this.currentLookAt.z = THREE.MathUtils.lerp(this.currentLookAt.z, lookTargetZ, lerpPosFactor);
    this.camera.lookAt(this.currentLookAt);

    // Dynamic banking / camera roll along the curve!
    this.currentCamRoll = THREE.MathUtils.lerp(this.currentCamRoll, targetRoll, delta * 10);
    this.camera.rotation.z = this.currentCamRoll;

    this.dirLight.position.set(this.playerX + 6, this.playerY + 15, this.playerZ + 10);

    // Keep SkyDome & Sun moving infinitely with playerX and playerZ so the horizon never ends or clips!
    if (this.skyDomeMesh) {
      this.skyDomeMesh.position.x = this.playerX;
      this.skyDomeMesh.position.z = this.playerZ;
    }
    if (this.sunMesh) {
      this.sunMesh.position.x = this.playerX + 24;
      this.sunMesh.position.z = this.playerZ - 75;
    }

    // 9. Environment update & discrete wave generation
    this.environment.update(delta, this.playerZ);
    this.environment.generateAhead(this.playerZ);

    // 10. Collectibles & Magnet
    this.updateCollectibles(delta);

    // 11. Obstacles Collision Check (Solid, impenetrable collisions!)
    this.checkCollisions();

    // 12. Powerup Timers
    this.updatePowerupTimers(delta);

    // 13. Throttled UI Notification (~15Hz instead of 60Hz to prevent React DOM reconciliation lag)
    this.hudUpdateTimer += delta;
    if (this.hudUpdateTimer >= 0.065) {
      this.hudUpdateTimer = 0;
      this.callbacks.onScoreUpdate(this.score, this.coins, this.gems, Math.floor(this.distance));
    }
  }

  private updateCollectibles(delta: number) {
    const isMagnetActive = this.activePowerups.magnet > 0;
    let magnetRange = 12;
    if (this.config.pet.enabled && this.config.pet.perk === 'magnet_boost') {
      magnetRange = 16;
    }

    this.playerPosVec.set(this.playerX, this.playerY + 0.8, this.playerZ);

    this.environment.collectibles.forEach((col) => {
      if (col.collected) return;

      const colPos = col.group.position;
      const dist = this.playerPosVec.distanceTo(colPos);

      if (isMagnetActive && col.type === 'coin' && dist < magnetRange) {
        colPos.lerp(this.playerPosVec, delta * 14);
      }

      if (dist < 1.35) {
        col.collected = true;
        col.group.visible = false;

        if (col.type === 'coin') {
          const coinValue = this.config.pet.enabled && this.config.pet.perk === 'coin_doubler' && Math.random() < 0.3 ? 2 : 1;
          this.coins += coinValue;
          this.score += 60 * coinValue;
          soundManager.playCoin();
        } else if (col.type === 'gem') {
          this.gems += 1;
          this.collectedInventory.gem = (this.collectedInventory.gem || 0) + 1;
          this.score += 500;
          soundManager.playGem();
        } else {
          const pType = col.type as PowerupType;
          this.collectedInventory[pType] = (this.collectedInventory[pType] || 0) + 1;
          this.triggerPowerup(pType);
        }
      }
    });
  }

  private triggerPowerup(type: PowerupType) {
    soundManager.playPowerup();

    if (type === 'magnet') {
      this.activePowerups.magnet = this.config.gameplay.magnetDuration;
    } else if (type === 'multiplier') {
      this.activePowerups.multiplier = this.config.gameplay.multiplierDuration;
    } else if (type === 'sneakers') {
      this.activePowerups.sneakers = this.config.gameplay.sneakersDuration;
    } else if (type === 'jetpack') {
      this.activePowerups.jetpack = this.config.gameplay.jetpackDuration;
    } else if (type === 'hoverboard') {
      this.hoverboardsRemaining++;
      this.callbacks.onHoverboardChange(this.hoverboardsRemaining, this.activePowerups.hoverboard);
    }

    this.callbacks.onPowerupUpdate(this.activePowerups);
  }

  private updatePowerupTimers(delta: number) {
    let changed = false;

    if (this.activePowerups.magnet > 0) {
      this.activePowerups.magnet -= delta;
      if (this.activePowerups.magnet <= 0) {
        this.activePowerups.magnet = 0;
        changed = true;
      }
    }
    if (this.activePowerups.multiplier > 0) {
      this.activePowerups.multiplier -= delta;
      if (this.activePowerups.multiplier <= 0) {
        this.activePowerups.multiplier = 0;
        changed = true;
      }
    }
    if (this.activePowerups.sneakers > 0) {
      this.activePowerups.sneakers -= delta;
      if (this.activePowerups.sneakers <= 0) {
        this.activePowerups.sneakers = 0;
        changed = true;
      }
    }
    if (this.activePowerups.jetpack > 0) {
      this.activePowerups.jetpack -= delta;
      if (this.activePowerups.jetpack <= 0) {
        this.activePowerups.jetpack = 0;
        changed = true;
      }
    }

    if (changed) {
      this.callbacks.onPowerupUpdate(this.activePowerups);
    }
  }

  // SOLID, REALISTIC COLLISION ENGINE
  private checkCollisions() {
    if (this.invulnerableTimer > 0 || this.activePowerups.jetpack > 0) return;

    for (let i = 0; i < this.environment.obstacles.length; i++) {
      const obs = this.environment.obstacles[i];

      // Distance culling
      if (Math.abs(obs.z - this.playerZ) > 14) continue;

      // 1. Train Collision
      if (obs.isTrain) {
        const frontZ = obs.z + 8.0;
        const rearZ = obs.z - 8.0;

        // Check if player is in the same lane or entering it (using world X of the active track)
        const obsWorldX = obs.group.position.x;
        const isSameLane = obs.laneIndex === this.currentLane || Math.abs(this.playerX - obsWorldX) < 0.85;

        if (isSameLane) {
          // If train has ramp and player is entering on ramp: SAFE!
          if (obs.hasRamp && obs.rampStartPosZ && obs.rampEndPosZ) {
            if (this.playerZ <= obs.rampStartPosZ + 0.3 && this.playerZ >= obs.rampEndPosZ) {
              continue; // Safely climbing ramp!
            }
          }

          // If player is on top of train roof: SAFE!
          if (this.playerY >= obs.roofY! - 0.25) {
            continue; // Safely running on roof!
          }

          // If player is below roof and hits front face of train:
          // The train front bumper is at frontZ. Solid impact!
          if (this.playerZ <= frontZ + 0.35 && this.playerZ >= rearZ - 0.5) {
            this.handleCrash();
            break;
          }
        }
        continue;
      }

      // 2. Low Barrier (Hurdle - must jump over!)
      if (obs.type === 'low_barrier') {
        const obsWorldX = obs.group.position.x;
        const isSameLane = obs.laneIndex === this.currentLane || Math.abs(this.playerX - obsWorldX) < 0.85;
        if (isSameLane && Math.abs(obs.z - this.playerZ) < 0.75) {
          // If jumped high enough: safe!
          if (this.playerY >= 0.72) {
            continue;
          } else {
            // Hit hurdle! Solid crash!
            this.handleCrash();
            break;
          }
        }
        continue;
      }

      // 3. High Barrier (Overhead Sign - must slide under!)
      if (obs.type === 'high_barrier') {
        const obsWorldX = obs.group.position.x;
        const isSameLane = obs.laneIndex === this.currentLane || Math.abs(this.playerX - obsWorldX) < 0.85;
        if (isSameLane && Math.abs(obs.z - this.playerZ) < 0.75) {
          // If sliding flat: safe!
          if (this.isSliding) {
            continue;
          } else {
            // Hit overhead sign! Solid crash!
            this.handleCrash();
            break;
          }
        }
        continue;
      }
    }
  }

  private handleCrash() {
    if (this.activePowerups.hoverboard) {
      this.activePowerups.hoverboard = false;
      this.princess.setHoverboard(false);
      this.invulnerableTimer = 1.8;
      soundManager.playShieldBreak();
      this.callbacks.onHoverboardChange(this.hoverboardsRemaining, false);
      this.callbacks.onPowerupUpdate(this.activePowerups);
      return;
    }

    soundManager.playCrash();
    this.isRunning = false;
    this.callbacks.onGameOver(this.score, this.coins, this.gems, Math.floor(this.distance));
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.environment) {
      this.environment.dispose();
    }
    if (this.skyDomeTex) {
      this.skyDomeTex.dispose();
    }
    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
  }
}

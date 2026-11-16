/**
 * Subway Princess Runner 3D
 * An endless 3D subway runner with pet companions, VIP Coin Store, and isolated Admin Studio
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { StartScreen } from './components/StartScreen';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';
import { StoreModal } from './components/StoreModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { GameEngine } from './game/GameEngine';
import { 
  GameCustomConfig, 
  ActivePowerups,
  ShopItem,
  CompanionBannerState,
  RoadsideShopState
} from './types/game';
import { 
  loadGameConfig, 
  saveGameConfig, 
  loadPlayerStats, 
  savePlayerStats, 
  fetchLiveServerConfig,
  subscribeToLiveFirestoreConfig,
  getXpForNextLevel,
  addDailyMissionProgress,
  applyUnlockedAdminLevelRewards,
  PlayerStats 
} from './utils/configStorage';
import { soundManager } from './game/soundEffects';

type GameMode = 'start' | 'running' | 'paused' | 'gameover';

export default function App() {
  const [config, setConfig] = useState<GameCustomConfig>(loadGameConfig());
  const [stats, setStats] = useState<PlayerStats>(loadPlayerStats());
  const [gameMode, setGameMode] = useState<GameMode>('start');
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
  const [isDailyMissionsOpen, setIsDailyMissionsOpen] = useState<boolean>(false);

  const getStartingBoards = (cfg: GameCustomConfig) =>
    cfg.gameplay.startingHoverboards + (cfg.princess.skateboard?.bonusBoards || 0);

  // Live in-game stats
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentCoins, setCurrentCoins] = useState<number>(0);
  const [currentGems, setCurrentGems] = useState<number>(0);
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [hoverboardsRemaining, setHoverboardsRemaining] = useState<number>(getStartingBoards(config));

  // Dedicated completed run stats so Game Over screen always shows accurate score, coins, gems & distance
  const [lastRunStats, setLastRunStats] = useState<{
    score: number;
    coins: number;
    gems: number;
    distance: number;
    isNewHigh: boolean;
  }>({
    score: 0,
    coins: 0,
    gems: 0,
    distance: 0,
    isNewHigh: false,
  });

  const gameModeRef = useRef<GameMode>(gameMode);
  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  const [activePowerups, setActivePowerups] = useState<ActivePowerups>({
    magnet: 0,
    multiplier: 0,
    sneakers: 0,
    jetpack: 0,
    hoverboard: false,
  });
  const [companionBanner, setCompanionBanner] = useState<CompanionBannerState | null>(null);
  const [roadsideShopState, setRoadsideShopState] = useState<RoadsideShopState | null>(null);

  const engineRef = useRef<GameEngine | null>(null);

  // Check URL and sync live server/Firestore config
  useEffect(() => {
    // 1. Initial fetch from Firestore / LocalStorage / Server
    fetchLiveServerConfig(loadGameConfig()).then((serverCfg) => {
      if (serverCfg) {
        setConfig(serverCfg);
      }
    });

    // 2. Real-time Firestore subscription (live sync across all players)
    const unsubFirestore = subscribeToLiveFirestoreConfig((liveCfg) => {
      if (liveCfg) {
        setConfig(liveCfg);
      }
    });

    return () => {
      unsubFirestore();
    };
  }, []);

  // Automatically unlock any Admin-configured Level Up free rewards if player level qualifies
  useEffect(() => {
    const { updatedStats, newlyUnlockedRewards } = applyUnlockedAdminLevelRewards(stats, config);
    if (newlyUnlockedRewards.length > 0) {
      setStats(updatedStats);
    }
  }, [config.levelUpRewards, stats.level]);

  // Listen to BroadcastChannel & LocalStorage for real-time config updates from /admin.html
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('subway_princess_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'CONFIG_UPDATED' && event.data.config) {
          setConfig(event.data.config);
        }
      };
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subway_princess_runner_config_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) {
            setConfig(loadGameConfig());
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handlers
  const handleStartGame = () => {
    setIsStoreOpen(false);
    setIsDailyMissionsOpen(false);
    setCompanionBanner(null);
    setRoadsideShopState(null);
    setCurrentScore(0);
    setCurrentCoins(0);
    setCurrentGems(0);
    setCurrentDistance(0);
    setIsNewHigh(false);
    setHoverboardsRemaining(getStartingBoards(config));

    setGameMode('running');
    setTimeout(() => {
      engineRef.current?.start();
    }, 50);
  };

  const handlePause = () => {
    engineRef.current?.pause();
    setGameMode('paused');
  };

  const handleResume = () => {
    engineRef.current?.resume();
    setGameMode('running');
  };

  // Keyboard shortcut (Escape or 'P') to toggle pause/resume
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameMode === 'running' && !isStoreOpen) {
          handlePause();
        } else if (gameMode === 'paused' && !isStoreOpen) {
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameMode, isStoreOpen]);

  const handleRestart = () => {
    handleStartGame();
  };

  const handleHome = () => {
    engineRef.current?.stop();
    setGameMode('start');
  };

  const handleOpenStore = () => {
    if (gameMode === 'running') {
      engineRef.current?.pause();
      setGameMode('paused');
    }
    setIsDailyMissionsOpen(false);
    setIsStoreOpen(true);
    fetchLiveServerConfig(config).then((serverCfg) => {
      if (serverCfg) {
        setConfig(serverCfg);
      }
    });
  };

  const handleOpenDailyMissions = () => {
    if (gameMode === 'running') {
      engineRef.current?.pause();
      setGameMode('paused');
    }
    setIsStoreOpen(false);
    setIsDailyMissionsOpen(true);
    fetchLiveServerConfig(config).then((serverCfg) => {
      if (serverCfg) {
        setConfig(serverCfg);
      }
    });
  };

  // Equip a Character, Dress, Skateboard, or Pet from the Store
  const handleEquipItem = (item: ShopItem, currentStats: PlayerStats = stats) => {
    let updatedPrincess = { ...config.princess };
    let updatedPet = { ...config.pet };

    if (item.category === 'character') {
      const charData = item.characterData || {};
      updatedPrincess = {
        ...updatedPrincess,
        ...charData,
        presetType: item.presetType || charData.presetType || '',
        customModelUrl: item.customModelUrl || charData.customModelUrl || '',
        customTextureUrl: item.customTextureUrl || charData.customTextureUrl || '',
        modelScale: item.modelScale || charData.modelScale || 1.0,
        modelYOffset: item.modelYOffset || charData.modelYOffset || 0,
        modelRotationY: item.modelRotationY || charData.modelRotationY || 0,
        tintColor: item.tintColor || charData.tintColor || '',
        // Preserve currently equipped skateboard
        skateboard: updatedPrincess.skateboard,
      };
    } else if (item.category === 'dress' && item.dressData) {
      updatedPrincess = {
        ...updatedPrincess,
        ...item.dressData,
        customTextureUrl: item.customTextureUrl || item.dressData.customTextureUrl,
      };
    } else if (item.category === 'skateboard' && item.skateboardData) {
      updatedPrincess = {
        ...updatedPrincess,
        skateboard: {
          ...item.skateboardData,
          customModelUrl: item.customModelUrl || item.skateboardData.customModelUrl,
          customTextureUrl: item.customTextureUrl || item.skateboardData.customTextureUrl,
        },
      };
    } else if (item.category === 'pet' && item.petData) {
      updatedPet = {
        ...updatedPet,
        ...item.petData,
        customModelUrl: item.customModelUrl || item.petData.customModelUrl,
        customTextureUrl: item.customTextureUrl || item.petData.customTextureUrl,
        modelScale: item.modelScale || item.petData.modelScale,
        modelYOffset: item.modelYOffset || item.petData.modelYOffset,
        tintColor: item.tintColor || item.petData.tintColor,
      };
    }

    const updatedConfig: GameCustomConfig = {
      ...config,
      princess: updatedPrincess,
      pet: updatedPet,
    };

    const updatedStats: PlayerStats = {
      ...currentStats,
      equippedItems: {
        ...currentStats.equippedItems,
        [item.category]: item.id,
      },
    };

    saveGameConfig(updatedConfig);
    savePlayerStats(updatedStats);
    setConfig(updatedConfig);
    setStats(updatedStats);

    if (gameMode === 'start') {
      setHoverboardsRemaining(getStartingBoards(updatedConfig));
    }
  };

  // Unlock Item with In-Game Coins
  const handleUnlockItemWithCoins = (item: ShopItem): { success: boolean; message: string } => {
    const isBn = config.gameplay.language === 'bn';
    const coinPrice = item.priceCoins && item.priceCoins > 0 ? item.priceCoins : 2500;

    if (stats.totalCoins < coinPrice) {
      return {
        success: false,
        message: isBn
          ? `পর্যাপ্ত কয়েন নেই! আরও ${(coinPrice - stats.totalCoins).toLocaleString()} কয়েন প্রয়োজন। দৌড়ে কয়েন সংগ্রহ করুন!`
          : `Not enough coins! Need ${(coinPrice - stats.totalCoins).toLocaleString()} more coins. Keep running to collect coins!`,
      };
    }

    const nextUnlocked = Array.from(new Set([...stats.unlockedItemIds, item.id]));
    const nextStats: PlayerStats = {
      ...stats,
      totalCoins: stats.totalCoins - coinPrice,
      unlockedItemIds: nextUnlocked,
    };
    handleEquipItem(item, nextStats);
    return {
      success: true,
      message: isBn
        ? `🎉 "${item.nameBn}" কয়েন দিয়ে আনলক ও ইকুইপ হয়েছে!`
        : `🎉 "${item.name}" unlocked with coins & equipped!`,
    };
  };

  const handleScoreUpdate = (score: number, coins: number, gems: number, dist: number) => {
    // Only update live running HUD while game is actively running
    if (gameModeRef.current === 'running') {
      setCurrentScore(score);
      setCurrentCoins(coins);
      setCurrentGems(gems);
      setCurrentDistance(dist);
    }
  };

  const handlePowerupUpdate = (powerups: ActivePowerups) => {
    setActivePowerups({ ...powerups });
  };

  const handleHoverboardChange = (count: number) => {
    setHoverboardsRemaining(count);
  };

  const handleGameOver = (finalScore: number, finalCoins: number, finalGems: number, dist: number) => {
    const isHigh = finalScore > stats.highScore;
    const roundedDist = Math.floor(dist);

    // Save exact final statistics of this completed run for the Game Over card
    setLastRunStats({
      score: finalScore,
      coins: finalCoins,
      gems: finalGems,
      distance: roundedDist,
      isNewHigh: isHigh,
    });

    setCurrentScore(finalScore);
    setCurrentCoins(finalCoins);
    setCurrentGems(finalGems);
    setCurrentDistance(roundedDist);
    setIsNewHigh(isHigh);

    setStats((prevStats) => {
      const baseStats: PlayerStats = {
        ...prevStats,
        highScore: Math.max(prevStats.highScore, finalScore),
        totalCoins: prevStats.totalCoins + finalCoins,
        totalGems: prevStats.totalGems + finalGems,
        runsCount: prevStats.runsCount + 1,
      };
      const newStats = addDailyMissionProgress(baseStats, {
        collect_coins: finalCoins,
        run_distance: roundedDist,
        reach_score: finalScore,
      });
      savePlayerStats(newStats);
      return newStats;
    });

    setGameMode('gameover');
  };

  const handleToggleLanguage = () => {
    const nextLang = config.gameplay.language === 'bn' ? 'en' : 'bn';
    const updated = {
      ...config,
      gameplay: { ...config.gameplay, language: nextLang as 'bn' | 'en' },
    };
    saveGameConfig(updated);
    setConfig(updated);
  };

  const handleToggleQuality = () => {
    const nextQuality = config.gameplay.graphicsQuality === 'smooth' ? 'high' : 'smooth';
    const updated = {
      ...config,
      gameplay: { ...config.gameplay, graphicsQuality: nextQuality as 'smooth' | 'high' },
    };
    saveGameConfig(updated);
    setConfig(updated);
  };

  const handleSoundVolumeChange = (vol: number) => {
    const updated = {
      ...config,
      gameplay: { ...config.gameplay, soundVolume: vol },
    };
    saveGameConfig(updated);
    setConfig(updated);
    soundManager.setVolumes(vol, config.gameplay.musicVolume);
  };

  const handleMusicVolumeChange = (vol: number) => {
    const updated = {
      ...config,
      gameplay: { ...config.gameplay, musicVolume: vol },
    };
    saveGameConfig(updated);
    setConfig(updated);
    soundManager.setVolumes(config.gameplay.soundVolume, vol);
  };

  const completedMissionsCount = (stats.dailyMissions || []).filter(
    (m) => !m.claimed && m.progress >= m.target
  ).length;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 select-none overscroll-none touch-none">
      {/* 3D WebGL Canvas */}
      <GameCanvas
        config={config}
        isRunning={gameMode === 'running' || gameMode === 'paused'}
        isPaused={gameMode === 'paused'}
        onScoreUpdate={handleScoreUpdate}
        onPowerupUpdate={handlePowerupUpdate}
        onGameOver={handleGameOver}
        onHoverboardChange={handleHoverboardChange}
        onCompanionEncounter={setCompanionBanner}
        onRoadsideShopUpdate={setRoadsideShopState}
        engineRef={engineRef}
      />

      {/* In-Game HUD (visible while running or paused) */}
      {(gameMode === 'running' || gameMode === 'paused') && (
        <GameHUD
          score={currentScore}
          coins={currentCoins}
          totalWalletCoins={stats.totalCoins}
          gems={currentGems}
          distance={currentDistance}
          activePowerups={activePowerups}
          hoverboardsRemaining={hoverboardsRemaining}
          config={config}
          companionBanner={companionBanner}
          roadsideShopState={roadsideShopState}
          onPause={handlePause}
          onActivateHoverboard={() => {
            engineRef.current?.activateHoverboard();
            setStats((prev) => addDailyMissionProgress(prev, { use_powerups: 1 }));
          }}
          onMoveLeft={() => engineRef.current?.moveLeft()}
          onMoveRight={() => engineRef.current?.moveRight()}
          onJump={() => {
            engineRef.current?.jump();
            setStats((prev) => addDailyMissionProgress(prev, { jump_or_slide: 1 }));
          }}
          onSlide={() => {
            engineRef.current?.slide();
            setStats((prev) => addDailyMissionProgress(prev, { jump_or_slide: 1 }));
          }}
          onOpenStore={handleOpenStore}
          onToggleLanguage={handleToggleLanguage}
          onToggleQuality={handleToggleQuality}
          onStopAtRoadsideShop={() => {
            engineRef.current?.stopAtRoadsideShop();
            setStats((prev) => addDailyMissionProgress(prev, { emote_or_shop: 1 }));
          }}
          onTurnTowardRoadsideShop={() => engineRef.current?.turnTowardRoadsideShop()}
          onWalkToRoadsideShop={() => engineRef.current?.walkToRoadsideShop()}
          onLeaveRoadsideShop={() => engineRef.current?.leaveRoadsideShop()}
          onTriggerEmote={(emote) => {
            engineRef.current?.triggerStationEmote(emote);
            setStats((prev) => addDailyMissionProgress(prev, { emote_or_shop: 1 }));
          }}
          onRotateShopCamera={(yawStep, pitchStep) =>
            engineRef.current?.rotateShopCameraByStep(yawStep, pitchStep)
          }
          onBuyRoadsideItem={(itemType, costCoins) => {
            const res = engineRef.current?.buyRoadsideItem(itemType, costCoins);
            setStats(loadPlayerStats());
            return res;
          }}
          onSellRoadsideItem={(itemType, rewardCoins) => {
            const res = engineRef.current?.sellRoadsideItem(itemType, rewardCoins);
            setStats(loadPlayerStats());
            return res;
          }}
        />
      )}

      {/* Start Screen Menu */}
      {gameMode === 'start' && (
        <StartScreen
          highScore={stats.highScore}
          totalCoins={stats.totalCoins}
          totalGems={stats.totalGems}
          level={stats.level}
          xp={stats.xp}
          xpRequired={getXpForNextLevel(stats.level)}
          completedMissionsCount={completedMissionsCount}
          config={config}
          onStart={handleStartGame}
          onOpenStore={handleOpenStore}
          onOpenDailyMissions={handleOpenDailyMissions}
          onToggleQuality={handleToggleQuality}
          onTriggerEmote={(emote) => {
            engineRef.current?.triggerStationEmote(emote);
            setStats((prev) => addDailyMissionProgress(prev, { emote_or_shop: 1 }));
          }}
        />
      )}

      {/* Pause Menu Modal */}
      {gameMode === 'paused' && !isStoreOpen && !isDailyMissionsOpen && (
        <PauseMenu
          config={config}
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          onOpenStore={handleOpenStore}
          onSoundVolumeChange={handleSoundVolumeChange}
          onMusicVolumeChange={handleMusicVolumeChange}
          onToggleQuality={handleToggleQuality}
        />
      )}

      {/* Game Over Modal */}
      {gameMode === 'gameover' && !isStoreOpen && !isDailyMissionsOpen && (
        <GameOverModal
          score={lastRunStats.score}
          highScore={stats.highScore}
          isNewHigh={lastRunStats.isNewHigh}
          coins={lastRunStats.coins}
          gems={lastRunStats.gems}
          distance={lastRunStats.distance}
          config={config}
          onRestart={handleRestart}
          onHome={handleHome}
          onOpenStore={handleOpenStore}
        />
      )}

      {/* VIP Shop & Coin Store Modal */}
      {isStoreOpen && (
        <StoreModal
          config={config}
          stats={stats}
          onClose={() => setIsStoreOpen(false)}
          onEquipItem={(item) => handleEquipItem(item)}
          onUnlockItemWithCoins={handleUnlockItemWithCoins}
        />
      )}

      {/* Daily Missions & Level Up Modal */}
      {isDailyMissionsOpen && (
        <DailyMissionsModal
          config={config}
          stats={stats}
          onClose={() => setIsDailyMissionsOpen(false)}
          onUpdateStats={(nextStats) => setStats(nextStats)}
          onEquipShopItem={(item, nextStats) => handleEquipItem(item, nextStats || stats)}
        />
      )}
    </div>
  );
}

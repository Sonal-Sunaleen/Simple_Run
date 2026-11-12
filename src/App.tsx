/**
 * Subway Princess Runner 3D
 * An endless 3D subway runner with pet companions, VIP UPI Store, and isolated Admin Studio
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

  // Unlock Item with UPI Secret Code or 12-Digit UTR Number
  const handleUnlockItemWithUpi = (
    item: ShopItem,
    utrOrCode: string
  ): { success: boolean; message: string } => {
    const isBn = config.gameplay.language === 'bn';
    const cleanInput = utrOrCode.trim();

    if (!cleanInput) {
      return {
        success: false,
        message: isBn ? 'অনুগ্রহ করে আনলক কোড বা UTR নম্বর লিখুন।' : 'Please enter an Unlock Code or UTR number.',
      };
    }

    // 1. Check Secret Unlock Code or Admin Master PIN
    const matchesUnlockCode =
      cleanInput.toUpperCase() === item.unlockCode.trim().toUpperCase() ||
      (config.upiConfig.adminPin && cleanInput === config.upiConfig.adminPin.trim());

    // 2. Check 12-Digit UPI UTR / Reference Number (if enabled by Admin)
    const is12DigitUtr = /^\d{12}$/.test(cleanInput);
    const isFakeRepeatedDigits = /^(\d)\1{11}$/.test(cleanInput);

    if (matchesUnlockCode) {
      const nextUnlocked = Array.from(new Set([...stats.unlockedItemIds, item.id]));
      const nextStats: PlayerStats = {
        ...stats,
        unlockedItemIds: nextUnlocked,
      };
      handleEquipItem(item, nextStats);
      return {
        success: true,
        message: isBn
          ? `🎉 "${item.nameBn}" সফলভাবে আনলক এবং ব্যবহৃত (Equipped) হয়েছে!`
          : `🎉 "${item.name}" unlocked & equipped!`,
      };
    }

    if (config.upiConfig.verificationMode === 'utr_or_code' && is12DigitUtr) {
      if (isFakeRepeatedDigits) {
        return {
          success: false,
          message: isBn
            ? 'সঠিক ১২ সংখ্যার UPI UTR / Ref নম্বর লিখুন।'
            : 'Invalid UTR number. Please enter a genuine 12-digit UPI UTR.',
        };
      }
      if (stats.usedUtrNumbers.includes(cleanInput)) {
        return {
          success: false,
          message: isBn
            ? 'এই UTR নম্বরটি ইতিমধ্যে ব্যবহার করা হয়েছে!'
            : 'This UTR number has already been used!',
        };
      }

      const nextUnlocked = Array.from(new Set([...stats.unlockedItemIds, item.id]));
      const nextStats: PlayerStats = {
        ...stats,
        unlockedItemIds: nextUnlocked,
        usedUtrNumbers: [...stats.usedUtrNumbers, cleanInput],
      };
      handleEquipItem(item, nextStats);
      return {
        success: true,
        message: isBn
          ? `🎉 পেমেন্ট ভেরিফাইড! "${item.nameBn}" আনলক ও ইকুইপ হয়েছে!`
          : `🎉 Payment verified! "${item.name}" unlocked & equipped!`,
      };
    }

    return {
      success: false,
      message:
        config.upiConfig.verificationMode === 'code_only'
          ? isBn
            ? 'ভুল আনলক কোড! পেমেন্টের পর সঠিক আনলক কোডটি দিন।'
            : 'Invalid Unlock Code! Please enter the valid code after UPI payment.'
          : isBn
          ? 'সঠিক ১২ সংখ্যার UPI UTR নম্বর অথবা সিক্রেট আনলক কোড দিন।'
          : 'Invalid code! Enter a valid 12-digit UPI UTR number or Secret Unlock Code.',
    };
  };

  // Unlock Item with In-Game Coins
  const handleUnlockItemWithCoins = (item: ShopItem): { success: boolean; message: string } => {
    const isBn = config.gameplay.language === 'bn';
    const coinPrice = item.priceCoins || 0;

    if (coinPrice <= 0) {
      return {
        success: false,
        message: isBn ? 'এই আইটেমটি শুধুমাত্র UPI দিয়ে আনলক করা যাবে।' : 'This item requires UPI unlock.',
      };
    }

    if (stats.totalCoins < coinPrice) {
      return {
        success: false,
        message: isBn
          ? `পর্যাপ্ত কয়েন নেই! আরও ${(coinPrice - stats.totalCoins).toLocaleString()} কয়েন প্রয়োজন অথবা ₹${item.priceInr} UPI দিয়ে আনলক করুন।`
          : `Not enough coins! Need ${(coinPrice - stats.totalCoins).toLocaleString()} more coins, or unlock instantly with ₹${item.priceInr} UPI.`,
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
    setCurrentScore(score);
    setCurrentCoins(coins);
    setCurrentGems(gems);
    setCurrentDistance(dist);
  };

  const handlePowerupUpdate = (powerups: ActivePowerups) => {
    setActivePowerups({ ...powerups });
  };

  const handleHoverboardChange = (count: number) => {
    setHoverboardsRemaining(count);
  };

  const handleGameOver = (finalScore: number, finalCoins: number, finalGems: number, dist: number) => {
    const isHigh = finalScore > stats.highScore;
    const baseStats: PlayerStats = {
      ...stats,
      highScore: Math.max(stats.highScore, finalScore),
      totalCoins: stats.totalCoins + finalCoins,
      totalGems: stats.totalGems + finalGems,
      runsCount: stats.runsCount + 1,
    };
    const newStats = addDailyMissionProgress(baseStats, {
      collect_coins: finalCoins,
      run_distance: Math.floor(dist),
      reach_score: finalScore,
    });
    savePlayerStats(newStats);
    setStats(newStats);
    setIsNewHigh(isHigh);
    setCurrentDistance(dist);
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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
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
          score={currentScore}
          highScore={stats.highScore}
          isNewHigh={isNewHigh}
          coins={currentCoins}
          gems={currentGems}
          distance={currentDistance}
          config={config}
          onRestart={handleRestart}
          onHome={handleHome}
          onOpenStore={handleOpenStore}
        />
      )}

      {/* VIP Shop & UPI Store Modal */}
      {isStoreOpen && (
        <StoreModal
          config={config}
          stats={stats}
          onClose={() => setIsStoreOpen(false)}
          onEquipItem={(item) => handleEquipItem(item)}
          onUnlockItemWithUpi={handleUnlockItemWithUpi}
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

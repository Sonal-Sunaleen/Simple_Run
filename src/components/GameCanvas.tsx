import React, { useEffect, useRef } from 'react';
import { GameEngine, GameEngineCallbacks } from '../game/GameEngine';
import { GameCustomConfig, ActivePowerups, CompanionBannerState, RoadsideShopState } from '../types/game';

interface GameCanvasProps {
  config: GameCustomConfig;
  isRunning: boolean;
  isPaused: boolean;
  onScoreUpdate: (score: number, coins: number, gems: number, distance: number) => void;
  onPowerupUpdate: (powerups: ActivePowerups) => void;
  onGameOver: (score: number, coins: number, gems: number, distance: number) => void;
  onHoverboardChange: (count: number, active: boolean) => void;
  onCompanionEncounter?: (info: CompanionBannerState) => void;
  onRoadsideShopUpdate?: (state: RoadsideShopState) => void;
  engineRef?: React.MutableRefObject<GameEngine | null>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  config,
  isRunning,
  isPaused,
  onScoreUpdate,
  onPowerupUpdate,
  onGameOver,
  onHoverboardChange,
  onCompanionEncounter,
  onRoadsideShopUpdate,
  engineRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalEngineRef = useRef<GameEngine | null>(null);

  // Fast Touch & Mouse Tracking for 60FPS running swipes and 360° Roadside Shop camera rotation
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastDragPos = useRef<{ x: number; y: number } | null>(null);
  const totalDragDist = useRef<number>(0);
  const isMouseDragging = useRef<boolean>(false);
  const lastTapTime = useRef<number>(0);

  const callbacksRef = useRef<GameEngineCallbacks>({
    onScoreUpdate,
    onPowerupUpdate,
    onGameOver,
    onHoverboardChange,
    onCompanionEncounter,
    onRoadsideShopUpdate,
  });

  callbacksRef.current = {
    onScoreUpdate,
    onPowerupUpdate,
    onGameOver,
    onHoverboardChange,
    onCompanionEncounter,
    onRoadsideShopUpdate,
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const proxyCallbacks: GameEngineCallbacks = {
      onScoreUpdate: (...args) => callbacksRef.current.onScoreUpdate(...args),
      onPowerupUpdate: (...args) => callbacksRef.current.onPowerupUpdate(...args),
      onGameOver: (...args) => callbacksRef.current.onGameOver(...args),
      onHoverboardChange: (...args) => callbacksRef.current.onHoverboardChange(...args),
      onCompanionEncounter: (...args) => callbacksRef.current.onCompanionEncounter?.(...args),
      onRoadsideShopUpdate: (...args) => callbacksRef.current.onRoadsideShopUpdate?.(...args),
    };

    const engine = new GameEngine(containerRef.current, config, proxyCallbacks);
    internalEngineRef.current = engine;
    if (engineRef) {
      engineRef.current = engine;
    }

    return () => {
      engine.destroy();
      internalEngineRef.current = null;
      if (engineRef) {
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (internalEngineRef.current) {
      internalEngineRef.current.updateConfig(config);
    }
  }, [config]);

  useEffect(() => {
    const engine = internalEngineRef.current;
    if (!engine) return;

    if (isRunning) {
      if (isPaused) {
        engine.pause();
      } else {
        engine.resume();
      }
    } else {
      engine.stop();
    }
  }, [isRunning, isPaused]);

  // Direct fast touch listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRunning || isPaused) return;
    const touch = e.touches[0];
    const now = Date.now();
    const atShop = internalEngineRef.current?.isAtRoadsideShop() ?? false;

    // Fast Double-tap for hoverboard (only while actively running, not while stopped at shop)
    if (!atShop && now - lastTapTime.current < 280) {
      internalEngineRef.current?.activateHoverboard();
    }
    lastTapTime.current = now;

    touchStartPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now,
    };
    lastDragPos.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    totalDragDist.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRunning && !isPaused && e.cancelable) {
      e.preventDefault();
    }
    if (!isRunning || isPaused) return;

    const touch = e.touches[0];
    if (internalEngineRef.current?.isAtRoadsideShop() && lastDragPos.current) {
      const dx = touch.clientX - lastDragPos.current.x;
      const dy = touch.clientY - lastDragPos.current.y;
      totalDragDist.current += Math.hypot(dx, dy);
      lastDragPos.current = { x: touch.clientX, y: touch.clientY };
      internalEngineRef.current.rotateShopCamera(dx, dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !isRunning || isPaused) return;

    if (internalEngineRef.current?.isAtRoadsideShop()) {
      // Quick tap without dragging while at the Roadside Shop triggers a 3D emote!
      if (totalDragDist.current < 12) {
        internalEngineRef.current.triggerStationEmote();
      }
      touchStartPos.current = null;
      lastDragPos.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartPos.current.x;
    const deltaY = touch.clientY - touchStartPos.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Responsive 18px swipe threshold for older Android digitizers
    const minSwipeDist = 18;

    if (Math.max(absX, absY) > minSwipeDist) {
      if (absX > absY) {
        if (deltaX > 0) {
          internalEngineRef.current?.moveRight();
        } else {
          internalEngineRef.current?.moveLeft();
        }
      } else {
        if (deltaY > 0) {
          internalEngineRef.current?.slide();
        } else {
          internalEngineRef.current?.jump();
        }
      }
    }

    touchStartPos.current = null;
    lastDragPos.current = null;
  };

  // Mouse drag listeners for 360° camera rotation while stopped at the Roadside Shop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRunning || isPaused) return;
    if (internalEngineRef.current?.isAtRoadsideShop()) {
      isMouseDragging.current = true;
      lastDragPos.current = { x: e.clientX, y: e.clientY };
      totalDragDist.current = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDragging.current || !isRunning || isPaused) return;
    if (internalEngineRef.current?.isAtRoadsideShop() && lastDragPos.current) {
      const dx = e.clientX - lastDragPos.current.x;
      const dy = e.clientY - lastDragPos.current.y;
      totalDragDist.current += Math.hypot(dx, dy);
      lastDragPos.current = { x: e.clientX, y: e.clientY };
      internalEngineRef.current.rotateShopCamera(dx, dy);
    }
  };

  const handleMouseUp = () => {
    isMouseDragging.current = false;
    lastDragPos.current = null;
  };

  const handleCanvasClick = () => {
    if (!isRunning && !isPaused) {
      internalEngineRef.current?.triggerStationEmote();
    } else if (isRunning && !isPaused && internalEngineRef.current?.isAtRoadsideShop()) {
      if (totalDragDist.current < 10) {
        internalEngineRef.current.triggerStationEmote();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
      className="w-full h-full absolute inset-0 select-none overflow-hidden touch-none cursor-grab active:cursor-grabbing"
    />
  );
};

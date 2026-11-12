import React, { useState } from 'react';
import {
  ActivePowerups,
  GameCustomConfig,
  CompanionBannerState,
  RoadsideShopState,
  InGameTradeItemType,
  StationEmoteType,
} from '../types/game';
import { soundManager } from '../game/soundEffects';
import { 
  Pause, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  ShoppingBag,
  Zap,
  Sparkles,
  Store,
  RotateCw,
  RotateCcw,
  Footprints,
  Play,
  Smile,
  Eye
} from 'lucide-react';

interface GameHUDProps {
  score: number;
  coins: number;
  totalWalletCoins: number;
  gems: number;
  distance: number;
  activePowerups: ActivePowerups;
  hoverboardsRemaining: number;
  config: GameCustomConfig;
  companionBanner?: CompanionBannerState | null;
  roadsideShopState?: RoadsideShopState | null;
  onPause: () => void;
  onActivateHoverboard: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onOpenStore: () => void;
  onToggleLanguage: () => void;
  onToggleQuality: () => void;
  onStopAtRoadsideShop?: () => void;
  onTurnTowardRoadsideShop?: () => void;
  onWalkToRoadsideShop?: () => void;
  onLeaveRoadsideShop?: () => void;
  onTriggerEmote?: (emote?: StationEmoteType) => void;
  onRotateShopCamera?: (yawStep: number, pitchStep?: number) => void;
  onBuyRoadsideItem?: (itemType: InGameTradeItemType, costCoins: number) => { success: boolean; messageBn: string; messageEn: string } | undefined;
  onSellRoadsideItem?: (itemType: InGameTradeItemType, rewardCoins: number) => { success: boolean; messageBn: string; messageEn: string } | undefined;
}

const SHOP_EMOTES: { id: string; engineEmote: StationEmoteType; icon: string; labelBn: string; labelEn: string }[] = [
  { id: 'wave', engineEmote: 'wave', icon: '👋', labelBn: 'হাই', labelEn: 'Wave' },
  { id: 'dance', engineEmote: 'dance', icon: '💃', labelBn: 'নাচ', labelEn: 'Dance' },
  { id: 'spin', engineEmote: 'spin', icon: '✨', labelBn: 'স্পিন', labelEn: 'Spin' },
  { id: 'heart', engineEmote: 'wave', icon: '💖', labelBn: 'লাভ', labelEn: 'Love' },
  { id: 'bow', engineEmote: 'royal_bow', icon: '👑', labelBn: 'কুর্নিশ', labelEn: 'Bow' },
  { id: 'cheer', engineEmote: 'jump_cheer', icon: '🎉', labelBn: 'উচ্ছ্বাস', labelEn: 'Cheer' },
];

const ROADSIDE_TRADE_ITEMS: {
  id: InGameTradeItemType;
  icon: string;
  nameBn: string;
  nameEn: string;
  descBn: string;
  descEn: string;
  buyCoins: number;
  sellCoins: number;
}[] = [
  {
    id: 'gem',
    icon: '💎',
    nameBn: 'রত্ন (Gem)',
    nameEn: 'Royal Gem',
    descBn: '+১ জেম ও +৫০০ স্কোর',
    descEn: '+1 Gem & +500 Score',
    buyCoins: 60,
    sellCoins: 40,
  },
  {
    id: 'hoverboard',
    icon: '🛹',
    nameBn: 'হোভারবোর্ড শিল্ড',
    nameEn: 'Hoverboard Shield',
    descBn: '+১ বোর্ড ও শিল্ড সুরক্ষা',
    descEn: '+1 Board & Active Shield',
    buyCoins: 50,
    sellCoins: 30,
  },
  {
    id: 'magnet',
    icon: '🧲',
    nameBn: 'কয়েন ম্যাগনেট',
    nameEn: 'Coin Magnet',
    descBn: 'স্বয়ংক্রিয় কয়েন আকর্ষণ',
    descEn: 'Pulls all nearby coins',
    buyCoins: 40,
    sellCoins: 25,
  },
  {
    id: 'multiplier',
    icon: '⭐',
    nameBn: '২X স্কোর স্টার',
    nameEn: '2X Multiplier',
    descBn: 'দ্বিগুণ স্কোর বুস্ট',
    descEn: 'Double score multiplier',
    buyCoins: 45,
    sellCoins: 28,
  },
  {
    id: 'sneakers',
    icon: '👟',
    nameBn: 'সুপার জাম্প জুতো',
    nameEn: 'Super Sneakers',
    descBn: 'ট্রেনের ওপর উঁচু লাফ',
    descEn: 'High jump over trains',
    buyCoins: 35,
    sellCoins: 22,
  },
  {
    id: 'jetpack',
    icon: '🚀',
    nameBn: 'জেটপ্যাক রকেট',
    nameEn: 'Jetpack Boost',
    descBn: 'আকাশে উড়ে নিরাপদ যাত্রা',
    descEn: 'Fly high above obstacles',
    buyCoins: 75,
    sellCoins: 45,
  },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  coins,
  totalWalletCoins,
  gems,
  distance,
  activePowerups,
  hoverboardsRemaining,
  config,
  companionBanner,
  roadsideShopState,
  onPause,
  onActivateHoverboard,
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  onOpenStore,
  onToggleLanguage,
  onToggleQuality,
  onStopAtRoadsideShop,
  onTurnTowardRoadsideShop,
  onWalkToRoadsideShop,
  onLeaveRoadsideShop,
  onTriggerEmote,
  onRotateShopCamera,
  onBuyRoadsideItem,
  onSellRoadsideItem,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [tradeFeedback, setTradeFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeShopEmote, setActiveShopEmote] = useState<string | null>(null);
  const [isCounterMinimized, setIsCounterMinimized] = useState<boolean>(false);
  const isBn = config.gameplay.language === 'bn';
  const isSmooth = config.gameplay.graphicsQuality === 'smooth';
  const shopPhase = roadsideShopState?.phase || 'none';
  const isAtShop =
    shopPhase === 'standing_in_front' ||
    shopPhase === 'facing_shop' ||
    shopPhase === 'at_counter';
  const combinedCoins = totalWalletCoins + coins;

  const handleShopEmoteClick = (emoteId: string) => {
    setActiveShopEmote(emoteId);
    const found = SHOP_EMOTES.find((e) => e.id === emoteId);
    onTriggerEmote?.(found?.engineEmote || 'wave');
    setTimeout(() => {
      setActiveShopEmote((prev) => (prev === emoteId ? null : prev));
    }, 2500);
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleBuy = (item: (typeof ROADSIDE_TRADE_ITEMS)[number]) => {
    const res = onBuyRoadsideItem?.(item.id, item.buyCoins);
    if (res) {
      setTradeFeedback({ text: isBn ? res.messageBn : res.messageEn, ok: res.success });
      setTimeout(() => setTradeFeedback(null), 2400);
    }
  };

  const handleSell = (item: (typeof ROADSIDE_TRADE_ITEMS)[number]) => {
    const res = onSellRoadsideItem?.(item.id, item.sellCoins);
    if (res) {
      setTradeFeedback({ text: isBn ? res.messageBn : res.messageEn, ok: res.success });
      setTimeout(() => setTradeFeedback(null), 2400);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 select-none font-sans">
      {/* Top Bar: 3 Zones */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Collectibles & Pet */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-black/75 px-2.5 py-1 rounded-full border border-yellow-500/30 text-yellow-400 shadow-md">
            <span className="text-sm sm:text-base">🪙</span>
            <span className="font-bold font-mono tabular-nums text-xs sm:text-sm text-white">
              {coins}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/75 px-2.5 py-1 rounded-full border border-rose-500/30 text-rose-400 shadow-md">
            <span className="text-sm sm:text-base">💎</span>
            <span className="font-bold font-mono tabular-nums text-xs sm:text-sm text-white">
              {gems}
            </span>
          </div>

          {config.pet.enabled && (
            <div className="hidden sm:flex items-center gap-1 bg-black/75 px-2 py-1 rounded-full border border-sky-500/30 text-sky-300 text-[11px] shadow-md">
              <span>🐾</span>
              <span className="font-medium text-white">{config.pet.name}</span>
            </div>
          )}
        </div>

        {/* Center: Live Score & Distance */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="bg-black/75 px-3.5 py-1 rounded-2xl border border-white/10 text-center shadow-lg">
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-pink-400">
              {isBn ? 'স্কোর' : 'SCORE'}
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-white tracking-wider leading-none my-0.5">
              {score.toLocaleString()}
            </div>
            <div className="text-[9px] font-mono text-zinc-400">
              {distance}m
            </div>
          </div>
        </div>

        {/* Right: Controls, 60FPS Toggle & Store */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
          <button
            onClick={onToggleQuality}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold border flex items-center gap-1 transition-colors ${
              isSmooth
                ? 'bg-emerald-600/90 border-emerald-400 text-white'
                : 'bg-black/75 border-white/10 text-zinc-300'
            }`}
            title="Toggle 60FPS Smooth Mode"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden xs:inline">
              {isSmooth ? '৬০ FPS' : 'HQ'}
            </span>
          </button>

          <button
            onClick={onToggleLanguage}
            className="px-2 py-1 bg-black/75 border border-white/10 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-white/10 transition-colors"
            title="Toggle Language"
          >
            {isBn ? 'EN' : 'বাং'}
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1.5 sm:p-2 bg-black/75 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Mute/Unmute"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onStopAtRoadsideShop}
            className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 bg-amber-500/90 hover:bg-amber-400 border border-amber-300 text-slate-950 rounded-xl font-extrabold text-[10px] sm:text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md"
            title={isBn ? 'রাস্তার পাশের দোকানে দাঁড়ান' : 'Stop at Roadside Shop'}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{isBn ? 'রাস্তার শপ' : 'Road Shop'}</span>
          </button>

          <button
            onClick={onOpenStore}
            className="p-1.5 sm:p-2 bg-black/75 border border-amber-500/40 text-amber-400 rounded-xl hover:bg-amber-500/20 active:scale-95 transition-all"
            title={isBn ? 'ভিআইপি শপ' : 'VIP Shop'}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          {/* Prominent, high-visibility Pause Button */}
          <button
            onClick={onPause}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl font-extrabold text-xs shadow-lg shadow-amber-500/25 active:scale-90 flex items-center gap-1.5 border border-amber-300 transition-all pointer-events-auto"
            title={isBn ? 'গেম পজ করুন' : 'Pause Game'}
          >
            <Pause className="w-4 h-4 fill-slate-950" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              {isBn ? 'পজ' : 'PAUSE'}
            </span>
          </button>
        </div>
      </div>

      {/* In-Game Companion Sprint Cheer Banner (দৌড়ানোর সময় একেক থিমে একেকজনের সাথে দেখা ও একসাথে কিছুক্ষণ দৌড়ানো) */}
      {companionBanner && companionBanner.active && (
        <div className="self-center mt-2 pointer-events-none transition-all duration-300 animate-pulse">
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl shadow-2xl border backdrop-blur-md ${
              companionBanner.isPullingAhead ? 'ring-2 ring-yellow-400 scale-105' : ''
            }`}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              borderColor: companionBanner.color,
              boxShadow: `0 0 20px ${companionBanner.color}66`,
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg border shadow-md shrink-0"
              style={{ backgroundColor: companionBanner.color, borderColor: '#ffffff' }}
            >
              {companionBanner.avatar}
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-400" />
                {isBn ? companionBanner.nameBn : companionBanner.name}
              </div>
              <div className="text-xs sm:text-sm font-black text-white drop-shadow">
                {isBn ? companionBanner.cheerBn : companionBanner.cheer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roadside Shop Approaching Prompt (রাস্তার পাশে দোকানের সামনে দাঁড়ানোর বাটন) */}
      {shopPhase === 'approaching' && (
        <div className="self-center mt-1 pointer-events-auto z-30">
          <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-amber-400 shadow-2xl">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl shrink-0">
              🏪
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {isBn
                  ? `রাস্তার পাশে আইটেম শপ (${roadsideShopState?.distanceToShop ?? 0}m)`
                  : `Roadside Item Shop (${roadsideShopState?.distanceToShop ?? 0}m)`}
              </div>
              <div className="text-xs font-extrabold text-white">
                {isBn ? 'কয়েন দিয়ে আইটেম কিনুন বা বিক্রি করুন!' : 'Buy or sell in-game items with coins!'}
              </div>
            </div>
            <button
              onClick={onStopAtRoadsideShop}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-transform whitespace-nowrap flex items-center gap-1.5"
            >
              <Store className="w-4 h-4" />
              <span>{isBn ? 'সামনে দাঁড়ান' : 'Stop at Shop'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 1 & Step 2: Standing in Front of or Facing the Roadside Shop — Free 360° Camera Rotation + Emotes + Shop Actions! */}
      {(shopPhase === 'standing_in_front' || shopPhase === 'facing_shop') && (
        <div className="self-center mt-auto mb-1 pointer-events-auto z-30 max-w-lg w-full px-1.5">
          <div className="bg-slate-950/88 backdrop-blur-md p-3 sm:p-3.5 rounded-3xl border-2 border-amber-400/90 shadow-2xl flex flex-col gap-2">
            {/* Top Status & 360° Camera Hint */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  {shopPhase === 'standing_in_front'
                    ? isBn
                      ? '🏪 দোকানের সামনে দাঁড়িয়ে আছেন • ৩৬০° ফ্রি ক্যামেরা'
                      : '🏪 Standing in Front of Shop • 360° Free Camera'
                    : isBn
                    ? '🏪 দোকানের দিকে মুখ করেছেন • ৩৬০° ফ্রি ক্যামেরা'
                    : '🏪 Facing Roadside Shop • 360° Free Camera'}
                </div>
                <div className="text-xs font-extrabold text-white">
                  {isBn
                    ? 'স্ক্রিনে টেনে বা বাটনে চাপ দিয়ে যেকোনো দিকে ক্যামেরা ঘোরান ও ইমোট দিন!'
                    : 'Drag screen or tap buttons to rotate camera 360° in any direction & emote!'}
                </div>
              </div>
            </div>

            {/* 360° Camera Rotation Controls */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onRotateShopCamera?.(-0.55, 0)}
                className="py-2 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 font-extrabold text-[11px] border border-cyan-500/40 flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isBn ? 'বামে ঘোরান' : 'Rotate Left'}</span>
              </button>

              <button
                onClick={onTurnTowardRoadsideShop}
                className="py-2 px-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 font-extrabold text-[11px] border border-amber-400/70 flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-300" />
                <span>{isBn ? 'দোকানের দিকে' : 'Face Shop'}</span>
              </button>

              <button
                onClick={() => onRotateShopCamera?.(0.55, 0)}
                className="py-2 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 font-extrabold text-[11px] border border-cyan-500/40 flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isBn ? 'ডানে ঘোরান' : 'Rotate Right'}</span>
              </button>
            </div>

            {/* Interactive Emotes Bar while at Roadside Shop (দোকানের সামনে দাঁড়িয়ে ইমোট দেওয়ার ব্যবস্থা) */}
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-2xl border border-pink-500/35">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-pink-300 uppercase tracking-wider">
                  <Smile className="w-3 h-3 text-pink-400" />
                  <span>{isBn ? 'ইমোট দিন (ট্যাপ করুন)' : 'Play Emotes (Tap)'}</span>
                </div>
                {activeShopEmote && (
                  <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                    {SHOP_EMOTES.find((e) => e.id === activeShopEmote)?.icon}{' '}
                    {isBn
                      ? SHOP_EMOTES.find((e) => e.id === activeShopEmote)?.labelBn
                      : SHOP_EMOTES.find((e) => e.id === activeShopEmote)?.labelEn}
                    !
                  </span>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {SHOP_EMOTES.map((emote) => {
                  const isSelected = activeShopEmote === emote.id;
                  return (
                    <button
                      key={emote.id}
                      onClick={() => handleShopEmoteClick(emote.id)}
                      className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl border transition-all active:scale-90 ${
                        isSelected
                          ? 'bg-gradient-to-b from-pink-500 to-rose-600 border-amber-300 text-white shadow-md scale-105'
                          : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-zinc-200'
                      }`}
                    >
                      <span className="text-sm sm:text-base leading-none">{emote.icon}</span>
                      <span className="text-[8px] sm:text-[9px] font-bold mt-0.5 truncate max-w-full">
                        {isBn ? emote.labelBn : emote.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Shop Navigation Actions */}
            <div className="flex items-center justify-center gap-2">
              {shopPhase === 'standing_in_front' && (
                <button
                  onClick={onTurnTowardRoadsideShop}
                  className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>{isBn ? '🔄 দোকানের দিকে ঘুরুন' : 'Turn to Shop'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsCounterMinimized(false);
                  onWalkToRoadsideShop?.();
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Footprints className="w-4 h-4" />
                <span>{isBn ? '🚶 দোকানে যান ও কেনাকাটা করুন' : 'Walk to Shop & Trade'}</span>
              </button>

              <button
                onClick={onLeaveRoadsideShop}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-bold text-xs border border-slate-600 active:scale-95 transition-transform whitespace-nowrap"
              >
                {isBn ? '🏃 দৌড়ে ফিরুন' : 'Resume Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: At the Roadside Shop Counter — Buy & Sell All In-Game Items + 360° Camera & Emotes! */}
      {shopPhase === 'at_counter' && (
        <div
          className={`self-center ${
            isCounterMinimized ? 'mt-auto mb-1 max-w-lg' : 'my-auto max-w-xl'
          } pointer-events-auto z-40 w-full px-2`}
        >
          <div className="bg-slate-950/92 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border-2 border-amber-400/80 shadow-2xl max-h-[80vh] flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🏪</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                    {isBn ? 'রাস্তার পাশের আইটেম শপ (কেনা ও বিক্রি)' : 'Roadside Item Shop (Buy & Sell)'}
                  </h3>
                  <p className="text-[10px] text-amber-300 font-medium">
                    {isBn
                      ? 'কয়েন দিয়ে আইটেম কিনুন/বিক্রি করুন অথবা ৩৬০° ক্যামেরা ঘুরিয়ে দেখুন!'
                      : 'Trade items with Coins or rotate camera 360° & play emotes!'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setIsCounterMinimized((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/60 text-pink-200 text-[10px] sm:text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {isCounterMinimized
                      ? isBn
                        ? '🛍️ শপ খুলুন'
                        : 'Show Shop'
                      : isBn
                      ? '🎥 ৩৬০° ভিউ'
                      : '360° View'}
                  </span>
                </button>

                <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/60 px-2.5 py-1 rounded-xl">
                  <span className="text-xs">🪙</span>
                  <span className="font-mono font-black text-xs text-yellow-300 tabular-nums">
                    {combinedCoins.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 360° Camera & Emotes Row (Always available at the shop!) */}
            <div className="flex flex-col gap-1.5 bg-slate-900/85 p-2 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onRotateShopCamera?.(-0.55, 0)}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px] border border-cyan-500/30 flex items-center justify-center gap-1 active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isBn ? 'বামে ঘোরান' : 'Rotate Left'}</span>
                </button>
                <button
                  onClick={onTurnTowardRoadsideShop}
                  className="py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[10px] border border-amber-400/50 flex items-center justify-center gap-1 active:scale-95"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{isBn ? 'দোকানের দিকে' : 'Face Shop'}</span>
                </button>
                <button
                  onClick={() => onRotateShopCamera?.(0.55, 0)}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px] border border-cyan-500/30 flex items-center justify-center gap-1 active:scale-95"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{isBn ? 'ডানে ঘোরান' : 'Rotate Right'}</span>
                </button>
              </div>

              <div className="grid grid-cols-6 gap-1">
                {SHOP_EMOTES.map((emote) => {
                  const isSelected = activeShopEmote === emote.id;
                  return (
                    <button
                      key={emote.id}
                      onClick={() => handleShopEmoteClick(emote.id)}
                      className={`flex items-center justify-center gap-1 py-1 px-1 rounded-lg border text-[10px] font-bold transition-all active:scale-90 ${
                        isSelected
                          ? 'bg-pink-600 border-amber-300 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-zinc-200'
                      }`}
                    >
                      <span>{emote.icon}</span>
                      <span className="hidden sm:inline truncate">
                        {isBn ? emote.labelBn : emote.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Trade Feedback Toast */}
            {tradeFeedback && (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold text-center border ${
                  tradeFeedback.ok
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-400 text-rose-200'
                }`}
              >
                {tradeFeedback.text}
              </div>
            )}

            {/* Grid of All 6 In-Game Items (hidden when user toggles 360° Free View mode) */}
            {!isCounterMinimized && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-1 overflow-y-auto pr-1">
                {ROADSIDE_TRADE_ITEMS.map((item) => {
                  const count = roadsideShopState?.inventory?.[item.id] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl bg-slate-800 w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700">
                            {item.icon}
                          </span>
                          <div>
                            <div className="text-xs font-extrabold text-white">
                              {isBn ? item.nameBn : item.nameEn}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {isBn ? item.descBn : item.descEn}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-zinc-400">
                            {isBn ? 'ঝুলিতে আছে' : 'In Bag'}
                          </div>
                          <div className="text-xs font-mono font-black text-amber-300 tabular-nums">
                            x{count}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleBuy(item)}
                          className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow transition-transform whitespace-nowrap"
                        >
                          <span>{isBn ? 'কিনুন' : 'Buy'}</span>
                          <span className="font-mono text-yellow-200">-{item.buyCoins}🪙</span>
                        </button>

                        <button
                          onClick={() => handleSell(item)}
                          disabled={count <= 0}
                          className={`py-1.5 px-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1 shadow transition-transform whitespace-nowrap ${
                            count > 0
                              ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950'
                              : 'bg-slate-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <span>{isBn ? 'বিক্রি' : 'Sell'}</span>
                          <span className="font-mono">+{item.sellCoins}🪙</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer: Leave Shop & Resume Run */}
            <button
              onClick={onLeaveRoadsideShop}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isBn
                  ? '🏃 কেনাকাটা শেষ — রাস্তায় ফিরে দৌড় শুরু করুন!'
                  : 'Leave Shop & Resume Running!'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Active Power-up Badges */}
      <div className="self-end flex flex-col gap-1.5 pointer-events-none pr-1">
        {activePowerups.magnet > 0 && (
          <div className="flex items-center gap-1.5 bg-red-600/90 px-2.5 py-0.5 rounded-full text-white text-[11px] border border-red-400 shadow-md">
            <span>🧲</span>
            <span className="font-bold">{isBn ? 'ম্যাগনেট' : 'MAGNET'}</span>
            <span className="font-mono">{Math.ceil(activePowerups.magnet)}s</span>
          </div>
        )}
        {activePowerups.multiplier > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-500/90 px-2.5 py-0.5 rounded-full text-white text-[11px] border border-amber-300 shadow-md">
            <span>⭐</span>
            <span className="font-bold">2X</span>
            <span className="font-mono">{Math.ceil(activePowerups.multiplier)}s</span>
          </div>
        )}
        {activePowerups.sneakers > 0 && (
          <div className="flex items-center gap-1.5 bg-emerald-600/90 px-2.5 py-0.5 rounded-full text-white text-[11px] border border-emerald-400 shadow-md">
            <span>👟</span>
            <span className="font-bold">{isBn ? 'সুপার জাম্প' : 'JUMP'}</span>
            <span className="font-mono">{Math.ceil(activePowerups.sneakers)}s</span>
          </div>
        )}
        {activePowerups.jetpack > 0 && (
          <div className="flex items-center gap-1.5 bg-cyan-600/90 px-2.5 py-0.5 rounded-full text-white text-[11px] border border-cyan-400 shadow-md">
            <span>🚀</span>
            <span className="font-bold">{isBn ? 'জেটপ্যাক' : 'JETPACK'}</span>
            <span className="font-mono">{Math.ceil(activePowerups.jetpack)}s</span>
          </div>
        )}
        {activePowerups.hoverboard && (
          <div className="flex items-center gap-1.5 bg-pink-600/90 px-2.5 py-0.5 rounded-full text-white text-[11px] border border-pink-400 shadow-md">
            <span>🛹</span>
            <span className="font-bold">{isBn ? 'শিল্ড সক্রিয়' : 'SHIELD'}</span>
          </div>
        )}
      </div>

      {/* Bottom Controls Area (Hidden while stopped at the Roadside Shop so the Shop Dock & 360° Camera have full space) */}
      {!isAtShop && (
        <div className="flex items-end justify-between gap-2 pointer-events-auto pb-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onMoveLeft();
            }}
            className="w-13 h-13 sm:w-16 sm:h-16 bg-black/75 hover:bg-black/90 active:scale-90 active:bg-pink-600/60 rounded-2xl border border-white/20 flex items-center justify-center text-white shadow-lg transition-transform touch-none"
            title="Move Left"
          >
            <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onMoveRight();
            }}
            className="w-13 h-13 sm:w-16 sm:h-16 bg-black/75 hover:bg-black/90 active:scale-90 active:bg-pink-600/60 rounded-2xl border border-white/20 flex items-center justify-center text-white shadow-lg transition-transform touch-none"
            title="Move Right"
          >
            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onActivateHoverboard();
            }}
            disabled={hoverboardsRemaining <= 0 || activePowerups.hoverboard}
            className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl flex items-center gap-1.5 font-bold shadow-xl transition-all active:scale-90 touch-none ${
              activePowerups.hoverboard
                ? 'bg-emerald-500 text-white border border-emerald-300'
                : hoverboardsRemaining > 0
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white border border-pink-300'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
            }`}
          >
            <span className="text-lg sm:text-xl">🛹</span>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold">
                {activePowerups.hoverboard
                  ? isBn ? 'শিল্ড অন' : 'SHIELD'
                  : isBn ? 'স্কেটবোর্ড' : 'BOARD'}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono opacity-90">
                x{hoverboardsRemaining}
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onSlide();
            }}
            className="w-13 h-13 sm:w-16 sm:h-16 bg-black/75 hover:bg-black/90 active:scale-90 active:bg-amber-600/60 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-white shadow-lg transition-transform touch-none"
            title="Slide Down"
          >
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            <span className="text-[9px] font-bold text-amber-400">
              {isBn ? 'স্লাইড' : 'SLIDE'}
            </span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onJump();
            }}
            className="w-13 h-13 sm:w-16 sm:h-16 bg-pink-600 hover:bg-pink-700 active:scale-90 active:bg-pink-500 rounded-2xl border border-pink-300/60 flex flex-col items-center justify-center text-white shadow-lg transition-transform touch-none"
            title="Jump Up"
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] font-bold">
              {isBn ? 'লাফ' : 'JUMP'}
            </span>
          </button>
        </div>
        </div>
      )}
    </div>
  );
};

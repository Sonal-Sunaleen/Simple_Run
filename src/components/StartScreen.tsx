import React, { useState } from 'react';
import { GameCustomConfig, StationEmoteType } from '../types/game';
import { Play, ShoppingBag, Trophy, Zap, Smile, Target, Sparkles, Flame } from 'lucide-react';
import { EmoteWheelModal, ALL_START_EMOTES } from './EmoteWheelModal';

interface StartScreenProps {
  highScore: number;
  totalCoins: number;
  totalGems: number;
  level: number;
  xp: number;
  xpRequired: number;
  completedMissionsCount: number;
  config: GameCustomConfig;
  onStart: () => void;
  onOpenStore: () => void;
  onOpenDailyMissions: () => void;
  onToggleQuality: () => void;
  onPlayEmote?: (emoteType: string) => void;
  onTriggerEmote?: (emote?: StationEmoteType) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  highScore,
  totalCoins,
  totalGems,
  level,
  xp,
  xpRequired,
  completedMissionsCount,
  config,
  onStart,
  onOpenStore,
  onOpenDailyMissions,
  onToggleQuality,
  onPlayEmote,
  onTriggerEmote,
}) => {
  const isBn = config.gameplay.language === 'bn';
  const isSmooth = config.gameplay.graphicsQuality === 'smooth';
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  const [isEmoteWheelOpen, setIsEmoteWheelOpen] = useState<boolean>(false);
  const xpPct = Math.min(100, Math.round((xp / Math.max(1, xpRequired)) * 100));

  const handleSelectEmote = (emoteId: string, engineEmote: StationEmoteType) => {
    setActiveEmote(emoteId);
    onPlayEmote?.(emoteId);
    onTriggerEmote?.(engineEmote);
    setTimeout(() => {
      setActiveEmote((prev) => (prev === emoteId ? null : prev));
    }, 2800);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between pt-[max(12px,calc(env(safe-area-inset-top,0px)+10px))] px-3 sm:px-5 pb-[max(14px,calc(env(safe-area-inset-bottom,0px)+12px))] select-none pointer-events-none overflow-hidden">
      {/* Top Section: Header Bar + Side Dock for 'শপ ও ক্যারেক্টারস' & 'Daily Mission's' */}
      <div className="flex-shrink-0 flex flex-col gap-2 w-full max-w-2xl mx-auto">
        {/* Top Currency & High Score Row */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-auto w-full">
          {/* High Score + Player Level Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl border border-amber-500/40 shadow-lg shadow-black/40">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse flex-shrink-0" />
              <div>
                <div className="text-[8px] sm:text-[9px] font-bold text-amber-300 uppercase tracking-wider leading-none">
                  {isBn ? 'রেকর্ড' : 'High Score'}
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-white tabular-nums leading-tight">
                  {highScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Level & XP Badge */}
            <button
              onClick={onOpenDailyMissions}
              className="flex flex-col justify-center bg-slate-900/90 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1 rounded-2xl border border-cyan-500/40 shadow-lg transition-transform active:scale-95 text-left"
              title="Player Level & XP"
            >
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] font-black text-cyan-300 uppercase">
                  {isBn ? `লেভেল ${level}` : `LV. ${level}`}
                </span>
                <span className="hidden xs:inline text-[8px] sm:text-[9px] font-mono text-zinc-400">
                  {xp}/{xpRequired} XP
                </span>
              </div>
              <div className="w-14 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(6, xpPct)}%` }}
                />
              </div>
            </button>
          </div>

          {/* Currency Badges: Coins, Gems & 60 FPS */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl border border-yellow-500/40 shadow-md">
              <span className="text-xs">🪙</span>
              <span className="text-[11px] sm:text-xs font-black font-mono text-yellow-300 tabular-nums">
                {totalCoins.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl border border-rose-500/40 shadow-md">
              <span className="text-xs">💎</span>
              <span className="text-[11px] sm:text-xs font-black font-mono text-rose-300 tabular-nums">
                {totalGems.toLocaleString()}
              </span>
            </div>

            <button
              onClick={onToggleQuality}
              className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl border text-[9px] sm:text-[11px] font-bold transition-transform active:scale-95 shadow-md ${
                isSmooth
                  ? 'bg-emerald-600/90 border-emerald-400 text-white'
                  : 'bg-slate-900/90 border-slate-700 text-zinc-300'
              }`}
              title="Toggle 60 FPS Mode"
            >
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300" />
              <span className="font-mono">60 FPS</span>
            </button>
          </div>
        </div>

        {/* Side Dock Buttons: 'শপ ও ক্যারেক্টারস' and beside it 'Daily Mission's' */}
        <div className="flex items-center gap-2 self-start pointer-events-auto">
          {/* 1. শপ ও ক্যারেক্টারস (Shop & Characters) on the side */}
          <button
            onClick={onOpenStore}
            className="group relative flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-gradient-to-br from-slate-900/95 via-purple-950/90 to-slate-900/95 backdrop-blur-md border-2 border-amber-400/60 hover:border-amber-300 text-white shadow-xl shadow-black/50 transition-all active:scale-95"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center shadow-md flex-shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                {isBn ? 'শপ ও ক্যারেক্টারস' : 'Shop & Characters'}
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold text-zinc-300 leading-none mt-0.5">
                {isBn ? '👑 ক্যারেক্টার, ড্রেস ও পেট' : '👑 Skins, Boards & Pets'}
              </div>
            </div>
          </button>

          {/* 2. Daily Mission's right beside it */}
          <button
            onClick={onOpenDailyMissions}
            className="group relative flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-900/95 backdrop-blur-md border-2 border-cyan-400/60 hover:border-cyan-300 text-white shadow-xl shadow-black/50 transition-all active:scale-95"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black text-cyan-300 leading-tight flex items-center gap-1.5">
                <span>Daily Mission's</span>
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold text-zinc-300 leading-none mt-0.5">
                {isBn ? `✨ XP ও কয়েন (লেভেল ${level})` : `✨ XP & Coins (LV. ${level})`}
              </div>
            </div>

            {completedMissionsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 font-black text-[10px] flex items-center justify-center animate-bounce shadow-lg">
                {completedMissionsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Center Section: Interactive Character Touch Zone for PDF-style Emote Wheel */}
      <div className="min-h-0 flex-1 flex flex-col items-center justify-center pointer-events-none relative my-0.5">
        <div
          onClick={() => setIsEmoteWheelOpen(true)}
          className="pointer-events-auto cursor-pointer group flex flex-col items-center transition-transform active:scale-95"
          title={isBn ? 'ক্যারেক্টারে টাচ করে ইমোট হুইল খুলুন' : 'Touch Princess to open Emote Wheel'}
        >
          {/* Active Emote Floating Reaction Speech Bubble */}
          {activeEmote ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl shadow-xl shadow-pink-500/50 border-2 border-white animate-bounce">
              <span className="text-lg sm:text-xl leading-none">
                {ALL_START_EMOTES.find((e) => e.id === activeEmote)?.icon}
              </span>
              <div className="text-left">
                <div className="text-[8px] sm:text-[9px] font-bold text-pink-200 uppercase leading-none">
                  {isBn ? 'প্রিন্সেস ইমোট' : 'Princess Emote'}
                </div>
                <div className="font-black text-xs sm:text-sm leading-tight">
                  {isBn
                    ? `${ALL_START_EMOTES.find((e) => e.id === activeEmote)?.labelBn}!`
                    : `${ALL_START_EMOTES.find((e) => e.id === activeEmote)?.labelEn}!`}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border-2 border-pink-400/80 hover:border-pink-300 shadow-xl shadow-pink-500/30 text-white animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span className="text-[10px] sm:text-xs font-black text-pink-200">
                {isBn ? '🎭 ক্যারেক্টারে টাচ করুন (ইমোট)' : '🎭 Touch Character for Emotes'}
              </span>
              <span className="text-xs leading-none">✨</span>
            </div>
          )}

          {/* Interactive touch target over the 3D character */}
          <div className="w-32 h-36 sm:w-44 sm:h-52 mt-1 rounded-3xl pointer-events-auto border-2 border-dashed border-pink-400/0 group-hover:border-pink-400/40 transition-colors" />
        </div>
      </div>

      {/* Bottom Area: Lifted comfortably above mobile navigation bar, browser toolbars & gesture bars */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-auto max-w-sm sm:max-w-md w-full mx-auto mb-[max(2.25rem,calc(env(safe-area-inset-bottom,0px)+2rem))] px-2">
        {/* Animated Tap Prompt with Radar Ripple & Pointing Hands: "এখানে ট্যাপ করো! ট্যাপ করো!" */}
        <div className="relative flex flex-col items-center gap-0.5">
          {/* Concentric Pulse Rings radiating outward to draw player's eyes */}
          <div className="absolute -inset-2 rounded-full bg-pink-500/30 blur-md animate-pulse pointer-events-none" />

          <div className="relative flex items-center gap-1.5 sm:gap-2 drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
            {/* Animated bouncing hand pointing down to the start button */}
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping" />
              <span className="text-xl sm:text-2xl animate-bounce select-none">👇</span>
            </div>

            {/* Glowing Tag indicating "এখানে ট্যাপ করো! ট্যাপ করো!" */}
            <div className="bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-md px-3.5 sm:px-4 py-1 rounded-full border-2 border-amber-400 text-amber-200 font-black text-[11px] sm:text-xs tracking-wide shadow-2xl uppercase flex items-center gap-1.5 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>
                {isBn
                  ? '⚡ GO! এখানে ট্যাপ করো! ট্যাপ করো!'
                  : '⚡ GO! TAP HERE! TAP HERE!'}
              </span>
              <Sparkles className="w-3 h-3 text-yellow-300" />
            </div>

            {/* Second bouncing hand on the right */}
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping" />
              <span className="text-xl sm:text-2xl animate-bounce select-none">👇</span>
            </div>
          </div>
        </div>

        {/* Big Pulsing Start / Run Button: Elevated, high contrast & prominent */}
        <button
          onClick={onStart}
          className="relative group w-full py-3.5 sm:py-4 px-6 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg text-white shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 border-2 border-white/80 shadow-pink-500/60 overflow-hidden"
        >
          {/* Shimmer sweep animation */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <Play className="w-5 h-5 fill-current text-white animate-pulse" />
          <span className="tracking-wider drop-shadow-md">
            {isBn ? '⚡ GO! দৌড় শুরু করুন (START RUN)' : '⚡ GO! START RUN (TAP TO PLAY)'}
          </span>
        </button>
      </div>

      {/* Radial Emote Wheel Modal (Opens when touching the character or emote buttons) */}
      <EmoteWheelModal
        isOpen={isEmoteWheelOpen}
        isBn={isBn}
        activeEmote={activeEmote}
        onClose={() => setIsEmoteWheelOpen(false)}
        onSelectEmote={handleSelectEmote}
      />
    </div>
  );
};

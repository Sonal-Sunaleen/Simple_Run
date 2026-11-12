import React, { useState } from 'react';
import { GameCustomConfig, StationEmoteType } from '../types/game';
import { Play, ShoppingBag, Trophy, Zap, Smile, Target } from 'lucide-react';

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

const EMOTES: { id: string; engineEmote: StationEmoteType; icon: string; labelBn: string; labelEn: string }[] = [
  { id: 'wave', engineEmote: 'wave', icon: '👋', labelBn: 'হাই', labelEn: 'Wave' },
  { id: 'dance', engineEmote: 'dance', icon: '💃', labelBn: 'নাচ', labelEn: 'Dance' },
  { id: 'spin', engineEmote: 'spin', icon: '✨', labelBn: 'স্পিন', labelEn: 'Spin' },
  { id: 'heart', engineEmote: 'wave', icon: '💖', labelBn: 'লাভ', labelEn: 'Love' },
  { id: 'bow', engineEmote: 'royal_bow', icon: '👑', labelBn: 'কুর্নিশ', labelEn: 'Bow' },
  { id: 'cheer', engineEmote: 'jump_cheer', icon: '🎉', labelBn: 'উচ্ছ্বাস', labelEn: 'Cheer' },
];

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
  const xpPct = Math.min(100, Math.round((xp / Math.max(1, xpRequired)) * 100));

  const handleEmoteClick = (emoteId: string) => {
    setActiveEmote(emoteId);
    onPlayEmote?.(emoteId);
    const found = EMOTES.find((e) => e.id === emoteId);
    onTriggerEmote?.(found?.engineEmote || 'wave');
    setTimeout(() => {
      setActiveEmote((prev) => (prev === emoteId ? null : prev));
    }, 2600);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 select-none pointer-events-none overflow-hidden">
      {/* Top Section: Header Bar + Side Dock for 'শপ ও ক্যারেক্টারস' & 'Daily Mission's' */}
      <div className="flex flex-col gap-2.5 w-full max-w-2xl mx-auto">
        {/* Top Currency & High Score Row */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto w-full">
          {/* High Score + Player Level Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-amber-500/40 shadow-lg shadow-black/40">
              <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <div className="text-[9px] font-bold text-amber-300 uppercase tracking-wider leading-none">
                  {isBn ? 'সর্বোচ্চ স্কোর' : 'High Score'}
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-white tabular-nums leading-tight">
                  {highScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Level & XP Badge */}
            <button
              onClick={onOpenDailyMissions}
              className="flex flex-col justify-center bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-2xl border border-cyan-500/40 shadow-lg transition-transform active:scale-95 text-left"
              title="Player Level & XP"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-cyan-300 uppercase">
                  {isBn ? `লেভেল ${level}` : `LV. ${level}`}
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  {xp}/{xpRequired} XP
                </span>
              </div>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(6, xpPct)}%` }}
                />
              </div>
            </button>
          </div>

          {/* Currency Badges: Coins, Gems & 60 FPS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-yellow-500/40 shadow-md">
              <span className="text-xs sm:text-sm">🪙</span>
              <span className="text-xs font-black font-mono text-yellow-300 tabular-nums">
                {totalCoins.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-rose-500/40 shadow-md">
              <span className="text-xs sm:text-sm">💎</span>
              <span className="text-xs font-black font-mono text-rose-300 tabular-nums">
                {totalGems.toLocaleString()}
              </span>
            </div>

            <button
              onClick={onToggleQuality}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl border text-[10px] sm:text-[11px] font-bold transition-transform active:scale-95 shadow-md ${
                isSmooth
                  ? 'bg-emerald-600/90 border-emerald-400 text-white'
                  : 'bg-slate-900/85 border-slate-700 text-zinc-300'
              }`}
              title="Toggle 60 FPS Mode"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span className="font-mono">60 FPS</span>
            </button>
          </div>
        </div>

        {/* Side Dock Buttons: 'শপ ও ক্যারেক্টারস' and beside it 'Daily Mission's' */}
        <div className="flex items-center gap-2.5 self-start pointer-events-auto">
          {/* 1. শপ ও ক্যারেক্টারস (Shop & Characters) on the side */}
          <button
            onClick={onOpenStore}
            className="group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-purple-950/90 to-slate-900/95 backdrop-blur-md border-2 border-amber-400/60 hover:border-amber-300 text-white shadow-xl shadow-black/50 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center shadow-md">
              <ShoppingBag className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                {isBn ? 'শপ ও ক্যারেক্টারস' : 'Shop & Characters'}
              </div>
              <div className="text-[9px] font-bold text-zinc-300 leading-none mt-0.5">
                {isBn ? '👑 ক্যারেক্টার, ড্রেস ও পেট' : '👑 Skins, Boards & Pets'}
              </div>
            </div>
          </button>

          {/* 2. Daily Mission's right beside it */}
          <button
            onClick={onOpenDailyMissions}
            className="group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-900/95 backdrop-blur-md border-2 border-cyan-400/60 hover:border-cyan-300 text-white shadow-xl shadow-black/50 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-md">
              <Target className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black text-cyan-300 leading-tight flex items-center gap-1.5">
                <span>Daily Mission's</span>
              </div>
              <div className="text-[9px] font-bold text-zinc-300 leading-none mt-0.5">
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

      {/* Bottom Area: Emotes Dock + Grand "Tap to Play / START" Button */}
      <div className="flex flex-col items-center gap-2 pointer-events-auto max-w-md w-full mx-auto">
        {/* Interactive Platform Emotes Bar */}
        <div className="w-full bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-2xl border border-pink-500/35 shadow-lg">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-pink-300 uppercase tracking-wider">
              <Smile className="w-3.5 h-3.5 text-pink-400" />
              <span>{isBn ? 'প্রিন্সেস ইমোটস (ট্যাপ করুন)' : 'Princess Emotes (Tap to Play)'}</span>
            </div>
            {activeEmote && (
              <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                {EMOTES.find((e) => e.id === activeEmote)?.icon}{' '}
                {isBn
                  ? EMOTES.find((e) => e.id === activeEmote)?.labelBn
                  : EMOTES.find((e) => e.id === activeEmote)?.labelEn}
                !
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {EMOTES.map((emote) => {
              const isSelected = activeEmote === emote.id;
              return (
                <button
                  key={emote.id}
                  onClick={() => handleEmoteClick(emote.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all active:scale-90 ${
                    isSelected
                      ? 'bg-gradient-to-b from-pink-500/80 to-rose-600/80 border-amber-300 text-white shadow-md shadow-pink-500/40 scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-zinc-200'
                  }`}
                >
                  <span className="text-base sm:text-lg leading-none">{emote.icon}</span>
                  <span className="text-[9px] font-bold mt-1 tracking-tight truncate max-w-full">
                    {isBn ? emote.labelBn : emote.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animated Hand Indicator Prompt */}
        <div className="flex items-center gap-2 text-white font-extrabold text-xs sm:text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-bounce">
          <span className="text-lg">👆</span>
          <span className="bg-slate-950/70 backdrop-blur-sm px-3.5 py-0.5 rounded-full border border-pink-400/40 text-pink-200 tracking-wide uppercase text-[11px] sm:text-xs">
            {isBn ? 'খেলতে ট্যাপ করুন' : 'Tap to Play'}
          </span>
        </div>

        {/* Big Pulsing Start / Run Button */}
        <button
          onClick={onStart}
          className="w-full py-3.5 sm:py-4 px-6 rounded-3xl font-black text-lg sm:text-xl text-white shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 border-2 border-white/40 shadow-pink-500/40 animate-pulse"
        >
          <Play className="w-6 h-6 fill-current text-white" />
          <span>{isBn ? 'দৌড় শুরু করুন (START)' : 'START RUN'}</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { StationEmoteType } from '../types/game';
import { X, Sparkles, Smile } from 'lucide-react';
import { soundManager } from '../game/soundEffects';

export interface EmoteDef {
  id: string;
  engineEmote: StationEmoteType;
  icon: string;
  labelBn: string;
  labelEn: string;
  color: string;
  glowColor: string;
}

export const ALL_START_EMOTES: EmoteDef[] = [
  {
    id: 'dance',
    engineEmote: 'dance',
    icon: '💃',
    labelBn: 'নাচ',
    labelEn: 'Dance',
    color: 'from-pink-500 to-rose-600',
    glowColor: 'rgba(244,63,94,0.6)',
  },
  {
    id: 'spin',
    engineEmote: 'spin',
    icon: '✨',
    labelBn: 'স্পিন',
    labelEn: 'Spin',
    color: 'from-cyan-500 to-blue-600',
    glowColor: 'rgba(6,182,212,0.6)',
  },
  {
    id: 'heart',
    engineEmote: 'wave',
    icon: '💖',
    labelBn: 'লাভ',
    labelEn: 'Love',
    color: 'from-rose-500 to-pink-600',
    glowColor: 'rgba(236,72,153,0.6)',
  },
  {
    id: 'bow',
    engineEmote: 'royal_bow',
    icon: '👑',
    labelBn: 'কুর্নিশ',
    labelEn: 'Royal Bow',
    color: 'from-amber-400 to-yellow-600',
    glowColor: 'rgba(245,158,11,0.6)',
  },
  {
    id: 'cheer',
    engineEmote: 'jump_cheer',
    icon: '🎉',
    labelBn: 'উচ্ছ্বাস',
    labelEn: 'Cheer',
    color: 'from-emerald-400 to-teal-600',
    glowColor: 'rgba(16,185,129,0.6)',
  },
  {
    id: 'wave',
    engineEmote: 'wave',
    icon: '👋',
    labelBn: 'হাই / হাত নাড়া',
    labelEn: 'Wave',
    color: 'from-purple-500 to-indigo-600',
    glowColor: 'rgba(168,85,247,0.6)',
  },
];

interface EmoteWheelModalProps {
  isOpen: boolean;
  isBn: boolean;
  activeEmote: string | null;
  onClose: () => void;
  onSelectEmote: (emoteId: string, engineEmote: StationEmoteType) => void;
}

export const EmoteWheelModal: React.FC<EmoteWheelModalProps> = ({
  isOpen,
  isBn,
  activeEmote,
  onClose,
  onSelectEmote,
}) => {
  if (!isOpen) return null;

  const radius = 108; // Pixel distance from wheel center

  const handlePick = (emote: EmoteDef) => {
    soundManager.playEmote(emote.id);
    onSelectEmote(emote.id, emote.engineEmote);
    // Smooth auto-close after trigger so user can enjoy full 3D animation
    setTimeout(() => {
      onClose();
    }, 450);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto select-none p-4 animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/90 border-2 border-pink-500/50 shadow-2xl shadow-pink-500/30 max-w-sm w-full mx-auto"
      >
        {/* Top Header Badge */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400 flex items-center justify-center">
              <Smile className="w-4 h-4 text-pink-300" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>{isBn ? '🎭 প্রিন্সেস ইমোট হুইল' : '🎭 Princess Emote Wheel'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="text-[10px] font-bold text-pink-300/80">
                {isBn ? 'যেকোনো একটি ট্যাপ করুন' : 'Tap any emote to play'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-zinc-300 hover:text-white flex items-center justify-center transition-transform active:scale-90"
            title="Close Emote Wheel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Circular / Radial Emote Wheel Arena */}
        <div className="relative w-[280px] h-[280px] sm:w-[310px] sm:h-[310px] flex items-center justify-center my-2">
          {/* Subtle Outer Neon Track Ring */}
          <div className="absolute inset-2 rounded-full border border-pink-500/30 border-dashed animate-spin-slow pointer-events-none" />
          <div className="absolute inset-8 rounded-full border border-cyan-400/20 pointer-events-none" />

          {/* Central Hub Button */}
          <div className="z-10 flex flex-col items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border-2 border-pink-400/80 shadow-xl shadow-pink-500/40 pointer-events-none">
            <span className="text-2xl animate-pulse">👑</span>
            <span className="text-[9px] font-black uppercase text-pink-200 tracking-wider mt-0.5">
              {isBn ? 'ইমোটস' : 'EMOTES'}
            </span>
          </div>

          {/* 6 Radial Emote Nodes */}
          {ALL_START_EMOTES.map((emote, index) => {
            const angleDeg = index * (360 / ALL_START_EMOTES.length) - 90; // Start from top 12 o'clock
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.cos(angleRad) * radius;
            const y = Math.sin(angleRad) * radius;
            const isSelected = activeEmote === emote.id;

            return (
              <button
                key={emote.id}
                onClick={() => handlePick(emote)}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                className={`absolute w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active:scale-90 group shadow-lg ${
                  isSelected
                    ? 'bg-gradient-to-br ' +
                      emote.color +
                      ' border-2 border-white scale-110 shadow-xl shadow-white/40 ring-4 ring-pink-400/60 z-20'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-2 border-pink-400/40 hover:border-pink-300 text-zinc-100'
                }`}
              >
                <span className="text-xl sm:text-2xl leading-none transition-transform group-hover:scale-125 group-active:scale-95">
                  {emote.icon}
                </span>
                <span className="text-[9px] font-black leading-none mt-1 tracking-tight text-white drop-shadow truncate max-w-[54px]">
                  {isBn ? emote.labelBn : emote.labelEn}
                </span>

                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="mt-4 text-center">
          <span className="text-[11px] font-bold text-zinc-300 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
            {isBn
              ? '✨ ট্যাপ করলেই প্রিন্সেস 3D অ্যানিমেশনে ইমোট দেখাবে!'
              : '✨ Tap to trigger instant 3D Princess emote!'}
          </span>
        </div>
      </div>
    </div>
  );
};

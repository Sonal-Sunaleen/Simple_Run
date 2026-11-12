import React from 'react';
import { Play, RotateCcw, Volume2, Music, ShoppingBag, Home, Zap } from 'lucide-react';
import { GameCustomConfig } from '../types/game';

interface PauseMenuProps {
  config: GameCustomConfig;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenStore: () => void;
  onSoundVolumeChange: (vol: number) => void;
  onMusicVolumeChange: (vol: number) => void;
  onToggleQuality: () => void;
  onOpenAdmin?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  config,
  onResume,
  onRestart,
  onHome,
  onOpenStore,
  onSoundVolumeChange,
  onMusicVolumeChange,
  onToggleQuality,
  onOpenAdmin,
}) => {
  const isBn = config.gameplay.language === 'bn';
  const isSmooth = config.gameplay.graphicsQuality === 'smooth';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col gap-4 text-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {isBn ? 'খেলা বিরতি' : 'GAME PAUSED'}
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {isBn ? 'আপনার দৌড় থামানো হয়েছে' : 'Game paused'}
          </p>
        </div>

        {/* 60 FPS Mode Switch */}
        <div 
          onClick={onToggleQuality}
          className={`p-2.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
            isSmooth
              ? 'bg-emerald-950/40 border-emerald-500/60'
              : 'bg-slate-800 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-left">
            <Zap className={`w-4 h-4 ${isSmooth ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <div>
              <div className="text-xs font-bold text-white">
                {isBn ? 'আল্ট্রা স্মুথ মোড (৬০ FPS)' : 'Ultra Smooth 60 FPS'}
              </div>
              <div className="text-[10px] text-zinc-400">
                {isSmooth ? (isBn ? 'সক্রিয় (বাজেট ফোন ফ্রেন্ডলি)' : 'Active (High Performance)') : (isBn ? 'হাই গ্রাফিক্স' : 'High Graphics')}
              </div>
            </div>
          </div>
          <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${isSmooth ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${isSmooth ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Audio Sliders */}
        <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700 flex flex-col gap-2.5 text-left">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                {isBn ? 'শব্দ' : 'Sound FX'}
              </span>
              <span className="font-mono text-zinc-400">
                {Math.round(config.gameplay.soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.gameplay.soundVolume}
              onChange={(e) => onSoundVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                {isBn ? 'সঙ্গীত' : 'Music'}
              </span>
              <span className="font-mono text-zinc-400">
                {Math.round(config.gameplay.musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.gameplay.musicVolume}
              onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onResume}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            {isBn ? 'চালিয়ে যান' : 'RESUME RUN'}
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {isBn ? 'নতুন করে শুরু করুন' : 'Restart Run'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onHome}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              {isBn ? 'মূল মেনু' : 'Main Menu'}
            </button>

            <button
              onClick={onOpenStore}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {isBn ? 'ভিআইপি শপ' : 'VIP Shop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

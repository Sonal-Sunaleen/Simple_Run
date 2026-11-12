import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Trophy, ShoppingBag, Home } from 'lucide-react';
import { GameCustomConfig } from '../types/game';

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHigh: boolean;
  coins: number;
  gems: number;
  distance: number;
  config: GameCustomConfig;
  onRestart: () => void;
  onHome: () => void;
  onOpenStore: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  isNewHigh,
  coins,
  gems,
  distance,
  config,
  onRestart,
  onHome,
  onOpenStore,
}) => {
  const isBn = config.gameplay.language === 'bn';

  useEffect(() => {
    if (isNewHigh) {
      try {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [isNewHigh]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white shadow-2xl flex flex-col gap-5 text-center">
        {/* Banner */}
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-red-400">
            {isBn ? 'খেলা সমাপ্ত' : 'CRASHED!'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isBn ? 'গেম ওভার' : 'GAME OVER'}
          </h2>
          {isNewHigh && (
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full animate-bounce">
              <Trophy className="w-3.5 h-3.5" />
              {isBn ? 'নতুন রেকর্ড স্কোর!' : 'NEW HIGH SCORE!'}
            </div>
          )}
        </div>

        {/* Score Card */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 flex flex-col gap-3">
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wider">
              {isBn ? 'অর্জিত স্কোর' : 'FINAL SCORE'}
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-pink-400">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700 text-xs">
            <div>
              <div className="text-zinc-400 text-[10px]">{isBn ? 'মুদ্রা' : 'Coins'}</div>
              <div className="font-bold font-mono text-yellow-400 tabular-nums">+{coins}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-[10px]">{isBn ? 'রত্ন' : 'Gems'}</div>
              <div className="font-bold font-mono text-rose-400 tabular-nums">+{gems}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-[10px]">{isBn ? 'দূরত্ব' : 'Distance'}</div>
              <div className="font-bold font-mono text-cyan-400 tabular-nums">{distance}m</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            {isBn ? 'আবার খেলুন' : 'PLAY AGAIN'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onHome}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              {isBn ? 'মূল পাতা' : 'Main Menu'}
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

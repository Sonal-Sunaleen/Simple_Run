import React, { useState } from 'react';
import { GameCustomConfig, ShopCategory, ShopItem } from '../types/game';
import { PlayerStats } from '../utils/configStorage';
import { soundManager } from '../game/soundEffects';
import {
  ShoppingBag,
  X,
  Lock,
  Check,
  Clock,
  Coins,
} from 'lucide-react';

interface StoreModalProps {
  config: GameCustomConfig;
  stats: PlayerStats;
  onClose: () => void;
  onEquipItem: (item: ShopItem) => void;
  onUnlockItemWithCoins: (item: ShopItem) => { success: boolean; message: string };
}

export const StoreModal: React.FC<StoreModalProps> = ({
  config,
  stats,
  onClose,
  onEquipItem,
  onUnlockItemWithCoins,
}) => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('character');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const isBn = config.gameplay.language === 'bn';

  const filteredItems = config.shopItems.filter((item) => item.category === activeCategory);

  const isUnlocked = (item: ShopItem) => {
    return Boolean(item.isDefaultUnlocked || stats.unlockedItemIds.includes(item.id));
  };

  const isEquipped = (item: ShopItem) => {
    return stats.equippedItems[item.category] === item.id;
  };

  const getCoinPrice = (item: ShopItem) => {
    return item.priceCoins && item.priceCoins > 0 ? item.priceCoins : 2500;
  };

  const handleCoinPurchase = (item: ShopItem) => {
    const result = onUnlockItemWithCoins(item);
    if (result.success) {
      soundManager.playGem();
      setFeedback({ type: 'success', text: result.message });
      setTimeout(() => setFeedback(null), 2200);
    } else {
      soundManager.playCrash();
      setFeedback({ type: 'error', text: result.message });
      setTimeout(() => setFeedback(null), 2800);
    }
  };

  const handleComingSoonPay = () => {
    setFeedback({
      type: 'info',
      text: isBn
        ? '🚧 Pay অপশনটি শীঘ্রই আসছে (Coming Soon)! আপাতত গেমে পাওয়া কয়েন (🪙) দিয়েই সবকিছু আনলক করুন।'
        : '🚧 Direct Pay is Coming Soon! Unlock items with your earned in-game Coins (🪙) for now.',
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-2.5 sm:p-4 pt-[max(12px,calc(env(safe-area-inset-top,0px)+8px))] pb-[max(12px,calc(env(safe-area-inset-bottom,0px)+8px))] overflow-y-auto select-none font-sans">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700/90 rounded-3xl p-4 sm:p-6 text-white shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center shadow-md shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {isBn ? 'প্রিন্সেস ভিআইপি শপ ও স্টোর' : 'Princess VIP Shop & Store'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {isBn
                  ? 'গেমে অর্জিত কয়েন (🪙) দিয়ে ক্যারেক্টার, ড্রেস, স্কেটবোর্ড ও পোষা প্রাণী আনলক করুন'
                  : 'Unlock Characters, Dresses, Skateboards & Pets using earned Coins (🪙)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Coins Balance */}
            <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-yellow-500/30 text-yellow-400 text-xs font-bold font-mono tabular-nums">
              <span>🪙</span>
              <span>{stats.totalCoins.toLocaleString()}</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-zinc-300 rounded-xl transition-colors"
              title="Close Store"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60">
          {(
            [
              { id: 'character', icon: '👑', labelBn: 'ক্যারেক্টার', labelEn: 'Characters' },
              { id: 'dress', icon: '👗', labelBn: 'ড্রেস', labelEn: 'Dresses' },
              { id: 'skateboard', icon: '🛹', labelBn: 'স্কেটবোর্ড', labelEn: 'Skateboards' },
              { id: 'pet', icon: '🐾', labelBn: 'পোষা প্রাণী', labelEn: 'Pets' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveCategory(tab.id);
                setFeedback(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                activeCategory === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="truncate">{isBn ? tab.labelBn : tab.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : feedback.type === 'info'
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-200'
                : 'bg-red-500/20 border border-red-500/50 text-red-300'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs underline ml-2 shrink-0">
              OK
            </button>
          </div>
        )}

        {/* Store Items Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const unlocked = isUnlocked(item);
            const equipped = isEquipped(item);
            const coinPrice = getCoinPrice(item);
            const canAfford = stats.totalCoins >= coinPrice;

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-all ${
                  equipped
                    ? 'bg-pink-950/30 border-pink-500/80 shadow-lg shadow-pink-500/10'
                    : unlocked
                    ? 'bg-slate-800/80 border-slate-700'
                    : 'bg-slate-800/50 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Visual Swatch */}
                  <div
                    className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl shadow-inner border-2 border-white/20 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${item.previewColors[0]} 0%, ${item.previewColors[1]} 100%)`,
                    }}
                  >
                    {item.category === 'character' && '👑'}
                    {item.category === 'dress' && '👗'}
                    {item.category === 'skateboard' && '🛹'}
                    {item.category === 'pet' && '🐾'}

                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-bold text-sm text-white truncate">
                        {isBn ? item.nameBn || item.name : item.name}
                      </h3>
                      {unlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase shrink-0">
                          {isBn ? 'আনলকড' : 'Unlocked'}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-black font-mono text-yellow-400 flex items-center gap-0.5 shrink-0">
                          <span>🪙</span>
                          <span>{coinPrice.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                      {isBn ? item.descriptionBn || item.description : item.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                  {unlocked ? (
                    <button
                      onClick={() => {
                        soundManager.playPowerup();
                        onEquipItem(item);
                      }}
                      disabled={equipped}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        equipped
                          ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 cursor-default'
                          : 'bg-pink-600 hover:bg-pink-500 text-white shadow-md active:scale-95'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {equipped
                        ? isBn
                          ? 'ব্যবহৃত হচ্ছে (Equipped)'
                          : 'Equipped'
                        : isBn
                        ? 'ব্যবহার করুন (Equip)'
                        : 'Equip Now'}
                    </button>
                  ) : (
                    <>
                      {/* Primary In-Game Coins Unlock Button */}
                      <button
                        onClick={() => handleCoinPurchase(item)}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950'
                            : 'bg-slate-700/90 hover:bg-slate-700 border border-yellow-500/30 text-yellow-300'
                        }`}
                        title={isBn ? 'গেমের কয়েন দিয়ে আনলক করুন' : 'Unlock with In-Game Coins'}
                      >
                        <Coins className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {isBn
                            ? `🪙 ${coinPrice.toLocaleString()} কয়েন`
                            : `🪙 ${coinPrice.toLocaleString()} Coins`}
                        </span>
                      </button>

                      {/* Pay Button (Coming Soon) */}
                      <button
                        type="button"
                        onClick={handleComingSoonPay}
                        className="py-2 px-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-600/70 text-zinc-300 font-bold text-[10px] flex flex-col items-center justify-center leading-tight active:scale-95 transition-all shrink-0"
                        title={isBn ? 'শীঘ্রই আসছে' : 'Coming Soon'}
                      >
                        <span className="flex items-center gap-1 text-zinc-200 font-extrabold">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Pay</span>
                        </span>
                        <span className="text-[8px] font-bold text-amber-300/90 uppercase tracking-tighter">
                          Coming Soon
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


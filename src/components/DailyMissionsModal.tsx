import React, { useState } from 'react';
import {
  GameCustomConfig,
  DailyMissionItem,
  LevelUpRewardConfig,
  ShopItem,
} from '../types/game';
import {
  PlayerStats,
  getXpForNextLevel,
  createDailyMissionForType,
  savePlayerStats,
} from '../utils/configStorage';
import { X, Star, Gift, CheckCircle2, Sparkles, Trophy, Lock } from 'lucide-react';
import { soundManager } from '../game/soundEffects';

interface DailyMissionsModalProps {
  config: GameCustomConfig;
  stats: PlayerStats;
  onClose: () => void;
  onUpdateStats: (nextStats: PlayerStats) => void;
  onEquipShopItem: (item: ShopItem, nextStats?: PlayerStats) => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  config,
  stats,
  onClose,
  onUpdateStats,
  onEquipShopItem,
}) => {
  const isBn = config.gameplay.language === 'bn';
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const xpRequired = getXpForNextLevel(stats.level);
  const xpPercent = Math.min(100, Math.round((stats.xp / Math.max(1, xpRequired)) * 100));

  const adminLevelRewards: LevelUpRewardConfig[] = Array.isArray(config.levelUpRewards)
    ? [...config.levelUpRewards]
        .filter((r) => r && r.enabled !== false && r.level >= 1)
        .sort((a, b) => a.level - b.level)
    : [];

  const handleClaimMission = (mission: DailyMissionItem) => {
    if (mission.progress < mission.target) return;

    soundManager.playPowerup();

    let nextLevel = stats.level;
    let nextXp = stats.xp + mission.rewardXp;
    let nextCoins = stats.totalCoins + mission.rewardCoins;
    let nextGems = stats.totalGems;
    const nextUnlockedIds = new Set(stats.unlockedItemIds);
    const nextClaimedRewardIds = new Set(stats.claimedLevelRewardIds || []);
    let leveledUpCount = 0;

    while (nextXp >= getXpForNextLevel(nextLevel)) {
      nextXp -= getXpForNextLevel(nextLevel);
      nextLevel += 1;
      leveledUpCount += 1;
    }

    // Check if any Admin-configured Level Up Rewards are unlocked at the new level
    const unlockedRewardNames: string[] = [];
    adminLevelRewards.forEach((reward) => {
      if (nextLevel >= reward.level && !nextClaimedRewardIds.has(reward.id)) {
        nextClaimedRewardIds.add(reward.id);
        unlockedRewardNames.push(isBn ? reward.itemNameBn || reward.itemName : reward.itemName);
        if (reward.rewardType === 'shop_item' && reward.shopItemId) {
          nextUnlockedIds.add(reward.shopItemId);
        } else if (reward.rewardType === 'coins') {
          nextCoins += Math.max(0, reward.amount || 500);
        } else if (reward.rewardType === 'gems') {
          nextGems += Math.max(0, reward.amount || 20);
        }
      }
    });

    // Advance this mission to the next stage (tier + 1) so the player can keep leveling up endlessly!
    const nextMissions = (stats.dailyMissions || []).map((m) => {
      if (m.id !== mission.id) return m;
      return createDailyMissionForType(mission.type, (mission.tier || 1) + 1);
    });

    const nextStats: PlayerStats = {
      ...stats,
      level: nextLevel,
      xp: nextXp,
      totalCoins: nextCoins,
      totalGems: nextGems,
      unlockedItemIds: Array.from(nextUnlockedIds),
      claimedLevelRewardIds: Array.from(nextClaimedRewardIds),
      dailyMissions: nextMissions,
    };

    savePlayerStats(nextStats);
    onUpdateStats(nextStats);

    if (leveledUpCount > 0) {
      if (unlockedRewardNames.length > 0) {
        setBannerMsg(
          isBn
            ? `🎉 লেভেল ${nextLevel} আপ! আপনি ফ্রিতে পেয়েছেন: ${unlockedRewardNames.join(', ')}!`
            : `🎉 Level ${nextLevel} Up! Unlocked for FREE: ${unlockedRewardNames.join(', ')}!`
        );
      } else {
        setBannerMsg(
          isBn
            ? `🎉 অভিনন্দন! আপনি লেভেল ${nextLevel}-এ উন্নীত হয়েছেন! (+${mission.rewardXp} XP, +${mission.rewardCoins} কয়েন)`
            : `🎉 Level Up! You reached Level ${nextLevel}! (+${mission.rewardXp} XP, +${mission.rewardCoins} Coins)`
        );
      }
    } else {
      setBannerMsg(
        isBn
          ? `✅ মিশন সম্পন্ন! +${mission.rewardXp} XP এবং +${mission.rewardCoins} কয়েন যুক্ত হয়েছে!`
          : `✅ Mission Claimed! +${mission.rewardXp} XP & +${mission.rewardCoins} Coins added!`
      );
    }
  };

  const handleClaimOrEquipLevelReward = (reward: LevelUpRewardConfig) => {
    if (stats.level < reward.level) return;

    const isClaimed = (stats.claimedLevelRewardIds || []).includes(reward.id);
    let nextStats = { ...stats };

    if (!isClaimed) {
      soundManager.playPowerup();
      const nextUnlockedIds = new Set(stats.unlockedItemIds);
      const nextClaimedIds = new Set(stats.claimedLevelRewardIds || []);
      nextClaimedIds.add(reward.id);

      let nextCoins = stats.totalCoins;
      let nextGems = stats.totalGems;

      if (reward.rewardType === 'shop_item' && reward.shopItemId) {
        nextUnlockedIds.add(reward.shopItemId);
      } else if (reward.rewardType === 'coins') {
        nextCoins += Math.max(0, reward.amount || 500);
      } else if (reward.rewardType === 'gems') {
        nextGems += Math.max(0, reward.amount || 20);
      }

      nextStats = {
        ...stats,
        totalCoins: nextCoins,
        totalGems: nextGems,
        unlockedItemIds: Array.from(nextUnlockedIds),
        claimedLevelRewardIds: Array.from(nextClaimedIds),
      };
      savePlayerStats(nextStats);
      onUpdateStats(nextStats);
    }

    if (reward.rewardType === 'shop_item' && reward.shopItemId) {
      const targetShopItem = config.shopItems.find((i) => i.id === reward.shopItemId);
      if (targetShopItem) {
        onEquipShopItem(targetShopItem, nextStats);
        setBannerMsg(
          isBn
            ? `👑 "${targetShopItem.nameBn}" ফ্রিতে আনলক ও ব্যবহৃত (Equipped) হয়েছে!`
            : `👑 "${targetShopItem.name}" unlocked for free & equipped!`
        );
        return;
      }
    }

    setBannerMsg(
      isBn
        ? `🎁 লেভেল ${reward.level} পুরস্কার "${reward.itemNameBn}" গ্রহণ করা হয়েছে!`
        : `🎁 Level ${reward.level} reward "${reward.itemName}" claimed!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-5 select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
              🎯
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Daily Mission's</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
                  {isBn ? `লেভেল ${stats.level}` : `LV. ${stats.level}`}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                {isBn
                  ? 'মিশন সম্পূর্ণ করে এক্সপিরিয়েন্স (XP) ও কয়েন পান এবং লেভেল আপ করুন!'
                  : 'Complete missions to earn Experience (XP) & Coins and Level Up!'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-zinc-300 border border-slate-700 transition-transform active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Level & XP Progress Card */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950/80 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 font-black text-xs sm:text-sm text-white shadow-md flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>{isBn ? `লেভেল ${stats.level}` : `LEVEL ${stats.level}`}</span>
              </div>
              <span className="text-xs font-bold text-cyan-300 font-mono">
                ✨ XP: {stats.xp.toLocaleString()} / {xpRequired.toLocaleString()} ({xpPercent}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-xl border border-yellow-500/40 text-xs font-black text-yellow-300 font-mono">
                <span>🪙</span>
                <span>{stats.totalCoins.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Animated XP Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 transition-all duration-500"
              style={{ width: `${Math.max(4, xpPercent)}%` }}
            />
          </div>

          {bannerMsg && (
            <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-pulse">
              <span>{bannerMsg}</span>
              <button
                onClick={() => setBannerMsg(null)}
                className="text-emerald-300 hover:text-white text-[10px] font-black uppercase"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content: Missions + Admin-Configured Level Up Rewards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Active Daily Missions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{isBn ? 'আজকের মিশনসমূহ (Daily Missions)' : "Today's Missions"}</span>
              </h3>
              <span className="text-[11px] text-zinc-400 font-semibold">
                {isBn ? 'সম্পূর্ণ করলেই XP ও কয়েন!' : 'Complete for XP & Coins!'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(stats.dailyMissions || []).map((mission) => {
                const isCompleted = mission.progress >= mission.target;
                const pct = Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100));

                return (
                  <div
                    key={mission.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-400/60 shadow-lg shadow-emerald-950/40'
                        : 'bg-slate-800/70 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                          {mission.icon}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-white leading-tight">
                            {isBn ? mission.titleBn : mission.titleEn}
                          </div>
                          <div className="text-[11px] text-zinc-300 mt-0.5">
                            {isBn ? mission.descBn : mission.descEn}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reward Badges */}
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                          +{mission.rewardXp} XP
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300">
                          +{mission.rewardCoins} 🪙
                        </span>
                      </div>
                      <span className="font-mono text-zinc-300">
                        {mission.progress.toLocaleString()} / {mission.target.toLocaleString()}
                      </span>
                    </div>

                    {/* Progress bar + Claim Button */}
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                              : 'bg-gradient-to-r from-pink-500 to-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {isCompleted ? (
                        <button
                          onClick={() => handleClaimMission(mission)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 animate-pulse"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isBn
                              ? `পুরস্কার নিন (+${mission.rewardXp} XP ও +${mission.rewardCoins} 🪙)`
                              : `CLAIM (+${mission.rewardXp} XP & +${mission.rewardCoins} 🪙)`}
                          </span>
                        </button>
                      ) : (
                        <div className="text-[10px] text-center text-zinc-400 font-semibold py-1 bg-slate-900/60 rounded-lg">
                          {isBn ? `অগ্রগতি: ${pct}% সম্পূর্ণ` : `Progress: ${pct}% Complete`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Level Up Special Rewards (Only if configured in Admin Panel!) */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm sm:text-base font-black text-pink-300 flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-400" />
                <span>
                  {isBn ? 'লেভেল আপ ফ্রি পুরস্কার (Level Up Rewards)' : 'Level Up Free Rewards'}
                </span>
              </h3>
            </div>

            {adminLevelRewards.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {isBn
                    ? 'মিশন সম্পূর্ণ করে XP ও কয়েন অর্জন করুন এবং যত খুশি লেভেল আপ করুন! (বর্তমানে কোনো নির্দিষ্ট লেভেলে ফ্রি আইটেম সেট করা নেই।)'
                    : 'Complete missions to earn XP & Coins and level up endlessly! (No special level-up free items are currently set.)'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {adminLevelRewards.map((reward) => {
                  const isUnlocked = stats.level >= reward.level;
                  const isClaimed = (stats.claimedLevelRewardIds || []).includes(reward.id);
                  const linkedShopItem =
                    reward.rewardType === 'shop_item' && reward.shopItemId
                      ? config.shopItems.find((i) => i.id === reward.shopItemId)
                      : undefined;
                  const isEquipped =
                    linkedShopItem &&
                    stats.equippedItems[linkedShopItem.category] === linkedShopItem.id;

                  return (
                    <div
                      key={reward.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-pink-950/50 via-purple-950/40 to-slate-900 border-pink-400/60 shadow-lg'
                          : 'bg-slate-950/70 border-slate-800 opacity-85'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black ${
                            isUnlocked
                              ? 'bg-pink-500 text-white'
                              : 'bg-slate-800 text-zinc-400 border border-slate-700'
                          }`}
                        >
                          {isBn ? `লেভেল ${reward.level}` : `LEVEL ${reward.level}`}
                        </span>
                        <span className="text-[11px] font-extrabold text-emerald-300">
                          {isBn ? '🎁 ১০০% ফ্রি পুরস্কার' : '🎁 100% FREE'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-pink-500/40 flex items-center justify-center text-lg">
                          {reward.rewardType === 'shop_item'
                            ? reward.itemCategory === 'character'
                              ? '👑'
                              : reward.itemCategory === 'dress'
                              ? '👗'
                              : reward.itemCategory === 'skateboard'
                              ? '🛹'
                              : '🐾'
                            : reward.rewardType === 'coins'
                            ? '🪙'
                            : '💎'}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-white">
                            {isBn ? reward.itemNameBn || reward.itemName : reward.itemName}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {isUnlocked
                              ? isBn
                                ? 'লেভেল সম্পূর্ণ! আপনার জন্য ফ্রি আনলক হয়েছে'
                                : 'Level reached! Unlocked for free'
                              : isBn
                              ? `লেভেল ${reward.level}-এ পৌঁছালে ফ্রিতে পাবেন`
                              : `Reach Level ${reward.level} to get for free`}
                          </div>
                        </div>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleClaimOrEquipLevelReward(reward)}
                          className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                            isEquipped
                              ? 'bg-emerald-600/30 border border-emerald-400/50 text-emerald-200'
                              : 'bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white shadow-md'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isEquipped
                              ? isBn
                                ? '✓ ব্যবহৃত হচ্ছে (Equipped)'
                                : '✓ Equipped'
                              : isClaimed && reward.rewardType === 'shop_item'
                              ? isBn
                                ? '👑 এখনই ব্যবহার করুন (Equip Free)'
                                : '👑 Equip Now'
                              : isClaimed
                              ? isBn
                                ? '✓ গ্রহণ করা হয়েছে'
                                : '✓ Claimed'
                              : isBn
                              ? '🎁 ফ্রিতে নিন ও ব্যবহার করুন'
                              : '🎁 Claim Free Reward'}
                          </span>
                        </button>
                      ) : (
                        <div className="w-full py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-zinc-400 text-[11px] font-bold flex items-center justify-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {isBn
                              ? `আরও ${reward.level - stats.level} লেভেল বাকি`
                              : `${reward.level - stats.level} more level(s) needed`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

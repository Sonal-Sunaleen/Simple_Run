import React, { useState } from 'react';
import { GameCustomConfig, ShopCategory, ShopItem } from '../types/game';
import { PlayerStats } from '../utils/configStorage';
import { soundManager } from '../game/soundEffects';
import {
  ShoppingBag,
  X,
  Lock,
  Check,
  Copy,
  Smartphone,
  QrCode,
  KeyRound,
  Sparkles,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';

interface StoreModalProps {
  config: GameCustomConfig;
  stats: PlayerStats;
  onClose: () => void;
  onEquipItem: (item: ShopItem) => void;
  onUnlockItemWithUpi: (item: ShopItem, utrOrCode: string) => { success: boolean; message: string };
  onUnlockItemWithCoins: (item: ShopItem) => { success: boolean; message: string };
}

export const StoreModal: React.FC<StoreModalProps> = ({
  config,
  stats,
  onClose,
  onEquipItem,
  onUnlockItemWithUpi,
  onUnlockItemWithCoins,
}) => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('character');
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<ShopItem | null>(null);
  const [inputCodeOrUtr, setInputCodeOrUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isBn = config.gameplay.language === 'bn';
  const upi = config.upiConfig;

  const filteredItems = config.shopItems.filter((item) => item.category === activeCategory);

  const isUnlocked = (item: ShopItem) => {
    return Boolean(item.isDefaultUnlocked || stats.unlockedItemIds.includes(item.id));
  };

  const isEquipped = (item: ShopItem) => {
    return stats.equippedItems[item.category] === item.id;
  };

  const handleCopyUpiId = () => {
    navigator.clipboard?.writeText(upi.upiId).catch(() => {});
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerifyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForPayment) return;

    const result = onUnlockItemWithUpi(selectedItemForPayment, inputCodeOrUtr.trim());
    if (result.success) {
      soundManager.playGem();
      setFeedback({ type: 'success', text: result.message });
      setInputCodeOrUtr('');
      setTimeout(() => {
        setSelectedItemForPayment(null);
        setFeedback(null);
      }, 1500);
    } else {
      soundManager.playCrash();
      setFeedback({ type: 'error', text: result.message });
    }
  };

  const handleCoinPurchase = (item: ShopItem) => {
    const result = onUnlockItemWithCoins(item);
    if (result.success) {
      soundManager.playGem();
      setFeedback({ type: 'success', text: result.message });
      setTimeout(() => setFeedback(null), 2000);
    } else {
      soundManager.playCrash();
      setFeedback({ type: 'error', text: result.message });
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const getUpiDeepLink = (item: ShopItem) => {
    const pa = encodeURIComponent(upi.upiId.trim());
    const pn = encodeURIComponent(upi.merchantName.trim() || 'Princess Store');
    const am = encodeURIComponent(item.priceInr.toFixed(2));
    const tn = encodeURIComponent(`Unlock ${item.name}`);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
  };

  const getWhatsappLink = (item: ShopItem) => {
    const cleanPhone = upi.whatsappNumber.replace(/[^0-9]/g, '');
    const msg = isBn
      ? `হ্যালো! আমি Subway Princess গেমে "${item.nameBn}" আনলক করার জন্য ₹${item.priceInr} UPI পেমেন্ট করেছি। দয়া করে আমাকে আনলক কোড দিন।`
      : `Hello! I paid ₹${item.priceInr} via UPI to unlock "${item.name}" in Subway Princess Runner. Please share my unlock code.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-2.5 sm:p-4 overflow-y-auto select-none font-sans">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700/90 rounded-3xl p-4 sm:p-6 text-white shadow-2xl flex flex-col gap-4 max-h-[94vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center shadow-md">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {isBn ? 'প্রিন্সেস ভিআইপি শপ ও স্টোর' : 'Princess VIP Shop & Store'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {isBn
                  ? 'নতুন ক্যারেক্টার, ড্রেস, স্কেটবোর্ড ও পোষা প্রাণী আনলক করুন'
                  : 'Unlock exclusive Characters, Dresses, Skateboards & Pets'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        {feedback && !selectedItemForPayment && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-red-500/20 border border-red-500/50 text-red-300'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs underline ml-2">
              OK
            </button>
          </div>
        )}

        {/* Store Items Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const unlocked = isUnlocked(item);
            const equipped = isEquipped(item);

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
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">
                          {isBn ? 'আনলকড' : 'Unlocked'}
                        </span>
                      ) : (
                        <span className="text-sm font-black font-mono text-amber-400">
                          ₹{item.priceInr}
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
                      {/* Primary UPI Unlock Button */}
                      <button
                        onClick={() => {
                          setSelectedItemForPayment(item);
                          setInputCodeOrUtr('');
                          setFeedback(null);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        {isBn ? `₹${item.priceInr} UPI আনলক` : `Unlock ₹${item.priceInr} UPI`}
                      </button>

                      {/* Optional Coin Purchase Button */}
                      {item.priceCoins && item.priceCoins > 0 ? (
                        <button
                          onClick={() => handleCoinPurchase(item)}
                          className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-yellow-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                          title={isBn ? 'কয়েন দিয়ে কিনুন' : 'Buy with Coins'}
                        >
                          <span>🪙</span>
                          <span className="font-mono">{item.priceCoins}</span>
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= UPI PAYMENT & UNLOCK MODAL ================= */}
      {selectedItemForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-5 text-white shadow-2xl flex flex-col gap-4 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {isBn ? 'ভারতীয় UPI পেমেন্ট গেটওয়ে' : 'Instant UPI Unlock'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isBn ? selectedItemForPayment.nameBn : selectedItemForPayment.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono text-amber-400">
                  ₹{selectedItemForPayment.priceInr}
                </span>
                <button
                  onClick={() => {
                    setSelectedItemForPayment(null);
                    setFeedback(null);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step 1: UPI QR Code & UPI ID */}
            <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 flex flex-col items-center gap-3 text-center">
              <div className="text-xs font-semibold text-zinc-200">
                {isBn
                  ? `ধাপ ১: নিচের UPI QR কোড স্ক্যান করুন অথবা UPI ID-তে ₹${selectedItemForPayment.priceInr} পাঠান`
                  : `Step 1: Scan UPI QR or send ₹${selectedItemForPayment.priceInr} to UPI ID`}
              </div>

              {/* QR Display */}
              <div className="bg-white p-3 rounded-2xl shadow-md flex flex-col items-center justify-center">
                <img
                  src={
                    upi.qrCodeImageUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(
                      getUpiDeepLink(selectedItemForPayment)
                    )}`
                  }
                  alt="UPI QR Code"
                  referrerPolicy="no-referrer"
                  className="w-40 h-40 object-contain rounded-lg"
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <span className="truncate max-w-[120px]">{upi.merchantName}</span>
                  <span className="text-pink-600 font-mono font-black">
                    ₹{selectedItemForPayment.priceInr}
                  </span>
                </div>
              </div>

              {/* UPI ID Copy Box */}
              <div className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                <div className="text-left truncate pr-2">
                  <div className="text-[9px] uppercase text-zinc-400">UPI ID</div>
                  <div className="text-xs font-mono font-bold text-amber-300 truncate">
                    {upi.upiId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUpi ? (isBn ? 'কপি হয়েছে' : 'Copied') : isBn ? 'কপি' : 'Copy'}
                </button>
              </div>

              {/* Direct Mobile UPI Deep Link Button */}
              <a
                href={getUpiDeepLink(selectedItemForPayment)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                {isBn
                  ? `UPI অ্যাপ দিয়ে ₹${selectedItemForPayment.priceInr} পেমেন্ট করুন (GPay/PhonePe)`
                  : `Pay ₹${selectedItemForPayment.priceInr} with UPI App (GPay / PhonePe)`}
              </a>

              {/* Optional WhatsApp Contact for Code */}
              {upi.whatsappNumber && (
                <a
                  href={getWhatsappLink(selectedItemForPayment)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {isBn
                    ? 'পেমেন্ট শেষে WhatsApp-এ আনলক কোড নিন'
                    : 'Get Unlock Code on WhatsApp after payment'}
                </a>
              )}
            </div>

            {/* Step 2: Enter Unlock Code or 12-Digit UTR */}
            <form onSubmit={handleVerifyPayment} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  {upi.verificationMode === 'code_only'
                    ? isBn
                      ? 'ধাপ ২: আপনার সিক্রেট আনলক কোডটি লিখুন:'
                      : 'Step 2: Enter Secret Unlock Code:'
                    : isBn
                    ? 'ধাপ ২: ১২ সংখ্যার UPI UTR / Ref নম্বর অথবা আনলক কোড লিখুন:'
                    : 'Step 2: Enter 12-Digit UPI UTR / Ref No. or Unlock Code:'}
                </label>
                <input
                  type="text"
                  required
                  value={inputCodeOrUtr}
                  onChange={(e) => setInputCodeOrUtr(e.target.value)}
                  placeholder={
                    upi.verificationMode === 'code_only'
                      ? isBn
                        ? 'যেমন: अनलॉक কোড লিখুন'
                        : 'Enter Unlock Code'
                      : isBn
                      ? '১২ সংখ্যার UTR নম্বর বা আনলক কোড'
                      : '12-digit UTR number or Unlock Code'
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none"
                />
              </div>

              {feedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-500/20 border border-red-500/40 text-red-300'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                {isBn ? 'ভেরিফাই ও আনলক করুন' : 'Verify & Unlock Now'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

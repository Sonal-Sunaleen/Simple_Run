import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  GameCustomConfig, 
  EnvironmentTheme, 
  CharacterModelType, 
  PetType, 
  PetPerk,
  ParticleTheme,
  ShopCategory,
  ShopItem,
  RoadsideShopKeeperConfig
} from '../types/game';
import { 
  loadGameConfig, 
  saveGameConfig, 
  resetGameConfig, 
  loadPlayerStats,
  savePlayerStats,
  CHARACTER_PRESETS, 
  PET_PRESETS, 
  THEME_PRESETS,
  DEFAULT_SKATEBOARD,
  DEFAULT_CONFIG
} from '../utils/configStorage';
import { PrincessCharacter } from '../game/CharacterModel';
import { PetCompanion } from '../game/PetModel';
import { 
  Crown, 
  Sparkles, 
  Sliders, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Play, 
  Image as ImageIcon, 
  Trash2, 
  Plus,
  Compass,
  QrCode,
  Lock,
  Copy,
  ShoppingBag,
  Share2,
  KeyRound
} from 'lucide-react';

interface AdminAppProps {
  onBackToGame?: () => void;
  isStandalonePage?: boolean;
}

type AdminTab = 'import_3d' | 'upi_shop' | 'character' | 'pet' | 'environment' | 'billboards' | 'gameplay';

export const AdminApp: React.FC<AdminAppProps> = ({ onBackToGame, isStandalonePage = false }) => {
  const [config, setConfig] = useState<GameCustomConfig>(loadGameConfig());
  const [activeTab, setActiveTab] = useState<AdminTab>('import_3d');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewBoardVisible, setPreviewBoardVisible] = useState(false);
  const [shopFilter, setShopFilter] = useState<ShopCategory>('character');
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingShopItemId, setEditingShopItemId] = useState<string | null>(null);
  const [selectedRoadsideSlotIndex, setSelectedRoadsideSlotIndex] = useState<number>(0);

  // 3D Model File Import State
  const [extModelUrl, setExtModelUrl] = useState<string>('');
  const [extModelName, setExtModelName] = useState<string>(() => config.princess.name || 'কাস্টম সাইবার ক্যারেক্টার');
  const [extModelPriceInr, setExtModelPriceInr] = useState<number>(39);
  const [extModelUnlockCode, setExtModelUnlockCode] = useState<string>('HERO39');
  const [extModelStatus, setExtModelStatus] = useState<string | null>(null);
  const extFileInputRef = useRef<HTMLInputElement>(null);

  // Admin PIN Authentication State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('subway_princess_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const previewCanvasRef = useRef<HTMLDivElement>(null);

  // Three.js Preview Refs
  const previewSceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    princess: PrincessCharacter;
    pet: PetCompanion;
    animId: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Initialize or update 3D Preview when unlocked
  useEffect(() => {
    if (!isUnlocked || !previewCanvasRef.current) return;
    const container = previewCanvasRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.environment.skyColor);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 3.8);
    camera.lookAt(0, 0.95, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Light
    const amb = new THREE.AmbientLight(config.environment.ambientLightColor || '#ffffff', 0.85);
    scene.add(amb);
    const hemi = new THREE.HemisphereLight(
      config.environment.skyColor,
      config.environment.trackColor,
      0.65
    );
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(config.environment.directionalLightColor || '#fff9db', 1.25);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    // Character (no bulky circular pedestal disc)
    const princess = new PrincessCharacter(config.princess);
    princess.setHoverboard(previewBoardVisible);
    scene.add(princess.group);

    // Pet
    const pet = new PetCompanion(config.pet);
    pet.group.position.set(-1.1, 0, 0.3);
    scene.add(pet.group);

    // Drag to rotate preview
    let isDragging = false;
    let prevMouseX = 0;
    let targetRotationY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      targetRotationY += deltaX * 0.01;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let lastT = performance.now();
    let animId = 0;

    const animate = (time: number) => {
      const delta = Math.min((time - lastT) / 1000, 0.1);
      lastT = time;

      scene.rotation.y = targetRotationY;
      princess.animate(delta, 12);
      pet.animate(delta, 12, false);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    previewSceneRef.current = {
      renderer,
      scene,
      camera,
      princess,
      pet,
      animId,
    };

    const handleResize = () => {
      if (!previewCanvasRef.current || !renderer || !camera) return;
      const w = previewCanvasRef.current.clientWidth;
      const h = previewCanvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [isUnlocked]);

  // Update 3D preview when state changes
  useEffect(() => {
    if (!previewSceneRef.current) return;
    const { princess, pet, scene } = previewSceneRef.current;
    princess.updateConfig(config.princess);
    princess.setHoverboard(previewBoardVisible);
    pet.updateConfig(config.pet);
    scene.background = new THREE.Color(config.environment.skyColor);
  }, [config, previewBoardVisible]);

  const handleSave = () => {
    saveGameConfig(config, true);
    setSaveSuccess(true);
    showToast(isBn ? 'সমস্ত পরিবর্তন ও স্টোর কনফিগ সার্ভারে সংরক্ষিত হয়েছে!' : 'All changes & Store settings saved to server!');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    const def = resetGameConfig();
    setConfig(def);
    setSaveSuccess(true);
    showToast(isBn ? 'ডিফল্ট সেটিংসে রিসেট করা হয়েছে!' : 'Reset to default settings!');
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `subway_princess_config_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.princess && parsed.environment) {
          setConfig(parsed);
          saveGameConfig(parsed);
          showToast('Config imported successfully!');
        } else {
          showToast('Invalid JSON config format.');
        }
      } catch {
        showToast('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const res = ev.target?.result as string;
        if (res) {
          setConfig((prev) => ({
            ...prev,
            environment: {
              ...prev.environment,
              billboardImages: [...prev.environment.billboardImages, res].slice(-6),
            },
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setConfig((prev) => ({
          ...prev,
          upiConfig: {
            ...prev.upiConfig,
            qrCodeImageUrl: res,
          },
        }));
        showToast(isBn ? 'UPI QR কোড ছবি আপলোড হয়েছে!' : 'UPI QR Code uploaded!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtModelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtModelStatus(isBn ? `⏳ ৩ডি ফাইল লোড হচ্ছে: ${file.name}...` : `Loading ${file.name}...`);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setExtModelUrl(dataUrl);
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setExtModelName(cleanName);
        setExtModelStatus(isBn ? `✅ ৩ডি ক্যারেক্টার ফাইল তৈরি: ${file.name}` : `✅ Loaded ${file.name}`);
        setConfig((prev) => ({
          ...prev,
          princess: {
            ...prev.princess,
            name: cleanName,
            customModelUrl: dataUrl,
          },
        }));
        showToast(isBn ? `📁 ৩ডি ফাইল লোড হয়েছে: ${file.name}` : `3D file loaded!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdd3DModelToStore = () => {
    const modelUrl = extModelUrl || config.princess.customModelUrl || '';
    if (!modelUrl) {
      showToast(isBn ? '⚠️ দয়া করে প্রথমে একটি ৩ডি ক্যারেক্টার ফাইল বাছুন!' : 'Please pick a 3D file first!');
      return;
    }
    const id = `custom_char_${Date.now()}`;
    const code = extModelUnlockCode || `HERO${Math.floor(100 + Math.random() * 900)}`;
    const itemName = extModelName.trim() || config.princess.name || 'Custom Character';

    const newItem: ShopItem = {
      id,
      category: 'character',
      name: itemName,
      nameBn: itemName,
      description: 'Custom imported 3D runner character',
      descriptionBn: 'কাস্টম ইমপোর্টেড ৩ডি রানার ক্যারেক্টার',
      priceInr: extModelPriceInr,
      priceCoins: 3000,
      unlockCode: code,
      isDefaultUnlocked: true,
      previewColors: ['#ec4899', '#38bdf8'],
      isExternalAsset: true,
      customModelUrl: modelUrl,
      characterData: {
        ...config.princess,
        name: itemName,
        // Avoid duplicating huge base64 string inside characterData; item.customModelUrl holds it
        customModelUrl: '',
      },
    };

    // Deduplicate any previous custom character with the exact same name so storage stays fast and lean
    const filteredExisting = config.shopItems.filter(
      (it) => !(it.id.startsWith('custom_') && it.category === 'character' && it.name === itemName)
    );

    const updated: GameCustomConfig = {
      ...config,
      princess: {
        ...config.princess,
        name: itemName,
        customModelUrl: modelUrl,
      },
      shopItems: [newItem, ...filteredExisting],
    };

    // Automatically unlock and equip the newly added character for the player
    const currentStats = loadPlayerStats();
    savePlayerStats({
      ...currentStats,
      unlockedItemIds: Array.from(new Set([...currentStats.unlockedItemIds, id])),
      equippedItems: {
        ...currentStats.equippedItems,
        character: id,
      },
    });

    setConfig(updated);
    saveGameConfig(updated, true);
    setShopFilter('character');
    setActiveTab('upi_shop');
    showToast(
      isBn
        ? `🎉 "${itemName}" ৩ডি ক্যারেক্টার শপে যোগ ও ইকুইপ করা হয়েছে! (কোড: ${code})`
        : `🎉 Added 3D character "${itemName}" to Store!`
    );
  };

  const removeBillboardImage = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      environment: {
        ...prev.environment,
        billboardImages: prev.environment.billboardImages.filter((_, i) => i !== idx),
      },
    }));
  };

  // Add current 3D design to the Store
  const handleAddCurrentDesignToStore = (category: ShopCategory) => {
    const id = `custom_${category}_${Date.now()}`;
    const randomCode = `VIP${Math.floor(100 + Math.random() * 900)}`;
    let newItem: ShopItem;

    if (category === 'character') {
      const charName = config.princess.name || extModelName || 'Custom Princess';
      const charModelUrl = extModelUrl || config.princess.customModelUrl || '';
      newItem = {
        id,
        category: 'character',
        name: charName,
        nameBn: charName,
        description: 'Exclusive custom character created in Admin Studio',
        descriptionBn: 'অ্যাডমিন স্টুডিওতে তৈরি বিশেষ ভিআইপি ক্যারেক্টার',
        priceInr: 39,
        priceCoins: 3000,
        unlockCode: randomCode,
        isDefaultUnlocked: true,
        previewColors: [config.princess.outfitColor, config.princess.hairColor],
        isExternalAsset: !!charModelUrl,
        customModelUrl: charModelUrl,
        characterData: {
          ...config.princess,
          name: charName,
          customModelUrl: '',
        },
      };
    } else if (category === 'dress') {
      newItem = {
        id,
        category: 'dress',
        name: `${config.princess.name} Royal Dress`,
        nameBn: `${config.princess.name} স্পেশাল ড্রেস`,
        description: 'Custom designer outfit & cape set',
        descriptionBn: 'কাস্টম ডিজাইনার পোশাক ও মুকুট সেট',
        priceInr: 25,
        priceCoins: 2000,
        unlockCode: randomCode,
        isDefaultUnlocked: false,
        previewColors: [config.princess.outfitColor, config.princess.outfitSecondaryColor],
        dressData: {
          outfitColor: config.princess.outfitColor,
          outfitSecondaryColor: config.princess.outfitSecondaryColor,
          capeColor: config.princess.capeColor,
          crownColor: config.princess.crownColor,
          hasCrown: config.princess.hasCrown,
          hasCape: config.princess.hasCape,
        },
      };
    } else if (category === 'skateboard') {
      const sb = config.princess.skateboard || DEFAULT_SKATEBOARD;
      newItem = {
        id,
        category: 'skateboard',
        name: sb.name || 'Custom VIP Skateboard',
        nameBn: sb.name || 'কাস্টম ভিআইপি স্কেটবোর্ড',
        description: `+${sb.bonusBoards} Extra Starting Boards every run!`,
        descriptionBn: `প্রতি গেমে +${sb.bonusBoards}টি অতিরিক্ত বোর্ড শিল্ড!`,
        priceInr: 29,
        priceCoins: 2500,
        unlockCode: randomCode,
        isDefaultUnlocked: false,
        previewColors: [sb.boardColor, sb.trimColor],
        skateboardData: { ...sb, id },
      };
    } else {
      newItem = {
        id,
        category: 'pet',
        name: config.pet.name || 'Custom VIP Pet',
        nameBn: config.pet.name || 'কাস্টম পোষা প্রাণী',
        description: config.pet.perkDescription || 'Special companion pet',
        descriptionBn: config.pet.perkDescription || 'বিশেষ সঙ্গী পোষা প্রাণী',
        priceInr: 29,
        priceCoins: 2500,
        unlockCode: randomCode,
        isDefaultUnlocked: false,
        previewColors: [config.pet.color, config.pet.secondaryColor],
        petData: { ...config.pet, enabled: true },
      };
    }

    const filteredExisting = config.shopItems.filter(
      (it) => !(it.id.startsWith('custom_') && it.category === category && it.name === newItem.name)
    );

    const updated: GameCustomConfig = {
      ...config,
      shopItems: [newItem, ...filteredExisting],
    };

    const currentStats = loadPlayerStats();
    savePlayerStats({
      ...currentStats,
      unlockedItemIds: Array.from(new Set([...currentStats.unlockedItemIds, id])),
      equippedItems: {
        ...currentStats.equippedItems,
        [category]: id,
      },
    });

    setConfig(updated);
    saveGameConfig(updated, true);
    setShopFilter(category);
    setActiveTab('upi_shop');
    showToast(
      isBn
        ? `নতুন "${newItem.nameBn}" শপে যোগ ও ইকুইপ করা হয়েছে! (কোড: ${randomCode})`
        : `Added "${newItem.name}" to Store! (Unlock Code: ${randomCode})`
    );
  };

  const handleUpdateShopItem = (itemId: string, patch: Partial<ShopItem>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        shopItems: prev.shopItems.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      };
      saveGameConfig(next, true);
      return next;
    });
  };

  const handleDeleteShopItem = (itemId: string) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        shopItems: prev.shopItems.filter((it) => it.id !== itemId),
      };
      saveGameConfig(next, true);
      return next;
    });
  };

  const roadsideKeepers: RoadsideShopKeeperConfig[] =
    config.roadsideShopCharacters && config.roadsideShopCharacters.length > 0
      ? config.roadsideShopCharacters
      : DEFAULT_CONFIG.roadsideShopCharacters || [];

  const handleLoadShopItemIntoDesigner = (item: ShopItem) => {
    setEditingShopItemId(item.id);
    if (item.category === 'character') {
      const cd = item.characterData || {};
      const modelUrl = item.customModelUrl || cd.customModelUrl || '';
      if (modelUrl) setExtModelUrl(modelUrl);
      setConfig((prev) => ({
        ...prev,
        princess: {
          ...prev.princess,
          ...cd,
          name: item.nameBn || item.name || cd.name || prev.princess.name,
          customModelUrl: modelUrl,
        },
      }));
      setActiveTab('character');
      showToast(
        isBn
          ? `✏️ "${item.nameBn || item.name}" কাস্টমাইজ করার জন্য ৩ডি ডিজাইনারে লোড হয়েছে!`
          : `✏️ Loaded "${item.name}" into 3D Designer for customization!`
      );
    } else if (item.category === 'dress' && item.dressData) {
      setConfig((prev) => ({
        ...prev,
        princess: {
          ...prev.princess,
          ...item.dressData,
        },
      }));
      setActiveTab('character');
      showToast(
        isBn
          ? `👗 "${item.nameBn || item.name}" ড্রেস কাস্টমাইজ করার জন্য লোড হয়েছে!`
          : `👗 Loaded "${item.name}" into Designer!`
      );
    } else if (item.category === 'skateboard' && item.skateboardData) {
      setPreviewBoardVisible(true);
      setConfig((prev) => ({
        ...prev,
        princess: {
          ...prev.princess,
          skateboard: { ...item.skateboardData! },
        },
      }));
      setActiveTab('character');
      showToast(
        isBn
          ? `🛹 "${item.nameBn || item.name}" স্কেটবোর্ড কাস্টমাইজ করার জন্য লোড হয়েছে!`
          : `🛹 Loaded "${item.name}" into Designer!`
      );
    } else if (item.category === 'pet' && item.petData) {
      setConfig((prev) => ({
        ...prev,
        pet: {
          ...prev.pet,
          ...item.petData,
          enabled: true,
        },
      }));
      setActiveTab('pet');
      showToast(
        isBn
          ? `🐾 "${item.nameBn || item.name}" পোষা প্রাণী কাস্টমাইজ করার জন্য লোড হয়েছে!`
          : `🐾 Loaded "${item.name}" into Pet Designer!`
      );
    }
  };

  const handleSaveCurrentDesignToShopItem = (targetItemId: string) => {
    const targetItem = config.shopItems.find((it) => it.id === targetItemId);
    if (!targetItem) return;

    const charModelUrl = extModelUrl || config.princess.customModelUrl || '';
    const updatedShopItems = config.shopItems.map((it) => {
      if (it.id !== targetItemId) return it;
      if (it.category === 'character') {
        const updatedName = config.princess.name || it.name;
        return {
          ...it,
          name: updatedName,
          nameBn: updatedName,
          previewColors: [config.princess.outfitColor, config.princess.hairColor] as [string, string],
          isExternalAsset: Boolean(charModelUrl),
          customModelUrl: charModelUrl,
          characterData: {
            ...config.princess,
            name: updatedName,
            customModelUrl: '',
          },
        };
      } else if (it.category === 'dress') {
        return {
          ...it,
          previewColors: [config.princess.outfitColor, config.princess.outfitSecondaryColor] as [string, string],
          dressData: {
            outfitColor: config.princess.outfitColor,
            outfitSecondaryColor: config.princess.outfitSecondaryColor,
            capeColor: config.princess.capeColor,
            crownColor: config.princess.crownColor,
            hasCrown: config.princess.hasCrown,
            hasCape: config.princess.hasCape,
          },
        };
      } else if (it.category === 'skateboard') {
        const sb = config.princess.skateboard || DEFAULT_SKATEBOARD;
        return {
          ...it,
          name: sb.name || it.name,
          nameBn: sb.name || it.nameBn,
          previewColors: [sb.boardColor, sb.trimColor] as [string, string],
          skateboardData: { ...sb, id: it.id },
        };
      } else {
        return {
          ...it,
          name: config.pet.name || it.name,
          nameBn: config.pet.name || it.nameBn,
          previewColors: [config.pet.color, config.pet.secondaryColor] as [string, string],
          petData: { ...config.pet, enabled: true },
        };
      }
    });

    const nextConfig: GameCustomConfig = {
      ...config,
      shopItems: updatedShopItems,
    };
    setConfig(nextConfig);
    saveGameConfig(nextConfig, true);
    showToast(
      isBn
        ? `✅ শপের "${targetItem.nameBn || targetItem.name}" সফলভাবে কাস্টমাইজ ও সেট করা হয়েছে!`
        : `✅ Updated & set "${targetItem.name}" in Store!`
    );
  };

  const handleLoadRoadsideKeeperIntoDesigner = (slotIdx: number) => {
    const keeper = roadsideKeepers[slotIdx];
    if (!keeper) return;
    setSelectedRoadsideSlotIndex(slotIdx);
    setEditingShopItemId(null);
    if (keeper.customModelUrl) {
      setExtModelUrl(keeper.customModelUrl);
    }
    setConfig((prev) => ({
      ...prev,
      princess: {
        ...prev.princess,
        name: keeper.name,
        modelType: keeper.modelType,
        skinColor: keeper.skinColor,
        hairColor: keeper.hairColor,
        outfitColor: keeper.outfitColor,
        outfitSecondaryColor: keeper.outfitSecondaryColor,
        crownColor: keeper.crownColor,
        capeColor: keeper.capeColor,
        hasCrown: keeper.hasCrown,
        hasCape: keeper.hasCape,
        customModelUrl: keeper.customModelUrl || '',
        presetType: keeper.presetType,
      },
    }));
    setActiveTab('character');
    showToast(
      isBn
        ? `🏪 "${keeper.roleBn}" কাস্টমাইজ করার জন্য ৩ডি প্রিভিউতে লোড হয়েছে!`
        : `🏪 Loaded "${keeper.roleEn}" into 3D Preview!`
    );
  };

  const handleSetCurrentDesignAsRoadsideKeeper = (slotIdx: number) => {
    const currentList = [...roadsideKeepers];
    const existing = currentList[slotIdx] || {
      id: `shop_keeper_${slotIdx}`,
      enabled: true,
      roleBn: `শপ ক্যারেক্টার #${slotIdx + 1}`,
      roleEn: `Shop Character #${slotIdx + 1}`,
      pose: 'wave' as const,
      ...config.princess,
    };
    const modelUrl = extModelUrl || config.princess.customModelUrl || '';
    currentList[slotIdx] = {
      ...existing,
      enabled: true,
      name: config.princess.name || existing.name,
      modelType: config.princess.modelType,
      skinColor: config.princess.skinColor,
      hairColor: config.princess.hairColor,
      outfitColor: config.princess.outfitColor,
      outfitSecondaryColor: config.princess.outfitSecondaryColor,
      crownColor: config.princess.crownColor,
      capeColor: config.princess.capeColor,
      hasCrown: config.princess.hasCrown,
      hasCape: config.princess.hasCape,
      customModelUrl: modelUrl,
      presetType: config.princess.presetType,
    };

    const nextConfig: GameCustomConfig = {
      ...config,
      roadsideShopCharacters: currentList,
    };
    setConfig(nextConfig);
    saveGameConfig(nextConfig, true);
    showToast(
      isBn
        ? `🏪 "${currentList[slotIdx].name}"-কে রাস্তার শপের পজিশন #${slotIdx + 1}-এ বসিয়ে সেট করা হয়েছে!`
        : `🏪 Set "${currentList[slotIdx].name}" in Roadside Shop Slot #${slotIdx + 1}!`
    );
  };

  const handleUpdateRoadsideKeeperSlot = (
    slotIdx: number,
    patch: Partial<RoadsideShopKeeperConfig>
  ) => {
    const currentList = [...roadsideKeepers];
    if (!currentList[slotIdx]) return;
    currentList[slotIdx] = {
      ...currentList[slotIdx],
      ...patch,
    };
    const nextConfig: GameCustomConfig = {
      ...config,
      roadsideShopCharacters: currentList,
    };
    setConfig(nextConfig);
    saveGameConfig(nextConfig, true);
  };

  const handleAssignStoreCharToRoadsideSlot = (slotIdx: number, storeItem: ShopItem) => {
    const cd = storeItem.characterData || {};
    const modelUrl = storeItem.customModelUrl || cd.customModelUrl || '';
    handleUpdateRoadsideKeeperSlot(slotIdx, {
      enabled: true,
      name: storeItem.nameBn || storeItem.name || cd.name || 'Shop Princess',
      modelType: (cd.modelType as CharacterModelType) || 'royal',
      skinColor: cd.skinColor || '#fed7aa',
      hairColor: cd.hairColor || '#eab308',
      outfitColor: cd.outfitColor || storeItem.previewColors[0] || '#ec4899',
      outfitSecondaryColor: cd.outfitSecondaryColor || storeItem.previewColors[1] || '#a855f7',
      crownColor: cd.crownColor || '#fbbf24',
      capeColor: cd.capeColor || '#f43f5e',
      hasCrown: cd.hasCrown ?? true,
      hasCape: cd.hasCape ?? true,
      customModelUrl: modelUrl,
      presetType: storeItem.presetType || cd.presetType,
    });
    showToast(
      isBn
        ? `🏪 "${storeItem.nameBn || storeItem.name}"-কে রাস্তার শপের পজিশন #${slotIdx + 1}-এ বসানো হয়েছে!`
        : `🏪 Placed "${storeItem.name}" in Roadside Shop Slot #${slotIdx + 1}!`
    );
  };

  const getShareablePlayerUrl = () => {
    const base = window.location.origin + '/';
    const params = new URLSearchParams();
    if (config.upiConfig.upiId) params.set('upi', config.upiConfig.upiId);
    if (config.upiConfig.merchantName) params.set('mn', config.upiConfig.merchantName);
    if (config.upiConfig.whatsappNumber) params.set('wa', config.upiConfig.whatsappNumber);
    return `${base}?${params.toString()}`;
  };

  const handleCopyShareLink = () => {
    navigator.clipboard?.writeText(getShareablePlayerUrl()).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const isBn = config.gameplay.language === 'bn';
  const currentPin = config.upiConfig.adminPin || '1234';

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === currentPin.trim()) {
      sessionStorage.setItem('subway_princess_admin_auth', 'true');
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // ================= ADMIN PIN LOCK SCREEN =================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans select-none">
        <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 mx-auto flex items-center justify-center shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <div>
            <h1 className="text-xl font-black text-white">
              {isBn ? 'অ্যাডমিন স্টুডিও লক' : 'Admin Studio Locked'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {isBn
                ? 'এই প্যানেলটি শুধুমাত্র গেমের মালিকের জন্য সংরক্ষিত। সাধারণ প্লেয়াররা এটি ব্যবহার করতে পারবে না।'
                : 'Restricted to the Game Owner only. Enter your Admin PIN to access.'}
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder={isBn ? 'অ্যাডমিন পিন লিখুন (PIN)' : 'Enter Admin PIN'}
              className="w-full bg-slate-950 border border-slate-700 focus:border-pink-500 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-white focus:outline-none"
              autoFocus
            />

            {pinError && (
              <div className="text-xs font-bold text-red-400">
                {isBn ? 'ভুল পিন! আবার চেষ্টা করুন।' : 'Incorrect PIN! Please try again.'}
              </div>
            )}

            {currentPin === '1234' && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                {isBn
                  ? '💡 প্রথমবার লগইনের ডিফল্ট পিন: 1234 (ভেতরে ঢুকে পিন পরিবর্তন করে নিন)'
                  : '💡 First-time Default PIN: 1234 (Change it inside UPI & Store Settings)'}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 text-white font-black text-sm shadow-lg"
            >
              {isBn ? 'আনলক করুন' : 'Unlock Admin Studio'}
            </button>
          </form>

          <a
            href="/"
            className="text-xs text-zinc-400 hover:text-white underline pt-1"
          >
            {isBn ? '← গেমে ফিরে যান' : '← Back to Game'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Bar Contract: 3 zones */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-md shadow-pink-500/20">
            👑
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">
              {isBn ? 'ওনার অ্যাডমিন ও UPI স্টোর কন্ট্রোল' : 'Owner Admin & UPI Store Studio'}
            </span>
            <div className="text-[11px] text-emerald-400 font-medium">
              {isBn ? '🔒 শুধুমাত্র অ্যাডমিন দেখতে পাচ্ছেন (প্লেয়ারদের কাছে গোপন)' : '🔒 Private Owner Panel (Hidden from players)'}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('import_3d')}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-colors ${
              activeTab === 'import_3d' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm' : 'text-pink-300 hover:text-white'
            }`}
          >
            {isBn ? '📥 ১. ৩ডি ফাইল ইমপোর্ট' : '📥 1. 3D File Import'}
          </button>
          <button
            onClick={() => setActiveTab('upi_shop')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'upi_shop' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-amber-300 hover:text-white'
            }`}
          >
            {isBn ? '💰 ২. UPI ও স্টোর' : '💰 2. UPI & Store'}
          </button>
          <button
            onClick={() => setActiveTab('character')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'character' ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isBn ? '👑 ৩. ক্যারেক্টার' : '3. Character'}
          </button>
          <button
            onClick={() => setActiveTab('pet')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'pet' ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isBn ? '🐾 ৪. পোষা প্রাণী' : '4. Pet Companion'}
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'environment' ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isBn ? '🌆 ৫. ব্যাকগ্রাউন্ড' : '5. Environment'}
          </button>
          <button
            onClick={() => setActiveTab('billboards')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'billboards' ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isBn ? '🖼️ বিলবোর্ড' : 'Billboards'}
          </button>
          <button
            onClick={() => setActiveTab('gameplay')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'gameplay' ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isBn ? '⚙️ গেমপ্লে' : 'Gameplay'}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md shadow-pink-500/25'
            }`}
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {saveSuccess ? (isBn ? 'সংরক্ষিত!' : 'Saved!') : isBn ? 'সেভ করুন' : 'Save Changes'}
          </button>

          {isStandalonePage ? (
            <a
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {isBn ? 'গেম খেলুন' : 'Play Game'}
            </a>
          ) : (
            <button
              onClick={onBackToGame}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {isBn ? 'গেমে ফিরুন' : 'Back to Game'}
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification Banner */}
      {statusMessage && (
        <div className="bg-emerald-600 text-white text-xs font-bold text-center py-2 px-4 shadow-md">
          {statusMessage}
        </div>
      )}

      {/* Mobile Subnav */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-900 border-b border-slate-800">
        {(['import_3d', 'upi_shop', 'character', 'pet', 'environment', 'billboards', 'gameplay'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? tab === 'import_3d'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                  : tab === 'upi_shop'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-pink-600 text-white'
                : 'text-zinc-400 bg-slate-800'
            }`}
          >
            {tab === 'import_3d' ? (isBn ? '📥 ১. ৩ডি ফাইল ইমপোর্ট' : '📥 1. 3D File Import') : ''}
            {tab === 'upi_shop' ? (isBn ? '💰 ২. UPI ও স্টোর' : '💰 2. UPI & Store') : ''}
            {tab === 'character' ? (isBn ? '👑 ৩. ক্যারেক্টার' : '3. Character') : ''}
            {tab === 'pet' ? (isBn ? '🐾 ৪. পোষা প্রাণী' : '4. Pet') : ''}
            {tab === 'environment' ? (isBn ? '🌆 ব্যাকগ্রাউন্ড' : 'Environment') : ''}
            {tab === 'billboards' ? (isBn ? '🖼️ বিলবোর্ড' : 'Billboards') : ''}
            {tab === 'gameplay' ? (isBn ? '⚙️ গেমপ্লে' : 'Gameplay') : ''}
          </button>
        ))}
      </div>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Live Interactive Preview Canvas (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {isBn ? 'লাইভ ৩ডি প্রিভিউ' : 'Live 3D Preview'}
            </span>
            <label className="flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={previewBoardVisible}
                onChange={(e) => setPreviewBoardVisible(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              {isBn ? '🛹 স্কেটবোর্ড দেখান' : '🛹 Show Skateboard'}
            </label>
          </div>

          {/* 3D Canvas Box */}
          <div
            ref={previewCanvasRef}
            className="w-full aspect-square rounded-2xl bg-gradient-to-b from-slate-950/80 to-slate-900 border border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center relative"
          />

          {/* Quick Add Current 3D Design to Store & Roadside Shop */}
          <div className="bg-slate-800/70 p-3 rounded-2xl border border-amber-500/30 space-y-2.5">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              {isBn
                ? '১. এই ৩ডি ডিজাইনটি স্টোরে যোগ করুন:'
                : '1. Add Current 3D Design to VIP Store:'}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleAddCurrentDesignToStore('character')}
                className="py-1.5 px-2 bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/40 rounded-xl text-pink-200 font-bold"
              >
                + {isBn ? 'নতুন ক্যারেক্টার' : 'As Character'}
              </button>
              <button
                type="button"
                onClick={() => handleAddCurrentDesignToStore('dress')}
                className="py-1.5 px-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl text-purple-200 font-bold"
              >
                + {isBn ? 'নতুন ড্রেস' : 'As Dress'}
              </button>
              <button
                type="button"
                onClick={() => handleAddCurrentDesignToStore('skateboard')}
                className="py-1.5 px-2 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 rounded-xl text-cyan-200 font-bold"
              >
                + {isBn ? 'নতুন স্কেটবোর্ড' : 'As Skateboard'}
              </button>
              <button
                type="button"
                onClick={() => handleAddCurrentDesignToStore('pet')}
                className="py-1.5 px-2 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 rounded-xl text-amber-200 font-bold"
              >
                + {isBn ? 'নতুন পোষা প্রাণী' : 'As Pet'}
              </button>
            </div>

            {/* Quick Set Current 3D Character in Roadside Shop */}
            <div className="pt-2 border-t border-slate-700/80 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <span>🏪</span>
                {isBn
                  ? '২. এই ক্যারেক্টারটি রাস্তার পাশের শপে বসান:'
                  : '2. Place Character in 3D Roadside Shop:'}
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {[0, 1, 2].map((slotIdx) => (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => handleSetCurrentDesignAsRoadsideKeeper(slotIdx)}
                    className="py-1.5 px-1.5 bg-emerald-600/25 hover:bg-emerald-600/45 border border-emerald-500/40 rounded-xl text-emerald-200 font-bold truncate"
                  >
                    {slotIdx === 0
                      ? isBn
                        ? '🏪 মাঝের কাউন্টার'
                        : '🏪 Center Slot'
                      : slotIdx === 1
                      ? isBn
                        ? '🏪 বাম পাশ'
                        : '🏪 Left Slot'
                      : isBn
                      ? '🏪 ডান পাশ'
                      : '🏪 Right Slot'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* JSON Export/Import & Reset */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
            <button
              onClick={handleExportJSON}
              className="py-2 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-zinc-300 flex items-center justify-center gap-1 font-semibold transition-colors"
              title="Export JSON"
            >
              <Download className="w-3.5 h-3.5" />
              {isBn ? 'এক্সপোর্ট' : 'Export'}
            </button>

            <label className="py-2 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-zinc-300 flex items-center justify-center gap-1 font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {isBn ? 'ইমপোর্ট' : 'Import'}
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            <button
              onClick={handleReset}
              className="py-2 px-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-300 rounded-xl text-zinc-400 flex items-center justify-center gap-1 font-semibold transition-colors"
              title="Reset Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isBn ? 'রিসেট' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Right Column: Customization Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 flex flex-col gap-6 shadow-xl">
          {/* ================= TAB 1: 3D MODEL FILE IMPORTER ================= */}
          {activeTab === 'import_3d' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-pink-400 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-pink-400" />
                  {isBn ? '📥 কাস্টম ৩ডি মডেল ও ক্যারেক্টার ইমপোর্টার' : '📥 Custom 3D Model & Character Importer'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'আপনার ফোন বা ডিভাইস থেকে যেকোনো .glb, .gltf, বা .obj ৩ডি ফাইল সিলেক্ট করে সরাসরি গেমের স্টোরে যুক্ত করুন:'
                    : 'Select any .glb, .gltf, or .obj 3D file from your device and add it to the game store:'}
                </p>
              </div>

              {/* Prominent Glowing Card for File Pick */}
              <div className="bg-gradient-to-br from-pink-900/40 via-purple-900/30 to-slate-900 border-2 border-pink-500/80 rounded-3xl p-6 text-center shadow-xl shadow-pink-500/20">
                <div className="text-base font-black text-pink-300 flex items-center justify-center gap-2 mb-1">
                  <Upload className="w-5 h-5 text-pink-400" />
                  {isBn ? '১. আপনার ফোন থেকে ৩ডি ক্যারেক্টার ফাইল সিলেক্ট করুন' : '1. Pick 3D File from Your Device'}
                </div>
                <p className="text-xs text-zinc-300 max-w-md mx-auto mb-4">
                  {isBn
                    ? '(.glb, .gltf, .obj ফরম্যাটের যেকোনো কাস্টম ৩ডি ক্যারেক্টার ফাইল এখান থেকে আপলোড হবে)'
                    : '(.glb, .gltf, .obj custom 3D files will be loaded from here)'}
                </p>

                <button
                  type="button"
                  onClick={() => extFileInputRef.current?.click()}
                  className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-pink-500/30 inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  {isBn ? '📁 ৩ডি ক্যারেক্টার ফাইল বাছুন (.glb / .obj)' : '📁 Pick 3D File (.glb / .obj)'}
                </button>
                <input
                  ref={extFileInputRef}
                  type="file"
                  accept="*/*"
                  className="hidden"
                  onChange={handleExtModelFileUpload}
                />

                {extModelStatus && (
                  <div className="mt-3 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-2.5 max-w-sm mx-auto">
                    {extModelStatus}
                  </div>
                )}
              </div>

              {/* Store Details and Publish Box */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-4">
                <div className="text-xs font-bold text-amber-300">
                  {isBn ? '২. স্টোর নাম, দাম ও সিক্রেট আনলক কোড সেট করুন:' : '2. Set Store Name, Price & Secret Code:'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-300 font-semibold block mb-1">
                      {isBn ? 'ক্যারেক্টারের নাম (বাংলায়):' : 'Character Name:'}
                    </label>
                    <input
                      type="text"
                      value={extModelName}
                      onChange={(e) => setExtModelName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-amber-400 font-semibold block mb-1">
                      {isBn ? 'স্টোর দাম (₹ রুপি):' : 'Store Price (₹ INR):'}
                    </label>
                    <input
                      type="number"
                      value={extModelPriceInr}
                      onChange={(e) => setExtModelPriceInr(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-pink-400 font-semibold block mb-1">
                    {isBn ? 'সিক্রেট আনলক কোড:' : 'Secret Unlock Code:'}
                  </label>
                  <input
                    type="text"
                    value={extModelUnlockCode}
                    onChange={(e) => setExtModelUnlockCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd3DModelToStore}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  {isBn ? '➕ এই কাস্টম ৩ডি ক্যারেক্টারটি গেমের স্টোরে যোগ করুন' : '➕ Add Custom 3D Character to Store'}
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 0: UPI PAYMENT & VIP STORE MANAGER ================= */}
          {activeTab === 'upi_shop' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  {isBn
                    ? 'ভারতীয় UPI পেমেন্ট ও ভিআইপি স্টোর কন্ট্রোল প্যানেল'
                    : 'Indian UPI Payment & VIP Store Monetization'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'এখানে আপনার UPI ID এবং QR কোড সেট করুন। সাধারণ ইউজাররা গেমের ভেতরে কোনো Admin বাটন পাবে না—তারা শুধুমাত্র "VIP Shop" দেখতে পাবে এবং আপনাকে ভারতীয় রুপি (₹) পাঠিয়ে ক্যারেক্টার, ড্রেস ও স্কেটবোর্ড আনলক করতে পারবে।'
                    : 'Set your UPI ID and QR Code here. Regular players never see the Admin Studio—they only see the VIP Shop where they pay you in Indian Rupees (₹) via UPI to unlock items.'}
                </p>
              </div>

              {/* UPI Details Box */}
              <div className="bg-slate-800/60 border border-amber-500/30 rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* UPI ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-300">
                      {isBn ? 'আপনার UPI ID (যেমন: PhonePe / GPay / Paytm):' : 'Your UPI ID (e.g. name@ybl, 987654@paytm):'}
                    </label>
                    <input
                      type="text"
                      value={config.upiConfig.upiId}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          upiConfig: { ...prev.upiConfig, upiId: e.target.value },
                        }))
                      }
                      placeholder="yourname@ybl"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>

                  {/* Merchant / Display Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      {isBn ? 'আপনার নাম / স্টোরের নাম:' : 'Receiver / Store Name:'}
                    </label>
                    <input
                      type="text"
                      value={config.upiConfig.merchantName}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          upiConfig: { ...prev.upiConfig, merchantName: e.target.value },
                        }))
                      }
                      placeholder="Princess Game Store"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      {isBn
                        ? 'WhatsApp নম্বর (ঐচ্ছিক - আনলক কোড দেওয়ার জন্য):'
                        : 'WhatsApp Number (Optional - to send Unlock Code):'}
                    </label>
                    <input
                      type="text"
                      value={config.upiConfig.whatsappNumber}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          upiConfig: { ...prev.upiConfig, whatsappNumber: e.target.value },
                        }))
                      }
                      placeholder="919876543210"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>

                  {/* Admin Secret PIN */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-pink-300 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      {isBn ? 'অ্যাডমিন স্টুডিও গোপন পিন (Admin PIN):' : 'Admin Studio Secret PIN:'}
                    </label>
                    <input
                      type="text"
                      value={config.upiConfig.adminPin}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          upiConfig: { ...prev.upiConfig, adminPin: e.target.value },
                        }))
                      }
                      placeholder="1234"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>
                </div>

                {/* Custom UPI QR Code Image Upload */}
                <div className="pt-2 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">
                      {isBn ? 'আপনার UPI QR কোড ছবি (ঐচ্ছিক):' : 'Custom UPI QR Code Image (Optional):'}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {isBn
                        ? 'আপনি নিজের QR ছবি আপলোড করতে পারেন, অথবা খালি রাখলে আপনার UPI ID দিয়ে স্বয়ংক্রিয়ভাবে টাকার পরিমাণসহ স্ক্যানযোগ্য QR তৈরি হবে!'
                        : 'Upload your own QR image, or leave empty to auto-generate a dynamic scannable QR from your UPI ID & item price!'}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {isBn ? 'QR কোড আপলোড করুন' : 'Upload QR Image'}
                        <input type="file" accept="image/*" onChange={handleQrImageUpload} className="hidden" />
                      </label>
                      {config.upiConfig.qrCodeImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              upiConfig: { ...prev.upiConfig, qrCodeImageUrl: '' },
                            }))
                          }
                          className="px-3 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-xl text-xs font-bold"
                        >
                          {isBn ? 'মুছে ফেলুন' : 'Remove QR'}
                        </button>
                      )}
                    </div>
                  </div>

                  {config.upiConfig.qrCodeImageUrl && (
                    <img
                      src={config.upiConfig.qrCodeImageUrl}
                      alt="Uploaded UPI QR"
                      className="w-24 h-24 object-contain bg-white p-1.5 rounded-xl border border-amber-400 shrink-0"
                    />
                  )}
                </div>

                {/* Unlock Verification Mode */}
                <div className="pt-2 border-t border-slate-700/80 space-y-2">
                  <label className="text-xs font-bold text-white block">
                    {isBn ? 'পেমেন্ট ভেরিফিকেশন ও আনলক পদ্ধতি:' : 'Payment Unlock Verification Mode:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          upiConfig: { ...prev.upiConfig, verificationMode: 'utr_or_code' },
                        }))
                      }
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        config.upiConfig.verificationMode === 'utr_or_code'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white'
                          : 'border-slate-700 bg-slate-900 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-emerald-300">
                        ⚡ {isBn ? 'অটো UTR নম্বর + আনলক কোড (সহজ)' : '12-Digit UPI UTR + Unlock Code'}
                      </div>
                      <div className="text-[10px] text-zinc-300 mt-0.5">
                        {isBn
                          ? 'প্লেয়ার পেমেন্টের ১২ সংখ্যার UPI UTR নম্বর অথবা সিক্রেট কোড দিলেই সাথে সাথে আনলক হবে।'
                          : 'Players can unlock using either their 12-digit UPI UTR number OR Secret Unlock Code.'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          upiConfig: { ...prev.upiConfig, verificationMode: 'code_only' },
                        }))
                      }
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        config.upiConfig.verificationMode === 'code_only'
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-slate-700 bg-slate-900 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-amber-300">
                        🔐 {isBn ? 'শুধুমাত্র সিক্রেট আনলক কোড (কঠোর)' : 'Secret Unlock Code Only (Strict)'}
                      </div>
                      <div className="text-[10px] text-zinc-300 mt-0.5">
                        {isBn
                          ? 'প্লেয়ার UPI পেমেন্ট করে আপনাকে WhatsApp করবে, আপনি পেমেন্ট দেখে নিচের আনলক কোডটি দেবেন।'
                          : 'Player pays via UPI & messages you on WhatsApp; you give them the item Unlock Code below.'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Shareable Link with Embedded UPI ID */}
                <div className="pt-2 border-t border-slate-700/80 space-y-1.5">
                  <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" />
                    {isBn
                      ? 'আপনার UPI যুক্ত গেমের শেয়ার লিংক (প্লেয়ারদের জন্য):'
                      : 'Shareable Game Link (Pre-loaded with your UPI ID):'}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareablePlayerUrl()}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : isBn ? 'লিংক কপি' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Store Items Pricing & Unlock Codes Manager */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">
                    {isBn
                      ? '🛍️ স্টোরের আইটেম, দাম (₹ INR) ও আনলক কোড তালিকা:'
                      : '🛍️ Store Items, Prices (₹ INR) & Unlock Codes:'}
                  </h4>
                  <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                    {(['character', 'dress', 'skateboard', 'pet'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setShopFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize ${
                          shopFilter === cat ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {cat === 'character' ? (isBn ? 'ক্যারেক্টার' : 'Characters') : ''}
                        {cat === 'dress' ? (isBn ? 'ড্রেস' : 'Dresses') : ''}
                        {cat === 'skateboard' ? (isBn ? 'স্কেটবোর্ড' : 'Boards') : ''}
                        {cat === 'pet' ? (isBn ? 'পোষা প্রাণী' : 'Pets') : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {config.shopItems
                    .filter((item) => item.category === shopFilter)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl shrink-0 border border-white/20 flex items-center justify-center text-lg"
                            style={{
                              background: `linear-gradient(135deg, ${item.previewColors[0]}, ${item.previewColors[1]})`,
                            }}
                          >
                            {item.category === 'character' && '👑'}
                            {item.category === 'dress' && '👗'}
                            {item.category === 'skateboard' && '🛹'}
                            {item.category === 'pet' && '🐾'}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-white">
                              {isBn ? item.nameBn || item.name : item.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {isBn ? item.descriptionBn || item.description : item.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Customize & Edit in 3D Designer Button */}
                          <button
                            type="button"
                            onClick={() => handleLoadShopItemIntoDesigner(item)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-pink-600/25 hover:bg-pink-600/45 border border-pink-500/50 text-pink-200 transition-colors cursor-pointer"
                            title="Customize in 3D Designer"
                          >
                            ✏️ {isBn ? 'কাস্টমাইজ ও সেট' : 'Customize & Set'}
                          </button>

                          {/* Price in INR */}
                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-amber-400 font-bold">₹ INR:</span>
                            <input
                              type="number"
                              min="0"
                              value={item.priceInr}
                              onChange={(e) =>
                                handleUpdateShopItem(item.id, {
                                  priceInr: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className="w-14 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                            />
                          </div>

                          {/* Secret Unlock Code */}
                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-pink-400 font-bold">
                              {isBn ? 'কোড:' : 'Code:'}
                            </span>
                            <input
                              type="text"
                              value={item.unlockCode}
                              onChange={(e) =>
                                handleUpdateShopItem(item.id, { unlockCode: e.target.value })
                              }
                              className="w-20 bg-transparent text-xs font-mono font-bold text-emerald-300 uppercase focus:outline-none"
                            />
                          </div>

                          {/* Free / Locked Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateShopItem(item.id, {
                                isDefaultUnlocked: !item.isDefaultUnlocked,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border ${
                              item.isDefaultUnlocked
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {item.isDefaultUnlocked
                              ? isBn
                                ? 'ফ্রি (Free)'
                                : 'Free'
                              : isBn
                              ? 'লকড (Paid)'
                              : 'Locked'}
                          </button>

                          {!item.isDefaultUnlocked && (
                            <button
                              type="button"
                              onClick={() => handleDeleteShopItem(item.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PRINCESS CHARACTER & SKATEBOARD */}
          {activeTab === 'character' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-pink-400" />
                  {isBn ? 'প্রিন্সেস চরিত্র, শপ ক্যারেক্টার ও স্কেটবোর্ড ডিজাইনার' : 'Princess, Shop Characters & Skateboard Designer'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'এখান থেকে আপনার মূল ক্যারেক্টার, স্টোরে থাকা ক্যারেক্টার এবং রাস্তার পাশের শপে দাঁড়িয়ে থাকা ৩ডি ক্যারেক্টারগুলো ইচ্ছেমতো কাস্টমাইজ করে বসাতে বা সেট করতে পারবেন।'
                    : 'Customize your main runner, VIP Store characters, and the 3D characters standing inside the Roadside Shop.'}
                </p>
              </div>

              {/* Active Store Item Editing Banner */}
              {editingShopItemId && (
                <div className="bg-gradient-to-r from-pink-950/80 via-purple-950/70 to-slate-900 border-2 border-pink-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-pink-300">
                      {isBn
                        ? `🎯 স্টোরের আইটেম কাস্টমাইজ মোড: "${config.princess.name}"`
                        : `🎯 Editing Store Item: "${config.princess.name}"`}
                    </div>
                    <div className="text-[11px] text-zinc-300 mt-0.5">
                      {isBn
                        ? 'নিচের রঙ, মুকুট বা প্রিসেট পরিবর্তন করে ডান পাশের বাটনে ক্লিক করলেই শপের এই ক্যারেক্টারটি আপডেট হয়ে যাবে!'
                        : 'Adjust colors, crown, or preset below and click Save to update this Store character!'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSaveCurrentDesignToShopItem(editingShopItemId)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                    >
                      ✅ {isBn ? 'শপের এই ক্যারেক্টারটিতে সেট করুন' : 'Update & Set in Store'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingShopItemId(null)}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 text-zinc-300 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* ================= ROADSIDE SHOP & STORE CHARACTERS CUSTOMIZER ================= */}
              <div className="bg-slate-800/60 border border-emerald-500/40 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
                      <span>🏪</span>
                      {isBn
                        ? 'শপে থাকা ক্যারেক্টার কাস্টমাইজ ও সেট প্যানেল (Roadside Shop & Store Characters)'
                        : 'Roadside Shop & Store Characters Customizer'}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isBn
                        ? 'গেম চলাকালীন রাস্তার পাশের শপে দাঁড়িয়ে থাকা ৩টি ক্যারেক্টার এবং স্টোরের যেকোনো ক্যারেক্টার কাস্টমাইজ করে বসিয়ে দিন:'
                        : 'Customize and place the 3 characters standing inside the Roadside Shop or edit any Store character:'}
                    </p>
                  </div>
                </div>

                {/* 3 Roadside Shop Character Slots */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {roadsideKeepers.slice(0, 3).map((keeper, idx) => (
                    <div
                      key={keeper.id || idx}
                      className={`rounded-2xl p-3 border flex flex-col justify-between gap-2.5 transition-all ${
                        selectedRoadsideSlotIndex === idx
                          ? 'bg-emerald-950/35 border-emerald-400 shadow-md'
                          : 'bg-slate-900/80 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl shrink-0 border border-white/20 flex items-center justify-center text-base"
                            style={{
                              background: `linear-gradient(135deg, ${keeper.outfitColor}, ${keeper.hairColor})`,
                            }}
                          >
                            🏪
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-emerald-300 truncate">
                              {isBn ? keeper.roleBn : keeper.roleEn}
                            </div>
                            <div className="text-xs font-black text-white truncate">
                              {keeper.name}
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={keeper.enabled !== false}
                          onChange={(e) =>
                            handleUpdateRoadsideKeeperSlot(idx, { enabled: e.target.checked })
                          }
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer mt-1"
                          title={isBn ? 'শপে দেখান / লুকান' : 'Show / Hide in Shop'}
                        />
                      </div>

                      {/* Pose Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block">
                          {isBn ? 'শপে দাঁড়ানোর স্টাইল / ইমোট:' : 'Shop Pose / Animation:'}
                        </label>
                        <select
                          value={keeper.pose || 'wave'}
                          onChange={(e) =>
                            handleUpdateRoadsideKeeperSlot(idx, {
                              pose: e.target.value as RoadsideShopKeeperConfig['pose'],
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                        >
                          <option value="wave">👋 {isBn ? 'হাত নেড়ে স্বাগত (Wave)' : 'Friendly Wave'}</option>
                          <option value="dance">💃 {isBn ? 'আনন্দময় নাচ (Dance)' : 'Idol Dance'}</option>
                          <option value="royal_bow">🙇‍♀️ {isBn ? 'রাজকীয় অভিবাদন (Bow)' : 'Royal Bow'}</option>
                          <option value="idle">✨ {isBn ? 'শান্তভাবে দাঁড়ানো (Idle)' : 'Calm Standing'}</option>
                        </select>
                      </div>

                      {/* Quick Assign from Store Characters */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block">
                          {isBn ? 'স্টোর থেকে ক্যারেক্টার বসান:' : 'Pick from Store Characters:'}
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const found = config.shopItems.find((it) => it.id === e.target.value);
                            if (found) handleAssignStoreCharToRoadsideSlot(idx, found);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-300"
                        >
                          <option value="">
                            {isBn ? '⚡ রেডিমেড/স্টোর ক্যারেক্টার বাছুন...' : '⚡ Choose Store Character...'}
                          </option>
                          {config.shopItems
                            .filter((it) => it.category === 'character')
                            .map((charItem) => (
                              <option key={charItem.id} value={charItem.id}>
                                👑 {isBn ? charItem.nameBn || charItem.name : charItem.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Load to Customize & Set Current Design Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleLoadRoadsideKeeperIntoDesigner(idx)}
                          className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-zinc-200 cursor-pointer"
                        >
                          🎨 {isBn ? 'এডিট করুন' : 'Customize'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetCurrentDesignAsRoadsideKeeper(idx)}
                          className="py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black cursor-pointer"
                        >
                          ✅ {isBn ? 'এখানে বসান' : 'Set Here'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Edit Existing Store Characters Bar */}
                <div className="pt-3 border-t border-slate-700/80 space-y-2">
                  <div className="text-[11px] font-bold text-pink-300">
                    {isBn
                      ? '👑 স্টোরের (VIP Shop) ক্যারেক্টারগুলো সিলেক্ট করে কাস্টমাইজ ও সেট করুন:'
                      : '👑 Select any Store Character to Customize & Set:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {config.shopItems
                      .filter((it) => it.category === 'character')
                      .map((charItem) => {
                        const isBeingEdited = editingShopItemId === charItem.id;
                        return (
                          <div
                            key={charItem.id}
                            className={`inline-flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] ${
                              isBeingEdited
                                ? 'bg-pink-950/60 border-pink-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-zinc-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleLoadShopItemIntoDesigner(charItem)}
                              className="px-2 py-0.5 font-bold hover:text-pink-300 cursor-pointer flex items-center gap-1"
                            >
                              <span>✏️</span>
                              <span>{isBn ? charItem.nameBn || charItem.name : charItem.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCurrentDesignToShopItem(charItem.id)}
                              className="px-2 py-0.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-black text-[10px] cursor-pointer"
                              title={isBn ? 'বর্তমান ৩ডি ডিজাইনটি এই ক্যারেক্টারে সেট করুন' : 'Set current 3D design to this character'}
                            >
                              {isBn ? 'সেট করুন' : 'Set'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Character Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">
                  {isBn ? 'রেডিমেড প্রিসেট সিলেক্ট করুন:' : 'Quick Presets:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(CHARACTER_PRESETS) as CharacterModelType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const preset = CHARACTER_PRESETS[type];
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, ...preset },
                        }));
                      }}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                        config.princess.modelType === type
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold text-white capitalize">{type}</span>
                      <span className="text-[10px] text-zinc-400">{CHARACTER_PRESETS[type].name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Character Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {isBn ? 'প্রিন্সেসের নাম:' : 'Character Name:'}
                </label>
                <input
                  type="text"
                  value={config.princess.name}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      princess: { ...prev.princess, name: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                {/* Outfit Primary */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'পোশাকের প্রধান রঙ (Dress):' : 'Main Dress Color:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.princess.outfitColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, outfitColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.princess.outfitColor}
                    </span>
                  </div>
                </div>

                {/* Outfit Secondary */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'পোশাকের বেল্ট/প্যান্ট:' : 'Secondary Accent:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.princess.outfitSecondaryColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, outfitSecondaryColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.princess.outfitSecondaryColor}
                    </span>
                  </div>
                </div>

                {/* Hair Color */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'চুলের রঙ (Hair):' : 'Hair Color:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.princess.hairColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, hairColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.princess.hairColor}
                    </span>
                  </div>
                </div>

                {/* Skin Tone */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'গায়ের রঙ (Skin):' : 'Skin Tone:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.princess.skinColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, skinColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.princess.skinColor}
                    </span>
                  </div>
                </div>

                {/* Crown Color */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'মুকুটের রঙ (Crown):' : 'Crown Color:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.princess.crownColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, crownColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.princess.crownColor}
                    </span>
                  </div>
                </div>

                {/* Cape Color */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'কেপের রঙ (Cape):' : 'Cape Color:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.princess.capeColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: { ...prev.princess, capeColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.princess.capeColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.princess.hasCrown}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        princess: { ...prev.princess, hasCrown: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded text-pink-600 focus:ring-0 accent-pink-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    {isBn ? 'মুকুট পরিধান করুন (Crown)' : 'Wear Royal Crown'}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.princess.hasCape}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        princess: { ...prev.princess, hasCape: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded text-pink-600 focus:ring-0 accent-pink-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    {isBn ? 'কেপ/স্কার্ফ পরিধান করুন (Cape)' : 'Wear Flowing Cape'}
                  </span>
                </label>
              </div>

              {/* Skateboard Customizer Section */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                  🛹 {isBn ? 'স্কেটবোর্ড কাস্টমাইজার (Skateboard Designer)' : 'Skateboard / Hoverboard Designer'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-300 block mb-1">
                      {isBn ? 'স্কেটবোর্ডের নাম:' : 'Skateboard Name:'}
                    </label>
                    <input
                      type="text"
                      value={config.princess.skateboard?.name || 'Custom Board'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: {
                            ...prev.princess,
                            skateboard: {
                              ...(prev.princess.skateboard || DEFAULT_SKATEBOARD),
                              name: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-300 block mb-1">
                      {isBn ? 'অতিরিক্ত বোনাস বোর্ড সংখ্যা (+Boards):' : 'Bonus Starting Boards:'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={config.princess.skateboard?.bonusBoards ?? 0}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: {
                            ...prev.princess,
                            skateboard: {
                              ...(prev.princess.skateboard || DEFAULT_SKATEBOARD),
                              bonusBoards: Math.max(0, parseInt(e.target.value) || 0),
                            },
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300">{isBn ? 'বোর্ডের রঙ:' : 'Deck Color:'}</span>
                    <input
                      type="color"
                      value={config.princess.skateboard?.boardColor || '#ec4899'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: {
                            ...prev.princess,
                            skateboard: {
                              ...(prev.princess.skateboard || DEFAULT_SKATEBOARD),
                              boardColor: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300">{isBn ? 'সাইড বর্ডার:' : 'Rail Color:'}</span>
                    <input
                      type="color"
                      value={config.princess.skateboard?.trimColor || '#38bdf8'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: {
                            ...prev.princess,
                            skateboard: {
                              ...(prev.princess.skateboard || DEFAULT_SKATEBOARD),
                              trimColor: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300">{isBn ? 'চাকার রঙ:' : 'Wheels Color:'}</span>
                    <input
                      type="color"
                      value={config.princess.skateboard?.thrusterColor || '#f59e0b'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          princess: {
                            ...prev.princess,
                            skateboard: {
                              ...(prev.princess.skateboard || DEFAULT_SKATEBOARD),
                              thrusterColor: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PET COMPANION */}
          {activeTab === 'pet' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  {isBn ? 'সঙ্গী পোষা প্রাণী কাস্টমাইজেশন' : 'Pet Companion Customizer'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'পোষা প্রাণী রানারের পাশে দৌড়াবে এবং বিশেষ বোনাস ক্ষমতা প্রদান করবে।'
                    : 'Pets run alongside the Princess and grant special bonus perks.'}
                </p>
              </div>

              {/* Toggle Enable */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">
                    {isBn ? 'পোষা প্রাণী সঙ্গী সক্রিয় করুন' : 'Enable Pet Companion'}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {isBn ? 'গেম চলাকালীন পাশে দৌড়াবে' : 'Runs alongside you during the race'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.pet.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      pet: { ...prev.pet, enabled: e.target.checked },
                    }))
                  }
                  className="w-6 h-6 rounded accent-pink-500 cursor-pointer"
                />
              </div>

              {/* Pet Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">
                  {isBn ? 'পোষা প্রাণীর ধরণ নির্বাচন করুন:' : 'Choose Pet Species:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(PET_PRESETS) as PetType[]).map((pType) => (
                    <button
                      key={pType}
                      onClick={() => {
                        const preset = PET_PRESETS[pType];
                        setConfig((prev) => ({
                          ...prev,
                          pet: { ...prev.pet, ...preset, type: pType },
                        }));
                      }}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
                        config.pet.type === pType
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl">
                        {pType === 'corgi' ? '🐶' : ''}
                        {pType === 'kitty' ? '🐱' : ''}
                        {pType === 'dragon' ? '🐉' : ''}
                        {pType === 'fox' ? '🦊' : ''}
                        {pType === 'panda' ? '🐼' : ''}
                      </span>
                      <span className="text-xs font-bold text-white capitalize">{pType}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pet Name & Perk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    {isBn ? 'পোষা প্রাণীর নাম:' : 'Pet Name:'}
                  </label>
                  <input
                    type="text"
                    value={config.pet.name}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        pet: { ...prev.pet, name: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    {isBn ? 'বিশেষ ক্ষমতা (Perk):' : 'Special Perk:'}
                  </label>
                  <select
                    value={config.pet.perk}
                    onChange={(e) => {
                      const perk = e.target.value as PetPerk;
                      let desc = '';
                      if (perk === 'magnet_boost') desc = '+25% Coin Magnet range';
                      if (perk === 'score_boost') desc = '+20% Score multiplier bonus';
                      if (perk === 'shield_saver') desc = '+1 Extra free Hoverboard';
                      if (perk === 'coin_doubler') desc = 'Chance for 2X Coins spawn';
                      setConfig((prev) => ({
                        ...prev,
                        pet: { ...prev.pet, perk, perkDescription: desc },
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="magnet_boost">🧲 {isBn ? 'ম্যাগনেট বুস্ট (+২৫%)' : 'Magnet Boost (+25%)'}</option>
                    <option value="score_boost">⭐ {isBn ? 'স্কোর বুস্ট (+২০%)' : 'Score Multiplier (+20%)'}</option>
                    <option value="shield_saver">🛹 {isBn ? 'অতিরিক্ত হোভারবোর্ড' : 'Extra Hoverboard Shield'}</option>
                    <option value="coin_doubler">🪙 {isBn ? 'ডাবল কয়েন সম্ভাবনা' : 'Double Coin Chance'}</option>
                  </select>
                </div>
              </div>

              {/* Pet Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'প্রধান শরীরের রঙ:' : 'Body Color:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.pet.color}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          pet: { ...prev.pet, color: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">{config.pet.color}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    {isBn ? 'পেটের ও কানের রঙ:' : 'Belly / Secondary Color:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.pet.secondaryColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          pet: { ...prev.pet, secondaryColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">{config.pet.secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENVIRONMENT & THEMES */}
          {activeTab === 'environment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" />
                  {isBn ? 'ব্যাকগ্রাউন্ড ও পরিবেশ থিম' : 'Environment & Subway Themes'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'আকাশ, রেললাইন ও ট্রেনের রঙ এবং আবহাওয়া পছন্দ করুন।'
                    : 'Choose city themes, sky lighting, rail tracks and subway train colors.'}
                </p>
              </div>

              {/* Theme Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">
                  {isBn ? 'থিম নির্বাচন করুন:' : 'Select Theme Preset:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(THEME_PRESETS) as EnvironmentTheme[]).map((themeKey) => {
                    const preset = THEME_PRESETS[themeKey];
                    return (
                      <button
                        key={themeKey}
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            environment: { ...prev.environment, ...preset, theme: themeKey },
                          }));
                        }}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          config.environment.theme === themeKey
                            ? 'border-sky-500 bg-sky-500/10'
                            : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{preset.themeName}</div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            {themeKey.replace('_', ' ')}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.trainColor }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.railColor }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">{isBn ? 'আকাশের রঙ (Sky):' : 'Sky Color:'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.environment.skyColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, skyColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.environment.skyColor}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">{isBn ? 'কুয়াশার রঙ (Fog):' : 'Fog Tint:'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.environment.fogColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, fogColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.environment.fogColor}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">{isBn ? 'ট্রেনের প্রধান রঙ:' : 'Subway Train Color:'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.environment.trainColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, trainColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.environment.trainColor}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300">{isBn ? 'রেললাইনের উজ্জ্বলতা:' : 'Rail Neon Color:'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.environment.railColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, railColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-xs text-zinc-400 uppercase">
                      {config.environment.railColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Particle Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {isBn ? 'পরিবেশের আবহাওয়া ও কণা (Particles):' : 'Atmospheric Particles:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['sparks', 'petals', 'stars', 'dust'] as ParticleTheme[]).map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, particleTheme: p },
                        }))
                      }
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        config.environment.particleTheme === p
                          ? 'border-sky-500 bg-sky-500/20 text-white'
                          : 'border-slate-800 bg-slate-800 text-zinc-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM BILLBOARDS */}
          {activeTab === 'billboards' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  {isBn ? 'কাস্টম বিলবোর্ড ও ব্যানার আপলোড' : 'Custom 3D Billboards & Posters'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'আপনার নিজের ছবি আপলোড করুন! এগুলি ৩ডি ট্র্যাকের ওভারহেড সাইনবোর্ডে দেখা যাবে।'
                    : 'Upload your own images! They will appear dynamically on overhead billboards across the 3D subway track.'}
                </p>
              </div>

              {/* Upload Box */}
              <label className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition-all text-center">
                <Plus className="w-8 h-8 text-pink-400" />
                <div className="text-sm font-bold text-white">
                  {isBn ? 'নতুন ছবি যোগ করতে ক্লিক করুন' : 'Click to Upload Billboard Image'}
                </div>
                <div className="text-xs text-zinc-400">
                  {isBn ? 'PNG বা JPG (সুপারিশ: 512x256 বা 16:9 অনুপাত)' : 'PNG, JPG or WebP (Recommended 512x256 or 16:9)'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Billboards List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-300">
                  {isBn ? 'আপলোডকৃত বিলবোর্ডসমূহ:' : 'Current Active Billboards:'}
                </div>
                {config.environment.billboardImages.length === 0 ? (
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-xs text-zinc-400 text-center">
                    {isBn
                      ? 'এখনও কোনো কাস্টম ছবি যোগ করা হয়নি। গেমের ডিফল্ট প্রিন্সেস বিলবোর্ড দেখাচ্ছে।'
                      : 'No custom billboard images uploaded yet. Default stylized posters are active.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {config.environment.billboardImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-800 aspect-video flex items-center justify-center"
                      >
                        <img
                          src={img}
                          alt={`Billboard ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeBillboardImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: GAMEPLAY TUNING */}
          {activeTab === 'gameplay' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  {isBn ? 'গেমপ্লে ও গতি টিউনিং' : 'Gameplay Difficulty & Speeds'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isBn
                    ? 'দৌড়ের প্রাথমিক গতি, লাফের উচ্চতা এবং পাওয়ার-আপ সময়কাল নিয়ন্ত্রণ করুন।'
                    : 'Fine-tune runner speed, jump physics and power-up durations.'}
                </p>
              </div>

              {/* Sliders */}
              <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                {/* Base Speed */}
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                    <span>{isBn ? 'প্রাথমিক দৌড়ের গতি (Base Speed):' : 'Initial Sprint Speed:'}</span>
                    <span className="font-mono text-pink-400 font-bold">{config.gameplay.baseSpeed} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="45"
                    step="1"
                    value={config.gameplay.baseSpeed}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gameplay: { ...prev.gameplay, baseSpeed: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                {/* Jump Velocity */}
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                    <span>{isBn ? 'লাফের শক্তি (Jump Height):' : 'Jump Velocity:'}</span>
                    <span className="font-mono text-purple-400 font-bold">{config.gameplay.jumpVelocity}</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="22"
                    step="0.5"
                    value={config.gameplay.jumpVelocity}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gameplay: { ...prev.gameplay, jumpVelocity: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Magnet Duration */}
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                    <span>{isBn ? 'ম্যাগনেট পাওয়ার সময় (Magnet Duration):' : 'Magnet Duration:'}</span>
                    <span className="font-mono text-amber-400 font-bold">{config.gameplay.magnetDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={config.gameplay.magnetDuration}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gameplay: { ...prev.gameplay, magnetDuration: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Graphics Performance Mode */}
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5">
                    <span className="font-semibold text-white">
                      {isBn ? '⚡ গ্রাফিক্স কোয়ালিটি মোড:' : '⚡ Performance Mode:'}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold uppercase">
                      {config.gameplay.graphicsQuality === 'smooth' ? '60 FPS Smooth' : 'High Graphics'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          gameplay: { ...prev.gameplay, graphicsQuality: 'smooth' },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        config.gameplay.graphicsQuality === 'smooth'
                          ? 'border-emerald-500 bg-emerald-500/20 text-white'
                          : 'border-slate-700 bg-slate-800 text-zinc-400'
                      }`}
                    >
                      <div className="text-white">⚡ {isBn ? 'আল্ট্রা স্মুথ (৬০ FPS)' : 'Ultra Smooth (60 FPS)'}</div>
                      <div className="text-[10px] text-zinc-400 font-normal">
                        {isBn ? 'পুরনো অ্যান্ড্রয়েড ও বাজেট ফোনে নিখুঁত' : 'Recommended for older/budget Android'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          gameplay: { ...prev.gameplay, graphicsQuality: 'high' },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        config.gameplay.graphicsQuality === 'high'
                          ? 'border-pink-500 bg-pink-500/20 text-white'
                          : 'border-slate-700 bg-slate-800 text-zinc-400'
                      }`}
                    >
                      <div className="text-white">💎 {isBn ? 'হাই গ্রাফিক্স (HQ)' : 'High Graphics (HQ)'}</div>
                      <div className="text-[10px] text-zinc-400 font-normal">
                        {isBn ? 'রিয়েলটাইম সফট শ্যাডো ও হাই রেজোলিউশন' : 'Real-time soft shadows & high res'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Starting Hoverboards */}
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
                    <span>{isBn ? 'শুরুতে হোভারবোর্ড সংখ্যা:' : 'Starting Hoverboards:'}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {config.gameplay.startingHoverboards}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={config.gameplay.startingHoverboards}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gameplay: { ...prev.gameplay, startingHoverboards: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {isBn ? 'পরিবর্তন করার পর অবশ্যই সংরক্ষণ করুন।' : 'Remember to save changes to apply immediately.'}
            </span>
            <button
              onClick={handleSave}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/25'
              }`}
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {saveSuccess ? (isBn ? 'সফলভাবে সংরক্ষিত!' : 'Applied & Saved!') : isBn ? 'সেভ করুন' : 'Save Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

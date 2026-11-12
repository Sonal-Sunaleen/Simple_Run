import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PrincessConfig, SkateboardConfig, StationEmoteType } from '../types/game';

export class PrincessCharacter {
  public group: THREE.Group;
  private config: PrincessConfig;

  // Body parts for animation
  private defaultBodyGroup: THREE.Group;
  private customModelGroup: THREE.Group | null = null;
  private headGroup: THREE.Group;
  private hairPonytail: THREE.Mesh;
  private crownMesh: THREE.Mesh | null = null;
  private torsoMesh: THREE.Mesh;
  private capeGroup: THREE.Group;
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;
  private hoverboardGroup: THREE.Group;
  private defaultHoverboardMeshGroup: THREE.Group;
  private customHoverboardGroup: THREE.Group | null = null;
  public shadowBlob: THREE.Mesh;

  // Materials for live recoloring
  private skinMaterial: THREE.MeshLambertMaterial;
  private hairMaterial: THREE.MeshLambertMaterial;
  private outfitMaterial: THREE.MeshLambertMaterial;
  private outfitSecondaryMaterial: THREE.MeshLambertMaterial;
  private crownMaterial: THREE.MeshLambertMaterial;
  private capeMaterial: THREE.MeshLambertMaterial;
  private hoverboardMaterial: THREE.MeshLambertMaterial;
  private hoverboardTrimMaterial: THREE.MeshBasicMaterial;
  private hoverboardThrusterMaterial: THREE.MeshBasicMaterial;

  // Animation mixer for GLTF skeletal models
  private mixer: THREE.AnimationMixer | null = null;
  private customAnimParts: {
    leftArmPivots: THREE.Object3D[];
    rightArmPivots: THREE.Object3D[];
    leftLegs: THREE.Object3D[];
    rightLegs: THREE.Object3D[];
    leftShoes: THREE.Object3D[];
    rightShoes: THREE.Object3D[];
    skirtNodes: THREE.Object3D[];
    hairBackNodes: THREE.Object3D[];
  } = {
    leftArmPivots: [],
    rightArmPivots: [],
    leftLegs: [],
    rightLegs: [],
    leftShoes: [],
    rightShoes: [],
    skirtNodes: [],
    hairBackNodes: [],
  };

  // State
  private runCycle: number = 0;
  private isHoverboardActive: boolean = false;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private isCustomModelLoaded: boolean = false;

  constructor(config: PrincessConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.defaultBodyGroup = new THREE.Group();
    this.group.add(this.defaultBodyGroup);

    const boardColor = this.config.skateboard?.boardColor || '#ec4899';
    const trimColor = this.config.skateboard?.trimColor || '#38bdf8';
    const thrusterColor = this.config.skateboard?.thrusterColor || '#f59e0b';

    // Create fast mobile-optimized materials
    this.skinMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.skinColor),
    });

    this.hairMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.hairColor),
    });

    this.outfitMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.outfitColor),
    });

    this.outfitSecondaryMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.outfitSecondaryColor),
    });

    this.crownMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.crownColor),
      emissive: new THREE.Color(this.config.crownColor).multiplyScalar(0.2),
    });

    this.capeMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.capeColor),
      side: THREE.DoubleSide,
    });

    this.hoverboardMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(boardColor),
      emissive: new THREE.Color(boardColor).multiplyScalar(0.35),
    });

    this.hoverboardTrimMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(trimColor),
    });

    this.hoverboardThrusterMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(thrusterColor),
    });

    if (this.config.customTextureUrl) {
      this.applyTextureUrl(this.config.customTextureUrl);
    }
    if (this.config.customModelUrl) {
      this.loadCustomModel(this.config.customModelUrl);
    }

    // 1. Torso & Upper Body
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.75, 8);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.outfitMaterial);
    this.torsoMesh.position.y = 1.05;
    this.defaultBodyGroup.add(this.torsoMesh);

    const beltGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 8);
    const belt = new THREE.Mesh(beltGeo, this.outfitSecondaryMaterial);
    belt.position.y = -0.15;
    this.torsoMesh.add(belt);

    // 2. Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.62, 0);

    const headGeo = new THREE.SphereGeometry(0.26, 10, 8);
    const headMesh = new THREE.Mesh(headGeo, this.skinMaterial);
    this.headGroup.add(headMesh);

    const hairGeo = new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairCap = new THREE.Mesh(hairGeo, this.hairMaterial);
    hairCap.position.y = 0.04;
    this.headGroup.add(hairCap);

    const ponytailGeo = new THREE.ConeGeometry(0.16, 0.65, 6);
    this.hairPonytail = new THREE.Mesh(ponytailGeo, this.hairMaterial);
    this.hairPonytail.position.set(0, 0.08, -0.28);
    this.hairPonytail.rotation.x = -Math.PI * 0.45;
    this.headGroup.add(this.hairPonytail);

    const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.09, 0.03, 0.23);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.09, 0.03, 0.23);
    this.headGroup.add(leftEye, rightEye);

    if (this.config.hasCrown) {
      this.createCrown();
    }
    this.defaultBodyGroup.add(this.headGroup);

    // 3. Cape
    this.capeGroup = new THREE.Group();
    this.capeGroup.position.set(0, 1.4, -0.22);
    const capeGeo = new THREE.PlaneGeometry(0.5, 0.85, 2, 3);
    const capeMesh = new THREE.Mesh(capeGeo, this.capeMaterial);
    capeMesh.position.y = -0.42;
    capeMesh.rotation.x = 0.2;
    this.capeGroup.add(capeMesh);
    if (this.config.hasCape) {
      this.defaultBodyGroup.add(this.capeGroup);
    }

    // 4. Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6);
    armGeo.translate(0, -0.25, 0);
    const handGeo = new THREE.SphereGeometry(0.08, 6, 6);

    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(0.38, 1.35, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, this.outfitMaterial);
    const leftHand = new THREE.Mesh(handGeo, this.skinMaterial);
    leftHand.position.y = -0.55;
    this.leftArmGroup.add(leftArmMesh, leftHand);
    this.defaultBodyGroup.add(this.leftArmGroup);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(-0.38, 1.35, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, this.outfitMaterial);
    const rightHand = new THREE.Mesh(handGeo, this.skinMaterial);
    rightHand.position.y = -0.55;
    this.rightArmGroup.add(rightArmMesh, rightHand);
    this.defaultBodyGroup.add(this.rightArmGroup);

    // 5. Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.7, 6);
    legGeo.translate(0, -0.32, 0);
    const shoeGeo = new THREE.BoxGeometry(0.16, 0.12, 0.26);
    const shoeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(0.16, 0.72, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, this.outfitSecondaryMaterial);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.66, 0.05);
    this.leftLegGroup.add(leftLegMesh, leftShoe);
    this.defaultBodyGroup.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(-0.16, 0.72, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, this.outfitSecondaryMaterial);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.66, 0.05);
    this.rightLegGroup.add(rightLegMesh, rightShoe);
    this.defaultBodyGroup.add(this.rightLegGroup);

    // 6. Skateboard / Hoverboard (with glowing wheels & rails)
    this.hoverboardGroup = new THREE.Group();
    this.hoverboardGroup.position.set(0, 0.08, 0);

    this.defaultHoverboardMeshGroup = new THREE.Group();
    const boardDeck = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.08, 1.45),
      this.hoverboardMaterial
    );
    this.defaultHoverboardMeshGroup.add(boardDeck);

    const leftTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.1, 1.46),
      this.hoverboardTrimMaterial
    );
    leftTrim.position.x = 0.34;
    const rightTrim = leftTrim.clone();
    rightTrim.position.x = -0.34;
    this.defaultHoverboardMeshGroup.add(leftTrim, rightTrim);

    // 4 Skateboard Wheels / Thrusters
    const wheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelOffsets = [
      [0.28, -0.06, 0.45],
      [-0.28, -0.06, 0.45],
      [0.28, -0.06, -0.45],
      [-0.28, -0.06, -0.45],
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, this.hoverboardThrusterMaterial);
      wheel.position.set(wx, wy, wz);
      this.defaultHoverboardMeshGroup.add(wheel);
    });

    this.hoverboardGroup.add(this.defaultHoverboardMeshGroup);

    const boardModelSource =
      this.config.skateboard?.customModelUrl ||
      this.config.skateboard?.presetType ||
      (this.config.skateboard?.id && (this.config.skateboard.id.includes('ext_') || this.config.skateboard.id.includes('custom_'))
        ? 'plasma_board'
        : '');

    if (this.config.skateboard?.customTextureUrl) {
      this.applySkateboardTexture(this.config.skateboard.customTextureUrl);
    }
    if (boardModelSource) {
      this.loadCustomSkateboardModel(
        boardModelSource,
        this.config.skateboard?.modelScale,
        this.config.skateboard?.modelYOffset
      );
    }

    this.hoverboardGroup.visible = false;
    this.group.add(this.hoverboardGroup);

    // 8. Fake Ground Shadow Blob (hidden so no disc appears under feet)
    const shadowGeo = new THREE.CircleGeometry(0.48, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = 0.02;
    this.shadowBlob.visible = false;
    this.group.add(this.shadowBlob);

    const charModelSource =
      this.config.customModelUrl ||
      this.config.presetType ||
      '';

    if (this.config.customTextureUrl) {
      this.applyTextureUrl(this.config.customTextureUrl);
    }
    if (charModelSource) {
      this.loadCustomModel(charModelSource);
    }
  }

  private applyTextureUrl(textureUrl: string) {
    try {
      new THREE.TextureLoader().load(textureUrl, (tex) => {
        this.outfitMaterial.map = tex;
        this.outfitMaterial.needsUpdate = true;
      });
    } catch {}
  }

  private applySkateboardTexture(textureUrl: string) {
    try {
      new THREE.TextureLoader().load(textureUrl, (tex) => {
        this.hoverboardMaterial.map = tex;
        this.hoverboardMaterial.needsUpdate = true;
      });
    } catch {}
  }

  private createSkateboardPresetMesh(presetType: string): THREE.Group {
    const group = new THREE.Group();
    const boardMat = this.hoverboardMaterial;
    const trimMat = this.hoverboardTrimMaterial;
    const glowMat = this.hoverboardThrusterMaterial;

    if (presetType === 'plasma_board' || presetType === 'luxury_skateboard' || presetType === 'cyber_hovercraft' || presetType === 'jet_board') {
      // Sleek aero hovercraft deck
      const mainDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.48, 1.6, 8),
        boardMat
      );
      mainDeck.rotation.x = Math.PI / 2;
      mainDeck.rotation.y = Math.PI / 8;
      mainDeck.position.y = 0.12;
      group.add(mainDeck);

      // Side stabilizer wings
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.9), trimMat);
      wingL.position.set(0.42, 0.14, 0);
      const wingR = wingL.clone();
      wingR.position.x = -0.42;
      group.add(wingL, wingR);

      // Dual jet thrusters
      const thrusterGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.35, 12);
      thrusterGeo.rotateX(Math.PI / 2);
      const thrusterL = new THREE.Mesh(thrusterGeo, glowMat);
      thrusterL.position.set(0.2, 0.1, -0.8);
      const thrusterR = thrusterL.clone();
      thrusterR.position.x = -0.2;
      group.add(thrusterL, thrusterR);
    } else {
      // High-tech rounded deck with glowing thrusters
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 1.5), boardMat);
      deck.position.y = 0.1;
      group.add(deck);

      const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.52, 8), trimMat);
      railL.rotation.x = Math.PI / 2;
      railL.position.set(0.36, 0.1, 0);
      const railR = railL.clone();
      railR.position.x = -0.36;
      group.add(railL, railR);

      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.4, 12), glowMat);
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(0, 0.08, -0.75);
      group.add(thruster);
    }

    return group;
  }

  private loadCustomSkateboardModel(urlOrPreset: string, scale: number = 1.0, yOffset: number = 0.0) {
    if (!urlOrPreset) return;

    if (this.customHoverboardGroup) {
      this.hoverboardGroup.remove(this.customHoverboardGroup);
      this.customHoverboardGroup = null;
    }

    this.customHoverboardGroup = new THREE.Group();

    // Check if it's a procedural preset name
    if (!urlOrPreset.startsWith('data:') && !urlOrPreset.startsWith('http') && !urlOrPreset.includes('/')) {
      const presetMesh = this.createSkateboardPresetMesh(urlOrPreset);
      presetMesh.scale.set(scale, scale, scale);
      presetMesh.position.y += yOffset;
      this.customHoverboardGroup.add(presetMesh);
      this.hoverboardGroup.add(this.customHoverboardGroup);
      this.defaultHoverboardMeshGroup.visible = false;
      return;
    }

    const onModelLoaded = (modelObj: THREE.Object3D) => {
      if (!this.customHoverboardGroup) return;

      const box = new THREE.Box3().setFromObject(modelObj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      modelObj.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const normalizedScale = (1.5 / maxDim) * scale;
      modelObj.scale.set(normalizedScale, normalizedScale, normalizedScale);
      modelObj.position.y += yOffset;

      modelObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.customHoverboardGroup.add(modelObj);
      this.hoverboardGroup.add(this.customHoverboardGroup);
      this.defaultHoverboardMeshGroup.visible = false;
    };

    try {
      if (urlOrPreset.startsWith('data:text') || urlOrPreset.endsWith('.obj') || urlOrPreset.includes('format=obj')) {
        if (urlOrPreset.startsWith('data:')) {
          const raw = atob(urlOrPreset.split(',')[1] || '');
          const obj = new OBJLoader().parse(raw);
          onModelLoaded(obj);
        } else {
          new OBJLoader().load(urlOrPreset, onModelLoaded, undefined, () => {});
        }
      } else {
        if (urlOrPreset.startsWith('data:')) {
          const byteCharacters = atob(urlOrPreset.split(',')[1] || '');
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          new GLTFLoader().parse(byteArray.buffer, '', (gltf) => onModelLoaded(gltf.scene), () => {});
        } else {
          new GLTFLoader().load(urlOrPreset, (gltf) => onModelLoaded(gltf.scene), undefined, () => {});
        }
      }
    } catch {
      // Fallback to preset mesh
      const fallback = this.createSkateboardPresetMesh('luxury_skateboard');
      this.customHoverboardGroup.add(fallback);
      this.hoverboardGroup.add(this.customHoverboardGroup);
      this.defaultHoverboardMeshGroup.visible = false;
    }
  }

  private createCharacterPresetMesh(presetType: string): THREE.Group {
    const group = new THREE.Group();
    const mainMat = this.outfitMaterial;
    const secMat = this.outfitSecondaryMaterial;
    const glowMat = this.crownMaterial;

    if (presetType === 'mecha' || presetType === 'robot' || presetType === 'cyber') {
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.45), mainMat);
      chest.position.y = 1.1;
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.48, 8), glowMat);
      core.rotation.x = Math.PI / 2;
      core.position.set(0, 1.15, 0.1);
      const mHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.38), secMat);
      mHead.position.set(0, 1.68, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.12), glowMat);
      visor.position.set(0, 1.68, 0.16);
      const sL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mainMat);
      sL.position.set(0.5, 1.4, 0);
      const sR = sL.clone();
      sR.position.x = -0.5;
      group.add(chest, core, mHead, visor, sL, sR);
    } else if (presetType === 'astro' || presetType === 'space') {
      const suit = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.85, 12), mainMat);
      suit.position.y = 1.05;
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), secMat);
      helm.position.y = 1.65;
      const goldVisor = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI, 0, Math.PI), glowMat);
      goldVisor.position.set(0, 1.65, 0.15);
      goldVisor.rotation.y = -Math.PI / 2;
      const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.22), secMat);
      tank.position.set(0, 1.1, -0.26);
      group.add(suit, helm, goldVisor, tank);
    } else {
      const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.65, 0.95, 16), mainMat);
      gown.position.y = 0.95;
      const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), glowMat);
      goldBand.position.y = 1.35;
      const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8), glowMat);
      cr.position.y = 1.85;
      group.add(gown, goldBand, cr);
    }

    return group;
  }

  private loadCustomModel(urlOrPreset: string) {
    if (!urlOrPreset) return;

    if (this.customModelGroup) {
      this.group.remove(this.customModelGroup);
      this.customModelGroup = null;
    }
    this.mixer = null;

    // Immediately hide default procedural body & accessories
    this.defaultBodyGroup.visible = false;
    if (this.crownMesh) this.crownMesh.visible = false;
    if (this.capeGroup) this.capeGroup.visible = false;

    this.customModelGroup = new THREE.Group();

    const scale = this.config.modelScale || 1.0;
    const yOffset = this.config.modelYOffset || 0.0;
    const rotY = this.config.modelRotationY || 0.0;

    // Check if it's a short preset string name
    const isPresetName =
      urlOrPreset.length < 50 &&
      !urlOrPreset.startsWith('data:') &&
      !urlOrPreset.startsWith('http') &&
      !urlOrPreset.includes('/') &&
      !urlOrPreset.includes('\n');

    if (isPresetName) {
      const presetMesh = this.createCharacterPresetMesh(urlOrPreset);
      presetMesh.position.set(0, yOffset, 0);
      presetMesh.scale.set(scale, scale, scale);
      presetMesh.rotation.y = rotY;

      this.customModelGroup.add(presetMesh);
      this.group.add(this.customModelGroup);
      this.defaultBodyGroup.visible = false;
      if (this.crownMesh) this.crownMesh.visible = false;
      if (this.capeGroup) this.capeGroup.visible = false;
      this.isCustomModelLoaded = true;
      return;
    }

    const onModelLoaded = (modelObj: THREE.Object3D, animations: THREE.AnimationClip[] = []) => {
      if (!this.customModelGroup) return;

      if (animations && animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(modelObj);
        const action = this.mixer.clipAction(animations[0]);
        action.play();
      }

      // 1. Remove any baked-in preview pedestal disc, stage platform, or floor ring from the 3D model
      modelObj.updateMatrixWorld(true);
      const nodesToRemove: THREE.Object3D[] = [];
      modelObj.traverse((child) => {
        const name = (child.name || '').toLowerCase();
        if (
          name.includes('pedestal') ||
          name.includes('platform') ||
          name.includes('stage') ||
          name.includes('disc') ||
          name.includes('stand') ||
          name.includes('ringborder') ||
          name.includes('auraring') ||
          name.includes('turntable') ||
          name.includes('base_plate') ||
          name.includes('floor')
        ) {
          nodesToRemove.push(child);
          return;
        }
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) {
            mesh.geometry.computeBoundingBox();
            const gBox = mesh.geometry.boundingBox;
            if (gBox) {
              const gSize = new THREE.Vector3();
              gBox.getSize(gSize);
              // Wide flat disc or torus ring in local geometry space
              if (gSize.x > 1.0 && gSize.z > 1.0 && gSize.y < 0.35) {
                nodesToRemove.push(child);
                return;
              }
            }
          }
          // Also check world-space bounding box of this mesh (catches rotated torus rings or scaled discs)
          const wBox = new THREE.Box3().setFromObject(mesh);
          const wSize = new THREE.Vector3();
          wBox.getSize(wSize);
          if (wSize.x > 1.0 && wSize.z > 1.0 && wSize.y < 0.35 && wBox.min.y < 0.2) {
            nodesToRemove.push(child);
          }
        }
      });
      nodesToRemove.forEach((n) => {
        if (n.parent) {
          n.parent.remove(n);
        }
      });

      // 2. Recompute clean bounding box of the character without the pedestal
      modelObj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(modelObj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const charHeight = Math.max(size.y, 0.1);
      const normalizedScale = (1.85 / charHeight) * scale;
      modelObj.scale.set(normalizedScale, normalizedScale, normalizedScale);

      // Center X/Z at 0 and place the bottom of the character's shoes (box.min.y) right on ground Y = 0
      modelObj.position.set(
        -center.x * normalizedScale,
        -box.min.y * normalizedScale + yOffset,
        -center.z * normalizedScale
      );

      // Auto-detect if face/toes are pointing toward -Z instead of +Z so character always faces straight forward
      let forwardZIndicator = 0;
      modelObj.traverse((child) => {
        const nm = (child.name || '').toLowerCase();
        const pnm = (child.parent?.name || '').toLowerCase();
        if (
          pnm.includes('face') ||
          nm.includes('face') ||
          pnm.includes('shoe') ||
          nm.includes('visor')
        ) {
          forwardZIndicator += child.position.z;
        }
      });
      const autoForwardFlip = forwardZIndicator < -0.02 ? Math.PI : 0;
      modelObj.rotation.y = autoForwardFlip;

      // 3. Classify limb, shoe, dress skirt, and flowing hair nodes while preserving facial features
      this.customAnimParts = {
        leftArmPivots: [],
        rightArmPivots: [],
        leftLegs: [],
        rightLegs: [],
        leftShoes: [],
        rightShoes: [],
        skirtNodes: [],
        hairBackNodes: [],
      };

      modelObj.traverse((child) => {
        child.matrixAutoUpdate = true;
        child.userData.initPos = child.position.clone();
        child.userData.initRot = child.rotation.clone();
        child.userData.initScale = child.scale.clone();

        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                m.side = THREE.DoubleSide;
              });
            } else {
              mesh.material.side = THREE.DoubleSide;
            }
          }
        }

        const name = (child.name || '').toLowerCase();
        const parentName = (child.parent?.name || '').toLowerCase();
        const px = child.position.x;
        const py = child.position.y;
        const pz = child.position.z;

        // Protect face features, head, crown, and necklace from limb rotation
        if (
          parentName.includes('face') ||
          name.includes('face') ||
          parentName.includes('head') ||
          name.includes('head') ||
          parentName.includes('crown') ||
          name.includes('crown') ||
          parentName.includes('necklace') ||
          name.includes('necklace')
        ) {
          return;
        }

        // Shoulder Arm Pivot Groups (e.g. CategoryGroup_skin children at x = ±0.22, y = 1.3)
        if (
          (!((child as THREE.Mesh).isMesh) && parentName.includes('skin') && Math.abs(px) > 0.14 && py > 1.0 && py < 1.5) ||
          name.includes('arm_l') ||
          name.includes('leftarm') ||
          name.includes('left_arm') ||
          name.includes('arm_r') ||
          name.includes('rightarm') ||
          name.includes('right_arm')
        ) {
          if (px > 0 || name.includes('_l') || name.includes('left')) {
            this.customAnimParts.leftArmPivots.push(child);
          } else {
            this.customAnimParts.rightArmPivots.push(child);
          }
          return;
        }

        // Legs (e.g. CategoryGroup_skin meshes at x = ±0.10, y = 0.42)
        if (
          ((child as THREE.Mesh).isMesh && parentName.includes('skin') && Math.abs(px) > 0.05 && py > 0.25 && py < 0.85) ||
          name.includes('leg_l') ||
          name.includes('leftleg') ||
          name.includes('leg_r') ||
          name.includes('rightleg')
        ) {
          if (px > 0 || name.includes('_l') || name.includes('left')) {
            this.customAnimParts.leftLegs.push(child);
          } else {
            this.customAnimParts.rightLegs.push(child);
          }
          return;
        }

        // Shoes / Feet (e.g. CategoryGroup_shoes children at x = ±0.10, y = 0.08)
        if (
          (parentName.includes('shoe') && Math.abs(px) > 0.04) ||
          name.includes('shoe_l') ||
          name.includes('foot_l') ||
          name.includes('shoe_r') ||
          name.includes('foot_r')
        ) {
          if (px > 0 || name.includes('_l') || name.includes('left')) {
            this.customAnimParts.leftShoes.push(child);
          } else {
            this.customAnimParts.rightShoes.push(child);
          }
          return;
        }

        // Flowing Dress Skirt / Gown / Cape (e.g. CategoryGroup_dress skirt group at y = 0.65)
        if (
          (parentName.includes('dress') && !((child as THREE.Mesh).isMesh) && py > 0.3 && py < 1.0) ||
          name.includes('skirt') ||
          name.includes('gown') ||
          name.includes('cape') ||
          name.includes('cloth')
        ) {
          this.customAnimParts.skirtNodes.push(child);
          return;
        }

        // Flowing Back Hair / Ponytail (e.g. CategoryGroup_hair child at z < -0.08)
        if (
          (parentName.includes('hair') && pz < -0.08) ||
          name.includes('ponytail') ||
          name.includes('back_hair') ||
          name.includes('hair_back')
        ) {
          this.customAnimParts.hairBackNodes.push(child);
          return;
        }
      });

      this.customModelGroup.add(modelObj);
      this.group.add(this.customModelGroup);
      this.defaultBodyGroup.visible = false;
      if (this.crownMesh) this.crownMesh.visible = false;
      if (this.capeGroup) this.capeGroup.visible = false;
      this.isCustomModelLoaded = true;
    };

    try {
      const isObjFormat =
        urlOrPreset.startsWith('#') ||
        urlOrPreset.startsWith('v ') ||
        urlOrPreset.startsWith('o ') ||
        urlOrPreset.startsWith('g ') ||
        urlOrPreset.startsWith('mtllib ') ||
        urlOrPreset.includes('format=obj') ||
        urlOrPreset.endsWith('.obj') ||
        urlOrPreset.startsWith('data:text');

      if (isObjFormat) {
        if (urlOrPreset.startsWith('data:')) {
          const raw = atob(urlOrPreset.split(',')[1] || '');
          const obj = new OBJLoader().parse(raw);
          onModelLoaded(obj);
        } else if (
          urlOrPreset.startsWith('#') ||
          urlOrPreset.startsWith('v ') ||
          urlOrPreset.startsWith('o ') ||
          urlOrPreset.startsWith('g ') ||
          urlOrPreset.startsWith('mtllib ') ||
          urlOrPreset.includes('\n')
        ) {
          const obj = new OBJLoader().parse(urlOrPreset);
          onModelLoaded(obj);
        } else {
          new OBJLoader().load(urlOrPreset, onModelLoaded, undefined, () => {});
        }
      } else {
        if (urlOrPreset.startsWith('data:')) {
          const base64Str = urlOrPreset.split(',')[1] || '';
          const byteCharacters = atob(base64Str);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          new GLTFLoader().parse(
            byteArray.buffer,
            '',
            (gltf) => onModelLoaded(gltf.scene, gltf.animations),
            (err) => console.error('GLTF parse error', err)
          );
        } else if (urlOrPreset.startsWith('{')) {
          new GLTFLoader().parse(
            urlOrPreset,
            '',
            (gltf) => onModelLoaded(gltf.scene, gltf.animations),
            () => {}
          );
        } else {
          new GLTFLoader().load(urlOrPreset, (gltf) => onModelLoaded(gltf.scene, gltf.animations), undefined, () => {});
        }
      }
    } catch {
      const fallback = this.createCharacterPresetMesh('mecha');
      this.customModelGroup.add(fallback);
      this.group.add(this.customModelGroup);
      this.defaultBodyGroup.visible = false;
      if (this.crownMesh) this.crownMesh.visible = false;
      if (this.capeGroup) this.capeGroup.visible = false;
      this.isCustomModelLoaded = true;
    }
  }

  private createCrown() {
    if (this.crownMesh) {
      this.headGroup.remove(this.crownMesh);
    }
    const crownGroup = new THREE.Group();
    const baseBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10, 1, true),
      this.crownMaterial
    );
    crownGroup.add(baseBand);

    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 3),
        this.crownMaterial
      );
      const angle = (i - 1.5) * 0.32;
      spike.position.set(Math.sin(angle) * 0.22, 0.1, Math.cos(angle) * 0.22);
      spike.rotation.y = angle;
      crownGroup.add(spike);
    }

    crownGroup.position.set(0, 0.28, 0);
    this.crownMesh = crownGroup as unknown as THREE.Mesh;
    this.headGroup.add(this.crownMesh);
  }

  public updateConfig(newConfig: PrincessConfig) {
    this.config = newConfig;

    this.skinMaterial.color.set(this.config.skinColor);
    this.hairMaterial.color.set(this.config.hairColor);
    this.outfitMaterial.color.set(this.config.outfitColor);
    this.outfitSecondaryMaterial.color.set(this.config.outfitSecondaryColor);
    this.crownMaterial.color.set(this.config.crownColor);
    this.crownMaterial.emissive.set(this.config.crownColor).multiplyScalar(0.2);
    this.capeMaterial.color.set(this.config.capeColor);

    const charModelSource =
      this.config.customModelUrl ||
      this.config.presetType ||
      '';

    if (this.config.customTextureUrl) {
      this.applyTextureUrl(this.config.customTextureUrl);
    }

    if (charModelSource) {
      this.defaultBodyGroup.visible = false;
      if (this.crownMesh) this.crownMesh.visible = false;
      if (this.capeGroup) this.capeGroup.visible = false;
      this.loadCustomModel(charModelSource);
    } else {
      if (this.customModelGroup) {
        this.group.remove(this.customModelGroup);
        this.customModelGroup = null;
      }
      this.defaultBodyGroup.visible = true;
      if (this.crownMesh) this.crownMesh.visible = this.config.hasCrown;
      if (this.capeGroup) this.capeGroup.visible = this.config.hasCape;
      this.isCustomModelLoaded = false;
    }

    if (this.config.skateboard) {
      this.updateSkateboard(this.config.skateboard);
    }

    if (this.config.hasCrown && !this.crownMesh) {
      this.createCrown();
    } else if (!this.config.hasCrown && this.crownMesh) {
      this.headGroup.remove(this.crownMesh);
      this.crownMesh = null;
    }

    if (this.config.hasCape && !this.defaultBodyGroup.children.includes(this.capeGroup)) {
      this.defaultBodyGroup.add(this.capeGroup);
    } else if (!this.config.hasCape && this.defaultBodyGroup.children.includes(this.capeGroup)) {
      this.defaultBodyGroup.remove(this.capeGroup);
    }

    if (charModelSource) {
      this.defaultBodyGroup.visible = false;
      if (this.crownMesh) this.crownMesh.visible = false;
      if (this.capeGroup) this.capeGroup.visible = false;
    }
  }

  public updateSkateboard(board: SkateboardConfig) {
    this.config.skateboard = board;
    this.hoverboardMaterial.color.set(board.boardColor || '#ec4899');
    this.hoverboardMaterial.emissive.set(board.boardColor || '#ec4899').multiplyScalar(0.35);
    this.hoverboardTrimMaterial.color.set(board.trimColor || '#38bdf8');
    this.hoverboardThrusterMaterial.color.set(board.thrusterColor || '#f59e0b');

    if (board.customTextureUrl) {
      this.applySkateboardTexture(board.customTextureUrl);
    } else if (this.hoverboardMaterial.map) {
      this.hoverboardMaterial.map = null;
      this.hoverboardMaterial.needsUpdate = true;
    }

    const boardModelSource =
      board.customModelUrl ||
      board.presetType ||
      (board.id && (board.id.includes('ext_') || board.id.includes('custom_')) ? 'plasma_board' : '');

    if (boardModelSource) {
      this.loadCustomSkateboardModel(boardModelSource, board.modelScale, board.modelYOffset);
    } else if (this.customHoverboardGroup) {
      this.hoverboardGroup.remove(this.customHoverboardGroup);
      this.customHoverboardGroup = null;
      this.defaultHoverboardMeshGroup.visible = true;
    }
  }

  public setHoverboard(active: boolean) {
    this.isHoverboardActive = active;
    this.hoverboardGroup.visible = active;
  }

  public setJumping(jumping: boolean) {
    this.isJumping = jumping;
  }

  public setSliding(sliding: boolean) {
    this.isSliding = sliding;
  }

  public animateDance(delta: number) {
    this.runCycle += delta * 2.8;
    const beat = Math.sin(this.runCycle);
    const pulse = Math.cos(this.runCycle * 2);

    // Joyful station idol dance: hip sway, energetic bounce, happy head tilt
    this.torsoMesh.position.y = 1.05 + Math.abs(pulse) * 0.08;
    this.torsoMesh.rotation.z = beat * 0.12;
    this.torsoMesh.rotation.x = 0.02;
    this.torsoMesh.rotation.y = beat * 0.18;

    this.headGroup.position.set(0, 1.62 + Math.abs(pulse) * 0.08, 0);
    this.headGroup.rotation.z = -beat * 0.15;

    // Graceful dancing arm gestures
    this.leftArmGroup.rotation.x = -0.4 + beat * 0.6;
    this.leftArmGroup.rotation.z = 0.65 + pulse * 0.25;
    this.rightArmGroup.rotation.x = -1.2 - beat * 0.5;
    this.rightArmGroup.rotation.y = -0.3;
    this.rightArmGroup.rotation.z = -0.55 + pulse * 0.2;

    // Rhythmic stepping feet
    this.leftLegGroup.position.y = 0.72 + (beat > 0 ? beat * 0.08 : 0);
    this.leftLegGroup.rotation.x = beat * 0.25;
    this.rightLegGroup.position.y = 0.72 + (beat < 0 ? -beat * 0.08 : 0);
    this.rightLegGroup.rotation.x = -beat * 0.25;

    this.hairPonytail.rotation.x = -Math.PI * 0.4 + beat * 0.25;
    if (this.capeGroup) {
      this.capeGroup.rotation.x = 0.15 + Math.abs(pulse) * 0.25;
    }

    if (this.customModelGroup) {
      const yOff = this.config.modelYOffset || 0.0;
      this.customModelGroup.position.y = yOff + Math.abs(pulse) * 0.08;
      this.customModelGroup.rotation.y = (this.config.modelRotationY || 0) + beat * 0.18;
      this.customModelGroup.rotation.z = beat * 0.08;
    }
  }

  /**
   * Station platform chat & idol dancing animation:
   * Expressive conversational gesturing, head nodding to friends, stepping feet, and idol dancing!
   * Fully supports both procedural character and custom GLTF models.
   */
  public animateStationChat(delta: number, isCheering: boolean = false, phaseOffset: number = 0) {
    this.runCycle += delta * 3.0;
    const time = this.runCycle + phaseOffset;
    const beat = Math.sin(time);
    const pulse = Math.cos(time * 2);
    const talkWave = Math.sin(time * 1.5);

    if (this.customModelGroup) {
      if (this.mixer) {
        this.mixer.update(delta * 1.2);
      }
      const yOff = this.config.modelYOffset || 0.0;
      const baseRotY = this.config.modelRotationY || 0.0;
      const parts = this.customAnimParts;

      if (isCheering) {
        const wave = Math.sin(time * 5.0);
        this.customModelGroup.position.y = yOff + Math.abs(wave) * 0.12;
        this.customModelGroup.rotation.y = baseRotY + wave * 0.1;
        this.customModelGroup.rotation.z = wave * 0.06;

        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 1.8 + wave * 0.4, ir.y, ir.z + 0.4);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 1.8 - wave * 0.4, ir.y, ir.z - 0.4);
        });
      } else {
        // Lively platform chatting & groove dancing for custom models
        this.customModelGroup.position.y = yOff + Math.abs(pulse) * 0.08;
        this.customModelGroup.rotation.y = baseRotY + beat * 0.22;
        this.customModelGroup.rotation.z = beat * 0.08;

        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.7 + talkWave * 0.45, ir.y + 0.2, ir.z + 0.35 + pulse * 0.15);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.3 - beat * 0.3, ir.y - 0.1, ir.z - 0.3 + beat * 0.1);
        });

        const legSwing = beat * 0.18;
        parts.leftLegs.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x + legSwing;
        });
        parts.rightLegs.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x - legSwing;
        });
      }
      return;
    }

    if (isCheering) {
      // Cheering: arms raised waving excitedly to runner on the track!
      const wave = Math.sin(time * 5.0);
      this.torsoMesh.position.y = 1.05 + Math.abs(wave) * 0.12;
      this.torsoMesh.rotation.z = wave * 0.1;
      this.torsoMesh.rotation.y = wave * 0.08;
      this.headGroup.position.set(0, 1.62 + Math.abs(wave) * 0.12, 0);
      this.headGroup.rotation.x = -0.15;

      this.leftArmGroup.rotation.x = -2.2 + wave * 0.45;
      this.leftArmGroup.rotation.z = 0.5 + wave * 0.25;
      this.rightArmGroup.rotation.x = -2.4 - wave * 0.45;
      this.rightArmGroup.rotation.z = -0.5 - wave * 0.25;

      this.leftLegGroup.position.y = 0.72 + (wave > 0 ? wave * 0.08 : 0);
      this.rightLegGroup.position.y = 0.72 + (wave < 0 ? -wave * 0.08 : 0);
      return;
    }

    // Lively Platform Idol Dance & Talking Gestures
    this.torsoMesh.position.y = 1.05 + Math.abs(pulse) * 0.09;
    this.torsoMesh.rotation.y = beat * 0.24;
    this.torsoMesh.rotation.z = beat * 0.12;

    // Expressive head nod, tilt and turn while talking to companions and player
    this.headGroup.position.set(0, 1.62 + Math.abs(pulse) * 0.09, 0);
    this.headGroup.rotation.y = Math.sin(time * 0.85) * 0.3;
    this.headGroup.rotation.x = Math.sin(time * 1.7) * 0.12;
    this.headGroup.rotation.z = -beat * 0.14;

    // Gesturing and dancing arms: one arm gestures enthusiastically, other sways with rhythm
    this.leftArmGroup.rotation.x = -0.85 + talkWave * 0.55;
    this.leftArmGroup.rotation.y = 0.3 + beat * 0.2;
    this.leftArmGroup.rotation.z = 0.55 + pulse * 0.25;

    this.rightArmGroup.rotation.x = -0.35 - beat * 0.4;
    this.rightArmGroup.rotation.y = -0.2;
    this.rightArmGroup.rotation.z = -0.45 + beat * 0.2;

    // Rhythmic stepping feet: shifting weight naturally to the beat
    this.leftLegGroup.position.y = 0.72 + (beat > 0 ? beat * 0.09 : 0);
    this.leftLegGroup.rotation.x = beat * 0.22;
    this.rightLegGroup.position.y = 0.72 + (beat < 0 ? -beat * 0.09 : 0);
    this.rightLegGroup.rotation.x = -beat * 0.22;

    this.hairPonytail.rotation.x = -Math.PI * 0.4 + beat * 0.25;
    if (this.capeGroup) {
      this.capeGroup.rotation.x = 0.2 + Math.abs(beat) * 0.2;
    }
  }

  /**
   * Station Swing Animation:
   * Princess seated on the station swing, gracefully swaying in a harmonic pendulum arc,
   * holding the swing rope with one hand while waving affectionately to her friends across the tracks!
   */
  public animateStationSwing(delta: number, swingAngle: number, swingTime: number) {
    this.runCycle += delta;
    const wave = Math.sin(swingTime * 3.2);

    if (this.customModelGroup) {
      if (this.mixer) {
        this.mixer.update(delta * 0.8);
      }
      const yOff = this.config.modelYOffset || 0.0;
      const baseRotY = this.config.modelRotationY || 0.0;
      this.customModelGroup.position.y = yOff - 0.18 + Math.abs(swingAngle) * 0.06;
      this.customModelGroup.rotation.x = -swingAngle * 0.75;
      this.customModelGroup.rotation.y = baseRotY + Math.sin(swingTime * 0.7) * 0.12;
      this.customModelGroup.rotation.z = Math.sin(swingTime * 1.5) * 0.03;

      const parts = this.customAnimParts;
      parts.leftArmPivots.forEach((n) => {
        const ir = n.userData.initRot || new THREE.Euler();
        n.rotation.set(ir.x - 1.4 + wave * 0.3, ir.y + 0.3, ir.z + 0.5);
      });
      parts.rightArmPivots.forEach((n) => {
        const ir = n.userData.initRot || new THREE.Euler();
        n.rotation.set(ir.x - 0.9 - swingAngle * 0.4, ir.y - 0.2, ir.z - 0.3);
      });
      return;
    }

    // Seated / dangling pose on swing bench
    this.torsoMesh.position.y = 0.86 + Math.abs(swingAngle) * 0.06;
    this.torsoMesh.rotation.x = -swingAngle * 0.75;
    this.torsoMesh.rotation.y = 0;
    this.torsoMesh.rotation.z = 0;

    // Head smiling, tilted gently towards friends across tracks
    this.headGroup.position.set(0, 1.44 + Math.abs(swingAngle) * 0.06, 0);
    this.headGroup.rotation.x = -swingAngle * 0.35;
    this.headGroup.rotation.y = Math.sin(swingTime * 0.75) * 0.22;
    this.headGroup.rotation.z = Math.sin(swingTime * 1.5) * 0.06;

    // Seated legs dangling down forward over swing seat
    this.leftLegGroup.position.set(0.16, 0.52, 0.14);
    this.leftLegGroup.rotation.x = -0.78 + swingAngle * 0.42 + Math.sin(swingTime * 2.0) * 0.08;
    this.rightLegGroup.position.set(-0.16, 0.52, 0.14);
    this.rightLegGroup.rotation.x = -0.78 + swingAngle * 0.42 - Math.sin(swingTime * 2.0) * 0.08;

    // Right arm holding securely to the swing rope / chain
    this.rightArmGroup.rotation.set(-1.15 - swingAngle * 0.45, -0.22, -0.32);

    // Left arm waving affectionately across the tracks to companions
    this.leftArmGroup.rotation.set(-1.55 + wave * 0.35, 0.35, 0.52 + wave * 0.18);

    // Hair floating in the gentle breeze of swinging
    this.hairPonytail.rotation.x = -Math.PI * 0.42 - swingAngle * 0.48;
    if (this.capeGroup) {
      this.capeGroup.rotation.x = 0.32 - swingAngle * 0.6;
    }
  }

  /**
   * Platform Standing Front-Facing Idle Animation:
   * Princess stands on the near platform facing directly toward the camera so her face is clearly visible!
   * She gently bounces to the rhythm, shifts weight gracefully, and waves warmly to the player.
   */
  public animatePlatformStanding(delta: number, time: number) {
    this.runCycle += delta;
    const pulse = Math.sin(time * 3.0);
    const sway = Math.sin(time * 1.5);
    const wave = Math.sin(time * 5.8);

    if (this.customModelGroup) {
      if (this.mixer) {
        this.mixer.update(delta * 0.9);
      }
      const yOff = this.config.modelYOffset || 0.0;
      const baseRotY = this.config.modelRotationY || 0.0;
      this.customModelGroup.position.y = yOff + Math.abs(pulse) * 0.04;
      this.customModelGroup.rotation.x = 0;
      this.customModelGroup.rotation.y = baseRotY + sway * 0.08;
      this.customModelGroup.rotation.z = sway * 0.025;

      const parts = this.customAnimParts;
      parts.rightArmPivots.forEach((n) => {
        const ir = n.userData.initRot || new THREE.Euler();
        n.rotation.set(ir.x - 1.7 + wave * 0.25, ir.y - 0.15, ir.z - 0.45 - Math.cos(time * 5.8) * 0.22);
      });
      parts.leftArmPivots.forEach((n) => {
        const ir = n.userData.initRot || new THREE.Euler();
        n.rotation.set(ir.x - 0.25 + pulse * 0.1, ir.y + 0.1, ir.z + 0.28 + sway * 0.06);
      });
      parts.leftLegs.forEach((n) => {
        const ip = n.userData.initPos || new THREE.Vector3();
        const ir = n.userData.initRot || new THREE.Euler();
        n.position.copy(ip);
        n.rotation.set(ir.x + sway * 0.06, ir.y, ir.z);
      });
      parts.rightLegs.forEach((n) => {
        const ip = n.userData.initPos || new THREE.Vector3();
        const ir = n.userData.initRot || new THREE.Euler();
        n.position.copy(ip);
        n.rotation.set(ir.x - sway * 0.06, ir.y, ir.z);
      });
      return;
    }

    // Upright front-facing standing posture on platform
    this.torsoMesh.position.y = 1.05 + Math.abs(pulse) * 0.05;
    this.torsoMesh.rotation.x = 0;
    this.torsoMesh.rotation.y = sway * 0.1;
    this.torsoMesh.rotation.z = sway * 0.05;

    // Head facing straight toward the camera with warm, expressive nods & tilts
    this.headGroup.position.set(0, 1.62 + Math.abs(pulse) * 0.05, 0);
    this.headGroup.rotation.x = Math.sin(time * 2.1) * 0.05;
    this.headGroup.rotation.y = Math.sin(time * 1.1) * 0.12;
    this.headGroup.rotation.z = -sway * 0.07;

    // Feet planted on the platform with gentle rhythmic bounce
    this.leftLegGroup.position.set(0.16, 0.72 + (sway > 0 ? sway * 0.03 : 0), 0);
    this.leftLegGroup.rotation.x = sway * 0.08;
    this.rightLegGroup.position.set(-0.16, 0.72 + (sway < 0 ? -sway * 0.03 : 0), 0);
    this.rightLegGroup.rotation.x = -sway * 0.08;

    // Right arm raised in a friendly greeting wave toward the camera
    this.rightArmGroup.rotation.set(-2.05 + wave * 0.25, -0.2, -0.45 - Math.cos(time * 5.8) * 0.24);
    // Left arm resting gracefully at hip/side with gentle rhythm
    this.leftArmGroup.rotation.set(-0.25 + pulse * 0.12, 0.2, 0.35 + sway * 0.08);

    this.hairPonytail.rotation.x = -Math.PI * 0.45 + pulse * 0.12;
    if (this.capeGroup) {
      this.capeGroup.rotation.x = 0.22 + Math.abs(pulse) * 0.14;
    }
  }

  /**
   * Interactive Platform Emotes (ইউজাররা প্লাটফর্মে থাকাকালীন ট্যাপ করে দেখতে পারবে):
   * Performs 1 of 5 expressive 3D emotes while facing the camera on the platform!
   */
  public animateStationEmote(delta: number, emote: StationEmoteType, progress: number, time: number) {
    this.runCycle += delta;

    if (this.customModelGroup) {
      if (this.mixer) {
        this.mixer.update(delta * 1.3);
      }
      const yOff = this.config.modelYOffset || 0.0;
      const baseRotY = this.config.modelRotationY || 0.0;
      const parts = this.customAnimParts;

      if (emote === 'wave') {
        const hop = Math.abs(Math.sin(progress * Math.PI * 4)) * 0.14;
        const w = Math.sin(time * 10);
        this.customModelGroup.position.y = yOff + hop;
        this.customModelGroup.rotation.set(0, baseRotY + w * 0.1, w * 0.05);
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 2.3 + w * 0.35, ir.y, ir.z + 0.55 + w * 0.2);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 2.3 - w * 0.35, ir.y, ir.z - 0.55 - w * 0.2);
        });
      } else if (emote === 'dance') {
        const beat = Math.sin(time * 8.5);
        const bounce = Math.abs(Math.sin(time * 17)) * 0.12;
        this.customModelGroup.position.y = yOff + bounce;
        this.customModelGroup.rotation.set(0.05, baseRotY + beat * 0.32, beat * 0.1);
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 1.4 + beat * 0.65, ir.y + 0.3, ir.z + 0.45);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 1.4 - beat * 0.65, ir.y - 0.3, ir.z - 0.45);
        });
      } else if (emote === 'spin') {
        const spinPhase = Math.min(1, progress / 0.78);
        const hop = Math.sin(spinPhase * Math.PI) * 0.24;
        this.customModelGroup.position.y = yOff + hop;
        this.customModelGroup.rotation.set(0, baseRotY, 0);
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 1.5, ir.y, ir.z + 0.85);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 1.5, ir.y, ir.z - 0.85);
        });
      } else if (emote === 'jump_cheer') {
        const jumpArc = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.48;
        this.customModelGroup.position.y = yOff + jumpArc;
        this.customModelGroup.rotation.set(-0.12 * (jumpArc > 0.1 ? 1 : 0), baseRotY, 0);
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 2.5, ir.y, ir.z + 0.65);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 2.5, ir.y, ir.z - 0.65);
        });
      } else {
        // royal_bow
        const bowCurve = progress < 0.55 ? Math.sin((progress / 0.55) * Math.PI) : 0;
        this.customModelGroup.position.y = yOff - bowCurve * 0.12;
        this.customModelGroup.rotation.set(bowCurve * 0.38, baseRotY, 0);
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.6 - (1 - bowCurve) * 1.4, ir.y, ir.z + 0.55);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.8, ir.y + 0.4 * bowCurve, ir.z - 0.25);
        });
      }
      return;
    }

    if (emote === 'wave') {
      const hop = Math.abs(Math.sin(progress * Math.PI * 4)) * 0.14;
      const w = Math.sin(time * 10);
      this.torsoMesh.position.y = 1.05 + hop;
      this.torsoMesh.rotation.set(0, w * 0.12, w * 0.08);
      this.headGroup.position.set(0, 1.62 + hop, 0);
      this.headGroup.rotation.set(-0.08, w * 0.15, -w * 0.12);

      this.leftArmGroup.rotation.set(-2.35 + w * 0.38, 0.25, 0.55 + w * 0.25);
      this.rightArmGroup.rotation.set(-2.35 - w * 0.38, -0.25, -0.55 - w * 0.25);

      this.leftLegGroup.position.set(0.16, 0.72 + hop * 0.7, 0);
      this.leftLegGroup.rotation.x = -0.15 * (hop > 0.05 ? 1 : 0);
      this.rightLegGroup.position.set(-0.16, 0.72 + hop * 0.7, 0);
      this.rightLegGroup.rotation.x = 0.15 * (hop > 0.05 ? 1 : 0);
    } else if (emote === 'dance') {
      const beat = Math.sin(time * 8.5);
      const bounce = Math.abs(Math.sin(time * 17)) * 0.12;
      this.torsoMesh.position.y = 1.05 + bounce;
      this.torsoMesh.rotation.set(0.06, beat * 0.35, beat * 0.15);

      this.headGroup.position.set(0, 1.62 + bounce, 0);
      this.headGroup.rotation.set(Math.sin(time * 17) * 0.08, -beat * 0.2, -beat * 0.14);

      this.leftArmGroup.rotation.set(-1.55 + beat * 0.75, 0.35, 0.55 + bounce * 1.5);
      this.rightArmGroup.rotation.set(-1.55 - beat * 0.75, -0.35, -0.55 - bounce * 1.5);

      this.leftLegGroup.position.set(0.16, 0.72 + (beat > 0 ? beat * 0.12 : 0), 0);
      this.leftLegGroup.rotation.x = beat * 0.35;
      this.rightLegGroup.position.set(-0.16, 0.72 + (beat < 0 ? -beat * 0.12 : 0), 0);
      this.rightLegGroup.rotation.x = -beat * 0.35;
    } else if (emote === 'spin') {
      const spinPhase = Math.min(1, progress / 0.78);
      const hop = Math.sin(spinPhase * Math.PI) * 0.22;
      this.torsoMesh.position.y = 1.05 + hop;
      this.torsoMesh.rotation.set(0, 0, 0);
      this.headGroup.position.set(0, 1.62 + hop, 0);
      this.headGroup.rotation.set(-0.06, 0, 0);

      // Graceful ballerina arms out during twirl, then V-victory pose at the end!
      if (progress < 0.78) {
        this.leftArmGroup.rotation.set(-1.35, 0.2, 0.95);
        this.rightArmGroup.rotation.set(-1.35, -0.2, -0.95);
        this.leftLegGroup.position.set(0.16, 0.72 + hop, 0);
        this.leftLegGroup.rotation.x = -0.15;
        this.rightLegGroup.position.set(-0.16, 0.72 + hop, 0);
        this.rightLegGroup.rotation.x = -0.35;
      } else {
        this.leftArmGroup.rotation.set(-2.35, 0.2, 0.55);
        this.rightArmGroup.rotation.set(-0.35, -0.2, -0.4);
        this.leftLegGroup.position.set(0.16, 0.72, 0);
        this.leftLegGroup.rotation.x = 0;
        this.rightLegGroup.position.set(-0.16, 0.72, 0);
        this.rightLegGroup.rotation.x = 0;
      }
      this.hairPonytail.rotation.x = -Math.PI * 0.65;
      if (this.capeGroup) {
        this.capeGroup.rotation.x = 0.65;
      }
    } else if (emote === 'jump_cheer') {
      const jumpArc = Math.abs(Math.sin(progress * Math.PI * 2)) * 0.45;
      const inAir = jumpArc > 0.08;
      this.torsoMesh.position.y = 1.05 + jumpArc;
      this.torsoMesh.rotation.set(inAir ? -0.12 : 0, 0, 0);
      this.headGroup.position.set(0, 1.62 + jumpArc, 0);
      this.headGroup.rotation.set(inAir ? -0.15 : 0, 0, 0);

      this.leftArmGroup.rotation.set(-2.45, 0.2, inAir ? 0.75 : 0.35);
      this.rightArmGroup.rotation.set(-2.45, -0.2, inAir ? -0.75 : -0.35);

      this.leftLegGroup.position.set(0.16 + (inAir ? 0.08 : 0), 0.72 + jumpArc * 0.9, 0);
      this.leftLegGroup.rotation.x = inAir ? -0.35 : 0;
      this.rightLegGroup.position.set(-0.16 - (inAir ? 0.08 : 0), 0.72 + jumpArc * 0.9, 0);
      this.rightLegGroup.rotation.x = inAir ? 0.35 : 0;
    } else {
      // royal_bow: Elegant royal curtsy followed by a cheerful greeting pose
      const bowCurve = progress < 0.58 ? Math.sin((progress / 0.58) * Math.PI) : 0;
      const poseWave = progress >= 0.58 ? Math.sin(time * 8) * 0.25 : 0;
      this.torsoMesh.position.y = 1.05 - bowCurve * 0.14;
      this.torsoMesh.rotation.set(bowCurve * 0.42, 0, 0);

      this.headGroup.position.set(0, 1.62 - bowCurve * 0.14, bowCurve * 0.08);
      this.headGroup.rotation.set(bowCurve * 0.32, 0, poseWave * 0.3);

      if (progress < 0.58) {
        this.rightArmGroup.rotation.set(-0.75, 0.55 * bowCurve, -0.15);
        this.leftArmGroup.rotation.set(-0.45, 0.2, 0.75 * bowCurve + 0.25);
        this.leftLegGroup.position.set(0.16, 0.72 - bowCurve * 0.08, 0);
        this.leftLegGroup.rotation.x = 0.15 * bowCurve;
        this.rightLegGroup.position.set(-0.12, 0.72 - bowCurve * 0.1, -0.14 * bowCurve);
        this.rightLegGroup.rotation.x = -0.45 * bowCurve;
      } else {
        this.rightArmGroup.rotation.set(-2.25 + poseWave, -0.2, -0.45);
        this.leftArmGroup.rotation.set(-0.3, 0.2, 0.35);
        this.leftLegGroup.position.set(0.16, 0.72, 0);
        this.leftLegGroup.rotation.x = 0;
        this.rightLegGroup.position.set(-0.16, 0.72, 0);
        this.rightLegGroup.rotation.x = 0;
      }
    }
  }

  /**
   * Companion Run Animation:
   * Smooth sprinting alongside the player, with one arm enthusiastically waving & cheering!
   */
  public animateCompanionRun(delta: number, runSpeed: number, waveRightSide: boolean = false) {
    this.animate(delta, runSpeed, 0, 0);

    const wave = Math.sin(Date.now() * 0.008);
    if (waveRightSide) {
      this.rightArmGroup.rotation.set(-1.9 + wave * 0.4, -0.25, -0.55 - wave * 0.2);
    } else {
      this.leftArmGroup.rotation.set(-1.9 + wave * 0.4, 0.25, 0.55 + wave * 0.2);
    }
    this.headGroup.rotation.y = (waveRightSide ? 0.35 : -0.35) + wave * 0.1;
  }

  public animate(delta: number, runSpeed: number, _playerY: number = 0, slideRatio: number = 0) {
    if (this.shadowBlob) {
      this.shadowBlob.visible = false;
    }

    if (this.customModelGroup) {
      // Ensure default procedural body parts & accessories are strictly hidden
      this.defaultBodyGroup.visible = false;
      if (this.crownMesh) this.crownMesh.visible = false;
      if (this.capeGroup) this.capeGroup.visible = false;

      // Update GLTF animation mixer if embedded clips exist
      if (this.mixer) {
        this.mixer.update(delta * (runSpeed * 0.45));
      }

      const yOff = this.config.modelYOffset || 0.0;
      const baseRotY = this.config.modelRotationY || 0.0;
      const parts = this.customAnimParts;

      if (this.isHoverboardActive) {
        const floatWave = Math.sin(Date.now() * 0.008);
        this.hoverboardGroup.position.y = 0.08 + floatWave * 0.04;
        this.customModelGroup.position.y = yOff + 0.12 + floatWave * 0.04;
        this.customModelGroup.rotation.y = baseRotY + 0.3;
        this.customModelGroup.rotation.x = 0.04;
        this.customModelGroup.rotation.z = 0;

        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.15, ir.y, ir.z + 0.22 + floatWave * 0.05);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x + 0.15, ir.y, ir.z - 0.22 - floatWave * 0.05);
        });
      } else if (this.isSliding) {
        // Acrobatic somersault dive roll / front flip (ডিগবাজি!)
        const rollProgress = Math.min(1.0, Math.max(0.0, slideRatio));
        const flipAngle = -rollProgress * Math.PI * 2;
        const rollBounce = Math.sin(rollProgress * Math.PI) * 0.35;

        this.customModelGroup.position.y = yOff - 0.25 + rollBounce;
        this.customModelGroup.rotation.x = flipAngle;
        this.customModelGroup.rotation.y = baseRotY;
        this.customModelGroup.rotation.z = 0;
      } else if (this.isJumping) {
        this.customModelGroup.position.y = yOff + 0.2;
        this.customModelGroup.rotation.x = -0.15; // Graceful arched back
        this.customModelGroup.rotation.y = baseRotY;
        this.customModelGroup.rotation.z = 0;

        // Raise arms high in graceful jump
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.85, ir.y, ir.z + 0.35);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - 0.85, ir.y, ir.z - 0.35);
        });
      } else {
        this.runCycle += delta * (runSpeed * 0.55);
        const swing = Math.sin(this.runCycle);
        const breeze = Math.sin(this.runCycle * 2);

        // Smooth runner stride bounce & forward lean
        this.customModelGroup.position.y = yOff + Math.abs(swing) * 0.09;
        this.customModelGroup.rotation.x = 0.08 + breeze * 0.015;
        this.customModelGroup.rotation.y = baseRotY + swing * 0.06;
        this.customModelGroup.rotation.z = Math.cos(this.runCycle) * 0.025;

        // 1. Arms swinging naturally from shoulder joints
        parts.leftArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x + swing * 0.55, ir.y, ir.z + Math.abs(swing) * 0.05);
        });
        parts.rightArmPivots.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.set(ir.x - swing * 0.55, ir.y, ir.z - Math.abs(swing) * 0.05);
        });

        // 2. Legs & Shoes swinging together from hip joint (y ≈ 0.74) with forward-stride foot lift
        const leftLegAngle = -swing * 0.34;
        const rightLegAngle = swing * 0.34;
        const leftForwardLift = Math.max(0, Math.cos(this.runCycle));
        const rightForwardLift = Math.max(0, -Math.cos(this.runCycle));

        parts.leftLegs.forEach((n) => {
          const ip = n.userData.initPos || new THREE.Vector3();
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x + leftLegAngle;
          n.position.z = ip.z - Math.sin(leftLegAngle) * 0.30;
          n.position.y = ip.y + leftForwardLift * 0.04;
        });
        parts.rightLegs.forEach((n) => {
          const ip = n.userData.initPos || new THREE.Vector3();
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x + rightLegAngle;
          n.position.z = ip.z - Math.sin(rightLegAngle) * 0.30;
          n.position.y = ip.y + rightForwardLift * 0.04;
        });

        parts.leftShoes.forEach((n) => {
          const ip = n.userData.initPos || new THREE.Vector3();
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x + leftLegAngle * 0.85;
          n.position.z = ip.z - Math.sin(leftLegAngle) * 0.56;
          n.position.y = ip.y + leftForwardLift * 0.08;
        });
        parts.rightShoes.forEach((n) => {
          const ip = n.userData.initPos || new THREE.Vector3();
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x + rightLegAngle * 0.85;
          n.position.z = ip.z - Math.sin(rightLegAngle) * 0.56;
          n.position.y = ip.y + rightForwardLift * 0.08;
        });

        // 3. Dress / Gown gentle wind flutter & hemline breeze
        parts.skirtNodes.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          const is = n.userData.initScale || new THREE.Vector3(1, 1, 1);
          n.rotation.x = ir.x + 0.05 + breeze * 0.045;
          n.rotation.z = ir.z + swing * 0.03;
          n.scale.set(
            is.x * (1 + breeze * 0.025),
            is.y,
            is.z * (1 + Math.cos(this.runCycle * 2) * 0.04)
          );
        });

        // 4. Flowing back hair / ponytail gentle wave
        parts.hairBackNodes.forEach((n) => {
          const ir = n.userData.initRot || new THREE.Euler();
          n.rotation.x = ir.x + 0.06 + breeze * 0.08;
          n.rotation.z = ir.z + swing * 0.04;
        });
      }
      return;
    }

    if (this.isSliding) {
      this.torsoMesh.position.y = 0.45;
      this.torsoMesh.rotation.x = -1.2;
      this.headGroup.position.y = 0.8;
      this.headGroup.position.z = -0.3;
      this.leftLegGroup.position.y = 0.3;
      this.leftLegGroup.rotation.x = -1.3;
      this.rightLegGroup.position.y = 0.3;
      this.rightLegGroup.rotation.x = -1.3;
      this.leftArmGroup.rotation.x = 0.8;
      this.rightArmGroup.rotation.x = 0.8;
      return;
    }

    if (this.isJumping) {
      this.torsoMesh.position.y = 1.05;
      this.torsoMesh.rotation.x = 0.1;
      this.headGroup.position.set(0, 1.62, 0);
      this.leftLegGroup.position.y = 0.72;
      this.rightLegGroup.position.y = 0.72;
      this.leftLegGroup.rotation.x = -0.4;
      this.rightLegGroup.rotation.x = -0.5;
      this.leftArmGroup.rotation.x = -2.2;
      this.rightArmGroup.rotation.x = -2.2;
      return;
    }

    this.runCycle += delta * (runSpeed * 0.55);
    const swing = Math.sin(this.runCycle);

    this.torsoMesh.position.y = 1.05 + Math.abs(swing) * 0.08;
    this.torsoMesh.rotation.x = 0.12;
    this.torsoMesh.rotation.y = swing * 0.08;
    this.torsoMesh.rotation.z = 0;
    this.leftArmGroup.rotation.y = 0;
    this.rightArmGroup.rotation.y = 0;
    this.leftArmGroup.rotation.z = 0;
    this.rightArmGroup.rotation.z = 0;

    this.headGroup.position.set(0, 1.62 + Math.abs(swing) * 0.08, 0);
    this.headGroup.rotation.set(0, 0, 0);

    this.leftLegGroup.position.set(0.16, 0.72, 0);
    this.rightLegGroup.position.set(-0.16, 0.72, 0);
    this.leftLegGroup.rotation.x = swing * 0.9;
    this.rightLegGroup.rotation.x = -swing * 0.9;

    this.leftArmGroup.rotation.x = -swing * 0.95;
    this.rightArmGroup.rotation.x = swing * 0.95;

    this.hairPonytail.rotation.x = -Math.PI * 0.45 + swing * 0.15;
    if (this.capeGroup) {
      this.capeGroup.rotation.x = 0.25 + Math.abs(swing) * 0.35;
    }
  }
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PetConfig, PetType } from '../types/game';

export class PetCompanion {
  public group: THREE.Group;
  private config: PetConfig;

  // Parts
  private defaultBodyGroup: THREE.Group;
  private customModelGroup: THREE.Group | null = null;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private tailMesh: THREE.Mesh;
  private leftEarMesh: THREE.Mesh;
  private rightEarMesh: THREE.Mesh;
  private wingsGroup?: THREE.Group;
  private legs: THREE.Mesh[] = [];
  public shadowBlob: THREE.Mesh;

  // Fast mobile materials
  private mainMaterial: THREE.MeshLambertMaterial;
  private secondaryMaterial: THREE.MeshLambertMaterial;

  private bounceCycle: number = 0;
  private isCustomModelLoaded: boolean = false;

  constructor(config: PetConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.defaultBodyGroup = new THREE.Group();
    this.group.add(this.defaultBodyGroup);

    this.mainMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.color),
    });

    this.secondaryMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(this.config.secondaryColor),
    });

    if (this.config.customTextureUrl) {
      this.applyTextureUrl(this.config.customTextureUrl);
    }
    if (this.config.customModelUrl) {
      this.loadCustomModel(this.config.customModelUrl);
    }

    // 1. Body
    const bodyGeo = new THREE.BoxGeometry(0.35, 0.28, 0.5);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.mainMaterial);
    this.bodyMesh.position.y = 0.3;
    this.defaultBodyGroup.add(this.bodyMesh);

    // Belly patch
    const bellyGeo = new THREE.BoxGeometry(0.36, 0.14, 0.35);
    const belly = new THREE.Mesh(bellyGeo, this.secondaryMaterial);
    belly.position.y = -0.06;
    this.bodyMesh.add(belly);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.32, 0.3, 0.3);
    this.headMesh = new THREE.Mesh(headGeo, this.mainMaterial);
    this.headMesh.position.set(0, 0.22, 0.32);
    this.bodyMesh.add(this.headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.1, 0.04, 0.15);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(-0.1, 0.04, 0.15);
    this.headMesh.add(eyeL, eyeR);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.14, 0.1, 0.12);
    const snout = new THREE.Mesh(snoutGeo, this.secondaryMaterial);
    snout.position.set(0, -0.04, 0.18);
    const noseDot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), eyeMat);
    noseDot.position.set(0, 0.04, 0.06);
    snout.add(noseDot);
    this.headMesh.add(snout);

    // 3. Ears
    const earGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
    this.leftEarMesh = new THREE.Mesh(earGeo, this.mainMaterial);
    this.leftEarMesh.position.set(0.12, 0.22, 0);
    this.rightEarMesh = new THREE.Mesh(earGeo, this.mainMaterial);
    this.rightEarMesh.position.set(-0.12, 0.22, 0);
    this.headMesh.add(this.leftEarMesh, this.rightEarMesh);

    // 4. Tail
    const tailGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.22, 4);
    tailGeo.translate(0, 0.11, 0);
    this.tailMesh = new THREE.Mesh(tailGeo, this.mainMaterial);
    this.tailMesh.position.set(0, 0.1, -0.25);
    this.tailMesh.rotation.x = -0.7;
    this.bodyMesh.add(this.tailMesh);

    // 5. 4 Stubby Legs
    const legPositions = [
      [0.14, -0.15, 0.15],
      [-0.14, -0.15, 0.15],
      [0.14, -0.15, -0.15],
      [-0.14, -0.15, -0.15],
    ];
    legPositions.forEach(([x, y, z]) => {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.18, 4);
      const leg = new THREE.Mesh(legGeo, this.mainMaterial);
      leg.position.set(x, y, z);
      this.bodyMesh.add(leg);
      this.legs.push(leg);
    });

    // 6. Fake Ground Shadow Blob (hidden so no disc appears under pet)
    const shadowGeo = new THREE.CircleGeometry(0.32, 10);
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

    this.applyTypeFeatures(this.config.type);
    this.group.visible = this.config.enabled;
  }

  private applyTextureUrl(textureUrl: string) {
    try {
      new THREE.TextureLoader().load(textureUrl, (tex) => {
        this.mainMaterial.map = tex;
        this.mainMaterial.needsUpdate = true;
      });
    } catch {}
  }

  private loadCustomModel(url: string) {
    if (this.customModelGroup) {
      this.group.remove(this.customModelGroup);
      this.customModelGroup = null;
    }

    const scale = (this.config.modelScale || 1.0) * 0.55;
    const yOffset = this.config.modelYOffset || 0.15;

    const onModelLoaded = (modelObj: THREE.Object3D) => {
      this.customModelGroup = new THREE.Group();
      this.customModelGroup.position.set(0, yOffset, 0);
      this.customModelGroup.scale.set(scale, scale, scale);

      if (this.config.tintColor || this.config.color) {
        const tint = new THREE.Color(this.config.tintColor || this.config.color);
        modelObj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                if ('color' in m) (m as THREE.MeshStandardMaterial).color.lerp(tint, 0.25);
              });
            } else if (mesh.material && 'color' in mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).color.lerp(tint, 0.25);
            }
          }
        });
      }

      this.customModelGroup.add(modelObj);
      this.group.add(this.customModelGroup);
      this.defaultBodyGroup.visible = false;
      this.isCustomModelLoaded = true;
    };

    try {
      if (url.endsWith('.obj') || url.includes('format=obj')) {
        new OBJLoader().load(url, onModelLoaded, undefined, () => {});
      } else {
        new GLTFLoader().load(url, (gltf) => onModelLoaded(gltf.scene), undefined, () => {});
      }
    } catch {}
  }

  private applyTypeFeatures(type: PetType) {
    if (type === 'dragon') {
      if (!this.wingsGroup) {
        this.wingsGroup = new THREE.Group();
        const wingMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(this.config.secondaryColor),
          side: THREE.DoubleSide,
        });
        const wingGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          0, 0, 0,
          0.3, 0.2, 0,
          0.25, -0.1, 0,
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const wingL = new THREE.Mesh(wingGeo, wingMat);
        wingL.position.set(0.18, 0.15, 0);
        const wingR = wingL.clone();
        wingR.scale.x = -1;
        wingR.position.x = -0.18;
        this.wingsGroup.add(wingL, wingR);
        this.bodyMesh.add(this.wingsGroup);
      }
    } else if (this.wingsGroup) {
      this.bodyMesh.remove(this.wingsGroup);
      this.wingsGroup = undefined;
    }
  }

  public updateConfig(newConfig: PetConfig) {
    this.config = newConfig;
    this.mainMaterial.color.set(this.config.color);
    this.secondaryMaterial.color.set(this.config.secondaryColor);
    if (this.config.customTextureUrl) {
      this.applyTextureUrl(this.config.customTextureUrl);
    }
    if (this.config.customModelUrl) {
      this.loadCustomModel(this.config.customModelUrl);
    } else if (this.customModelGroup) {
      this.group.remove(this.customModelGroup);
      this.customModelGroup = null;
      this.defaultBodyGroup.visible = true;
      this.isCustomModelLoaded = false;
    }
    this.applyTypeFeatures(this.config.type);
    this.group.visible = this.config.enabled;
  }

  public animate(delta: number, speed: number, isPlayerJumping: boolean, _playerY: number = 0) {
    if (!this.group.visible) return;

    if (this.shadowBlob) {
      this.shadowBlob.visible = false;
    }

    this.bounceCycle += delta * (speed * 0.7);
    const bounce = Math.sin(this.bounceCycle);

    if (this.customModelGroup && this.isCustomModelLoaded) {
      this.customModelGroup.position.y = (this.config.modelYOffset || 0.15) + Math.abs(bounce) * 0.1;
      this.customModelGroup.rotation.z = bounce * 0.05;
    } else {
      this.bodyMesh.position.y = 0.3 + Math.abs(bounce) * 0.14;
      this.bodyMesh.rotation.z = bounce * 0.08;
      this.tailMesh.rotation.z = Math.sin(this.bounceCycle * 2) * 0.5;

      if (this.legs.length === 4) {
        this.legs[0].rotation.x = bounce * 0.5;
        this.legs[1].rotation.x = -bounce * 0.5;
        this.legs[2].rotation.x = -bounce * 0.5;
        this.legs[3].rotation.x = bounce * 0.5;
      }

      if (this.wingsGroup) {
        this.wingsGroup.children[0].rotation.z = Math.sin(this.bounceCycle * 2.5) * 0.5;
        this.wingsGroup.children[1].rotation.z = -Math.sin(this.bounceCycle * 2.5) * 0.5;
      }
    }

    if (isPlayerJumping) {
      this.group.position.y = 0.8;
    } else {
      this.group.position.y = 0;
    }
  }
}

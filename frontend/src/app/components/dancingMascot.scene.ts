import {
  buildMascotDanceRoutine,
  computeFitScale,
  EXCITED_CLIP_PREFERENCE,
  pickClipName,
} from "./dancingMascot.clips.utils";

export type MascotSceneHandle = {
  dispose: () => void;
  playExcited: () => void;
};

type MascotSceneOptions = {
  modelUrl: string;
  reducedMotion: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
};

type MeshLike = {
  isMesh?: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
};

type DisposableNode = {
  geometry?: { dispose?: () => void };
  material?: { dispose?: () => void } | Array<{ dispose?: () => void }>;
};

type MascotAction = {
  timeScale: number;
  enabled: boolean;
  reset: () => MascotAction;
  setEffectiveTimeScale: (value: number) => void;
  setLoop: (loop: unknown, count: number) => void;
  fadeOut: (duration: number) => void;
  fadeIn: (duration: number) => MascotAction;
  play: () => void;
};

/**
 * Builds a minimal procedural environment map so the Fox model's PBR
 * materials (roughness/metalness/normals) get realistic indirect lighting
 * without shipping a heavy .hdr file.
 *
 * We create a small DataTexture that encodes a simple gradient sky
 * (warm top ↔ cool bottom), then run it through PMREMGenerator so
 * Three.js can use it as an irradiance probe.
 */
function createSoftShadowTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.45)");
    grad.addColorStop(0.35, "rgba(0, 0, 0, 0.25)");
    grad.addColorStop(0.7, "rgba(0, 0, 0, 0.08)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export async function mountDancingMascotScene(
  canvas: HTMLCanvasElement,
  options: MascotSceneOptions,
): Promise<MascotSceneHandle> {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { OrbitControls } = await import(
    "three/examples/jsm/controls/OrbitControls.js"
  );
  // @ts-ignore Three.js RoomEnvironment
  const { RoomEnvironment } = await import(
    "three/examples/jsm/environments/RoomEnvironment.js"
  );

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACESFilmic gives rich cartoon colors with clear highlights and deep shadows
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // ── Scene & Camera ────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // Use Three.js official RoomEnvironment for PBR reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envMap;
  // Keep background transparent (alpha canvas) — env is for reflections only

  // Standing cartoon robot: vertical FOV 36° and distance ~2.35 frame the upright body, head, and feet comfortably.
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0.18, 0.95, 2.35);

  // ── Orbit Controls ────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  // Mascot handles its own alive rotation; user can drag to inspect
  controls.autoRotate = false;
  // Constrain vertical angle: from slightly above horizon to ~20° down
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.50;
  // Orbit around center of robot body (chest height)
  controls.target.set(0, 0.52, 0);
  controls.update();

  // ── Lighting ──────────────────────────────────────────────────────────────
  // Soft ambient fill
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // Hemisphere light: bright soft sky from above, subtle dark earth bounce
  const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 0.7);
  scene.add(hemi);

  // Key light — main crisp light from upper-right-front, casts the shadow
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(2.0, 4.0, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.camera.left = -2;
  key.shadow.camera.right = 2;
  key.shadow.camera.top = 2;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.001;
  scene.add(key);

  // Fill light — soft blue from the left to separate the mascot from the bg
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.45);
  fill.position.set(-2.5, 2.0, 2.0);
  scene.add(fill);

  // Rim / back light — creates a crisp outline highlight on the mascot
  const rim = new THREE.DirectionalLight(0x60a5fa, 0.6);
  rim.position.set(0, 3.0, -3.0);
  scene.add(rim);

  // ── Ground Shadow Disc ────────────────────────────────────────────────────
  // Realistic soft radial gradient contact shadow
  const shadowTexture = createSoftShadowTexture(THREE);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);

  // ── Scene Root ────────────────────────────────────────────────────────────
  const petRoot = new THREE.Group();
  scene.add(petRoot);
  // @ts-ignore debug handle
  canvas.__petRoot = petRoot;

  // ── Animation State ───────────────────────────────────────────────────────
  let disposed = false;
  let mixer: {
    update: (dt: number) => void;
    stopAllAction: () => void;
    clipAction: (clip: unknown) => MascotAction;
  } | null = null;
  let currentAction: MascotAction | null = null;
  const actions = new Map<string, MascotAction>();
  let routineIndex = 0;
  let stepElapsedMs = 0;
  let spinSpeed = 0.35;
  let excitedUntil = 0;
  let frameId = 0;
  const clock = new THREE.Clock();

  // ── Resize Handling ───────────────────────────────────────────────────────
  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement || canvas);

  // ── Clip Player ───────────────────────────────────────────────────────────
  const playClip = (name: string | null, fade = 0.22, timeScale = 1) => {
    if (!name) return;
    const next = actions.get(name);
    if (!next) return;
    if (currentAction === next) {
      next.timeScale = timeScale;
      return;
    }
    next.reset();
    next.setEffectiveTimeScale(timeScale);
    next.setLoop(THREE.LoopRepeat, Infinity);
    if (currentAction) {
      currentAction.fadeOut(fade);
      next.fadeIn(fade).play();
    } else {
      next.play();
    }
    currentAction = next;
  };

  // ── Load Model ────────────────────────────────────────────────────────────
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(options.modelUrl);
  } catch (error) {
    options.onError?.(error);
    throw error;
  }

  if (disposed) {
    return {
      dispose: () => undefined,
      playExcited: () => undefined,
    };
  }

  const model = gltf.scene;
  model.traverse((object: MeshLike) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  // Auto-fit: target 1.05 world-units tall so the standing mascot fits comfortably inside the stage
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fitScale = computeFitScale(size.y, 1.05);
  model.scale.setScalar(fitScale);
  model.position.set(-center.x * fitScale, -box.min.y * fitScale, -center.z * fitScale);
  petRoot.add(model);
  // Default facing: friendly slight 3/4 angle toward the user
  petRoot.rotation.y = -0.15;

  console.log("🤖 MASCOT 3D BOUNDS:", {
    origSize: { x: size.x, y: size.y, z: size.z },
    origCenter: { x: center.x, y: center.y, z: center.z },
    fitScale,
    modelPos: { x: model.position.x, y: model.position.y, z: model.position.z },
    cameraPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    controlsTarget: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
  });

  // ── Animation Clips ───────────────────────────────────────────────────────
  const animationMixer = new THREE.AnimationMixer(model);
  mixer = animationMixer;
  const clipNames: string[] = [];
  for (const clip of gltf.animations) {
    const action = animationMixer.clipAction(clip);
    action.enabled = true;
    actions.set(clip.name, action);
    clipNames.push(clip.name);
  }

  const routine = buildMascotDanceRoutine(clipNames);
  const excitedClip = pickClipName(clipNames, EXCITED_CLIP_PREFERENCE);
  if (routine[0]) {
    spinSpeed = options.reducedMotion ? 0 : routine[0].spinSpeed;
    playClip(routine[0].clip, 0, routine[0].timeScale);
  } else if (clipNames[0]) {
    playClip(clipNames[0], 0, 1);
  }

  options.onReady?.();

  // ── Render Loop ───────────────────────────────────────────────────────────
  const tick = () => {
    if (disposed) return;
    frameId = window.requestAnimationFrame(tick);
    const dt = clock.getDelta();
    const now = performance.now();
    mixer?.update(dt);

    if (!options.reducedMotion) {
      if (now < excitedUntil) {
        // Energetic excited celebration turn
        petRoot.rotation.y += spinSpeed * dt;
        shadow.scale.setScalar(0.82 + Math.sin(now / 80) * 0.1);
      } else if (routine.length > 0) {
        // Normal routine: advance to next clip step on timer
        stepElapsedMs += dt * 1000;
        const step = routine[routineIndex];
        if (step && stepElapsedMs >= step.durationMs) {
          routineIndex = (routineIndex + 1) % routine.length;
          stepElapsedMs = 0;
          const next = routine[routineIndex];
          if (next) {
            spinSpeed = next.spinSpeed;
            playClip(next.clip, 0.25, next.timeScale);
          }
        }

        const currentStep = routine[routineIndex];
        if (currentStep?.clip === "Dance") {
          // Dance step: fun spinning rhythm
          petRoot.rotation.y += spinSpeed * dt;
        } else {
          // Idle / Walking: stays facing the user with a gentle alive breathing sway
          const targetFacing = -0.15 + Math.sin(now * 0.0016) * 0.16;
          petRoot.rotation.y += (targetFacing - (petRoot.rotation.y % (Math.PI * 2))) * 0.04;
        }

        // Subtle breathing pulse on the soft contact shadow
        shadow.scale.setScalar(0.95 + Math.sin(now / 200) * 0.05);
      }

      controls.update();
    }

    renderer.render(scene, camera);
  };
  tick();

  return {
    playExcited: () => {
      if (options.reducedMotion) return;
      const clip = excitedClip ?? routine[routine.length - 1]?.clip ?? null;
      // Play Wave/ThumbsUp/Jump with lively energy
      playClip(clip, 0.12, 1.15);
      spinSpeed = 2.2;
      excitedUntil = performance.now() + 2000;
    },
    dispose: () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      mixer?.stopAllAction();
      shadowTexture.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
      envMap.dispose();
      renderer.dispose();
      scene.traverse((object: DisposableNode) => {
        const maybeMesh = object;
        maybeMesh.geometry?.dispose?.();
        if (Array.isArray(maybeMesh.material)) {
          maybeMesh.material.forEach((material) => material.dispose?.());
        } else {
          maybeMesh.material?.dispose?.();
        }
      });
    },
  };
}


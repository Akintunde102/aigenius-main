const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_PATH = 'C:\\Users\\DELL5530\\.gemini\\antigravity\\brain\\7f6ba56e-18d4-46d0-9088-70e279bde227\\robot-preview.png';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 500, height: 500 } });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script type="importmap">
          {
            "imports": {
              "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
              "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
          }
        </script>
      </head>
      <body style="margin:0; background: #121214; display:flex; justify-content:center; align-items:center; height:100vh;">
        <canvas id="c" width="500" height="500"></canvas>
        <script type="module">
          import * as THREE from 'three';
          import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
          import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

          const canvas = document.getElementById('c');
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
          renderer.setSize(500, 500);
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.2;

          const scene = new THREE.Scene();
          const pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

          const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
          camera.position.set(0, 1.4, 3.2);
          camera.lookAt(0, 0.9, 0);

          scene.add(new THREE.AmbientLight(0xffffff, 0.7));
          const dir = new THREE.DirectionalLight(0xffffff, 1.8);
          dir.position.set(2, 4, 3);
          scene.add(dir);

          const loader = new GLTFLoader();
          loader.load('http://127.0.0.1:23001/mascot/robot.glb', (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.position.y += size.y / 2;
            scene.add(model);

            const mixer = new THREE.AnimationMixer(model);
            const dance = gltf.animations.find(a => a.name === 'Dance') || gltf.animations[0];
            if (dance) mixer.clipAction(dance).play();

            mixer.update(0.5); // Advance to dancing pose
            renderer.render(scene, camera);
            window.__READY__ = true;
          });
        </script>
      </body>
    </html>
  `);

  await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });
  await page.screenshot({ path: OUT_PATH });
  console.log('Saved robot preview to:', OUT_PATH);

  await browser.close();
})();

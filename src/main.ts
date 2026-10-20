import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createEiffelTower } from './assets/eiffel/eiffelTowerAsset';
import { AssetRegistry, type AssetFactoryResult } from './scene/assetRegistry';
import { createScene } from './scene/createScene';
import { createCamera } from './scene/createCamera';
import { applyDebugView } from './runtime/debugViews';
import { installErrorOverlay } from './runtime/errorOverlay';
import { persistCamera, restoreCamera } from './runtime/captureState';
import { createCaptureApi, type CaptureApi } from './runtime/captureApi';
import './style.css';

interface AssetInfo {
  assetId: string;
  source: string;
  height: number;
  min: [number, number, number];
  max: [number, number, number];
  framing: unknown;
}

interface BrowserWindow extends Window {
  media2threejsReady?: boolean;
  __IMG2THREEJS_READY__?: boolean;
  __IMG2THREEJS_CAPTURE__?: CaptureApi;
  __ASSET_INFO__?: AssetInfo;
  __SCENE__?: THREE.Scene;
  __CAMERA__?: THREE.OrthographicCamera;
  __interactive?: boolean;
}

const browserWindow = window as unknown as BrowserWindow;
const params = new URLSearchParams(location.search);
const captureMode = params.get('capture') === '1';
installErrorOverlay();

const canvas = document.querySelector<HTMLCanvasElement>('#app');
if (!canvas) throw new Error('Missing #app canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(captureMode ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(new THREE.Color(0xf4f4f2), 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
const exposureOverride = Number(params.get('exposure'));
if (Number.isFinite(exposureOverride) && exposureOverride > 0) {
  renderer.toneMappingExposure = exposureOverride;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = createScene();
const camera = createCamera(canvas);
applyDebugView(scene, params);

const controls = new OrbitControls(camera, canvas);
controls.enabled = !captureMode;
controls.enableDamping = false;
controls.screenSpacePanning = true;
controls.minZoom = 0.35;
controls.maxZoom = 6;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.56;
controls.addEventListener('start', () => {
  browserWindow.__interactive = true;
});
controls.addEventListener('end', () => persistCamera(camera));

browserWindow.__interactive = false;

let captureApi: CaptureApi | null = null;

function renderFrame(): void {
  renderer.render(scene, camera);
}

function animate(): void {
  requestAnimationFrame(animate);
  if (browserWindow.__interactive === true) controls.update();
  renderer.render(scene, camera);
}

function resize(): void {
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  renderer.setSize(width, height, false);
  if (captureApi) captureApi.refit(width / height);
}

addEventListener('resize', resize);
animate();

async function boot(): Promise<void> {
  const registry = new AssetRegistry();
  registry.register('eiffel-tower', createEiffelTower);
  const result: AssetFactoryResult = await registry.create('eiffel-tower');

  const root = result.root;
  if (!root.name) root.name = 'eiffel-tower';
  scene.add(root);
  root.traverse((object: THREE.Object3D) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const bounds = result.bounds.isEmpty() ? new THREE.Box3().setFromObject(root) : result.bounds.clone();
  if (bounds.isEmpty()) throw new Error('Eiffel tower asset bounds are empty');

  // Size the renderer first so the capture camera solves its frustum against
  // the real viewport aspect (1086x1448 = 0.75 in capture mode).
  resize();
  captureApi = createCaptureApi({ renderer, camera, controls, bounds, root, render: renderFrame });
  await captureApi.resetCamera();
  if (!captureMode) restoreCamera(camera);
  resize();
  renderFrame();

  const info: AssetInfo = {
    assetId: 'eiffel-tower',
    source: 'procedural-asset',
    height: bounds.max.y - bounds.min.y,
    min: [bounds.min.x, bounds.min.y, bounds.min.z],
    max: [bounds.max.x, bounds.max.y, bounds.max.z],
    framing: captureApi.getFraming(),
  };
  browserWindow.__ASSET_INFO__ = info;
  browserWindow.__SCENE__ = scene;
  browserWindow.__CAMERA__ = camera;
  browserWindow.__IMG2THREEJS_CAPTURE__ = captureApi;
  browserWindow.__IMG2THREEJS_READY__ = true;
  browserWindow.media2threejsReady = true;
  document.documentElement.dataset.media2threejsReady = 'true';
  document.documentElement.dataset.assetSource = 'eiffel-tower-asset';
  document.documentElement.dataset.captureApi = 'setCamera,capturePass,getCameraState';
  console.info('eiffel-tower ready', JSON.stringify(info));
}

boot().catch((error: unknown) => {
  console.error('eiffel-tower boot failed', error);
});

import * as THREE from 'three';
import { createLighting } from './createLighting';
import { STUDIO_FLOOR_RADIUS } from './framing';

export const STUDIO_BACKGROUND_HEX = 0xf4f4f2;

/**
 * Seamless near-white studio. The capture camera is orthographic with a small
 * downward tilt, so a huge floor plane fills the frame: it acts as the seamless
 * backdrop itself (no dark horizon line) and still catches the soft contact
 * shadow under the tower. A gentle depth gradient reproduces the reference
 * photo (slightly grey at the top, brighter toward the foreground floor).
 */
function createFloorGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2048;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create studio floor gradient texture');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  // Canvas top maps to world -Z (far behind the asset / top of frame),
  // canvas bottom maps to world +Z (foreground floor / bottom of frame).
  // Visible floor band of the reference-match view maps to canvas 0.196..0.509
  // (top of frame .. bottom of frame): tuned to the reference photo profile
  // (top ~#edeff2, middle ~#f3f4f7, foreground floor ~#f7f8fa).
  gradient.addColorStop(0.0, '#e6e9ed');
  gradient.addColorStop(0.196, '#eff1f4');
  gradient.addColorStop(0.353, '#f5f6f9');
  gradient.addColorStop(0.509, '#f8f9fb');
  gradient.addColorStop(0.65, '#f9fafc');
  gradient.addColorStop(1.0, '#f9fafc');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // Deterministic +/-1 LSB dither: the gradient is stretched over ~1400 screen
  // rows, so without dithering the 8-bit quantisation shows as faint banding.
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const noise = ((index * 1103515245 + 12345) % 3) - 1;
    data[index] = Math.min(255, Math.max(0, data[index] + noise));
    data[index + 1] = Math.min(255, Math.max(0, data[index + 1] + noise));
    data[index + 2] = Math.min(255, Math.max(0, data[index + 2] + noise));
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createFloor(): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(STUDIO_FLOOR_RADIUS, 128);
  const material = new THREE.MeshBasicMaterial({
    map: createFloorGradientTexture(),
    toneMapped: false,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.name = 'studio-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  return floor;
}

function createDirectionalShadowCatcher(): THREE.Mesh {
  const material = new THREE.ShadowMaterial({
    color: 0x8a877f,
    opacity: 0.04,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(STUDIO_FLOOR_RADIUS * 0.5, 96), material);
  catcher.name = 'studio-shadow-catcher';
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.05;
  catcher.receiveShadow = true;
  return catcher;
}

/** Soft radial contact shadow: grounds the asset without a directional smear. */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create contact shadow texture');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.0, 'rgba(62, 56, 47, 0.16)');
  gradient.addColorStop(0.35, 'rgba(62, 56, 47, 0.10)');
  gradient.addColorStop(0.6, 'rgba(62, 56, 47, 0.05)');
  gradient.addColorStop(1.0, 'rgba(62, 56, 47, 0.0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadow(): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), material);
  blob.name = 'studio-contact-shadow';
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  return blob;
}

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.name = 'eiffel-tower-studio';
  scene.background = new THREE.Color(STUDIO_BACKGROUND_HEX);
  scene.add(createLighting());
  scene.add(createFloor());
  scene.add(createContactShadow());
  scene.add(createDirectionalShadowCatcher());
  return scene;
}

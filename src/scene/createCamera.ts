import * as THREE from 'three';
import { CAPTURE_FAR, CAPTURE_NEAR } from './framing';

/**
 * Orthographic studio camera: matches the reference product-shot projection
 * (parallel verticals, constant scale over the 330 m tower) and makes the
 * capture framing exact rather than a perspective approximation.
 */
export function createCamera(canvas: HTMLCanvasElement): THREE.OrthographicCamera {
  const aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
  const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, CAPTURE_NEAR, CAPTURE_FAR);
  camera.name = 'studio-orthographic-camera';
  camera.position.set(0, 200, 1320);
  camera.lookAt(0, 165, 0);
  return camera;
}

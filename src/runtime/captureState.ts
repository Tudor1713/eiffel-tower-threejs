import * as THREE from 'three';

const KEY = 'media2threejs.camera.v1';

export interface StoredCameraState {
  position: number[];
  quaternion: number[];
  zoom: number;
}

type RestorableCamera = THREE.OrthographicCamera | THREE.PerspectiveCamera;

export function persistCamera(camera: RestorableCamera): void {
  const state: StoredCameraState = {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    zoom: camera.zoom,
  };
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function restoreCamera(camera: RestorableCamera): boolean {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const value = JSON.parse(raw) as Partial<StoredCameraState>;
    if (!Array.isArray(value.position) || !Array.isArray(value.quaternion)) return false;
    camera.position.fromArray(value.position);
    camera.quaternion.fromArray(value.quaternion);
    if (typeof value.zoom === 'number' && Number.isFinite(value.zoom)) camera.zoom = value.zoom;
    camera.updateProjectionMatrix();
    return true;
  } catch {
    return false;
  }
}

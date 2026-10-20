import * as THREE from 'three';

/**
 * Debug URL params (kept from the project template, extended for the studio):
 *   ?view=sun-only   -> only the key light
 *   ?view=no-floor   -> hide floor and shadow catcher (silhouette checks)
 *   ?asset=<id>      -> isolate one registered asset id
 */
export function applyDebugView(scene: THREE.Scene, params: URLSearchParams): void {
  const view = params.get('view');
  if (view === 'sun-only') {
    scene.traverse((object: THREE.Object3D) => {
      if ((object as THREE.Light).isLight) object.visible = object.name === 'studio-key';
    });
  }
  if (view === 'no-floor') {
    const floor = scene.getObjectByName('studio-floor');
    if (floor) floor.visible = false;
    const catcher = scene.getObjectByName('studio-shadow-catcher');
    if (catcher) catcher.visible = false;
  }
  const isolate = params.get('asset');
  if (isolate) {
    scene.traverse((object: THREE.Object3D) => {
      const assetId = object.userData.assetId;
      if (typeof assetId === 'string' && assetId !== isolate) object.visible = false;
    });
  }
}

import * as THREE from 'three';

/**
 * Soft studio rig: warm key from upper front-left, cool fill from front-right,
 * white rim from behind, plus hemisphere/ambient lift so the pale painted iron
 * never crushes to black and the near-white floor has no dark horizon.
 * The key sits high so the cast shadow stays short around the base instead of
 * smearing across the seamless backdrop.
 */
export function createLighting(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'studio-lighting';

  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.name = 'studio-key';
  key.position.set(-460, 1000, 820);
  key.target.position.set(0, 120, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -340;
  key.shadow.camera.right = 340;
  key.shadow.camera.top = 430;
  key.shadow.camera.bottom = -430;
  key.shadow.camera.near = 300;
  key.shadow.camera.far = 2600;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.8;
  key.shadow.radius = 12;

  const fill = new THREE.DirectionalLight(0xe8eef9, 1.0);
  fill.name = 'studio-fill';
  fill.position.set(760, 380, 640);
  fill.target.position.set(0, 120, 0);

  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.name = 'studio-rim';
  rim.position.set(200, 620, -840);
  rim.target.position.set(0, 200, 0);

  const hemisphere = new THREE.HemisphereLight(0xf8fbff, 0xe5e8ec, 1.0);
  hemisphere.name = 'studio-hemisphere';

  const ambient = new THREE.AmbientLight(0xffffff, 0.12);
  ambient.name = 'studio-ambient';

  root.add(key, key.target, fill, fill.target, rim, rim.target, hemisphere, ambient);
  return root;
}

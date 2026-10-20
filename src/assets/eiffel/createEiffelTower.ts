import * as THREE from 'three';
import { buildArches, buildFoundation, buildLegs } from './base';
import { buildPlatform1, buildPlatform2, buildShaftMid, buildShaftUpper } from './body';
import { buildAntenna, buildCupola, buildPlatform3 } from './top';
import { DIM, createTowerMaterials } from './common';

export const TOWER_HEIGHT = DIM.height;

/**
 * Builds the complete procedural Eiffel Tower asset as a THREE.Group:
 * metres, Y-up, semantic base at y=0, local forward +Z, centred on X/Z.
 * Every canonical component id is a named node inside the returned hierarchy.
 */
export function createEiffelTowerModel(options: Record<string, unknown> = {}): THREE.Group {
  const materials = createTowerMaterials();
  const root = new THREE.Group();
  root.name = 'eiffel-tower';

  root.add(
    buildFoundation(materials),
    buildLegs(materials),
    buildArches(materials),
    buildPlatform1(materials),
    buildShaftMid(materials),
    buildPlatform2(materials),
    buildShaftUpper(materials),
    buildPlatform3(materials),
    buildCupola(materials),
    buildAntenna(materials),
  );

  root.userData.dimensions = JSON.parse(JSON.stringify(DIM)) as Record<string, unknown>;
  root.userData.source = 'procedural-parametric-eiffel-v1';
  root.userData.options = options;
  return root;
}

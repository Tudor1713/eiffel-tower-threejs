import * as THREE from 'three';
import type { AssetFactoryResult, ColliderDescriptor } from '../../scene/assetRegistry';
import { createEiffelTowerModel } from './createEiffelTower';

const MACRO_IDS = [
  'foundation-plinths',
  'base-legs',
  'base-arches',
  'platform-1',
  'shaft-mid',
  'platform-2',
  'shaft-upper',
  'platform-3',
  'lantern-cupola',
  'antenna-spire',
] as const;

const REGION_MAP: Record<string, string[]> = {
  legs: ['base-legs', 'foundation-plinths'],
  platforms: ['platform-1', 'platform-2', 'platform-3'],
  arches: ['base-arches'],
  shafts: ['shaft-mid', 'shaft-upper'],
  cupola: ['lantern-cupola'],
  antenna: ['antenna-spire'],
};

/** Registers the procedural Eiffel Tower with the asset registry contract. */
export function createEiffelTower(): AssetFactoryResult {
  const root = createEiffelTowerModel();

  const nodes: Record<string, THREE.Object3D> = {};
  root.traverse((object) => {
    if (object !== root && object.name) nodes[object.name] = object;
  });

  const sockets: Record<string, THREE.Object3D> = {};
  const socketSpecs: Array<[string, number]> = [
    ['socket-platform-1', 84.4],
    ['socket-platform-2', 148.6],
    ['socket-platform-3', 297.8],
    ['socket-antenna-tip', 330],
  ];
  for (const [id, y] of socketSpecs) {
    const socket = new THREE.Object3D();
    socket.name = id;
    socket.position.set(0, y, 0);
    root.add(socket);
    sockets[id] = socket;
    nodes[id] = socket;
  }

  const colliders: ColliderDescriptor[] = [];
  for (const id of MACRO_IDS) {
    const node = nodes[id];
    if (!node) continue;
    const box = new THREE.Box3().setFromObject(node);
    const size = box.getSize(new THREE.Vector3());
    colliders.push({ kind: 'box', nodeId: id, size: [size.x, size.y, size.z] });
  }

  const destructionGroups: Record<string, THREE.Object3D[]> = {};
  for (const id of MACRO_IDS) {
    const node = nodes[id];
    if (node) destructionGroups[id] = [node];
  }

  const semanticRegions: Record<string, THREE.Object3D[]> = {};
  for (const [region, ids] of Object.entries(REGION_MAP)) {
    semanticRegions[region] = ids.map((id) => nodes[id]).filter((node): node is THREE.Object3D => Boolean(node));
  }

  const bounds = new THREE.Box3().setFromObject(root);

  root.userData.sculptRuntime = {
    assetId: 'eiffel-tower',
    units: 'metres',
    forward: '+Z',
    up: '+Y',
    nodes,
    sockets,
    colliders,
    destructionGroups,
    semanticRegions,
    explodeWithParent: true,
  };

  return { root, nodes, sockets, colliders, destructionGroups, bounds, semanticRegions };
}

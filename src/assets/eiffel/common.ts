import * as THREE from 'three';
import { MeshBuilder, PALETTE, lerp, srgb } from './kit';

export const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
export { PALETTE, lerp, srgb };

/** Measured dimensions of the reference model, metres, total height 330 m. */
export const DIM = {
  height: 330,
  pier: {
    padHalf: 23.5,
    stepHalf: 20.0,
    padTop: 2.6,
    stepTop: 5.0,
    pedestalHalfBottom: 17.5,
    pedestalHalfTop: 14.0,
    pedestalTop: 11.8,
    corniceHalf: 16.0,
    corniceTop: 13.2,
    capHalf: 14.0,
    capTop: 15.0,
    centre: 68.4,
  },
  leg: {
    bottomY: 15,
    topY: 80,
    outerBottom: 81.25,
    outerTop: 41.0,
    sectionBottom: 34,
    sectionTop: 24,
  },
  p1: {
    bottomY: 66,
    arcadeTop: 72.2,
    friezeTop: 76.2,
    deckBottomY: 78.6,
    deckSurfaceY: 80.0,
    railTop: 87.2,
    half: 45.8,
    corniceHalf: 46.8,
    railHalf: 45.2,
  },
  shaftMid: { bottomY: 80.2, topY: 138.2, halfBottom: 37.9, halfTop: 18.9 },
  p2: {
    bottomY: 138.2,
    friezeTop: 146.2,
    deckSurfaceY: 148.4,
    railTop: 151.2,
    half: 23.6,
    corniceHalf: 24.6,
    railHalf: 22.9,
  },
  shaftUpper: { bottomY: 151.2, topY: 289.0, halfBottom: 16.1, halfTop: 4.5 },
  p3: {
    bottomY: 289.0,
    bandTop: 294.0,
    deckSurfaceY: 296.2,
    railTop: 298.4,
    half: 8.9,
    corniceHalf: 9.7,
    railHalf: 8.4,
  },
  cupola: { baseY: 298.2, drumTop: 303.6, corniceTop: 304.6, domeTop: 308.6, lanternTop: 310.2, half: 7.4, corniceHalf: 8.2 },
  antenna: { baseY: 309.8, ringTop: 313.0, tipY: 330.0 },
} as const;

export interface TowerMaterials {
  iron: THREE.MeshStandardMaterial;
  ironInner: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  antenna: THREE.MeshStandardMaterial;
}

export function createTowerMaterials(): TowerMaterials {
  return {
    iron: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, metalness: 0.16, side: THREE.DoubleSide }),
    ironInner: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.76, metalness: 0.08, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, metalness: 0.02 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xa9b4b8,
      roughness: 0.16,
      metalness: 0.55,
      transparent: true,
      opacity: 0.55,
    }),
    antenna: new THREE.MeshStandardMaterial({ color: 0xd6d2c9, roughness: 0.42, metalness: 0.5 }),
  };
}

export interface MeshOptions {
  explode?: boolean;
  cast?: boolean;
}

export function meshPart(
  name: string,
  material: THREE.Material,
  build: (builder: MeshBuilder) => void,
  options: MeshOptions = {},
): THREE.Mesh {
  const builder = new MeshBuilder();
  build(builder);
  const mesh = new THREE.Mesh(builder.build(), material);
  mesh.name = name;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = true;
  if (options.explode) mesh.userData.explodeWithParent = true;
  mesh.userData.triangles = builder.triangleCount;
  return mesh;
}

export function groupOf(name: string, children: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  for (const child of children) group.add(child);
  return group;
}

/* ---------- tower profile helpers ---------- */

export function legOuterHalf(y: number): number {
  const t = (y - DIM.leg.bottomY) / (DIM.leg.topY - DIM.leg.bottomY);
  return lerp(DIM.leg.outerBottom, DIM.leg.outerTop, t);
}

export function legSection(y: number): number {
  const t = (y - DIM.leg.bottomY) / (DIM.leg.topY - DIM.leg.bottomY);
  return lerp(DIM.leg.sectionBottom, DIM.leg.sectionTop, t);
}

export function legCentre(y: number): number {
  return legOuterHalf(y) - legSection(y) / 2;
}

export function shaftMidHalf(y: number): number {
  const t = (y - DIM.shaftMid.bottomY) / (DIM.shaftMid.topY - DIM.shaftMid.bottomY);
  return lerp(DIM.shaftMid.halfBottom, DIM.shaftMid.halfTop, t);
}

/** Concave upper shaft: measured outer half-widths, minus ~0.9 m corner-post half width. */
const SHAFT_UPPER_STATIONS: Array<[number, number]> = [
  [151.2, 17.0],
  [198.0, 10.5],
  [250.0, 6.8],
  [289.0, 4.7],
];

export function shaftUpperHalf(y: number): number {
  const stations = SHAFT_UPPER_STATIONS;
  if (y <= stations[0][0]) return stations[0][1];
  for (let i = 0; i < stations.length - 1; i++) {
    const [y0, h0] = stations[i];
    const [y1, h1] = stations[i + 1];
    if (y <= y1) return lerp(h0, h1, (y - y0) / (y1 - y0));
  }
  return stations[stations.length - 1][1];
}

/** Builds one face of a square tower between two heights, for any profile function. */
export function faceQuad(
  halfAt: (y: number) => number,
  y0: number,
  y1: number,
  face: number,
): [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const h0 = halfAt(y0);
  const h1 = halfAt(y1);
  switch (face) {
    case 0:
      return [V(-h0, y0, h0), V(h0, y0, h0), V(h1, y1, h1), V(-h1, y1, h1)];
    case 1:
      return [V(h0, y0, -h0), V(h0, y0, h0), V(h1, y1, h1), V(h1, y1, -h1)];
    case 2:
      return [V(h0, y0, -h0), V(-h0, y0, -h0), V(-h1, y1, -h1), V(h1, y1, -h1)];
    default:
      return [V(-h0, y0, h0), V(-h0, y0, -h0), V(-h1, y1, -h1), V(-h1, y1, h1)];
  }
}

/** Four corners of a square ring at height y for a given half-width profile. */
export function squareCorners(halfAt: (y: number) => number, y: number): THREE.Vector3[] {
  const h = halfAt(y);
  return [V(-h, y, h), V(h, y, h), V(h, y, -h), V(-h, y, -h)];
}

/** Sample a quadratic Bezier in 2D. */
export function quadBezier(
  p0: [number, number],
  control: [number, number],
  p1: [number, number],
  samples: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const x = mt * mt * p0[0] + 2 * mt * t * control[0] + t * t * p1[0];
    const y = mt * mt * p0[1] + 2 * mt * t * control[1] + t * t * p1[1];
    points.push([x, y]);
  }
  return points;
}

/** In-plane normals (pointing away from the arch centre) for a 2D polyline. */
export function polylineNormals(points: Array<[number, number]>): Array<[number, number]> {
  return points.map((_point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const length = Math.hypot(tx, ty) || 1;
    // Outward normal for an arch traversed left-to-right: rotate the tangent +90 degrees.
    return [ty / length, -tx / length];
  });
}

/** Applies a face basis to a local (x = horizontal, y = height) point at a fixed offset along the normal. */
export function facePoint(
  face: number,
  localX: number,
  localY: number,
  offset: number,
): THREE.Vector3 {
  const z = typeof offset === 'number' ? offset : 0;
  switch (face) {
    case 0:
      return V(localX, localY, z);
    case 1:
      return V(z, localY, -localX);
    case 2:
      return V(-localX, localY, -z);
    default:
      return V(-z, localY, localX);
  }
}

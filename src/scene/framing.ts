import * as THREE from 'three';

/**
 * Capture framing contract for the Eiffel Tower reference image.
 *
 * The reference silhouette bbox was measured by the Lead in the 1086x1448
 * reference frame and normalized:
 *   x [0.13904, 0.86004]  (width fraction 0.7210)
 *   y [0.017266, 0.96547] (height fraction 0.948204; top margin smaller than
 *                          the bottom margin, so the silhouette center sits
 *                          slightly above the frame center)
 * The render must reproduce this bbox through the orthographic capture camera,
 * compensating for the studio pitch (depth * sin(pitch) adds to the projected
 * vertical extent of the asset bounds).
 */
export const REFERENCE_VIEWPORT_WIDTH = 1086;
export const REFERENCE_VIEWPORT_HEIGHT = 1448;

export const REFERENCE_SILHOUETTE_BBOX = {
  x0: 0.13904,
  x1: 0.86004,
  y0: 0.017266,
  y1: 0.96547,
} as const;

export const REFERENCE_BBOX_WIDTH_FRACTION =
  REFERENCE_SILHOUETTE_BBOX.x1 - REFERENCE_SILHOUETTE_BBOX.x0;
export const REFERENCE_BBOX_HEIGHT_FRACTION =
  REFERENCE_SILHOUETTE_BBOX.y1 - REFERENCE_SILHOUETTE_BBOX.y0;
export const REFERENCE_BBOX_CENTER_X = (REFERENCE_SILHOUETTE_BBOX.x0 + REFERENCE_SILHOUETTE_BBOX.x1) / 2;
export const REFERENCE_BBOX_CENTER_Y = (REFERENCE_SILHOUETTE_BBOX.y0 + REFERENCE_SILHOUETTE_BBOX.y1) / 2;

/**
 * The reference photo is a studio product shot taken from slightly above floor
 * level, so a small downward tilt reveals the floor and the contact shadow.
 * Capture roles add their own elevationDegrees on top of this baseline.
 */
export const STUDIO_PITCH_DEGREES = 4;
export const HEAD_CLOSEUP_HEIGHT_FRACTION = 0.26;
export const STUDIO_FLOOR_RADIUS = 8000;
export const CAPTURE_NEAR = 10;
export const CAPTURE_FAR = 14000;

export interface AssetFraming {
  height: number;
  center: THREE.Vector3;
  minY: number;
  maxY: number;
}

/** Fields the render bridge puts in each capture record. */
export interface CaptureCameraSpec {
  id?: string;
  role?: string;
  azimuthDegrees?: number;
  elevationDegrees?: number;
  /** Recorded by the render bridge; the role is the framing authority for this route. */
  target?: [number, number, number];
  distance?: number;
  fovDegrees?: number;
  near?: number;
  far?: number;
}

/** Bounding box of the asset's geometry projected into camera screen axes (metres). */
export interface ProjectedBounds {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
  width: number;
  height: number;
  centerU: number;
  centerV: number;
}

export interface NormalizedBbox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface FramingMatch {
  projectedWidthMeters: number;
  projectedHeightMeters: number;
  frustumWidthMeters: number;
  frustumHeightMeters: number;
  predictedBbox: NormalizedBbox;
  desiredBbox: NormalizedBbox;
  widthFractionDelta: number;
  heightFractionDelta: number;
}

export interface ResolvedCaptureView {
  id: string;
  role: string;
  projection: 'orthographic';
  azimuthDegrees: number;
  elevationDegrees: number;
  pitchDegrees: number;
  distance: number;
  frustumHeight: number;
  frustumWidth: number;
  near: number;
  far: number;
  target: THREE.Vector3;
  position: THREE.Vector3;
  framing?: FramingMatch;
}

export interface CameraBasis {
  /** Camera right axis in world space (no vertical component). */
  right: THREE.Vector3;
  /** Camera up axis in world space (accounts for pitch). */
  up: THREE.Vector3;
  /** Unit vector from target toward the camera (opposite of the view direction). */
  direction: THREE.Vector3;
}

export function computeAssetFraming(bounds: THREE.Box3): AssetFraming {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  return {
    height: Math.max(1e-3, size.y),
    center,
    minY: bounds.min.y,
    maxY: bounds.max.y,
  };
}

/** Camera basis for an azimuth (degrees around +Y, 0 = looking from +Z) and pitch. */
export function cameraBasis(azimuthDegrees: number, pitchDegrees: number): CameraBasis {
  const azimuth = THREE.MathUtils.degToRad(azimuthDegrees);
  const pitch = THREE.MathUtils.degToRad(pitchDegrees);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const sinAzimuth = Math.sin(azimuth);
  const cosAzimuth = Math.cos(azimuth);
  return {
    right: new THREE.Vector3(cosAzimuth, 0, -sinAzimuth),
    up: new THREE.Vector3(-sinAzimuth * sinPitch, cosPitch, -cosAzimuth * sinPitch),
    direction: new THREE.Vector3(sinAzimuth * cosPitch, sinPitch, cosAzimuth * cosPitch),
  };
}

/**
 * Exact projected extents of all mesh vertices, i.e. the silhouette bbox the
 * renderer will produce for an orthographic camera. This is more accurate than
 * transforming Box3 corners: a box corner that is hidden behind the base still
 * contributes to the corner bbox but not to the silhouette.
 */
export function measureProjectedBounds(
  object: THREE.Object3D,
  target: THREE.Vector3,
  basis: CameraBasis,
): ProjectedBounds {
  object.updateMatrixWorld(true);
  let minU = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  const vertex = new THREE.Vector3();
  object.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;
    const position = geometry.getAttribute('position');
    if (!position) return;
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
      const relativeX = vertex.x - target.x;
      const relativeY = vertex.y - target.y;
      const relativeZ = vertex.z - target.z;
      const u = relativeX * basis.right.x + relativeY * basis.right.y + relativeZ * basis.right.z;
      const v = relativeX * basis.up.x + relativeY * basis.up.y + relativeZ * basis.up.z;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  });
  if (!Number.isFinite(minU)) {
    return { minU: 0, maxU: 0, minV: 0, maxV: 0, width: 0, height: 0, centerU: 0, centerV: 0 };
  }
  return {
    minU,
    maxU,
    minV,
    maxV,
    width: maxU - minU,
    height: maxV - minV,
    centerU: (minU + maxU) / 2,
    centerV: (minV + maxV) / 2,
  };
}

/** Normalize projected screen-space bounds into the 0..1 frame. */
export function normalizedBbox(
  projected: ProjectedBounds,
  frustumWidth: number,
  frustumHeight: number,
): NormalizedBbox {
  return {
    x0: 0.5 + projected.minU / frustumWidth,
    x1: 0.5 + projected.maxU / frustumWidth,
    y0: 0.5 - projected.maxV / frustumHeight,
    y1: 0.5 - projected.minV / frustumHeight,
  };
}

export function desiredBbox(): NormalizedBbox {
  return {
    x0: REFERENCE_SILHOUETTE_BBOX.x0,
    x1: REFERENCE_SILHOUETTE_BBOX.x1,
    y0: REFERENCE_SILHOUETTE_BBOX.y0,
    y1: REFERENCE_SILHOUETTE_BBOX.y1,
  };
}

/** Default camera distance; orthographic so this only affects clipping. */
export function captureDistance(framing: AssetFraming): number {
  return Math.max(framing.height * 4, 1);
}

/** Orbit view that reuses the reference-match frustum and target. */
export function orbitView(
  reference: ResolvedCaptureView,
  id: string,
  azimuthDegrees: number,
  elevationDegrees: number,
  framing: AssetFraming,
): ResolvedCaptureView {
  const pitchDegrees = STUDIO_PITCH_DEGREES + elevationDegrees;
  const basis = cameraBasis(azimuthDegrees, pitchDegrees);
  const distance = captureDistance(framing);
  return {
    id,
    role: 'orbit',
    projection: 'orthographic',
    azimuthDegrees,
    elevationDegrees,
    pitchDegrees,
    distance,
    frustumHeight: reference.frustumHeight,
    frustumWidth: reference.frustumWidth,
    near: reference.near,
    far: reference.far,
    target: reference.target.clone(),
    position: reference.target.clone().addScaledVector(basis.direction, distance),
  };
}

/** Head close-up: frames the top of the asset inside its own frustum. */
export function headCloseupView(
  id: string,
  azimuthDegrees: number,
  elevationDegrees: number,
  framing: AssetFraming,
  aspect: number,
): ResolvedCaptureView {
  const pitchDegrees = STUDIO_PITCH_DEGREES + elevationDegrees;
  const basis = cameraBasis(azimuthDegrees, pitchDegrees);
  const frustumHeight = Math.max(framing.height * HEAD_CLOSEUP_HEIGHT_FRACTION, 1);
  const frustumWidth = frustumHeight * Math.max(aspect, 1e-3);
  const target = framing.center.clone();
  target.y = framing.maxY - frustumHeight / 2;
  const distance = captureDistance(framing);
  return {
    id,
    role: 'head-closeup',
    projection: 'orthographic',
    azimuthDegrees,
    elevationDegrees,
    pitchDegrees,
    distance,
    frustumHeight,
    frustumWidth,
    near: CAPTURE_NEAR,
    far: CAPTURE_FAR,
    target,
    position: target.clone().addScaledVector(basis.direction, distance),
  };
}

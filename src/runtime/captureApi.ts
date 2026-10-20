import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CAPTURE_FAR,
  CAPTURE_NEAR,
  REFERENCE_BBOX_HEIGHT_FRACTION,
  REFERENCE_BBOX_CENTER_X,
  REFERENCE_BBOX_CENTER_Y,
  STUDIO_PITCH_DEGREES,
  cameraBasis,
  captureDistance,
  computeAssetFraming,
  desiredBbox,
  headCloseupView,
  measureProjectedBounds,
  normalizedBbox,
  orbitView,
  type AssetFraming,
  type CameraBasis,
  type CaptureCameraSpec,
  type FramingMatch,
  type ProjectedBounds,
  type ResolvedCaptureView,
} from '../scene/framing';

export interface CaptureApiOptions {
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  controls: OrbitControls;
  bounds: THREE.Box3;
  root: THREE.Object3D;
  render: () => void;
}

export interface CaptureCameraState {
  projection: 'orthographic';
  role: string;
  azimuthDegrees: number;
  elevationDegrees: number;
  pitchDegrees: number;
  distance: number;
  position: [number, number, number];
  target: [number, number, number];
  near: number;
  far: number;
  frustumHeight: number;
  frustumWidth: number;
  zoom: number;
  assetHeight: number;
  assetCenter: [number, number, number];
  framing: FramingMatch | null;
}

export interface CaptureApi {
  setCamera: (spec: CaptureCameraSpec) => Promise<{ ok: true; view: CaptureCameraState }>;
  resetCamera: () => Promise<{ ok: true; view: CaptureCameraState }>;
  capturePass: () => Promise<{ ok: true; selector: 'canvas' }>;
  getCameraState: () => CaptureCameraState;
  refit: (aspect: number) => void;
  getFraming: () => FramingMatch | null;
}

/**
 * Implements the media2threejs browser capture contract:
 *   window.__IMG2THREEJS_CAPTURE__.setCamera({id, role, azimuthDegrees, elevationDegrees, ...})
 *   window.__IMG2THREEJS_CAPTURE__.capturePass() -> {ok:true, selector:'canvas'}
 *
 * role 'reference-match' solves the orthographic frustum and look-at target so
 * the projected silhouette (all mesh vertices) lands on the measured reference
 * bbox. Orbit roles reuse that frustum/target and only change azimuth/elevation.
 */
export function createCaptureApi(options: CaptureApiOptions): CaptureApi {
  const { renderer, camera, controls, bounds, root, render } = options;
  const framing: AssetFraming = computeAssetFraming(bounds);
  let lastView: ResolvedCaptureView;
  let referenceView: ResolvedCaptureView;

  function currentAspect(): number {
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x > 0 && size.y > 0) return size.x / size.y;
    return 1;
  }

  function measure(azimuthDegrees: number, pitchDegrees: number, target: THREE.Vector3): {
    projected: ProjectedBounds;
    basis: CameraBasis;
  } {
    const basis = cameraBasis(azimuthDegrees, pitchDegrees);
    const projected = measureProjectedBounds(root, target, basis);
    return { projected, basis };
  }

  function predictFraming(view: ResolvedCaptureView, projected: ProjectedBounds): FramingMatch {
    const predicted = normalizedBbox(projected, view.frustumWidth, view.frustumHeight);
    const desired = desiredBbox();
    return {
      projectedWidthMeters: projected.width,
      projectedHeightMeters: projected.height,
      frustumWidthMeters: view.frustumWidth,
      frustumHeightMeters: view.frustumHeight,
      predictedBbox: predicted,
      desiredBbox: desired,
      widthFractionDelta: predicted.x1 - predicted.x0 - (desired.x1 - desired.x0),
      heightFractionDelta: predicted.y1 - predicted.y0 - (desired.y1 - desired.y0),
    };
  }

  /**
   * Solve frustum height and camera target height so the projected silhouette
   * bbox reproduces the reference bbox height fractions and vertical center.
   * The width fraction follows the asset's own proportions at the fixed 3:4
   * viewport; the residual is reported through FramingMatch.
   */
  function solveReferenceMatch(): ResolvedCaptureView {
    const aspect = currentAspect();
    const azimuthDegrees = 0;
    const pitchDegrees = STUDIO_PITCH_DEGREES;
    let target = framing.center.clone();
    const first = measure(azimuthDegrees, pitchDegrees, target);
    const projectedHeight = Math.max(first.projected.height, 1e-3);
    const frustumHeight = projectedHeight / REFERENCE_BBOX_HEIGHT_FRACTION;
    const frustumWidth = frustumHeight * aspect;

    // Vertical: frame center is the look-at target; put the projected bbox center
    // at the reference bbox center.
    const desiredCenterV = (0.5 - REFERENCE_BBOX_CENTER_Y) * frustumHeight;
    const shiftY = (first.projected.centerV - desiredCenterV) / Math.cos(THREE.MathUtils.degToRad(pitchDegrees));
    target = target.clone();
    target.y += shiftY;

    // Horizontal: shift the camera target sideways so the bbox is x-centered.
    const second = measure(azimuthDegrees, pitchDegrees, target);
    const desiredCenterU = (REFERENCE_BBOX_CENTER_X - 0.5) * frustumWidth;
    const shiftU = second.projected.centerU - desiredCenterU;
    target.addScaledVector(second.basis.right, shiftU);

    // Third pass: measure the final projected bbox for diagnostics.
    const distance = captureDistance(framing);
    const basis = cameraBasis(azimuthDegrees, pitchDegrees);
    const finalProjected = measure(azimuthDegrees, pitchDegrees, target).projected;
    const view: ResolvedCaptureView = {
      id: 'reference-match',
      role: 'reference-match',
      projection: 'orthographic',
      azimuthDegrees,
      elevationDegrees: 0,
      pitchDegrees,
      distance,
      frustumHeight,
      frustumWidth,
      near: CAPTURE_NEAR,
      far: CAPTURE_FAR,
      target,
      position: target.clone().addScaledVector(basis.direction, distance),
    };
    view.framing = predictFraming(view, finalProjected);
    return view;
  }

  function ensureReferenceView(): ResolvedCaptureView {
    if (!referenceView) {
      referenceView = solveReferenceMatch();
    }
    return referenceView;
  }

  function applyFrustum(view: ResolvedCaptureView, aspect: number): void {
    const halfHeight = view.frustumHeight * 0.5;
    const halfWidth = halfHeight * Math.max(aspect, 1e-3);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.near = view.near;
    camera.far = view.far;
    camera.updateProjectionMatrix();
  }

  function applyView(view: ResolvedCaptureView): void {
    applyFrustum(view, currentAspect());
    camera.position.copy(view.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(view.target);
    camera.updateMatrixWorld(true);
    controls.target.copy(view.target);
    render();
  }

  function getCameraState(): CaptureCameraState {
    return {
      projection: 'orthographic',
      role: lastView.role,
      azimuthDegrees: lastView.azimuthDegrees,
      elevationDegrees: lastView.elevationDegrees,
      pitchDegrees: lastView.pitchDegrees,
      distance: lastView.distance,
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [lastView.target.x, lastView.target.y, lastView.target.z],
      near: camera.near,
      far: camera.far,
      frustumHeight: lastView.frustumHeight,
      frustumWidth: lastView.frustumHeight * currentAspect(),
      zoom: camera.zoom,
      assetHeight: framing.height,
      assetCenter: [framing.center.x, framing.center.y, framing.center.z],
      framing: lastView.framing ?? null,
    };
  }

  function goTo(spec: CaptureCameraSpec): { ok: true; view: CaptureCameraState } {
    const role = typeof spec.role === 'string' && spec.role.length > 0 ? spec.role : 'reference-match';
    const azimuthDegrees = typeof spec.azimuthDegrees === 'number' && Number.isFinite(spec.azimuthDegrees)
      ? spec.azimuthDegrees
      : 0;
    const elevationDegrees = typeof spec.elevationDegrees === 'number' && Number.isFinite(spec.elevationDegrees)
      ? spec.elevationDegrees
      : 0;
    const reference = ensureReferenceView();
    if (role === 'orbit') {
      lastView = orbitView(reference, String(spec.id ?? 'orbit'), azimuthDegrees, elevationDegrees, framing);
    } else if (role === 'head-closeup') {
      lastView = headCloseupView(String(spec.id ?? 'head-closeup'), azimuthDegrees, elevationDegrees, framing, currentAspect());
    } else {
      lastView = reference;
    }
    applyView(lastView);
    return { ok: true, view: getCameraState() };
  }

  referenceView = solveReferenceMatch();
  lastView = referenceView;
  applyView(lastView);

  return {
    setCamera: async (spec: CaptureCameraSpec) => goTo(spec ?? {}),
    resetCamera: async () => goTo({ role: 'reference-match', azimuthDegrees: 0, elevationDegrees: 0 }),
    capturePass: async () => {
      render();
      return { ok: true, selector: 'canvas' };
    },
    getCameraState,
    refit: (aspect: number) => {
      applyFrustum(lastView, aspect);
      render();
    },
    getFraming: () => lastView.framing ?? null,
  };
}

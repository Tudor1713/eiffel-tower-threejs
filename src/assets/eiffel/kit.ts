import * as THREE from 'three';

export type Col = [number, number, number];

const srgbCache = new Map<number, Col>();
/** Convert an sRGB hex literal to a linear-space RGB triple (vertex colours are linear). */
export function srgb(hex: number): Col {
  const cached = srgbCache.get(hex);
  if (cached) return cached;
  const c = new THREE.Color(hex).convertSRGBToLinear();
  const out: Col = [c.r, c.g, c.b];
  srgbCache.set(hex, out);
  return out;
}

export const PALETTE = {
  ivory: srgb(0xd9d6cf),
  ivoryBright: srgb(0xe7e5df),
  ivoryShade: srgb(0xc0bcb3),
  ironShadow: srgb(0x8b877f),
  crevice: srgb(0x6b675f),
  stone: srgb(0xdedbd5),
  stoneShadow: srgb(0xcdc9c4),
  glass: srgb(0xb6c0c3),
  darkMetal: srgb(0x86817a),
} as const;

const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _tmp = new THREE.Vector3();

/**
 * Accumulates triangles for one merged, vertex-coloured mesh.
 * All methods are in metres / world units; winding is auto-corrected against the supplied normal.
 */
export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private indices: number[] = [];
  private count = 0;
  private current: Col = PALETTE.ivory;

  get triangleCount(): number {
    return this.indices.length / 3;
  }

  setColor(color: Col): this {
    this.current = color;
    return this;
  }

  private push(p: THREE.Vector3, n: THREE.Vector3): number {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.colors.push(this.current[0], this.current[1], this.current[2]);
    return this.count++;
  }

  /** Adds a quad. a,b,c,d run around the perimeter; winding is fixed so the face points along n. */
  addQuad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3): void {
    _e1.copy(b).sub(a);
    _e2.copy(c).sub(a);
    if (_cross.crossVectors(_e1, _e2).dot(n) < 0) {
      const t = b;
      b = d;
      d = t;
    }
    const ia = this.push(a, n);
    const ib = this.push(b, n);
    const ic = this.push(c, n);
    const id = this.push(d, n);
    this.indices.push(ia, ib, ic, ia, ic, id);
  }

  /** Oriented box centred at c. ax/ay/az are FULL edge vectors (direction + length). */
  addBox(c: THREE.Vector3, ax: THREE.Vector3, ay: THREE.Vector3, az: THREE.Vector3): void {
    const hx = _tmp.copy(ax).multiplyScalar(0.5);
    const hxv = hx.clone();
    const hyv = ay.clone().multiplyScalar(0.5);
    const hzv = az.clone().multiplyScalar(0.5);
    const nx = ax.clone().normalize();
    const ny = ay.clone().normalize();
    const nz = az.clone().normalize();
    const corner = (sx: number, sy: number, sz: number): THREE.Vector3 =>
      new THREE.Vector3()
        .copy(c)
        .addScaledVector(hxv, sx)
        .addScaledVector(hyv, sy)
        .addScaledVector(hzv, sz);
    // Face along +X / -X
    this.addQuad(corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(1, -1, 1), nx);
    this.addQuad(corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1), corner(-1, -1, -1), nx.clone().negate());
    // Face along +Y / -Y
    this.addQuad(corner(-1, 1, -1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1), ny);
    this.addQuad(corner(-1, -1, 1), corner(1, -1, 1), corner(1, -1, -1), corner(-1, -1, -1), ny.clone().negate());
    // Face along +Z / -Z
    this.addQuad(corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1), nz);
    this.addQuad(corner(1, -1, -1), corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1), nz.clone().negate());
  }

  /** Axis-aligned box shorthand (centre + full sizes). */
  addAABox(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): void {
    this.addBox(
      new THREE.Vector3(cx, cy, cz),
      new THREE.Vector3(sx, 0, 0),
      new THREE.Vector3(0, sy, 0),
      new THREE.Vector3(0, 0, sz),
    );
  }

  /**
   * Rectangular beam from a to b.
   * width runs across the beam inside the face plane (or an arbitrary perpendicular when no plane is given),
   * thickness runs along planeNormal.
   */
  addBeam(a: THREE.Vector3, b: THREE.Vector3, width: number, thickness: number, planeNormal?: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-5) return;
    dir.multiplyScalar(1 / len);
    const ref = planeNormal ? planeNormal.clone().normalize() : new THREE.Vector3(0, 1, 0);
    if (Math.abs(ref.dot(dir)) > 0.985) ref.set(1, 0, 0);
    const across = new THREE.Vector3().crossVectors(ref, dir).normalize();
    const normal = new THREE.Vector3().crossVectors(dir, across).normalize();
    const centre = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    this.addBox(
      centre,
      across.multiplyScalar(width),
      normal.multiplyScalar(thickness),
      dir.multiplyScalar(len),
    );
  }

  /** Cylinder (closed when caps is true) from a to b. */
  addCylinder(a: THREE.Vector3, b: THREE.Vector3, radius: number, sides = 8, caps = true): void {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-5) return;
    dir.multiplyScalar(1 / len);
    const ref = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(ref, dir).normalize();
    const v = new THREE.Vector3().crossVectors(dir, u).normalize();
    const ring = (centre: THREE.Vector3, out: THREE.Vector3[]): void => {
      for (let i = 0; i < sides; i++) {
        const ang = (i / sides) * Math.PI * 2;
        out.push(
          new THREE.Vector3()
            .copy(centre)
            .addScaledVector(u, Math.cos(ang) * radius)
            .addScaledVector(v, Math.sin(ang) * radius),
        );
      }
    };
    const ringA: THREE.Vector3[] = [];
    const ringB: THREE.Vector3[] = [];
    ring(a, ringA);
    ring(b, ringB);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const n = new THREE.Vector3()
        .addVectors(ringA[i], ringA[j])
        .multiplyScalar(0.5)
        .sub(a)
        .normalize();
      this.addQuad(ringA[i], ringA[j], ringB[j], ringB[i], n);
    }
    if (caps) {
      const capA = ringA[0].clone().add(ringA[Math.floor(sides / 2)]).multiplyScalar(0.5);
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        this.addTriangle(a, ringA[j], ringA[i], dir.clone().negate());
        this.addTriangle(b, ringB[i], ringB[j], dir.clone());
      }
      void capA;
    }
  }

  addTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3): void {
    _e1.copy(b).sub(a);
    _e2.copy(c).sub(a);
    if (_cross.crossVectors(_e1, _e2).dot(n) < 0) {
      const t = b;
      b = c;
      c = t;
    }
    const ia = this.push(a, n);
    const ib = this.push(b, n);
    const ic = this.push(c, n);
    this.indices.push(ia, ib, ic);
  }

  /** Revolve a profile of [radius, y] pairs about the Y axis at (originX, originZ). */
  addRevolve(profile: Array<[number, number]>, segments: number, originX = 0, originZ = 0, color?: Col): void {
    const prev = this.current;
    if (color) this.setColor(color);
    for (let s = 0; s < profile.length - 1; s++) {
      const [r0, y0] = profile[s];
      const [r1, y1] = profile[s + 1];
      if (r1 <= 1e-4 && r0 <= 1e-4) continue;
      const dr = r1 - r0;
      const dy = y1 - y0;
      const nl = Math.hypot(dr, dy) || 1;
      const nr = dy / nl;
      const ny = -dr / nl;
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        const c0 = Math.cos(a0);
        const s0 = Math.sin(a0);
        const c1 = Math.cos(a1);
        const s1 = Math.sin(a1);
        const p00 = new THREE.Vector3(originX + c0 * r0, y0, originZ + s0 * r0);
        const p10 = new THREE.Vector3(originX + c1 * r0, y0, originZ + s1 * r0);
        const p11 = new THREE.Vector3(originX + c1 * r1, y1, originZ + s1 * r1);
        const p01 = new THREE.Vector3(originX + c0 * r1, y1, originZ + s0 * r1);
        const mid = (a0 + a1) / 2;
        const n = new THREE.Vector3(c0 * nr + c1 * nr, ny * 2, s0 * nr + s1 * nr).normalize();
        void mid;
        this.addQuad(p00, p10, p11, p01, n);
      }
    }
    this.current = prev;
  }

  /**
   * Rectangular-section arc rib in a plane: plane origin O, in-plane axes uAxis/vAxis (unit),
   * normal nAxis (unit). The rib centre line is O + u*cos(theta)*radius + v*sin(theta)*radius.
   */
  addArcRib(
    origin: THREE.Vector3,
    uAxis: THREE.Vector3,
    vAxis: THREE.Vector3,
    nAxis: THREE.Vector3,
    radius: number,
    startAngle: number,
    endAngle: number,
    width: number,
    thickness: number,
    segments: number,
    color?: Col,
  ): void {
    const prev = this.current;
    if (color) this.setColor(color);
    const halfW = width * 0.5;
    const halfT = thickness * 0.5;
    const point = (ang: number, r: number, t: number): THREE.Vector3 =>
      new THREE.Vector3()
        .copy(origin)
        .addScaledVector(uAxis, Math.cos(ang) * r)
        .addScaledVector(vAxis, Math.sin(ang) * r)
        .addScaledVector(nAxis, t);
    for (let i = 0; i < segments; i++) {
      const t0 = startAngle + ((endAngle - startAngle) * i) / segments;
      const t1 = startAngle + ((endAngle - startAngle) * (i + 1)) / segments;
      const mid = (t0 + t1) / 2;
      const radialMid = new THREE.Vector3()
        .copy(uAxis)
        .multiplyScalar(Math.cos(mid))
        .addScaledVector(vAxis, Math.sin(mid))
        .normalize();
      // outer face
      this.addQuad(
        point(t0, radius + halfW, -halfT),
        point(t1, radius + halfW, -halfT),
        point(t1, radius + halfW, halfT),
        point(t0, radius + halfW, halfT),
        radialMid,
      );
      // inner face
      this.addQuad(
        point(t0, radius - halfW, halfT),
        point(t1, radius - halfW, halfT),
        point(t1, radius - halfW, -halfT),
        point(t0, radius - halfW, -halfT),
        radialMid.clone().negate(),
      );
      // top face (+n)
      this.addQuad(
        point(t0, radius - halfW, halfT),
        point(t1, radius - halfW, halfT),
        point(t1, radius + halfW, halfT),
        point(t0, radius + halfW, halfT),
        nAxis,
      );
      // bottom face (-n)
      this.addQuad(
        point(t0, radius + halfW, -halfT),
        point(t1, radius + halfW, -halfT),
        point(t1, radius - halfW, -halfT),
        point(t0, radius - halfW, -halfT),
        nAxis.clone().negate(),
      );
    }
    // end caps
    const capNormal = (ang: number): THREE.Vector3 =>
      new THREE.Vector3()
        .copy(uAxis)
        .multiplyScalar(-Math.sin(ang))
        .addScaledVector(vAxis, Math.cos(ang))
        .normalize();
    this.addQuad(
      point(startAngle, radius - halfW, -halfT),
      point(startAngle, radius + halfW, -halfT),
      point(startAngle, radius + halfW, halfT),
      point(startAngle, radius - halfW, halfT),
      capNormal(startAngle).negate(),
    );
    this.addQuad(
      point(endAngle, radius - halfW, halfT),
      point(endAngle, radius + halfW, halfT),
      point(endAngle, radius + halfW, -halfT),
      point(endAngle, radius - halfW, -halfT),
      capNormal(endAngle),
    );
    this.current = prev;
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** Smooth interpolation helper. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Bilinear point on a quad given its four corners (p00 -> p10 -> p11 -> p01). */
export function quadPoint(
  p00: THREE.Vector3,
  p10: THREE.Vector3,
  p11: THREE.Vector3,
  p01: THREE.Vector3,
  u: number,
  v: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const a = new THREE.Vector3().lerpVectors(p00, p10, u);
  const b = new THREE.Vector3().lerpVectors(p01, p11, u);
  return out.lerpVectors(a, b, v);
}

export interface LatticeOptions {
  columns: number;
  rows: number;
  barWidth: number;
  barThickness: number;
  chordWidth?: number;
  chordThickness?: number;
  diagonalColor?: Col;
  chordColor?: Col;
  verticals?: boolean;
  horizontals?: boolean;
  /** Only draw a horizontal chord every N rows (1 = every row). */
  horizontalEvery?: number;
  crossMode?: 'x' | 'single' | 'none';
}

/**
 * Fills one quad face with an X-braced lattice (border chords, verticals, diagonals).
 * Corners are ordered p00 (u=0,v=0), p10 (1,0), p11 (1,1), p01 (0,1).
 */
export function addLatticeFace(
  builder: MeshBuilder,
  p00: THREE.Vector3,
  p10: THREE.Vector3,
  p11: THREE.Vector3,
  p01: THREE.Vector3,
  options: LatticeOptions,
): void {
  const n = new THREE.Vector3()
    .crossVectors(new THREE.Vector3().subVectors(p10, p00), new THREE.Vector3().subVectors(p01, p00))
    .normalize();
  const chordW = options.chordWidth ?? options.barWidth * 1.9;
  const chordT = options.chordThickness ?? options.barThickness * 1.9;
  const diagColor = options.diagonalColor ?? PALETTE.ivory;
  const chordColor = options.chordColor ?? PALETTE.ivoryBright;
  const { columns, rows } = options;

  // Border chords
  builder.setColor(chordColor);
  builder.addBeam(p00, p10, chordW, chordT, n);
  builder.addBeam(p01, p11, chordW, chordT, n);
  builder.addBeam(p00, p01, chordW, chordT, n);
  builder.addBeam(p10, p11, chordW, chordT, n);

  // Verticals
  if (options.verticals !== false) {
    builder.setColor(diagColor);
    for (let i = 1; i < columns; i++) {
      const u = i / columns;
      const bottom = quadPoint(p00, p10, p11, p01, u, 0);
      const top = quadPoint(p00, p10, p11, p01, u, 1);
      builder.addBeam(bottom, top, options.barWidth, options.barThickness, n);
    }
  }

  // Horizontal chords
  if (options.horizontals) {
    builder.setColor(chordColor);
    const every = Math.max(1, Math.round(options.horizontalEvery ?? 1));
    for (let j = 1; j < rows; j++) {
      if (j % every !== 0) continue;
      const v = j / rows;
      const left = quadPoint(p00, p10, p11, p01, 0, v);
      const right = quadPoint(p00, p10, p11, p01, 1, v);
      builder.addBeam(left, right, options.barWidth * 1.25, options.barThickness * 1.25, n);
    }
  }

  // Cross bracing
  builder.setColor(diagColor);
  const mode = options.crossMode ?? 'x';
  if (mode !== 'none') {
    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        const u0 = i / columns;
        const u1 = (i + 1) / columns;
        const v0 = j / rows;
        const v1 = (j + 1) / rows;
        const a = quadPoint(p00, p10, p11, p01, u0, v0);
        const b = quadPoint(p00, p10, p11, p01, u1, v1);
        builder.addBeam(a, b, options.barWidth, options.barThickness, n);
        if (mode === 'x') {
          const c = quadPoint(p00, p10, p11, p01, u0, v1);
          const d = quadPoint(p00, p10, p11, p01, u1, v0);
          builder.addBeam(c, d, options.barWidth, options.barThickness, n);
        }
      }
    }
  }
}

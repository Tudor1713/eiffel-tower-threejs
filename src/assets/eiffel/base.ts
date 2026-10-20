import * as THREE from 'three';
import { PALETTE, addLatticeFace } from './kit';
import {
  DIM,
  V,
  groupOf,
  legCentre,
  legSection,
  meshPart,
  type TowerMaterials,
} from './common';

const CORNERS: Array<[number, number, string]> = [
  [1, 1, 'se'],
  [-1, 1, 'sw'],
  [-1, -1, 'nw'],
  [1, -1, 'ne'],
];

/** Offset of the tower's four inclined faces from the vertical axis at height y. */
function facePlaneOffset(y: number): number {
  return legCentre(y) + legSection(y) / 2;
}

/** Point on one of the four inclined faces; extra is measured along the outward normal. */
function facePointInclined(face: number, localX: number, localY: number, extra: number): THREE.Vector3 {
  const off = facePlaneOffset(localY) + extra;
  switch (face) {
    case 0:
      return V(localX, localY, off);
    case 1:
      return V(off, localY, -localX);
    case 2:
      return V(-localX, localY, -off);
    default:
      return V(-off, localY, localX);
  }
}

function faceNormal(face: number): THREE.Vector3 {
  switch (face) {
    case 0:
      return V(0, 0, 1);
    case 1:
      return V(1, 0, 0);
    case 2:
      return V(0, 0, -1);
    default:
      return V(-1, 0, 0);
  }
}

/** Arch geometry from the frozen measurements: soffit centre y 9.2 m, R 40.4, crown 49.6 m. */
const ARCH = { crownY: 49.6, endX: 40.3, endY: 12, segments: 40 } as const;

/* ------------------------------------------------------------------ foundations */

export function buildFoundation(materials: TowerMaterials): THREE.Group {
  const pads = meshPart('foundation-plinths.pads', materials.stone, (builder) => {
    for (const [sx, sz] of CORNERS) {
      const cx = sx * DIM.pier.centre;
      const cz = sz * DIM.pier.centre;
      builder.setColor(PALETTE.stone);
      builder.addAABox(cx, DIM.pier.padTop / 2, cz, DIM.pier.padHalf * 2, DIM.pier.padTop, DIM.pier.padHalf * 2);
      builder.setColor(PALETTE.stoneShadow);
      builder.addAABox(
        cx,
        (DIM.pier.padTop + DIM.pier.stepTop) / 2,
        cz,
        DIM.pier.stepHalf * 2,
        DIM.pier.stepTop - DIM.pier.padTop,
        DIM.pier.stepHalf * 2,
      );
      builder.setColor(PALETTE.stone);
      builder.addAABox(cx, DIM.pier.stepTop + 0.35, cz, DIM.pier.stepHalf * 2 - 1.6, 0.7, DIM.pier.stepHalf * 2 - 1.6);
    }
  });

  const pedestals = meshPart('plinth-steps.pedestals', materials.stone, (builder) => {
    for (const [sx, sz] of CORNERS) {
      const cx = sx * DIM.pier.centre;
      const cz = sz * DIM.pier.centre;
      const layers = 7;
      for (let i = 0; i < layers; i++) {
        const t0 = i / layers;
        const t1 = (i + 1) / layers;
        const y0 = DIM.pier.stepTop + 0.7 + (DIM.pier.pedestalTop - DIM.pier.stepTop - 0.7) * t0;
        const y1 = DIM.pier.stepTop + 0.7 + (DIM.pier.pedestalTop - DIM.pier.stepTop - 0.7) * t1;
        const half = (DIM.pier.pedestalHalfBottom + DIM.pier.pedestalHalfTop) / 2
          - 0.9
          + ((DIM.pier.pedestalHalfTop - DIM.pier.pedestalHalfBottom) / 2) * Math.cos((Math.PI * (t0 + t1)) / 2);
        builder.setColor(i % 2 === 0 ? PALETTE.stoneShadow : PALETTE.stone);
        builder.addAABox(cx, (y0 + y1) / 2, cz, half * 2, y1 - y0, half * 2);
      }
      builder.setColor(PALETTE.stoneShadow);
      for (const [nx, nz] of CORNERS.map((c) => [c[0], c[1]] as [number, number])) {
        for (let k = -1; k <= 1; k++) {
          const along = k * 4.6;
          const px = cx + nx * (DIM.pier.pedestalHalfBottom - 0.4) + (nx === 0 ? along : 0);
          const pz = cz + nz * (DIM.pier.pedestalHalfBottom - 0.4) + (nz === 0 ? along : 0);
          builder.addBeam(V(px, 6.6, pz), V(px, 10.9, pz), 1.5, 1.1, V(nx, 0, nz));
        }
      }
      builder.setColor(PALETTE.stone);
      builder.addAABox(cx, (DIM.pier.pedestalTop + DIM.pier.corniceTop) / 2, cz, DIM.pier.corniceHalf * 2, DIM.pier.corniceTop - DIM.pier.pedestalTop, DIM.pier.corniceHalf * 2);
      builder.setColor(PALETTE.stoneShadow);
      builder.addAABox(cx, DIM.pier.corniceTop + 0.45, cz, (DIM.pier.capHalf - 0.5) * 2, 0.9, (DIM.pier.capHalf - 0.5) * 2);
      builder.setColor(PALETTE.stone);
      builder.addAABox(cx, (DIM.pier.corniceTop + 0.9 + DIM.pier.capTop) / 2, cz, DIM.pier.capHalf * 2, DIM.pier.capTop - DIM.pier.corniceTop - 0.9, DIM.pier.capHalf * 2);
    }
  });

  return groupOf('foundation-plinths', [pads, groupOf('plinth-steps', [pedestals])]);
}

/* ------------------------------------------------------------------------ legs */

function legFaceCorners(
  sx: number,
  sz: number,
  face: number,
  y0: number,
  y1: number,
): [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const c0 = legCentre(y0);
  const h0 = legSection(y0) / 2;
  const c1 = legCentre(y1);
  const h1 = legSection(y1) / 2;
  const at = (y: number, c: number, h: number, u: number): THREE.Vector3 => {
    switch (face) {
      case 0:
        return V(sx * (c + u * h), y, sz * (c + h));
      case 1:
        return V(sx * (c + h), y, sz * (c + u * h));
      case 2:
        return V(sx * (c + u * h), y, sz * (c - h));
      default:
        return V(sx * (c - h), y, sz * (c + u * h));
    }
  };
  return [at(y0, c0, h0, -1), at(y0, c0, h0, 1), at(y1, c1, h1, 1), at(y1, c1, h1, -1)];
}

/** Front-facing leg faces stay pale; the rest shade down so the see-through lattice reads deep. */
function legFaceColor(face: number, sx: number, sz: number): [number, number, number] {
  const outward = face === 0 ? sz : face === 2 ? -sz : face === 1 ? sx : -sx;
  if (outward > 0) return PALETTE.ivory;
  return face % 2 === 0 ? PALETTE.ivoryShade : PALETTE.ironShadow;
}

function buildLeg(materials: TowerMaterials, sx: number, sz: number, id: string): THREE.Group {
  const faces = meshPart(
    `leg-${id}.lattice`,
    materials.ironInner,
    (builder) => {
      for (let face = 0; face < 4; face++) {
        const [p00, p10, p11, p01] = legFaceCorners(sx, sz, face, DIM.leg.bottomY, DIM.leg.topY);
        const baseColor = legFaceColor(face, sx, sz);
        builder.setColor(baseColor);
        addLatticeFace(builder, p00, p10, p11, p01, {
          columns: 7,
          rows: 26,
          barWidth: 1.05,
          barThickness: 0.8,
          chordWidth: 1.9,
          chordThickness: 1.35,
          horizontals: true,
          horizontalEvery: 2,
          diagonalColor: baseColor,
          chordColor: baseColor === PALETTE.ivory ? PALETTE.ivoryBright : baseColor,
        });
      }
    },
    { explode: true },
  );

  const posts = meshPart(
    `leg-${id}.posts`,
    materials.iron,
    (builder) => {
      for (const lx of [-1, 1]) {
        for (const lz of [-1, 1]) {
          const segments = 11;
          for (let i = 0; i < segments; i++) {
            const t0 = i / segments;
            const t1 = (i + 1) / segments;
            const at = (t: number): THREE.Vector3 => {
              const y = DIM.leg.bottomY + (DIM.leg.topY - DIM.leg.bottomY) * t;
              const c = legCentre(y);
              const h = legSection(y) / 2;
              return V(sx * (c + lx * h), y, sz * (c + lz * h));
            };
            const w = 3.0 - 1.2 * t0;
            builder.setColor(i % 2 === 0 ? PALETTE.ivoryBright : PALETTE.ivory);
            builder.addBeam(at(t0), at(t1), w, w);
          }
        }
      }
    },
    { explode: true },
  );

  return groupOf(`leg-${id}`, [faces, posts]);
}

export function buildLegs(materials: TowerMaterials): THREE.Group {
  const legs = CORNERS.map(([sx, sz, id]) => buildLeg(materials, sx, sz, id));

  const feet = meshPart(
    'leg-plinths.feet',
    materials.iron,
    (builder) => {
      for (const [sx, sz] of CORNERS) {
        const c = legCentre(DIM.leg.bottomY);
        const h = legSection(DIM.leg.bottomY) / 2;
        builder.setColor(PALETTE.ironShadow);
        builder.addAABox(sx * c, DIM.leg.bottomY + 0.6, sz * c, h * 2 + 1.8, 1.2, h * 2 + 1.8);
        builder.setColor(PALETTE.ivoryShade);
        builder.addAABox(sx * c, DIM.leg.bottomY + 1.9, sz * c, h * 2 + 0.9, 1.4, h * 2 + 0.9);
        builder.setColor(PALETTE.ivory);
        builder.addAABox(sx * c, DIM.leg.bottomY + 3.0, sz * c, h * 2, 1.0, h * 2);
      }
    },
    { explode: true },
  );

  const knees = meshPart(
    'leg-bracing.knees',
    materials.iron,
    (builder) => {
      for (const [sx, sz] of CORNERS) {
        for (let face = 0; face < 4; face++) {
          const [p00, p10] = legFaceCorners(sx, sz, face, DIM.leg.bottomY + 1.4, 24);
          const mid = new THREE.Vector3().addVectors(p00, p10).multiplyScalar(0.5);
          builder.setColor(PALETTE.ivoryShade);
          builder.addBeam(p00, mid.clone().setY(mid.y + 7.5), 1.3, 0.9);
          builder.addBeam(p10, mid.clone().setY(mid.y + 7.5), 1.3, 0.9);
        }
      }
    },
    { explode: true },
  );

  const bands = meshPart(
    'rivet-chord-bands.legs',
    materials.iron,
    (builder) => {
      for (const [sx, sz] of CORNERS) {
        for (let j = 1; j < 9; j++) {
          const y = DIM.leg.bottomY + ((DIM.leg.topY - DIM.leg.bottomY) * j) / 9;
          const c = legCentre(y);
          const h = legSection(y) / 2;
          builder.setColor(PALETTE.ivoryShade);
          builder.addBeam(V(sx * (c - h), y, sz * (c + h)), V(sx * (c + h), y, sz * (c + h)), 1.0, 0.75);
          builder.addBeam(V(sx * (c - h), y, sz * (c - h)), V(sx * (c + h), y, sz * (c - h)), 1.0, 0.75);
          builder.addBeam(V(sx * (c + h), y, sz * (c - h)), V(sx * (c + h), y, sz * (c + h)), 1.0, 0.75);
          builder.addBeam(V(sx * (c - h), y, sz * (c - h)), V(sx * (c - h), y, sz * (c + h)), 1.0, 0.75);
        }
      }
    },
    { explode: true },
  );

  return groupOf('base-legs', [
    ...legs,
    groupOf('leg-plinths', [feet]),
    groupOf('leg-bracing', [knees]),
    groupOf('rivet-chord-bands', [bands]),
  ]);
}

/* ---------------------------------------------------------------------- arches */

interface ArchCircle {
  cy: number;
  radius: number;
}

function archCircle(): ArchCircle {
  const { crownY, endX, endY } = ARCH;
  const dy = crownY - endY;
  const cy = (dy * dy - endX * endX) / (2 * dy);
  return { cy, radius: crownY - cy };
}

/** Sample an arc offset radially from the opening curve; all offsets share the springline angle. */
function archSamples(offset: number, samples: number): Array<[number, number]> {
  const { cy, radius } = archCircle();
  const r = radius + offset;
  const angle = Math.atan2(ARCH.endY - cy, ARCH.endX);
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i++) {
    const theta = angle + ((Math.PI - 2 * angle) * i) / samples;
    points.push([r * Math.cos(theta), cy + r * Math.sin(theta)]);
  }
  return points;
}

export function buildArches(materials: TowerMaterials): THREE.Group {
  const faces = [0, 1, 2, 3];
  const samples = ARCH.segments;

  const bands = meshPart(
    'arch-ribs.bands',
    materials.iron,
    (builder) => {
      for (const face of faces) {
        const normal = faceNormal(face);
        const ribs: Array<[number, number, [number, number, number]]> = [
          [0.8, 1.5, PALETTE.ivoryBright],
          [2.9, 1.0, PALETTE.ivory],
          [5.0, 1.0, PALETTE.ivory],
          [6.9, 1.5, PALETTE.ivoryBright],
        ];
        for (const [offset, width, color] of ribs) {
          const points = archSamples(offset, samples);
          builder.setColor(color);
          for (let i = 0; i < points.length - 1; i++) {
            builder.addBeam(
              facePointInclined(face, points[i][0], points[i][1], 0),
              facePointInclined(face, points[i + 1][0], points[i + 1][1], 0),
              width,
              2.4,
              normal,
            );
          }
        }
        const latticeBands: Array<[number, number]> = [[1.4, 2.4], [3.4, 4.5], [5.4, 6.5]];
        for (const [innerOffset, outerOffset] of latticeBands) {
          const inner = archSamples(innerOffset, samples);
          const outer = archSamples(outerOffset, samples);
          builder.setColor(PALETTE.ivoryShade);
          const count = Math.min(inner.length, outer.length) - 1;
          for (let i = 0; i < count; i++) {
            builder.addBeam(
              facePointInclined(face, inner[i][0], inner[i][1], 0),
              facePointInclined(face, outer[i + 1][0], outer[i + 1][1], 0),
              0.6,
              1.6,
              normal,
            );
            builder.addBeam(
              facePointInclined(face, outer[i][0], outer[i][1], 0),
              facePointInclined(face, inner[i + 1][0], inner[i + 1][1], 0),
              0.6,
              1.6,
              normal,
            );
          }
        }
      }
    },
    { explode: true },
  );

  const spandrels = meshPart(
    'arch-spandrels.lattice',
    materials.iron,
    (builder) => {
      const top = DIM.p1.bottomY - 0.2;
      for (const face of faces) {
        const normal = faceNormal(face);
        const outer = archSamples(7.4, samples);
        const clipped = outer.filter(([x]) => Math.abs(x) <= 43);
        for (let i = 0; i < clipped.length; i++) {
          const [x, y] = clipped[i];
          if (top - y < 1.6) continue;
          builder.setColor(PALETTE.ivory);
          builder.addBeam(facePointInclined(face, x, y, 0), facePointInclined(face, x, top, 0), 0.75, 1.25, normal);
          if (i + 1 < clipped.length) {
            const [x2, y2] = clipped[i + 1];
            if (top - y2 < 1.6) continue;
            builder.setColor(PALETTE.ivoryShade);
            builder.addBeam(facePointInclined(face, x, y, 0), facePointInclined(face, x2, top, 0), 0.5, 1.0, normal);
            builder.addBeam(facePointInclined(face, x, top, 0), facePointInclined(face, x2, y2, 0), 0.5, 1.0, normal);
            if (i + 2 < clipped.length) {
              const [x3, y3] = clipped[i + 2];
              if (top - y3 >= 1.6) {
                builder.setColor(PALETTE.ivory);
                builder.addBeam(facePointInclined(face, x, y, 0), facePointInclined(face, x3, y3, 0), 0.45, 0.9, normal);
                builder.addBeam(facePointInclined(face, x2, y2, 0), facePointInclined(face, x3, top, 0), 0.45, 0.9, normal);
              }
            }
          }
        }
        // horizontal ties only inside the spandrel band (between the soffit and the platform)
        for (const level of [0.35, 0.7]) {
          const chordY = top - (top - 57) * (1 - level);
          if (chordY <= 20) continue;
          const reach = Math.sqrt(Math.max(0, Math.pow(40.4 + 7.4, 2) - Math.pow(chordY - 9.2, 2)));
          const inner = Math.sqrt(Math.max(0, Math.pow(40.4, 2) - Math.pow(chordY - 9.2, 2)));
          if (reach - inner < 1.5) continue;
          builder.setColor(PALETTE.ivoryBright);
          builder.addBeam(facePointInclined(face, -reach, chordY, 0), facePointInclined(face, -inner, chordY, 0), 0.8, 1.3, normal);
          builder.addBeam(facePointInclined(face, inner, chordY, 0), facePointInclined(face, reach, chordY, 0), 0.8, 1.3, normal);
        }
      }
    },
    { explode: true },
  );

  const medallions = meshPart(
    'arch-crown-relief.medallions',
    materials.iron,
    (builder) => {
      for (const face of faces) {
        const normal = faceNormal(face);
        const points = archSamples(3.9, samples);
        for (let i = 3; i < points.length - 3; i += 3) {
          const [x, y] = points[i];
          const centre = facePointInclined(face, x, y, 1.4);
          builder.setColor(PALETTE.ivoryBright);
          builder.addCylinder(centre, centre.clone().addScaledVector(normal, 1.3), 0.95, 8, false);
        }
      }
    },
    { explode: true },
  );

  const plinths = meshPart(
    'arch-ribs.plinths',
    materials.stone,
    (builder) => {
      for (const face of faces) {
        for (const sign of [-1, 1]) {
          const anchor = facePointInclined(face, sign * ARCH.endX, ARCH.endY, 0);
          builder.setColor(PALETTE.stone);
          builder.addAABox(anchor.x, 1.2, anchor.z, 11.0, 2.4, 11.0);
          builder.setColor(PALETTE.stoneShadow);
          builder.addAABox(anchor.x, 3.2, anchor.z, 9.4, 1.6, 9.4);
          builder.setColor(PALETTE.stone);
          builder.addAABox(anchor.x, 5.0, anchor.z, 8.2, 2.0, 8.2);
          builder.setColor(PALETTE.stoneShadow);
          builder.addAABox(anchor.x, 8.0, anchor.z, 7.0, 4.0, 7.0);
          builder.setColor(PALETTE.stone);
          builder.addAABox(anchor.x, 10.7, anchor.z, 8.0, 1.4, 8.0);
        }
      }
    },
    { explode: true },
  );

  return groupOf('base-arches', [
    groupOf('arch-ribs', [bands, plinths]),
    groupOf('arch-spandrels', [spandrels]),
    groupOf('arch-crown-relief', [medallions]),
  ]);
}

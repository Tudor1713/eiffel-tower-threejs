import * as THREE from 'three';
import { MeshBuilder, PALETTE, addLatticeFace } from './kit';
import {
  DIM,
  V,
  facePoint,
  faceQuad,
  groupOf,
  meshPart,
  shaftMidHalf,
  shaftUpperHalf,
  type TowerMaterials,
} from './common';

const FACES = [0, 1, 2, 3];

/** Faces are shaded by depth: front pale, sides mid, back darker - gives the lattice visual depth. */
const FACE_COLORS: Array<[number, number, number]> = [
  PALETTE.ivory,
  PALETTE.ivoryShade,
  PALETTE.ironShadow,
  PALETTE.ivoryShade,
];

function faceAxes(face: number): { u: THREE.Vector3; v: THREE.Vector3; n: THREE.Vector3 } {
  switch (face) {
    case 0:
      return { u: V(1, 0, 0), v: V(0, 1, 0), n: V(0, 0, 1) };
    case 1:
      return { u: V(0, 0, -1), v: V(0, 1, 0), n: V(1, 0, 0) };
    case 2:
      return { u: V(-1, 0, 0), v: V(0, 1, 0), n: V(0, 0, -1) };
    default:
      return { u: V(0, 0, 1), v: V(0, 1, 0), n: V(-1, 0, 0) };
  }
}

function addRing(
  builder: MeshBuilder,
  half: number,
  y: number,
  width: number,
  thickness: number,
  color: [number, number, number],
): void {
  builder.setColor(color);
  for (const face of FACES) {
    builder.addBeam(facePoint(face, -half, y, half), facePoint(face, half, y, half), width, thickness, V(0, 1, 0));
  }
}

function addArcade(
  builder: MeshBuilder,
  half: number,
  yBottom: number,
  yTop: number,
  pitch: number,
  color: [number, number, number],
  archColor: [number, number, number],
): void {
  const springY = yBottom + (yTop - yBottom) * 0.55;
  for (const face of FACES) {
    const axes = faceAxes(face);
    const bays = Math.max(3, Math.round((half * 2) / pitch));
    const step = (half * 2) / bays;
    const radius = step * 0.42;
    for (let i = 0; i <= bays; i++) {
      const u = -half + i * step;
      if (i < bays) {
        const centre = facePoint(face, u + step / 2, springY, half);
        builder.setColor(archColor);
        builder.addArcRib(centre, axes.u, axes.v, axes.n, radius, 0, Math.PI, 0.8, 1.2, 8);
      }
      if (i > 0 && i < bays) {
        builder.setColor(color);
        builder.addBeam(facePoint(face, u, yBottom, half), facePoint(face, u, springY, half), 1.15, 1.3, axes.n);
      }
    }
    builder.setColor(color);
    builder.addBeam(facePoint(face, -half, yBottom, half), facePoint(face, half, yBottom, half), 1.5, 1.7);
    builder.addBeam(facePoint(face, -half, yTop - 0.4, half), facePoint(face, half, yTop - 0.4, half), 1.6, 1.8);
  }
}

function addRailing(
  builder: MeshBuilder,
  half: number,
  yBase: number,
  yTop: number,
  postPitch: number,
  balusterPitch: number,
): void {
  const height = yTop - yBase;
  addRing(builder, half, yTop - 0.28, 0.4, 0.6, PALETTE.ivoryBright);
  addRing(builder, half, yBase + height * 0.3, 0.24, 0.38, PALETTE.ivory);
  for (const face of FACES) {
    const bays = Math.max(2, Math.round((half * 2) / postPitch));
    const step = (half * 2) / bays;
    for (let i = 0; i <= bays; i++) {
      const u = -half + i * step;
      builder.setColor(PALETTE.ivoryBright);
      builder.addBeam(facePoint(face, u, yBase, half), facePoint(face, u, yTop, half), 0.6, 0.6);
    }
    const balusters = Math.max(4, Math.round((half * 2) / balusterPitch));
    const bstep = (half * 2) / balusters;
    for (let i = 0; i <= balusters; i++) {
      const u = -half + i * bstep;
      builder.setColor(PALETTE.ivoryShade);
      builder.addBeam(facePoint(face, u, yBase + 0.08, half), facePoint(face, u, yTop - 0.6, half), 0.16, 0.16);
    }
  }
}

function addPanelBand(
  builder: MeshBuilder,
  half: number,
  y0: number,
  y1: number,
  pitch: number,
  color: [number, number, number],
  bright: [number, number, number],
): void {
  const mid = (y0 + y1) / 2;
  for (const face of FACES) {
    builder.setColor(color);
    builder.addBeam(facePoint(face, -half, mid, half - 0.9), facePoint(face, half, mid, half - 0.9), y1 - y0, 0.7, faceAxes(face).n);
    const bays = Math.max(2, Math.round((half * 2) / pitch));
    const step = (half * 2) / bays;
    for (let i = 0; i <= bays; i++) {
      const u = -half + i * step;
      builder.setColor(bright);
      builder.addBeam(facePoint(face, u, y0, half), facePoint(face, u, y1, half), 0.55, 1.35, faceAxes(face).n);
    }
  }
  addRing(builder, half, y0 + 0.2, 1.15, 1.15, bright);
  addRing(builder, half, y1 - 0.2, 1.15, 1.15, bright);
}

function addRosetteRow(
  builder: MeshBuilder,
  half: number,
  y: number,
  pitch: number,
  radius: number,
  color: [number, number, number],
): void {
  for (const face of FACES) {
    const axes = faceAxes(face);
    const count = Math.max(4, Math.round((half * 2) / pitch));
    const step = (half * 2) / count;
    for (let i = 0; i < count; i++) {
      const u = -half + (i + 0.5) * step;
      const centre = facePoint(face, u, y, half + 0.15);
      builder.setColor(color);
      builder.addCylinder(centre, centre.clone().addScaledVector(axes.n, 0.7), radius, 8, false);
    }
  }
}

/* ---------------------------------------------------------------- platform one */

export function buildPlatform1(materials: TowerMaterials): THREE.Group {
  const d = DIM.p1;
  const deck = meshPart('platform-1-deck.slab', materials.iron, (builder) => {
    builder.setColor(PALETTE.ivoryShade);
    builder.addAABox(0, (d.deckBottomY + d.deckSurfaceY) / 2, 0, d.half * 2, d.deckSurfaceY - d.deckBottomY, d.half * 2);
    builder.setColor(PALETTE.ivoryBright);
    builder.addAABox(0, d.deckBottomY + 0.35, 0, d.corniceHalf * 2, 0.9, d.corniceHalf * 2);
    builder.setColor(PALETTE.ivoryShade);
    builder.addAABox(0, d.deckBottomY - 0.45, 0, d.half * 2 - 1.2, 0.9, d.half * 2 - 1.2);
    // console brackets under the cornice
    builder.setColor(PALETTE.ivoryShade);
    for (const face of FACES) {
      const axes = faceAxes(face);
      const count = Math.round((d.half * 2) / 4.8);
      const step = (d.half * 2) / count;
      for (let i = 0; i <= count; i++) {
        const u = -d.half + i * step;
        builder.addBeam(
          facePoint(face, u, d.deckBottomY + 0.2, d.half - 0.3),
          facePoint(face, u, d.deckBottomY - 2.2, d.half - 3.4),
          0.8,
          1.0,
          axes.n,
        );
      }
    }
  });

  const frieze = meshPart('platform-1-frieze.band', materials.iron, (builder) => {
    addPanelBand(builder, d.half, d.friezeTop, d.deckBottomY, 2.4, PALETTE.ivoryShade, PALETTE.ivoryBright);
  });

  const arcade = meshPart('frieze-arcade.arches', materials.iron, (builder) => {
    // lower row of small niches
    const nicheTop = d.bottomY + 2.2;
    for (const face of FACES) {
      const axes = faceAxes(face);
      const bays = Math.round((d.half * 2) / 2.3);
      const step = (d.half * 2) / bays;
      for (let i = 0; i < bays; i++) {
        const centre = facePoint(face, -d.half + (i + 0.5) * step, d.bottomY + 0.7, d.half);
        builder.setColor(PALETTE.ivoryBright);
        builder.addArcRib(centre, axes.u, axes.v, axes.n, step * 0.34, 0, Math.PI, 0.42, 0.6, 6);
      }
      builder.setColor(PALETTE.ivory);
      builder.addBeam(facePoint(face, -d.half, d.bottomY + 0.2, d.half), facePoint(face, d.half, d.bottomY + 0.2, d.half), 1.2, 1.4);
      builder.addBeam(facePoint(face, -d.half, nicheTop, d.half), facePoint(face, d.half, nicheTop, d.half), 1.3, 1.5);
    }
    // main arcade
    addArcade(builder, d.half, nicheTop, d.arcadeTop, 4.6, PALETTE.ivory, PALETTE.ivoryBright);
  });

  const truss = meshPart(
    'platform-1-brackets.struts',
    materials.iron,
    (builder) => {
      for (const face of FACES) {
        const [p00, p10, p11, p01] = faceQuad(() => d.half, d.arcadeTop, d.friezeTop, face);
        builder.setColor(PALETTE.ivory);
        addLatticeFace(builder, p00, p10, p11, p01, {
          columns: 14,
          rows: 1,
          barWidth: 0.85,
          barThickness: 0.95,
          chordWidth: 1.5,
          chordThickness: 1.4,
          crossMode: 'x',
        });
      }
      addRosetteRow(builder, d.half, d.arcadeTop + 1.6, 2.4, 0.55, PALETTE.ivoryBright);
    },
    { explode: true },
  );

  const galleryBase = d.deckSurfaceY + 2.4;
  const railing = meshPart('platform-1-railing.rails', materials.iron, (builder) => {
    // lower balustrade on the deck
    addRailing(builder, d.railHalf, d.deckSurfaceY, galleryBase, 4.8, 0.62);
    // tall open gallery above it: posts + X bracing + top rail
    addRing(builder, d.railHalf, d.railTop - 0.3, 0.5, 0.7, PALETTE.ivoryBright);
    for (const face of FACES) {
      const bays = Math.round((d.railHalf * 2) / 4.8);
      const step = (d.railHalf * 2) / bays;
      for (let i = 0; i <= bays; i++) {
        const u = -d.railHalf + i * step;
        builder.setColor(PALETTE.ivoryBright);
        builder.addBeam(facePoint(face, u, galleryBase, d.railHalf), facePoint(face, u, d.railTop, d.railHalf), 0.7, 0.7);
        if (i < bays) {
          const u2 = u + step;
          builder.setColor(PALETTE.ivoryShade);
          builder.addBeam(facePoint(face, u, galleryBase + 0.4, d.railHalf), facePoint(face, u2, d.railTop - 0.4, d.railHalf), 0.35, 0.35);
          builder.addBeam(facePoint(face, u2, galleryBase + 0.4, d.railHalf), facePoint(face, u, d.railTop - 0.4, d.railHalf), 0.35, 0.35);
        }
      }
    }
    for (const face of FACES) {
      for (const sign of [-1, 1]) {
        const bottom = facePoint(face, sign * d.railHalf, d.deckSurfaceY, d.railHalf);
        const top = facePoint(face, sign * d.railHalf, d.railTop + 0.5, d.railHalf);
        builder.setColor(PALETTE.ivoryBright);
        builder.addBeam(bottom, top, 1.2, 1.2);
      }
    }
  });

  const balusters = meshPart(
    'railing-balusters.platform1',
    materials.iron,
    (builder) => {
      for (const face of FACES) {
        const count = Math.round((d.railHalf * 2) / 0.72);
        const step = (d.railHalf * 2) / count;
        for (let i = 0; i <= count; i++) {
          const u = -d.railHalf + i * step;
          builder.setColor(PALETTE.ivoryShade);
          builder.addBeam(facePoint(face, u, d.deckSurfaceY + 0.1, d.railHalf), facePoint(face, u, d.railTop - 0.9, d.railHalf), 0.16, 0.16);
        }
      }
    },
    { explode: true },
  );

  return groupOf('platform-1', [
    groupOf('platform-1-deck', [deck]),
    groupOf('platform-1-frieze', [frieze]),
    groupOf('frieze-arcade', [arcade]),
    groupOf('platform-1-railing', [railing]),
    groupOf('railing-balusters', [balusters]),
    groupOf('platform-1-brackets', [truss]),
  ]);
}

/* ------------------------------------------------------------------ mid shaft */

export function buildShaftMid(materials: TowerMaterials): THREE.Group {
  const d = DIM.shaftMid;
  const posts = meshPart('shaft-mid-posts.corners', materials.iron, (builder) => {
    const segments = 10;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < segments; i++) {
          const at = (t: number): THREE.Vector3 => {
            const y = d.bottomY + (d.topY - d.bottomY) * t;
            const h = shaftMidHalf(y);
            return V(sx * h, y, sz * h);
          };
          builder.setColor(i % 2 === 0 ? PALETTE.ivoryBright : PALETTE.ivory);
          builder.addBeam(at(i / segments), at((i + 1) / segments), 3.2 - 0.8 * (i / segments), 3.0 - 0.8 * (i / segments));
        }
      }
    }
  });

  const bracing = meshPart(
    'shaft-mid-bracing.faces',
    materials.iron,
    (builder) => {
      for (const face of FACES) {
        const [p00, p10, p11, p01] = faceQuad(shaftMidHalf, d.bottomY, d.topY, face);
        builder.setColor(FACE_COLORS[face]);
        addLatticeFace(builder, p00, p10, p11, p01, {
          columns: 3,
          rows: 14,
          barWidth: 0.95,
          barThickness: 0.75,
          chordWidth: 1.3,
          chordThickness: 1.0,
          horizontals: true,
          horizontalEvery: 2,
          diagonalColor: FACE_COLORS[face],
          chordColor: face === 0 ? PALETTE.ivoryBright : FACE_COLORS[face],
        });
      }
    },
    { explode: true },
  );

  return groupOf('shaft-mid', [
    groupOf('shaft-mid-posts', [posts]),
    groupOf('shaft-mid-bracing', [bracing]),
  ]);
}

/* ------------------------------------------------------------- platform two */

export function buildPlatform2(materials: TowerMaterials): THREE.Group {
  const d = DIM.p2;
  const bandBottom = d.bottomY + 1.2;
  const latticeTop = bandBottom + 2.0;
  const deck = meshPart('platform-2-deck.slab', materials.iron, (builder) => {
    builder.setColor(PALETTE.ivoryShade);
    builder.addAABox(0, (d.friezeTop + d.deckSurfaceY) / 2, 0, d.half * 2, d.deckSurfaceY - d.friezeTop, d.half * 2);
    builder.setColor(PALETTE.ivoryBright);
    builder.addAABox(0, d.friezeTop + 0.45, 0, d.corniceHalf * 2, 0.9, d.corniceHalf * 2);
    builder.setColor(PALETTE.ironShadow);
    builder.addAABox(0, d.friezeTop - 0.4, 0, d.half * 2 - 1.4, 0.8, d.half * 2 - 1.4);
  });

  const frieze = meshPart('platform-2-frieze.band', materials.iron, (builder) => {
    addPanelBand(builder, d.half, latticeTop, d.friezeTop, 1.8, PALETTE.ivoryShade, PALETTE.ivoryBright);
    for (const face of FACES) {
      const [p00, p10, p11, p01] = faceQuad(() => d.half, bandBottom, latticeTop, face);
      builder.setColor(PALETTE.ivory);
      addLatticeFace(builder, p00, p10, p11, p01, {
        columns: 16,
        rows: 2,
        barWidth: 0.55,
        barThickness: 0.65,
        chordWidth: 0.9,
        chordThickness: 0.8,
        crossMode: 'x',
      });
    }
    addRosetteRow(builder, d.half, latticeTop - 0.25, 1.8, 0.32, PALETTE.ivoryBright);
  });

  const railing = meshPart('platform-2-railing.rails', materials.iron, (builder) => {
    addRailing(builder, d.railHalf, d.deckSurfaceY, d.railTop, 2.4, 0.7);
  });

  return groupOf('platform-2', [
    groupOf('platform-2-deck', [deck]),
    groupOf('platform-2-frieze', [frieze]),
    groupOf('platform-2-railing', [railing]),
  ]);
}

/* ---------------------------------------------------------------- upper shaft */

export function buildShaftUpper(materials: TowerMaterials): THREE.Group {
  const d = DIM.shaftUpper;
  const posts = meshPart('shaft-upper-posts.corners', materials.iron, (builder) => {
    const segments = 21;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < segments; i++) {
          const at = (t: number): THREE.Vector3 => {
            const y = d.bottomY + (d.topY - d.bottomY) * t;
            const h = shaftUpperHalf(y);
            return V(sx * h, y, sz * h);
          };
          builder.setColor(i % 2 === 0 ? PALETTE.ivoryBright : PALETTE.ivory);
          const w = 2.4 - 1.2 * (i / segments);
          builder.addBeam(at(i / segments), at((i + 1) / segments), w, w * 0.92);
        }
      }
    }
  });

  const faceMeshes: THREE.Mesh[] = [];
  for (let face = 0; face < FACES.length; face += 1) {
    const [p00, p10, p11, p01] = faceQuad(shaftUpperHalf, d.bottomY, d.topY, face);
    const faceMesh = meshPart(
      face < 3 ? `shaft-upper-bracing.face-${face}` : 'lattice-panel-grid',
      materials.iron,
      (builder) => {
        builder.setColor(FACE_COLORS[face]);
        addLatticeFace(builder, p00, p10, p11, p01, {
          columns: 2,
          rows: 26,
          barWidth: 0.78,
          barThickness: 0.6,
          chordWidth: 1.15,
          chordThickness: 0.9,
          horizontals: true,
          horizontalEvery: 1,
          diagonalColor: FACE_COLORS[face],
          chordColor: face === 0 ? PALETTE.ivoryBright : FACE_COLORS[face],
        });
      },
      { explode: true },
    );
    faceMeshes.push(faceMesh);
  }

  const collar = meshPart(
    'shaft-upper-posts.collar',
    materials.iron,
    (builder) => {
      addRing(builder, shaftUpperHalf(d.topY - 5.4) + 0.9, d.topY - 5.4, 1.7, 1.7, PALETTE.ivoryBright);
      addRing(builder, shaftUpperHalf(d.topY - 1.2) + 0.6, d.topY - 1.2, 1.3, 1.5, PALETTE.ivoryShade);
    },
    { explode: true },
  );

  return groupOf('shaft-upper', [
    groupOf('shaft-upper-posts', [posts, collar]),
    groupOf('shaft-upper-bracing', faceMeshes),
  ]);
}

import * as THREE from 'three';
import { MeshBuilder, PALETTE } from './kit';
import {
  DIM,
  V,
  facePoint,
  groupOf,
  meshPart,
  type TowerMaterials,
} from './common';

const FACES = [0, 1, 2, 3];

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

function addRing(builder: MeshBuilder, half: number, y: number, width: number, thickness: number, color: [number, number, number]): void {
  builder.setColor(color);
  for (const face of FACES) {
    builder.addBeam(facePoint(face, -half, y, half), facePoint(face, half, y, half), width, thickness, V(0, 1, 0));
  }
}

function addCircularRing(
  builder: MeshBuilder,
  radius: number,
  y: number,
  width: number,
  thickness: number,
  color: [number, number, number],
  segments = 16,
): void {
  builder.setColor(color);
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    builder.addBeam(
      V(Math.cos(a0) * radius, y, Math.sin(a0) * radius),
      V(Math.cos(a1) * radius, y, Math.sin(a1) * radius),
      width,
      thickness,
    );
  }
}

/* ---------------------------------------------------------------- platform 3 */

export function buildPlatform3(materials: TowerMaterials): THREE.Group {
  const d = DIM.p3;
  const deck = meshPart('platform-3-deck.slab', materials.iron, (builder) => {
    builder.setColor(PALETTE.ivoryShade);
    builder.addAABox(0, (d.bandTop + d.deckSurfaceY) / 2, 0, d.half * 2, d.deckSurfaceY - d.bandTop, d.half * 2);
    builder.setColor(PALETTE.ivoryBright);
    builder.addAABox(0, d.bandTop + 0.45, 0, d.corniceHalf * 2, 0.9, d.corniceHalf * 2);
    // small arcade band below the deck
    for (const face of FACES) {
      const axes = faceAxes(face);
      const bays = 7;
      const step = (d.half * 2) / bays;
      const springY = d.bottomY + 3.1;
      for (let i = 0; i < bays; i++) {
        const centre = facePoint(face, -d.half + (i + 0.5) * step, springY, d.half);
        builder.setColor(PALETTE.ivoryBright);
        builder.addArcRib(centre, axes.u, axes.v, axes.n, step * 0.4, 0, Math.PI, 0.55, 0.8, 6);
      }
      for (let i = 0; i <= bays; i++) {
        const u = -d.half + i * step;
        builder.setColor(PALETTE.ivory);
        builder.addBeam(facePoint(face, u, d.bottomY, d.half), facePoint(face, u, springY, d.half), 0.7, 0.8, axes.n);
      }
      builder.setColor(PALETTE.ivory);
      builder.addBeam(facePoint(face, -d.half, d.bottomY, d.half), facePoint(face, d.half, d.bottomY, d.half), 1.3, 1.5);
    }
  });

  const railing = meshPart('platform-3-railing.rails', materials.iron, (builder) => {
    addRing(builder, d.railHalf, d.railTop - 0.24, 0.36, 0.5, PALETTE.ivoryBright);
    addRing(builder, d.railHalf, d.deckSurfaceY + 0.9, 0.22, 0.32, PALETTE.ivory);
    for (const face of FACES) {
      const posts = 9;
      const step = (d.railHalf * 2) / posts;
      for (let i = 0; i <= posts; i++) {
        const u = -d.railHalf + i * step;
        builder.setColor(PALETTE.ivoryBright);
        builder.addBeam(facePoint(face, u, d.deckSurfaceY, d.railHalf), facePoint(face, u, d.railTop, d.railHalf), 0.5, 0.5);
      }
      const balusters = 30;
      const bstep = (d.railHalf * 2) / balusters;
      for (let i = 0; i <= balusters; i++) {
        const u = -d.railHalf + i * bstep;
        builder.setColor(PALETTE.ivoryShade);
        builder.addBeam(facePoint(face, u, d.deckSurfaceY + 0.15, d.railHalf), facePoint(face, u, d.railTop - 0.7, d.railHalf), 0.14, 0.14);
      }
    }
  });

  return groupOf('platform-3', [
    groupOf('platform-3-deck', [deck]),
    groupOf('platform-3-railing', [railing]),
  ]);
}

/* ------------------------------------------------------------------- cupola */

export function buildCupola(materials: TowerMaterials): THREE.Group {
  const d = DIM.cupola;
  const glass = meshPart(
    'cupola-glazing.drum',
    materials.glass,
    (builder) => {
      builder.setColor(PALETTE.glass);
      builder.addCylinder(V(0, d.baseY + 0.5, 0), V(0, d.drumTop, 0), d.half, 24, false);
    },
    { cast: false },
  );

  const ribs = meshPart('cupola-ribs.mullions', materials.iron, (builder) => {
    const mullions = 14;
    for (let i = 0; i < mullions; i++) {
      const angle = (i / mullions) * Math.PI * 2;
      const cx = Math.cos(angle);
      const cz = Math.sin(angle);
      builder.setColor(PALETTE.ivoryBright);
      builder.addBeam(
        V(cx * (d.half + 0.12), d.baseY + 0.4, cz * (d.half + 0.12)),
        V(cx * (d.half + 0.12), d.drumTop, cz * (d.half + 0.12)),
        0.55,
        0.45,
      );
    }
    addCircularRing(builder, d.half + 0.15, d.baseY + 0.8, 0.6, 0.6, PALETTE.ivoryBright, 24);
    addCircularRing(builder, d.half + 0.15, d.drumTop - 0.3, 0.75, 0.75, PALETTE.ivoryBright, 24);
    addCircularRing(builder, d.corniceHalf, (d.drumTop + d.corniceTop) / 2, d.corniceTop - d.drumTop, d.corniceHalf - d.half, PALETTE.ivory, 28);
    // gallery railing around the drum base
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const cx = Math.cos(angle);
      const cz = Math.sin(angle);
      builder.setColor(PALETTE.ivoryShade);
      builder.addBeam(
        V(cx * (d.corniceHalf + 0.15), d.corniceTop + 0.1, cz * (d.corniceHalf + 0.15)),
        V(cx * (d.corniceHalf + 0.15), d.corniceTop + 1.0, cz * (d.corniceHalf + 0.15)),
        0.16,
        0.16,
      );
    }
    addCircularRing(builder, d.corniceHalf + 0.15, d.corniceTop + 1.0, 0.28, 0.28, PALETTE.ivoryBright, 36);
  });

  const domeProfile: Array<[number, number]> = [
    [d.half + 0.15, d.drumTop],
    [d.half - 0.1, d.drumTop + 0.55],
    [d.half - 0.8, d.drumTop + 1.1],
    [d.half - 1.9, d.drumTop + 1.65],
    [d.half - 3.2, d.drumTop + 2.2],
    [d.half - 4.7, d.drumTop + 2.7],
    [d.half - 6.0, d.drumTop + 3.15],
    [1.6, d.domeTop - 0.55],
    [0.9, d.domeTop - 0.2],
    [0.0, d.domeTop],
  ];

  const dome = meshPart('cupola-dome.shell', materials.iron, (builder) => {
    builder.setColor(PALETTE.ivory);
    builder.addRevolve(domeProfile, 24, 0, 0, PALETTE.ivory);
    builder.setColor(PALETTE.ivoryBright);
    builder.addCylinder(V(0, d.domeTop - 0.6, 0), V(0, d.domeTop + 0.7, 0), 0.8, 10, true);
  });

  // meridian ribs over the dome
  const domeRibs = meshPart('cupola-ribs.dome-ribs', materials.iron, (builder) => {
    const ribsCount = 14;
    for (let i = 0; i < ribsCount; i++) {
      const angle = (i / ribsCount) * Math.PI * 2;
      const cx = Math.cos(angle);
      const cz = Math.sin(angle);
      builder.setColor(PALETTE.ivoryBright);
      for (let k = 0; k < domeProfile.length - 1; k++) {
        const [r0, y0] = domeProfile[k];
        const [r1, y1] = domeProfile[k + 1];
        if (r1 < 0.4) continue;
        builder.addBeam(V(cx * (r0 + 0.1), y0, cz * (r0 + 0.1)), V(cx * (r1 + 0.1), y1, cz * (r1 + 0.1)), 0.42, 0.36);
      }
    }
  });

  return groupOf('lantern-cupola', [
    groupOf('cupola-dome', [dome]),
    groupOf('cupola-glazing', [glass]),
    groupOf('cupola-ribs', [ribs, domeRibs]),
  ]);
}

/* ------------------------------------------------------------------ antenna */

export function buildAntenna(materials: TowerMaterials): THREE.Group {
  const d = DIM.antenna;
  const mast = meshPart('antenna-mast.spire', materials.antenna, (builder) => {
    // small glazed lantern above the dome
    builder.setColor(PALETTE.ivoryBright);
    builder.addCylinder(V(0, d.baseY - 1.6, 0), V(0, d.baseY - 0.2, 0), 1.9, 12, true);
    builder.setColor(PALETTE.ivory);
    builder.addCylinder(V(0, d.baseY - 0.2, 0), V(0, d.baseY + 0.4, 0), 2.3, 12, true);
    // stacked rings at the base of the antenna
    const rings: Array<[number, number, number]> = [
      [d.baseY + 0.3, 1.6, 0.55],
      [d.baseY + 1.0, 1.4, 0.5],
      [d.baseY + 1.6, 1.15, 0.5],
      [d.baseY + 2.2, 0.9, 0.5],
    ];
    for (const [y, radius, height] of rings) {
      builder.setColor(PALETTE.ivoryBright);
      builder.addCylinder(V(0, y, 0), V(0, y + height, 0), radius, 12, true);
    }
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      builder.setColor(PALETTE.ivoryShade);
      builder.addBeam(
        V(Math.cos(angle) * 1.0, d.baseY + 2.7, Math.sin(angle) * 1.0),
        V(Math.cos(angle) * 0.55, d.ringTop, Math.sin(angle) * 0.55),
        0.16,
        0.16,
      );
    }
    builder.setColor(PALETTE.darkMetal);
    builder.addCylinder(V(0, d.ringTop - 0.4, 0), V(0, d.tipY - 1.6, 0), 0.4, 10, true);
    builder.addCylinder(V(0, d.tipY - 1.8, 0), V(0, d.tipY - 1.0, 0), 0.26, 8, true);
  });

  const crossarms = meshPart('antenna-crossarms.bars', materials.antenna, (builder) => {
    const bars: Array<[number, number, number]> = [
      [d.ringTop + 4.0, 3.4, 0.24],
      [d.ringTop + 9.0, 2.4, 0.2],
    ];
    for (const [y, length, radius] of bars) {
      builder.setColor(PALETTE.darkMetal);
      builder.addCylinder(V(-length / 2, y, 0), V(length / 2, y, 0), radius, 6, true);
      builder.addCylinder(V(0, y - 0.2, -length / 2), V(0, y - 0.2, length / 2), radius, 6, true);
    }
  });

  const star = meshPart(
    'finial-star.burst',
    materials.antenna,
    (builder) => {
      const tipY = d.tipY;
      builder.setColor(PALETTE.ivoryBright);
      builder.addCylinder(V(0, tipY - 1.3, 0), V(0, tipY - 0.7, 0), 0.4, 8, true);
      const spikes = 14;
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const elevation = -0.3 + 1.0 * (((i * 5) % spikes) / spikes);
        const dx = Math.cos(angle) * Math.cos(elevation);
        const dz = Math.sin(angle) * Math.cos(elevation);
        const dy = Math.abs(Math.sin(elevation));
        const length = 2.2;
        builder.addBeam(
          V(0, tipY - 1.0, 0),
          V(dx * length, tipY - 1.0 + dy * length, dz * length),
          0.1,
          0.1,
        );
      }
    },
    { explode: true },
  );

  return groupOf('antenna-spire', [
    groupOf('antenna-mast', [mast]),
    groupOf('antenna-crossarms', [crossarms]),
    groupOf('finial-star', [star]),
  ]);
}

# Architecture

## Conventions

- Units: **metres**, right-handed, **Y-up**, local asset forward **+Z**, semantic base at `y = 0`,
  centred on X/Z. The tower is normalised to a 330.33 m total height (real-world scale).
- Every named component from `spec/object-sculpt-spec.json` exists as a named `THREE.Group` or
  `THREE.Mesh` inside the root group `eiffel-tower`.
- Geometry is deterministic: there are no random seeds, no noise, no texture lookups.

## Modules

### `kit.ts` — triangle accumulator

`MeshBuilder` writes positions / normals / vertex colours / indices directly into growable arrays and
produces one merged `BufferGeometry` per part. Primitives:

| Method | Purpose |
|---|---|
| `addQuad` / `addTriangle` | raw faces; winding is auto-corrected against a supplied normal |
| `addBox` / `addAABox` | oriented / axis-aligned boxes |
| `addBeam(a, b, width, thickness, planeNormal?)` | the workhorse for lattice members |
| `addCylinder` | masts, balusters, rosettes, antenna |
| `addRevolve(profile, segments)` | domes / turned parts |
| `addArcRib(...)` | arcaded bands, arches, cupola rings |
| `addLatticeFace(p00, p10, p11, p01, options)` | X-braced lattice over an arbitrary quad, with |
| | `columns`, `rows`, `horizontals`, `horizontalEvery`, chord/bar sizes |

Vertex colours (`PALETTE`) give depth without textures: front faces stay pale, side faces shade down,
back faces use the darker `ironShadow` tone. Materials are double-sided so the inside of the hollow
lattice reads as shadowed iron instead of showing the background through the structure.

### `common.ts` — measured dimensions and profiles

`DIM` stores the dimensions measured from the reference. Profile helpers:

- `legOuterHalf(y)`, `legSection(y)`, `legCentre(y)` — linear taper of the four legs.
- `shaftMidHalf(y)` — linear taper of the mid shaft.
- `shaftUpperHalf(y)` — **concave** upper shaft through measured stations
  `(151.2, 17.0) (198, 10.5) (250, 6.8) (289, 4.7)` (outer half-widths minus corner-post inset).
- `facePlaneOffset(y)`, `facePointInclined(...)` — the four tower faces are *inclined* planes; the
  decorative arches and spandrels are placed on those planes, not on vertical planes.
- `faceQuad`, `squareCorners`, `quadBezier`, `polylineNormals` — geometry utilities.

Materials: `iron`, `ironInner`, `stone`, `glass`, `antenna` — all textureless `MeshStandardMaterial`
with `vertexColors`.

### `base.ts` / `body.ts` / `top.ts` — components

| File | Components |
|---|---|
| `base.ts` | `foundation-plinths` (+ `plinth-steps`), `base-legs` (4 × `leg-*`, `leg-plinths`, `leg-bracing`, `rivet-chord-bands`), `base-arches` (`arch-ribs`, `arch-spandrels`, `arch-crown-relief`) |
| `body.ts` | `platform-1` (`deck`, `frieze`, `railing`, `brackets`, `frieze-arcade`, `railing-balusters`), `shaft-mid` (`posts`, `bracing`), `platform-2`, `shaft-upper` (`posts`, `bracing`, `lattice-panel-grid`) |
| `top.ts` | `platform-3`, `lantern-cupola` (`dome`, `glazing`, `ribs`), `antenna-spire` (`mast`, `crossarms`, `finial-star`) |

### `createEiffelTower.ts` / `eiffelTowerAsset.ts`

`createEiffelTowerModel()` returns the bare `THREE.Group`.
`createEiffelTower()` returns the full runtime contract:

```ts
{
  root, nodes, sockets, colliders, destructionGroups, bounds, semanticRegions
}
```

`root.userData.sculptRuntime` mirrors the contract for runtime discovery. Sockets sit at the three
platform decks and the antenna tip; colliders are per-macro-component boxes; destruction groups are
the macro components, so the model can be exploded/picked part-by-part.

## Framing and capture

`src/scene/framing.ts` builds an orthographic capture camera (4° studio pitch) and solves the frustum
height + look-at target so the **projected** silhouette lands on the reference framing
(`y ∈ [0.0173, 0.9655]` of the frame). `src/runtime/captureApi.ts` exposes
`window.__IMG2THREEJS_CAPTURE__`:

```ts
setCamera({ role, azimuthDegrees, elevationDegrees }) // orbit roles
resetCamera()                                         // reference-match view
capturePass()                                         // deterministic render tick
getCameraState() / getFraming()
```

This is the contract used to produce `screenshots/`.

## Performance

- 178,240 triangles, 43 meshes, 5 materials, no textures, no post-processing.
- Geometry is merged per part → low draw-call count.
- LOD levers: `columns` / `rows` / `horizontalEvery` in each `addLatticeFace` call, and `DIM` for
  overall proportions.

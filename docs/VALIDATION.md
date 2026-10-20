# Validation

All numbers below were produced by the deterministic gates of the
[media2threejs](https://github.com/promptwhisper/media2threejs) pipeline (Python tooling, no LLM in
the scoring path) against the reference image framing, then verified by reading the saved PNGs back.

## Gates

| Gate | Threshold | Result |
|---|---|---|
| Sculpt spec strict-quality | 0 errors / 0 warnings | **PASS** |
| Assembly coverage (spec ↔ built model) | 0 errors | **PASS** — 43 specified, 85 built, 0 errors, 0 warnings, 0 unnamed meshes |
| Tier-1 silhouette IoU | ≥ 0.85 | **0.8996** |
| Tier-1 scale delta (bbox area) | ≤ 0.08 | **0.0065** |
| Tier-1 aspect-ratio delta | ≤ 0.05 | **0.0065** |
| Bilateral symmetry error | ≤ 0.10 | **0.0065** |
| Divine Eye hard gates | no hard failure | **none** |
| Divine Eye soft fidelity | target 0.85 | 0.8475 (edge detail / tonal parity are the levers) |
| Multi-angle degenerate view | must not collapse | **none** (hero 0.176, +35° 0.2586, profile 0.2204, rear 0.1793 silhouette area fractions) |
| Browser captures | 7/7, 0 console errors | **PASS** |
| TypeScript + Vite build | exit 0 | **PASS** |
| Project integration validation | passed | **PASS** |

## Framing measurement

The rendered reference-match frame is 1086 × 1448. Measured silhouette bbox:

- rendered: `x [0.1538, 0.8444], y [0.0180, 0.9648]` → height **94.75%** of the frame.
- target (reference): `x [0.1390, 0.8600], y [0.0173, 0.9655]` → height 94.82%.

Vertical placement is within ~1 px. The width difference (~2.9% of frame) is the base-span
approximation described under *Known limitations*.

## Appearance deltas (final capture vs reference)

| Metric | Reference | Render |
|---|---|---|
| subject mean luminance (0–255) | 158.0 | 169.1 |
| chroma (|R−B|) | 8.89 | 8.44 (neutral) |
| dark crevice share (luma < 128) | 24.3% | 13.8% |
| edge energy (render/reference) | 1.0 | 0.727 |
| palette mean ΔE76 | — | 5.89 |
| blown highlights (≥ 245 in subject) | 0.0% | 0.0% |

The render is slightly brighter/flatter in the lattice interstices (weaker ambient occlusion) and has
softer edge energy — see the limitations section of the README.

## Method notes and honest caveats

- **Reference silhouette segmentation.** The reference is a pale, thin lattice on a near-white
  backdrop. A plain colour-distance foreground mask fragments it (27.3% of foreground cells fall
  outside the largest connected component at the 224-cell review grid), which collapses the reference
  bounding box and yields a *false* IoU/scale reject (IoU ≈ 0.49, scale delta ≈ 1.31). For the
  validation numbers above, a **deterministic alpha matte** with byte-identical RGB was used on both
  the reference and the render; the raw-file result is kept for the record. The matte algorithm and
  the raw number are reproducible with the pipeline tooling.
- **Rear/side geometry.** The reference is a single front elevation. Rear, side and under-deck
  geometry is inferred by four-fold/mirror symmetry and is flagged as such in the spec's observation
  blocks. Multi-angle captures only prove self-consistency, not fidelity to unseen reference detail.
- **Not a scan.** This is a procedural reconstruction with artistic approximation, not a
  photogrammetric/NeRF digital twin.

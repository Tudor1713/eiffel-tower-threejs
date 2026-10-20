# How this asset was produced (media2threejs pipeline)

This repository is the *output* of the [media2threejs](https://github.com/promptwhisper/media2threejs)
skill (Apache-2.0) applied to a single user-supplied reference image. The skill is **not vendored**
here; only its output (code, spec, review records) is published.

## Route

- Manifest mode: `image-object` (single standalone asset, no scene, no source motion timeline).
- Asset id: `eiffel-tower`.
- State machine steps (all with evidence): project intake → routing → reference analysis →
  asset assessment → spec → blockout → structural → form → material → interaction → optimization →
  review/asset-turntables → review/integration → handoff.

## What the gates checked

1. **Reference admission + measurements** — silhouette bbox, half-width vs height profile, platform
   bands, arch circle, lattice row periods, palette.
2. **`validate_sculpt_spec.py --strict-quality`** — component depth (macro/meso/micro), materials with
   independent PBR channels, repetition systems, attachment contracts, detail inventory.
3. **`check_part_coverage.py`** — diffs the *built* model's named part tree against the spec
   (catches specified-but-never-built parts, fused parts, unnamed meshes).
4. **`diagnose_render.py` (Tier-1)** — silhouette IoU, aspect, scale, bilateral symmetry.
5. **`divine_eye.py`** — deterministic multi-signal ensemble (IoU / scale hard gates; pHash / SSIM /
   edge / tonal parity / objectness soft signals) with self-uncertainty.
6. **`diagnose_render_multi_angle.py`** — orbit self-consistency; a flat plane faking volume would
   collapse in silhouette area.
7. **Playwright capture** — 7 deterministic camera views with console/page error collection.
8. **`validate_project.py` + `report.py`** — integration validation and handoff report.

## Reproducing

```bash
# 1) deploy the skill (host skill registry)
git clone https://github.com/promptwhisper/media2threejs.git
#   copy its tree to ~/.agents/skills/media2threejs (see the skill README)

# 2) in a project directory
python forge/route.py --manifest references.json --write project-manifest.json
python forge/state.py init --manifest project-manifest.json --state .media2threejs/state.json
python forge/next.py --state .media2threejs/state.json      # authoritative next step

# 3) gates used for this asset (run from the project root)
python forge/stage2_spec/validate_sculpt_spec.py spec/object-sculpt-spec.json --strict-quality
python forge/stage4_review/check_part_coverage.py --spec spec/object-sculpt-spec.json --manifest parts.json
python forge/stage4_review/diagnose_render.py --reference <matted-ref.png> --render <render.png> --json
python forge/stage4_review/divine_eye.py --reference <matted-ref.png> --render <render.png> --json
python forge/stage4_review/diagnose_render_multi_angle.py --reference hero.png --orbit orbit-plus35.png --profile.png
```

The included `spec/object-sculpt-spec.json` is the exact spec the strict gate validated (44 components:
10 macro, 26 meso, 7 micro, plus the tree root).

## Relation of the code to the pipeline

The pipeline's compatibility entrypoint can generate a skeleton factory from the spec; for this asset
the production factory is **hand-authored TypeScript** (`src/assets/eiffel/*`) because the lattice
structure, inclined faces and arch geometry needed explicit construction. The generated skeleton was
kept only as a blockout-stage artifact in the original project, not in this repository.

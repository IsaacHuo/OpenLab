# OpenLab product mark

The product mark redraws the flask-and-wave reference supplied by IsaacHuo using mathematical SVG geometry. The SVG files contain paths and references to paths only: no embedded bitmap, texture, font, or raster filter. The source reference is not bundled in the repository.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/brand/openlab-mark-inverse.svg">
  <img src="../assets/brand/openlab-mark.svg" alt="OpenLab mark" width="256" height="256">
</picture>

## Geometry

| Property | Exact construction |
| --- | --- |
| Canvas | 512 × 512 units, transparent background |
| Outline symmetry | Vertical axis x = 256; one shoulder is reused through `translate(512 0) scale(-1 1)` |
| Bowl | True lower semicircle centered at (256, 304), radius 168; SVG elliptical arc has equal x/y radii |
| Neck bends | Circular 36-unit-radius arcs, mirrored from a single source path |
| Stroke | Constant 20 units with round caps and round joins |
| Wave symmetry | One cubic Bézier half is reused through a 180-degree rotation about (256, 304) |
| Clear space | At least one stroke width around the visible mark in other layouts |

The neck and shoulders are shaped like the reference and are not a complete circle. The bowl's lower half is exactly circular. The internal wave intentionally has half-turn symmetry, while the outline has reflection symmetry; reflecting the entire mark horizontally would reverse the wave's direction. Raster previews can show antialiasing differences at pixel boundaries, which do not change the underlying geometry.

## Assets and reproduction

- [Dark mark](../assets/brand/openlab-mark.svg): dark strokes for a light background.
- [Inverse mark](../assets/brand/openlab-mark-inverse.svg): white strokes for a dark background.
- [Generator](../scripts/generate-brand.mjs): shared geometry for both SVG variants.

Run `npm run brand:generate` to reproduce the files. Keep the full square viewBox, scale uniformly, and use the appropriate contrast variant. Do not stretch, add texture, change individual stroke widths or hand-edit one mirrored shoulder. Keep the product name as ordinary text beside the mark rather than embedding font-dependent lettering in the icon.

The OpenLab-authored vector redraw follows the repository's Apache-2.0 license. The supplied reference's provenance has not been independently established; this record does not assert original authorship of the reference or trademark registration.

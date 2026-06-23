// Generates all PWA / iOS icons from a single source image.
//
//   npm run gen:icons            # uses ./icon-source.png if present
//   npm run gen:icons my-art.png # or pass a path
//
// If no source image is found, a simple branded placeholder is generated so the
// app stays installable. Replace icon-source.png with your artwork and re-run.
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');

const THEME = '#0ea5e9'; // sky-500
const BG = '#0c4a6e'; // sky-900

const source = process.argv[2] || path.join(root, 'icon-source.png');

// A square-cropped, high-res master we resize everything else from.
async function loadMaster() {
  if (existsSync(source)) {
    console.log(`Using source image: ${source}`);
    return sharp(source).resize(1024, 1024, { fit: 'cover' }).png();
  }
  console.log('No source image found — generating a placeholder. ' +
    'Drop your artwork at icon-source.png and re-run to replace it.');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" rx="180" fill="${THEME}"/>
    <ellipse cx="512" cy="600" rx="300" ry="260" fill="#e0f2fe"/>
    <path d="M512 230 C420 360 360 470 360 560 a152 152 0 0 0 304 0 C664 470 604 360 512 230 Z" fill="#0369a1"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png();
}

async function run() {
  await mkdir(outDir, { recursive: true });
  const master = await loadMaster();
  const buf = await master.toBuffer();

  const out = (name) => path.join(outDir, name);

  // Standard "any" icons + favicons — full-bleed square.
  const plain = [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['favicon-32.png', 32],
    ['favicon-16.png', 16],
  ];
  for (const [name, size] of plain) {
    await sharp(buf).resize(size, size, { fit: 'cover' }).png().toFile(out(name));
  }

  // Apple touch icon: 180px, flattened onto a solid bg (iOS adds its own corners
  // and dislikes transparency).
  await sharp(buf)
    .resize(180, 180, { fit: 'cover' })
    .flatten({ background: BG })
    .png()
    .toFile(out('apple-touch-icon.png'));

  // Maskable icons: shrink to ~80% inside a themed safe area so Android's
  // circular/rounded masks never clip the artwork.
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.8);
    const pad = Math.round((size - inner) / 2);
    const resized = await sharp(buf).resize(inner, inner, { fit: 'cover' }).toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: THEME },
    })
      .composite([{ input: resized, top: pad, left: pad }])
      .png()
      .toFile(out(`icon-maskable-${size}.png`));
  }

  console.log(`Icons written to ${path.relative(root, outDir)}/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

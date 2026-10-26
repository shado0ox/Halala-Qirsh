/**
 * Icon & Launch Image Generator for iOS & Capacitor
 * Generates 1024x1024 App Store icon (without transparency),
 * complete Xcode AppIcon.appiconset with Contents.json, and launch images.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputIconSvg = path.join(rootDir, 'public', 'app-icon.svg');
const inputLaunchSvg = path.join(rootDir, 'public', 'launch-screen.svg');

const resourcesDir = path.join(rootDir, 'resources');
const appIconSetDir = path.join(resourcesDir, 'AppIcon.appiconset');

// Standard Apple Xcode iOS AppIcon specs
const iconSpecs = [
  { size: 20, scale: 2, filename: 'AppIcon-20x20@2x.png', idiom: 'iphone' },
  { size: 20, scale: 3, filename: 'AppIcon-20x20@3x.png', idiom: 'iphone' },
  { size: 29, scale: 2, filename: 'AppIcon-29x29@2x.png', idiom: 'iphone' },
  { size: 29, scale: 3, filename: 'AppIcon-29x29@3x.png', idiom: 'iphone' },
  { size: 40, scale: 2, filename: 'AppIcon-40x40@2x.png', idiom: 'iphone' },
  { size: 40, scale: 3, filename: 'AppIcon-40x40@3x.png', idiom: 'iphone' },
  { size: 60, scale: 2, filename: 'AppIcon-60x60@2x.png', idiom: 'iphone' },
  { size: 60, scale: 3, filename: 'AppIcon-60x60@3x.png', idiom: 'iphone' },
  // iPad
  { size: 20, scale: 1, filename: 'AppIcon-20x20@1x.png', idiom: 'ipad' },
  { size: 20, scale: 2, filename: 'AppIcon-20x20@2x-ipad.png', idiom: 'ipad' },
  { size: 29, scale: 1, filename: 'AppIcon-29x29@1x.png', idiom: 'ipad' },
  { size: 29, scale: 2, filename: 'AppIcon-29x29@2x-ipad.png', idiom: 'ipad' },
  { size: 40, scale: 1, filename: 'AppIcon-40x40@1x.png', idiom: 'ipad' },
  { size: 40, scale: 2, filename: 'AppIcon-40x40@2x-ipad.png', idiom: 'ipad' },
  { size: 76, scale: 1, filename: 'AppIcon-76x76@1x.png', idiom: 'ipad' },
  { size: 76, scale: 2, filename: 'AppIcon-76x76@2x.png', idiom: 'ipad' },
  { size: 83.5, scale: 2, filename: 'AppIcon-83.5x83.5@2x.png', idiom: 'ipad' },
  // App Store 1024pt (ios-marketing)
  { size: 1024, scale: 1, filename: 'AppIcon-512@2x.png', idiom: 'ios-marketing' },
];

async function generate() {
  console.log('Generating iOS App Icons and Launch Screens...');

  if (!fs.existsSync(inputIconSvg)) {
    throw new Error(`Source icon SVG not found at ${inputIconSvg}`);
  }

  // Ensure directories exist
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.mkdirSync(appIconSetDir, { recursive: true });

  const svgBuffer = fs.readFileSync(inputIconSvg);

  // 1. Generate 1024x1024 App Store icon in resources/
  const appStore1024Path = path.join(resourcesDir, 'AppIcon-1024.png');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .flatten({ background: '#064E3B' }) // Guarantee ZERO transparency
    .png({ progressive: true, compressionLevel: 9 })
    .toFile(appStore1024Path);

  console.log(`✓ Generated: ${appStore1024Path} (1024x1024, opaque)`);

  // 2. Generate each file in AppIcon.appiconset
  const contentsImages = [];

  for (const spec of iconSpecs) {
    const pixelDim = Math.round(spec.size * spec.scale);
    const outPath = path.join(appIconSetDir, spec.filename);

    await sharp(svgBuffer)
      .resize(pixelDim, pixelDim)
      .flatten({ background: '#064E3B' }) // Zero alpha channel
      .png({ progressive: true, compressionLevel: 9 })
      .toFile(outPath);

    contentsImages.push({
      size: `${spec.size}x${spec.size}`,
      idiom: spec.idiom,
      filename: spec.filename,
      scale: `${spec.scale}x`,
    });

    console.log(`✓ Icon: ${spec.filename} (${pixelDim}x${pixelDim}px)`);
  }

  // 3. Write Xcode Contents.json
  const contentsJson = {
    images: contentsImages,
    info: {
      version: 1,
      author: 'xcode',
    },
  };

  const contentsPath = path.join(appIconSetDir, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2), 'utf-8');
  console.log(`✓ Wrote Xcode asset catalog: ${contentsPath}`);

  // 4. Generate Launch Screen image if SVG exists
  if (fs.existsSync(inputLaunchSvg)) {
    const launchSvgBuffer = fs.readFileSync(inputLaunchSvg);
    const launchPngPath = path.join(resourcesDir, 'LaunchImage.png');

    await sharp(launchSvgBuffer)
      .resize(1024, 1024)
      .flatten({ background: '#064E3B' })
      .png({ progressive: true })
      .toFile(launchPngPath);

    console.log(`✓ Launch Image generated: ${launchPngPath} (1024x1024)`);
  }

  console.log('✅ All iOS icons & launch assets generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

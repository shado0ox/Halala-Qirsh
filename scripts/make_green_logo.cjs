const { execSync } = require('child_process');
const fs = require('fs');

console.log('1. Exporting raw RGB from source image...');
execSync('convert public/assets/aistudio/IMG_0257_bce7aadd.jpg -resize 1024x1024^ -gravity center -extent 1024x1024 rgb:scripts/raw_in.rgb');

const buffer = fs.readFileSync('scripts/raw_in.rgb');
const outBuffer = Buffer.alloc(buffer.length);

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb((h / 360) + 1/3);
    g = hue2rgb(h / 360);
    b = hue2rgb((h / 360) - 1/3);
  }
  return [
    Math.min(255, Math.max(0, Math.round(r * 255))),
    Math.min(255, Math.max(0, Math.round(g * 255))),
    Math.min(255, Math.max(0, Math.round(b * 255)))
  ];
}

for (let i = 0; i < buffer.length; i += 3) {
  const r = buffer[i];
  const g = buffer[i + 1];
  const b = buffer[i + 2];

  let [h, s, l] = rgbToHsl(r, g, b);

  // If pixel is in the blue/teal/cyan zone (background, phone body, blue glow)
  // Transition smoothly around edges (160 - 255)
  if (h >= 165 && h <= 255) {
    // Shift hue to rich emerald green (around 145 - 152 degrees)
    // The closer to 200 (deep blue), the more emerald (148)
    const factor = Math.min(1, Math.max(0, (h - 165) / 35));
    // Blend towards 148 deg (emerald)
    h = 148;
    // Boost emerald saturation slightly for a rich royal look
    s = Math.min(1.0, s * 1.15);
  } else if (h > 65 && h < 165) {
    // Already green/lime (wallet, arrow, chart bars) - enhance green vibrancy
    s = Math.min(1.0, s * 1.12);
  }
  // Gold coin (h between 20 and 65): kept 100% natural and gleaming!
  // Silver coin & white text (low saturation): kept clean and crisp!

  const [newR, newG, newB] = hslToRgb(h, s, l);
  outBuffer[i] = newR;
  outBuffer[i + 1] = newG;
  outBuffer[i + 2] = newB;
}

fs.writeFileSync('scripts/raw_out.rgb', outBuffer);
console.log('2. Converting raw RGB to high quality PNG...');
execSync('convert -size 1024x1024 -depth 8 rgb:scripts/raw_out.rgb public/test_green_perfect.png');
console.log('Done!');

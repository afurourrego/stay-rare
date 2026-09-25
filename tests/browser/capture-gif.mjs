import { mkdir, writeFile } from 'node:fs/promises';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';
import { testGame } from '@rarefriends/friendsdk/testing';
import { startRun } from './flow.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const frames = [];
// Recorded with the SDK's automated test fixture (sample Friend #7730), like the other entries' screenshots.
await testGame('./games/stay-rare', {
  width: 960, height: 800, timeout: 90_000,
  check: async ({ page, game }) => {
    await startRun(page, game);
    await game.locator('canvas').click({ position: { x: 20, y: 60 } }); // focus (inside the canvas at any integer scale)
    const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'], frame = page.locator('.rf-game-frame');
    for (let i = 0; i < 90; i++) {
      if (i % 15 === 0) { if (i) await page.keyboard.up(keys[(i / 15 - 1) % 4]); await page.keyboard.down(keys[(i / 15) % 4]); }
      const dialog = game.getByRole('dialog', { name: 'Level up!' });
      if (await dialog.isVisible()) await game.getByRole('button', { name: /^Choose / }).first().click();
      frames.push(await frame.screenshot());
      await page.waitForTimeout(90);
    }
  },
});
const enc = GIFEncoder();
for (const buffer of frames) {
  const png = PNG.sync.read(buffer), w = Math.floor(png.width / 2), h = Math.floor(png.height / 2), rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) rgba[(y * w + x) * 4 + c] = png.data[((y * 2) * png.width + x * 2) * 4 + c];
  const palette = quantize(rgba, 16), index = applyPalette(rgba, palette);
  enc.writeFrame(index, w, h, { palette, delay: 100 });
}
enc.finish();
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/stay-rare.gif', enc.bytes());
console.log(`artifacts/stay-rare.gif: ${frames.length} frames`);

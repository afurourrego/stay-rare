import { testGame } from '@rarefriends/friendsdk/testing';
import { assertCardsReachable, assertSoundOn, assertReachable, assertStartClearOfPool, finishRun, startRun, walkUntilCapsule } from './flow.mjs';

// The fixture pins the seed to 1500 and the preview roll to "Pool entry"; Friend #7730 is a Hoverer.
for (const width of [960, 360]) {
  const result = await testGame('./games/stay-rare', {
    width, height: width < 500 ? 740 : 800, timeout: 45_000, screenshot: `./artifacts/stay-rare-${width}.png`,
    check: async ({ page, game }) => {
      await game.getByRole('heading', { name: 'Stay Rare' }).waitFor();
      await game.getByText('Simulated — example rivals').waitFor();
      await game.getByText(/^Bulk \d+ px: /).waitFor(); // your Friend's own traits, read from its art
      await assertReachable(page, game.getByRole('button', { name: 'Start run · 1 RF' }), 'Start button');
      await assertStartClearOfPool(page, game);
      await startRun(page, game);
      await assertSoundOn(game, 'run');
      await walkUntilCapsule(page, game);
      await page.locator('.rf-game-frame').screenshot({ path: `./artifacts/stay-rare-${width}-capsule.png` });
      await assertCardsReachable(page, game);
      await finishRun(page, game);
    },
  });
  console.log(`PASS ${result.width}px`);
}

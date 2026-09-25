/** Accept the runtime's preview confirmations ("Buy run", then "Use run"), which live on `page`, not in the game frame. */
export async function confirmPreview(page) {
  await page.getByRole('button', { name: /Confirm preview/i }).click();
}

export async function startRun(page, game) {
  await game.getByRole('button', { name: 'Start run · 1 RF' }).click();
  await confirmPreview(page);
  await confirmPreview(page);
  await game.getByRole('img', { name: 'Stay Rare run' }).waitFor();
}

/** Walk in a square (D, S, A, W) until a capsule opens; the fixture seed gets one within ~40 s. */
export async function walkUntilCapsule(page, game, timeout = 90_000) {
  const dialog = game.getByRole('dialog', { name: 'Level up!' }), keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
  await game.locator('canvas').click({ position: { x: 20, y: 60 } });
  for (let i = 0, start = Date.now(); Date.now() - start < timeout; i++) {
    await page.keyboard.down(keys[i % 4]); await page.waitForTimeout(350); await page.keyboard.up(keys[i % 4]);
    if (await dialog.isVisible()) return dialog;
  }
  throw new Error('No capsule opened while walking');
}

/** The element must be fully inside the game frame and above the runtime toolbar strip (bottom 60 px). */
export async function assertReachable(page, locator, label) {
  const frame = await page.locator('iframe').boundingBox(), box = await locator.boundingBox();
  if (!box || box.y < frame.y || box.y + box.height > frame.y + frame.height - 60 || box.x < frame.x || box.x + box.width > frame.x + frame.width) {
    throw new Error(`${label} is outside the playable area: ${JSON.stringify(box)} in frame ${JSON.stringify(frame)}`);
  }
}

export async function assertCardsReachable(page, game) {
  const cards = game.locator('.sr-cardpick'), count = await cards.count();
  if (count < 1) throw new Error('No capsule cards');
  for (let i = 0; i < count; i++) await assertReachable(page, cards.nth(i), `Capsule card ${i + 1}`);
  await cards.nth(count - 1).click();
}

export async function finishRun(page, game) {
  await game.getByRole('button', { name: 'Pause' }).click();
  for (const name of ['Resume', 'End run']) await assertReachable(page, game.getByRole('button', { name }), `Pause menu "${name}"`);
  await game.getByRole('button', { name: 'End run' }).click();
  await game.getByRole('heading', { name: 'Run over' }).waitFor();
  await game.getByText(/simulated pool, example rivals/).waitFor({ timeout: 2_000 });
  await game.getByRole('button', { name: 'Open chest' }).click();
  await game.getByText('Pool entry', { exact: true }).waitFor();
  await game.getByRole('button', { name: 'Back to title' }).click();
  await game.getByRole('button', { name: 'Start run · 1 RF' }).waitFor();
}

/** Expanding "Show top 10" must never make the pool card overlap the Start button (under the Friend card). */
export async function assertStartClearOfPool(page, game) {
  await game.getByText('Show top 10').click();
  const start = await game.getByRole('button', { name: 'Start run · 1 RF' }).boundingBox();
  const pool = await game.locator('.sr-pool').boundingBox();
  if (!start || !pool) throw new Error('Missing Start button or pool card');
  const overlap = start.x < pool.x + pool.width && pool.x < start.x + start.width && start.y < pool.y + pool.height && pool.y < start.y + start.height;
  if (overlap) throw new Error(`Pool card overlaps the Start button: ${JSON.stringify({ start, pool })}`);
  await game.getByText('Show top 10').click();
}

/** The Sound toggle exists and is on (aria-pressed="true"): sound is on by default, unlocked by the Start click. */
export async function assertSoundOn(game, where) {
  const pressed = await game.getByRole('button', { name: 'Sound' }).getAttribute('aria-pressed');
  if (pressed !== 'true') throw new Error(`Sound should be on by default (${where}); aria-pressed=${pressed}`);
}

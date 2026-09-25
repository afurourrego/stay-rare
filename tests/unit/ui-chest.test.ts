import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ChestPanel, FREE_RUN_LINE, type ChestPanelProps } from '../../games/stay-rare/ui/Chest';

const props = (over: Partial<ChestPanelProps>): ChestPanelProps => ({
  result: { kind: 'freeRun', playId: 1n }, busy: false, error: '', unclaimed: 1n, reducedMotion: true, poolShare: '0.89 RF',
  playAgain: { ok: false, label: 'Play again · 1 RF', reason: 'Not enough simulated RF. Reload to reset.' },
  sound: null, sfx: null, onRetry() {}, onRedeem() {}, onDone() {}, onPlayAgain() {}, ...over,
});
/** Rules inside the small-screen media query that hide something. */
const hiddenOnPhones = () => {
  const css = readFileSync('games/stay-rare/style.css', 'utf8'), start = css.indexOf('@media (max-width: 640px)');
  return [...css.slice(start).matchAll(/([^{}]+)\{[^}]*display:\s*none/g)].map(m => m[1].trim());
};

describe('chest panel copy', () => {
  test('the reason Play again is disabled has its own class, never hidden on phones', () => {
    const html = renderToStaticMarkup(createElement(ChestPanel, props({})));
    expect(html).toMatch(/class="sr-reason"[^>]*>Not enough simulated RF/);
    expect(hiddenOnPhones().some(sel => sel.includes('sr-reason'))).toBe(false);
  });
  test('the free-run line itself says the RF is simulated (the fine print is hidden on phones)', () => {
    // the free block renders after the reveal (an effect), so the line is exported and checked directly
    expect(hiddenOnPhones().some(sel => sel.includes('.sr-chest-window .sr-fine'))).toBe(true);
    expect(FREE_RUN_LINE).toMatch(/simulated/i);
  });
});

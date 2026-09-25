import { describe, expect, test } from 'vitest';
import { SONGS, songEvents, stepSeconds } from '../../games/stay-rare/audio/music';

describe('chiptune music (pure data + sequencer)', () => {
  test('two songs: a wave theme and a faster, tenser boss theme, each a whole number of bars', () => {
    expect(Object.keys(SONGS).sort()).toEqual(['boss', 'wave']);
    for (const song of Object.values(SONGS)) {
      expect(song.steps % 16).toBe(0);
      for (const n of song.notes) {
        expect(n.step).toBeGreaterThanOrEqual(0); expect(n.step).toBeLessThan(song.steps);
        expect(n.len).toBeGreaterThan(0);
        if (n.voice !== 'kick' && n.voice !== 'snare' && n.voice !== 'hat') { expect(n.midi).toBeGreaterThanOrEqual(28); expect(n.midi).toBeLessThanOrEqual(96); }
      }
      for (const voice of ['lead', 'bass', 'kick', 'snare', 'hat'] as const) expect(song.notes.some(n => n.voice === voice), voice).toBe(true);
    }
    expect(SONGS.boss.bpm).toBeGreaterThan(SONGS.wave.bpm);
    expect(stepSeconds(SONGS.wave)).toBeCloseTo(60 / SONGS.wave.bpm / 4);
  });
  test('the sequencer loops: any split of the timeline yields the same notes, once each', () => {
    const song = SONGS.wave, whole = songEvents(song, 0, song.steps * 2);
    expect(whole).toHaveLength(song.notes.length * 2);
    const split = [...songEvents(song, 0, 37), ...songEvents(song, 37, 100), ...songEvents(song, 100, song.steps * 2)];
    expect(split).toEqual(whole);
    expect(songEvents(song, song.steps, song.steps + 1).map(e => e.at)).toEqual(song.notes.filter(n => n.step === 0).map(() => song.steps));
  });
});

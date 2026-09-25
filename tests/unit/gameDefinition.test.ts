import { describe, expect, test } from 'vitest';
import { RF, expectedReward, maximumPrize, parseChanceGame } from '@rarefriends/friendsdk/game';
import gameJson from '../../games/stay-rare/game.json';

describe('game.json', () => {
  test('is a valid FriendSDK chance game: 1 RF Run, 99% pool entry, 1% free run', () => {
    const game = parseChanceGame(gameJson);
    expect(game.consumable).toBe('Run');
    expect(game.price).toBe(RF);
    expect(game.outcomes.map(o => [o.name, o.chanceBps, o.reward])).toEqual([['Pool entry', 9900, 0n], ['Free run', 100, RF]]);
    expect(expectedReward(game)).toBe(RF / 100n);
    expect(maximumPrize(game)).toBe(RF);
  });
});

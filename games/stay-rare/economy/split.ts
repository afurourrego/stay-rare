/** Design split of each 1 RF entry (simulated; FriendSDK v0.1.2 adds the whole price to the game stake). */
export const SPLIT_BPS = { pool: 8_900, luck: 100, house: 500, burn: 500 } as const;

export function splitEntry(price: bigint) {
  const pool = price * BigInt(SPLIT_BPS.pool) / 10_000n;
  const luck = price * BigInt(SPLIT_BPS.luck) / 10_000n;
  const burn = price * BigInt(SPLIT_BPS.burn) / 10_000n;
  return { pool, luck, house: price - pool - luck - burn, burn } as const;
}

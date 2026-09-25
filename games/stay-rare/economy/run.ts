import { maximumPrize, type ChanceGameDefinition, type GameClient, type GamePlay, type GameSnapshot } from '@rarefriends/friendsdk/game';

export const POOL_ENTRY_OUTCOME = 1;
export const FREE_RUN_OUTCOME = 2;

export type StartCheck = { ok: true } | { ok: false; reason: string };
export type ChestResult = Readonly<{ kind: 'poolEntry' | 'freeRun' | 'sealing'; playId: bigint }>;

export function pendingPlay(s: GameSnapshot): GamePlay | undefined { return s.plays.find(p => p.outcomeId === null); }
export function unclaimedFreeRuns(s: GameSnapshot): bigint { return s.inventory[FREE_RUN_OUTCOME - 1] ?? 0n; }

/** `client.canBuy` checks only the game's free stake, so the player's balance is checked here. */
export function startCheck(s: GameSnapshot, d: ChanceGameDefinition): StartCheck {
  if (pendingPlay(s)) return { ok: false, reason: 'Open your unopened chest first.' };
  if (s.consumables > 0n) return { ok: true };
  if (s.rfBalance < d.price) return { ok: false, reason: 'Not enough simulated RF. Reload the page to reset the preview.' };
  const max = maximumPrize(d);
  if (s.freeStake < max || s.freeStake + d.price < max) return { ok: false, reason: 'New runs are paused until the game has enough free backing.' };
  return { ok: true };
}

/** buy (skipped if a Run is already owned) → play. Each call shows the runtime's own confirmation. */
export async function startRun(client: GameClient): Promise<bigint> {
  const s = await client.read(), check = startCheck(s, client.definition);
  if (!check.ok) throw new Error(check.reason);
  if (s.consumables === 0n) await client.buy(1n);
  const [play] = await client.play(1n);
  return play.id;
}

/** The chest roll happens here (preview: inside settle; chain: Dice RNG requested by settle). */
export async function openChest(client: GameClient, playId: bigint): Promise<ChestResult> {
  const settled = await client.settle(playId);
  if (settled.outcomeId === null) return { kind: 'sealing', playId };
  return { kind: settled.outcomeId === FREE_RUN_OUTCOME ? 'freeRun' : 'poolEntry', playId };
}

/** Never redeem outcome 1: Pool entry is worth 0 and the SDK rejects it. */
export async function redeemFreeRun(client: GameClient): Promise<void> { await client.redeem(FREE_RUN_OUTCOME, 1n); }

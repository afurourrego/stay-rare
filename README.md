# Stay Rare

A survivor-like for your Rare Friend, built on FriendSDK v0.1.2 for the Rare Friends Vibeathon.
Your Friend's family decides its starting weapon and trait. Survive endless waves of 1-bit glitches (real Generations
Friends corrupted by static) and a boss every ~90 seconds, level up through the "Level up!" terminal (pick 1 of 3 power
chips), and enter the Daily Pool.

**Play:** https://afurourrego.github.io/stay-rare/ — needs a browser wallet on Robinhood mainnet (chain 4663) holding a
hardwired Rare Friends Generations NFT (generation ≥ 1). Connecting only reads: no signatures, no transactions, no RF.
Everything economic is simulated.

## How to play
- WASD / arrows, or drag anywhere on touch screens. Weapons fire on their own.
- Your Friend's own traits, read from its on-chain pixels: Bulk (tougher but slower, or quick but fragile), Symmetry
  (crits, or faster weapons) and Eyes (pickup range). Small trade-offs shown on the title card.
- Families: Skeleton: Bone Bolt, +10% damage · Mask: Mask Wave, −7% cooldown · Family: Kin Orbit, +35% XP · Cellular: Split Cell, regenerates 0.2 HP/s · Asymmetry: Offset Shot, +10% crit · Hoverer: Drift Mines, +20% speed · Colossus: Quake Stamp, +40% HP, −10% speed · Sparkling: Glitter Bounce, +10% area · Hollow: Void Beam, 1 s invulnerability after a hit.
- Collect XP; each level opens the "Level up!" terminal with 3 power chips (common 70% · rare 25% · legendary 5%). Pick one.
- Max a weapon and own its paired passive to evolve it (e.g. Bone Bolt + Sharp Edge = Bone Storm).
- A boss arrives every ~90 s (Big Static, Broken Glyph, Dead Pixel Grid, then The Corruptor, your Friend inverted);
  beating it heals you, levels you up and starts a harder wave.
- Scenery is solid: you walk behind and in front of props, shots stop on them, and crates and terminals break,
  sometimes dropping a health patch (+25% HP).
- P / Esc or `[ II ]` pauses; M toggles sound; "Reduce motion" is in the pause menu.

## Economy (simulated)
| | |
|---|---|
| Consumable | Run, 1 RF |
| Chest on death | Pool entry 99% (0 RF) · Free run 1% (1 RF back) — regardless of score |
| Expected reward | 0.01 RF per run · max prize 1 RF (each Run reserves 1 RF) |
| Design split of 1 RF | 0.89 Daily Pool · 0.01 free-run chest · 0.05 house · 0.05 burned |
| Daily Pool | best run per Friend; top 10 get 30/20/13/9/7/6/5/4/3/3 %; cutoff 00:00 UTC; unpaid share carries over |

In FriendSDK v0.1.2 the whole price goes to the game stake; the pool, payouts and burn are a design shown with
example rivals. Making it real needs a pool/burn contract, server-side verification (the simulation is deterministic:
seed + recorded inputs replay the exact score) and legal review of a paid-entry tournament.

## Develop
Node ≥ 22.
```sh
npm ci
npm test              # unit tests
npm run test:balance  # headless bot balance suite (slow)
npm run check         # friendsdk check
npm run test:browser  # SDK test harness (mock wallet, automated only)
npm run dev           # local preview (real wallet gate)
npm run build         # static preview in games/stay-rare/.friendsdk/
```
Art tools: `python3 tools/logo.py` (pixel logo), `python3 tools/icons16.py` (power icons), `python3 tools/home-webp.py`
(animated home background) and `node tools/snapshot-friends.mjs` (the real Friends used as glitches). The pre-connect
title screen is `games/stay-rare/host.css`, which only restyles the SDK runtime's own frame and menus.

## Credits and licenses
Code: Apache-2.0. Friend artwork and runtime: FriendSDK (see NOTICE.md). Fonts: Silkscreen and Archivo, SIL Open
Font License (`games/stay-rare/fonts/`). Props and glitch enemies: FriendSDK props and real Generations Friends decoded
with the SDK. Sounds: FriendSDK sound kit plus chiptune action sounds and background music synthesized in code (`audio/sfx.ts`,
`audio/music.ts`).

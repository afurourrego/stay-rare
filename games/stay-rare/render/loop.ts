export type LoopOptions = {
  tick(): void; render(): void; running(): boolean;
  hz?: number; maxSteps?: number; now?: () => number;
  raf?: (cb: FrameRequestCallback) => number; caf?: (id: number) => void;
};

/** requestAnimationFrame driver with a fixed-step accumulator (max `maxSteps` ticks per frame). */
export function createFixedLoop(o: LoopOptions) {
  const dtMs = 1000 / (o.hz ?? 60), maxSteps = o.maxSteps ?? 5;
  const now = o.now ?? (() => performance.now());
  const raf = o.raf ?? ((cb: FrameRequestCallback) => requestAnimationFrame(cb));
  const caf = o.caf ?? ((id: number) => cancelAnimationFrame(id));
  let last = 0, acc = 0, handle = 0, alive = false;
  const frame = () => {
    if (!alive) return;
    const t = now(), elapsed = t - last;
    last = t;
    if (o.running()) {
      // One extra step of headroom so float error never turns a long stall into maxSteps − 1 ticks.
      acc += Math.min(elapsed, dtMs * (maxSteps + 1));
      for (let steps = 0; acc >= dtMs && steps < maxSteps; steps++) {
        o.tick();
        acc -= dtMs;
        if (!o.running()) { acc = 0; break; }
      }
    } else acc = 0;
    o.render();
    handle = raf(frame);
  };
  return {
    start() { if (alive) return; alive = true; last = now(); acc = 0; handle = raf(frame); },
    stop() { alive = false; caf(handle); },
  };
}

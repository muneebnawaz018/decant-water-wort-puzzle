import {
  advanceDrift,
  ambientMotes,
  ASSUMED_FRAME_MS,
  groundVector,
  lampGlow,
  moteOpacity,
  washGlow,
  type DriftState,
} from '../backdrop';

describe('backdrop geometry', () => {
  it('hangs the lamp above the top edge', () => {
    // Spec §3 puts it at -8%, so the glow falls into frame rather than
    // sitting as a disc inside it.
    expect(lampGlow(400, 800).cy).toBeLessThan(0);
  });

  it('puts the wash past the bottom-right corner', () => {
    const wash = washGlow(400, 800);
    expect(wash.cx).toBeGreaterThan(400 * 0.5);
    expect(wash.cy).toBeGreaterThan(800);
  });

  it('runs the ground gradient top to bottom', () => {
    const { start, end } = groundVector(400, 800);
    expect(end.y).toBeGreaterThan(start.y);
  });

  it('scales with the screen instead of assuming a size', () => {
    expect(lampGlow(800, 800).r).toBeGreaterThan(lampGlow(400, 800).r);
  });
});

describe('ambientMotes', () => {
  it('is deterministic, so a re-render never re-rolls the drift', () => {
    expect(ambientMotes(14)).toEqual(ambientMotes(14));
  });

  it('spreads motes across the width without hugging the edges', () => {
    for (const mote of ambientMotes(14)) {
      expect(mote.x).toBeGreaterThanOrEqual(0.05);
      expect(mote.x).toBeLessThanOrEqual(0.95);
    }
  });

  it('puts as many motes down the left as down the right', () => {
    // The old sin-based hash was not uniform over small sequential integers
    // and landed twelve of fourteen motes on the right half, eight of them in
    // the far quarter. It read as drift blowing sideways rather than as an
    // even field, which is exactly what someone noticed on the device.
    const xs = ambientMotes(14).map((m) => m.x);
    const left = xs.filter((x) => x < 0.5).length;
    expect(Math.abs(left - (xs.length - left))).toBeLessThanOrEqual(2);
  });

  it('leaves no empty band across the screen', () => {
    // Evenly split halves are not enough on their own — the old field also had
    // a quarter of the width with nothing in it at all.
    const xs = ambientMotes(14).map((m) => m.x);
    for (const quarter of [0, 1, 2, 3]) {
      const inBand = xs.filter(
        (x) => x >= quarter * 0.25 && x < (quarter + 1) * 0.25
      ).length;
      expect(inBand).toBeGreaterThan(0);
    }
  });

  it('spreads the starting phases through the rise', () => {
    // Otherwise the field pulses: a clump of motes fading in together, then a
    // gap with the screen nearly empty.
    const offsets = ambientMotes(14).map((m) => m.offset);
    for (const half of [0, 1]) {
      const inHalf = offsets.filter((o) => o >= half * 0.5 && o < (half + 1) * 0.5).length;
      expect(inHalf).toBeGreaterThan(3);
    }
  });

  it('does not tie sideways drift to which side a mote starts on', () => {
    // `drift` was derived from the same draw as `x`, so motes on the right
    // always drifted right and the field leaned further over time.
    const motes = ambientMotes(14);
    const rightward = motes.filter((m) => m.x > 0.5 && m.drift > 0).length;
    const rightSide = motes.filter((m) => m.x > 0.5).length;
    expect(rightward).toBeLessThan(rightSide);
  });

  it('varies speed, so they never rise as one rank', () => {
    const speeds = new Set(ambientMotes(14).map((m) => m.speed));
    expect(speeds.size).toBeGreaterThan(1);
  });

  it('staggers the start of every rise', () => {
    // With speed quantised, `offset` carries most of the variety. Two motes
    // sharing a speed and an offset would rise as one.
    const phases = new Set(ambientMotes(14).map((m) => `${m.speed}:${m.offset}`));
    expect(phases.size).toBe(14);
  });

  it('keeps speed a whole number, so the clock wrap is continuous', () => {
    // Phase is `(clock * speed + offset) % 1`. On the wrap 1 → 0 that shifts
    // by `-speed mod 1`, which is only zero for an integer speed. A fractional
    // one teleports every mote on the wrap frame.
    for (const mote of ambientMotes(14)) {
      expect(Number.isInteger(mote.speed)).toBe(true);
      expect(mote.speed).toBeGreaterThan(0);

      const before = (1 * mote.speed + mote.offset) % 1;
      const after = (0 * mote.speed + mote.offset) % 1;
      expect(after).toBeCloseTo(before, 10);
    }
  });
});

describe('moteOpacity', () => {
  it('starts and ends invisible', () => {
    expect(moteOpacity(0)).toBeCloseTo(0);
    expect(moteOpacity(1)).toBeCloseTo(0);
  });

  it('never leaves the 0..1 range across a full rise', () => {
    for (let i = 0; i <= 100; i++) {
      const value = moteOpacity(i / 100);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is brightest low, where the lamp is not washing it out', () => {
    expect(moteOpacity(0.2)).toBeGreaterThan(moteOpacity(0.8));
  });
});

describe('advanceDrift', () => {
  const CYCLE = 14000;

  /** Run `frames` frames of `interval` ms and hand back the final state. */
  const run = (interval: number, frames: number, from?: DriftState): DriftState => {
    let state: DriftState = from ?? { clock: 0, frameMs: ASSUMED_FRAME_MS };
    for (let i = 0; i < frames; i++) state = advanceDrift(state, interval, CYCLE);
    return state;
  };

  it('learns the panel rate from the frames themselves', () => {
    expect(run(1000 / 120, 200).frameMs).toBeCloseTo(1000 / 120, 1);
    expect(run(1000 / 30, 200).frameMs).toBeCloseTo(1000 / 30, 1);
  });

  it('drifts at the same speed whatever the rate', () => {
    // One second of wall clock, three panels. Position must agree — the whole
    // point of advancing by elapsed time rather than by a per-frame step.
    const at60 = run(1000 / 60, 60).clock;
    const at120 = run(1000 / 120, 120).clock;
    const at30 = run(1000 / 30, 30).clock;

    expect(at120).toBeCloseTo(at60, 6);
    expect(at30).toBeCloseTo(at60, 6);
    expect(at60).toBeCloseTo(1000 / CYCLE, 6);
  });

  it('pins a stall to three frames of drift, not the whole gap', () => {
    const settled = run(1000 / 60, 200);
    const stalled = advanceDrift(settled, 2000, CYCLE);
    const moved = stalled.clock - settled.clock;

    expect(moved).toBeCloseTo((3 * settled.frameMs) / CYCLE, 6);
  });

  it('scales that ceiling with the panel, so a hitch costs the same frames', () => {
    const slow = run(1000 / 60, 200);
    const fast = run(1000 / 120, 200);

    const slowJump = advanceDrift(slow, 2000, CYCLE).clock - slow.clock;
    const fastJump = advanceDrift(fast, 2000, CYCLE).clock - fast.clock;

    // Half the frame interval, half the jump. A fixed millisecond ceiling gave
    // the 120Hz panel twice the tolerance, on the display where a jump shows
    // most.
    expect(fastJump).toBeCloseTo(slowJump / 2, 6);
  });

  it('keeps a stall out of the rate estimate', () => {
    const settled = run(1000 / 120, 200);
    const after = advanceDrift(settled, 2000, CYCLE);

    // A hitch that raised the estimate would raise the ceiling meant to catch
    // it, and the next hitch would be paid out larger still.
    expect(after.frameMs).toBeCloseTo(settled.frameMs, 6);
  });

  it('ignores a zero or negative delta', () => {
    const settled = run(1000 / 60, 60);
    expect(advanceDrift(settled, 0, CYCLE).clock).toBe(settled.clock);
    expect(advanceDrift(settled, -5, CYCLE).clock).toBe(settled.clock);
  });

  it('wraps rather than running past one', () => {
    const state = run(1000 / 60, 60 * 20);
    expect(state.clock).toBeGreaterThanOrEqual(0);
    expect(state.clock).toBeLessThan(1);
  });
});

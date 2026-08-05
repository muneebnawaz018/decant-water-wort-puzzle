import { ambientMotes, groundVector, lampGlow, moteOpacity, washGlow } from '../backdrop';

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

  it('varies speed, so they never rise as one rank', () => {
    const speeds = new Set(ambientMotes(14).map((m) => m.speed));
    expect(speeds.size).toBeGreaterThan(10);
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

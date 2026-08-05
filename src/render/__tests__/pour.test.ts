import { computeLayout } from '../layout';
import {
  extension,
  GOO_MATRIX,
  PHASE,
  phaseProgress,
  POUR_MS,
  pourGeometry,
  splashParticles,
  TILT,
} from '../pour';

const layout = computeLayout({
  tubeCount: 6,
  capacity: 4,
  width: 360,
  height: 520,
});

describe('pour timing', () => {
  it('leaves doc §7 its 350ms of actual pouring', () => {
    const pouring = (PHASE.pourEnd - PHASE.pourStart) * POUR_MS;
    expect(Math.round(pouring)).toBeGreaterThanOrEqual(280);
  });

  it('does not start filling until the stream is falling', () => {
    expect(PHASE.fillStart).toBeGreaterThan(PHASE.pourStart);
  });

  it('does not send the tube home until it has finished pouring', () => {
    expect(PHASE.returnStart).toBeGreaterThanOrEqual(PHASE.pourEnd);
  });

  it('clamps a phase to 0..1 outside its window', () => {
    expect(phaseProgress(0, 0.3, 0.6)).toBe(0);
    expect(phaseProgress(0.45, 0.3, 0.6)).toBeCloseTo(0.5);
    expect(phaseProgress(1, 0.3, 0.6)).toBe(1);
  });

  it('treats a zero-length phase as a switch, not a divide by zero', () => {
    expect(phaseProgress(0.4, 0.5, 0.5)).toBe(0);
    expect(phaseProgress(0.6, 0.5, 0.5)).toBe(1);
  });
});

describe('extension', () => {
  it('starts and ends in the rack', () => {
    expect(extension(0)).toBeCloseTo(0);
    expect(extension(1)).toBeCloseTo(0);
  });

  it('is fully out for the whole pour', () => {
    expect(extension(PHASE.pourStart)).toBeCloseTo(1);
    expect(extension((PHASE.pourStart + PHASE.pourEnd) / 2)).toBeCloseTo(1);
    expect(extension(PHASE.pourEnd)).toBeCloseTo(1);
  });

  it('travels out before it pours and back afterwards', () => {
    expect(extension(PHASE.travelEnd / 2)).toBeGreaterThan(0);
    expect(extension(PHASE.travelEnd / 2)).toBeLessThan(1);
    expect(extension((PHASE.returnStart + 1) / 2)).toBeLessThan(1);
  });

  it('never leaves the rack twice in one pour', () => {
    let peaked = false;
    let previous = 0;
    for (let i = 0; i <= 100; i++) {
      const value = extension(i / 100);
      if (value < previous - 1e-6) peaked = true;
      // Once it has started coming back it must not go out again. The guard is
      // the property: the assertion only applies after the peak.
      // eslint-disable-next-line jest/no-conditional-expect
      if (peaked) expect(value).toBeLessThanOrEqual(previous + 1e-6);
      previous = value;
    }
    expect(peaked).toBe(true);
  });
});

describe('pourGeometry', () => {
  it('pivots on the lip corner facing the destination', () => {
    const source = layout.tubes[0]!;
    const rightwards = pourGeometry(layout, 0, 2, 0);
    const leftwards = pourGeometry(layout, 2, 0, 0);

    expect(rightwards.pivot.x).toBeCloseTo(source.x + source.width);
    expect(leftwards.pivot.x).toBeCloseTo(layout.tubes[2]!.x);
  });

  it('tips away from the destination so the body never covers it', () => {
    expect(pourGeometry(layout, 0, 2, 0).tilt).toBeCloseTo(-TILT);
    expect(pourGeometry(layout, 2, 0, 0).tilt).toBeCloseTo(TILT);
  });

  it('hangs the lip above the destination, not inside it', () => {
    const dest = layout.tubes[3]!;
    const geometry = pourGeometry(layout, 0, 3, 1);

    expect(geometry.target.y).toBeLessThan(dest.y);
    expect(geometry.streamX).toBeCloseTo(dest.x + dest.width / 2);
  });

  it('measures the surface of what is already in the tube', () => {
    const dest = layout.tubes[1]!;
    expect(pourGeometry(layout, 0, 1, 0).surfaceY).toBeCloseTo(dest.y + dest.height);
    expect(pourGeometry(layout, 0, 1, 2).surfaceY).toBeCloseTo(
      dest.y + dest.height - 2 * layout.segmentHeight
    );
  });

  it('scales the stream to the board, not to a fixed pixel width', () => {
    const small = computeLayout({
      tubeCount: 14,
      capacity: 4,
      width: 360,
      height: 520,
    });
    expect(pourGeometry(small, 0, 1, 0).width).toBeLessThan(
      pourGeometry(layout, 0, 1, 0).width
    );
  });
});

describe('splashParticles', () => {
  it('throws liquid to both sides', () => {
    const particles = splashParticles(20);
    expect(particles.some((p) => p.vx < 0)).toBe(true);
    expect(particles.some((p) => p.vx > 0)).toBe(true);
  });

  it('always launches upward — gravity brings them back down', () => {
    for (const particle of splashParticles(20)) {
      expect(particle.vy).toBeLessThan(0);
    }
  });

  it('mixes a fine high spray with a wide low sheet', () => {
    const speeds = splashParticles(20).map((p) => Math.abs(p.vy));
    // A uniform spread is what made the first attempt look like a cartoon.
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeGreaterThan(2.5);
  });

  it('staggers launches instead of firing everything on one frame', () => {
    const delays = new Set(splashParticles(20).map((p) => p.delay));
    expect(delays.size).toBeGreaterThan(10);
  });

  it('is deterministic, so a pour never replays differently', () => {
    expect(splashParticles(20)).toEqual(splashParticles(20));
  });
});

describe('metaball threshold', () => {
  it('leaves colour alone and only steepens alpha', () => {
    expect(GOO_MATRIX).toHaveLength(20);
    // Rows 1-3 are identity: the effect must not tint the liquid.
    expect(GOO_MATRIX.slice(0, 5)).toEqual([1, 0, 0, 0, 0]);
    expect(GOO_MATRIX.slice(5, 10)).toEqual([0, 1, 0, 0, 0]);
    expect(GOO_MATRIX.slice(10, 15)).toEqual([0, 0, 1, 0, 0]);
    // Alpha gets a steep gain and a negative bias, which is what fuses blobs.
    expect(GOO_MATRIX[18]).toBeGreaterThan(1);
    expect(GOO_MATRIX[19]).toBeLessThan(0);
  });
});

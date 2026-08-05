import { apothecary } from '../apothecary';
import { alpha, colours, fade, glyphOn, gradients, tint, ui } from '../colors';

describe('alpha', () => {
  it('expands a palette colour to rgba', () => {
    expect(alpha('white', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(alpha('black', 1)).toBe('rgba(0,0,0,1)');
  });

  it('reads the channels in the right order', () => {
    // mango is #FF8A1E — red highest, blue lowest.
    expect(alpha('mango', 1)).toBe('rgba(255,138,30,1)');
  });

  it('clamps out-of-range opacity rather than emitting invalid css', () => {
    expect(alpha('white', 2)).toBe('rgba(255,255,255,1)');
    expect(alpha('white', -1)).toBe('rgba(255,255,255,0)');
  });

  it('fades to fully transparent', () => {
    expect(fade('lamp')).toBe(alpha('lamp', 0));
  });
});

describe('tint', () => {
  it('leaves a colour alone at zero', () => {
    expect(tint('mango', 0)).toBe('rgb(255,138,30)');
  });

  it('reaches white at one', () => {
    expect(tint('mango', 1)).toBe('rgb(255,255,255)');
  });

  it('lifts every channel towards white', () => {
    // mango is #FF8A1E. Halfway: red is already at the ceiling, the other two
    // move to the midpoint between themselves and 255.
    expect(tint('mango', 0.5)).toBe('rgb(255,197,143)');
  });

  it('clamps out-of-range amounts rather than overshooting white', () => {
    expect(tint('mango', 2)).toBe(tint('mango', 1));
    expect(tint('mango', -1)).toBe(tint('mango', 0));
  });

  it('stays opaque, so a tint never picks up what sits behind it', () => {
    // The shelf's ramp sits over the backdrop's purple wash. An rgba step
    // would blend with it and the vial would read as translucent.
    expect(tint('lime', 0.4)).not.toContain('rgba');
  });
});

describe('palette', () => {
  it('holds no duplicate values', () => {
    // Two names for one colour is how a design drifts: someone tweaks one and
    // not the other, and the difference is invisible until it ships.
    const seen = new Map<string, string>();
    for (const [name, value] of Object.entries(colours)) {
      const key = value.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.set(key, name);
    }
  });

  it('is all six-digit hex, so `alpha` can parse every entry', () => {
    for (const value of Object.values(colours)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('semantic tokens', () => {
  it('resolves every entry to a colour string or a tuple of them', () => {
    for (const value of Object.values(ui)) {
      const parts = Array.isArray(value) ? value : [value];
      for (const part of parts) {
        expect(part).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(\d+,\d+,\d+,[\d.]+\))$/);
      }
    }
  });

  it('gives every gradient at least two stops', () => {
    for (const stops of Object.values(gradients)) {
      expect(stops.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('derives translucency from the base colour it belongs to', () => {
    // If the accent moves, its wash has to move with it.
    expect(ui.accentWash).toBe(alpha('accent', 0.2));
    expect(ui.goldEdge).toBe(alpha('gold', 0.55));
    expect(ui.line).toBe(alpha('white', 0.1));
  });
});

describe('glyphOn', () => {
  it('goes dark on the light liquids', () => {
    // lime and tangerine are both above L* 84. A white mark on them is the
    // accessibility feature failing silently.
    expect(glyphOn(colours.lime)).toContain('42,23,88');
    expect(glyphOn(colours.tangerine)).toContain('42,23,88');
  });

  it('stays white on the dark liquids', () => {
    expect(glyphOn(colours.grape)).toContain('255,255,255');
    expect(glyphOn(colours.blueberry)).toContain('255,255,255');
    expect(glyphOn(colours.coral)).toContain('255,255,255');
  });

  it('picks a legible mark for every liquid in the palette', () => {
    const liquids = [
      colours.coral,
      colours.grape,
      colours.teal,
      colours.tangerine,
      colours.olive,
      colours.rose,
      colours.lime,
      colours.blueberry,
      colours.mango,
      colours.fern,
      colours.aqua,
      colours.plum,
    ];
    for (const fill of liquids) {
      expect(glyphOn(fill)).toMatch(/^rgba\(/);
    }
  });
});

describe('liquid separation', () => {
  /** CIE76 ΔE. Rough, but enough to catch two colours nobody can tell apart. */
  const distance = (a: string, b: string) => {
    const lab = (hex: string) => {
      const v = parseInt(hex.slice(1), 16);
      const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const r = lin((v >> 16) & 255);
      const g = lin((v >> 8) & 255);
      const bl = lin(v & 255);
      const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const fx = f((r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047);
      const fy = f(r * 0.2126 + g * 0.7152 + bl * 0.0722);
      const fz = f((r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883);
      return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    };
    const [l1, a1, b1] = lab(a);
    const [l2, a2, b2] = lab(b);
    return Math.hypot(l1! - l2!, a1! - a2!, b1! - b2!);
  };

  const pieces = apothecary.pieces;

  it('keeps every colour a board can use well apart', () => {
    // The curve tops out at 12, but 11 covers everything below level 501.
    for (let count = 3; count <= 11; count++) {
      const used = pieces.slice(0, count);
      for (let i = 0; i < used.length; i++) {
        for (let j = i + 1; j < used.length; j++) {
          expect(distance(used[i]!, used[j]!)).toBeGreaterThan(30);
        }
      }
    }
  });

  it('never lets a liquid vanish into the background', () => {
    for (const piece of pieces) {
      expect(distance(piece, colours.night)).toBeGreaterThan(40);
    }
  });

  it('has a symbol for every piece', () => {
    expect(apothecary.symbols).toHaveLength(apothecary.pieces.length);
    expect(new Set(apothecary.symbols).size).toBe(apothecary.symbols.length);
  });
});

describe('colour vision', () => {
  /**
   * Viénot–Brettel–Mollon dichromacy simulation.
   *
   * Converts to LMS, collapses the missing cone onto the plane the other two
   * span, and converts back. The inverse matrix is derived from the forward
   * one rather than pasted: a mismatched pair pushes results far outside
   * gamut, and the clamp then reports colours as identical when they are not.
   */
  const M = [
    [0.31399022, 0.63951294, 0.04649755],
    [0.15537241, 0.75789446, 0.0867014],
    [0.01775239, 0.10944209, 0.87256922],
  ] as const;

  const inverse = (m: typeof M) => {
    const [a, b, c] = m[0];
    const [d, e, f] = m[1];
    const [g, h, i] = m[2];
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
      [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
      [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
      [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
    ];
  };

  const Mi = inverse(M);
  const apply = (m: readonly (readonly number[])[], v: number[]) =>
    m.map((row) => row[0]! * v[0]! + row[1]! * v[1]! + row[2]! * v[2]!);

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  const toGamma = (c: number) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  };

  type Deficiency = 'protan' | 'deutan' | 'tritan';

  const simulate = (hex: string, kind: Deficiency): number[] => {
    const value = parseInt(hex.slice(1), 16);
    const rgb = [
      toLinear((value >> 16) & 255),
      toLinear((value >> 8) & 255),
      toLinear(value & 255),
    ];
    const lms = apply(M, rgb);
    let [l, m, s] = lms as [number, number, number];
    if (kind === 'protan') l = 2.02344 * m - 2.52581 * s;
    else if (kind === 'deutan') m = 0.494207 * l + 1.24827 * s;
    else s = -0.012245 * l + 0.072034 * m;
    return apply(Mi, [l, m, s]).map((c) => toLinear(toGamma(c) * 255));
  };

  const deltaE = (a: number[], b: number[]) => {
    const lab = ([r, g, bl]: number[]) => {
      const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const fx = f((r! * 0.4124 + g! * 0.3576 + bl! * 0.1805) / 0.95047);
      const fy = f(r! * 0.2126 + g! * 0.7152 + bl! * 0.0722);
      const fz = f((r! * 0.0193 + g! * 0.1192 + bl! * 0.9505) / 1.08883);
      return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    };
    const [l1, a1, b1] = lab(a);
    const [l2, a2, b2] = lab(b);
    return Math.hypot(l1! - l2!, a1! - a2!, b1! - b2!);
  };

  const deficiencies: Deficiency[] = ['protan', 'deutan', 'tritan'];

  /** Worst pair among the first `count` pieces, across all three deficiencies. */
  const floorAt = (count: number) => {
    let worst = Infinity;
    for (const kind of deficiencies) {
      const seen = apothecary.pieces.slice(0, count).map((hex) => simulate(hex, kind));
      for (let i = 0; i < seen.length; i++) {
        for (let j = i + 1; j < seen.length; j++) {
          worst = Math.min(worst, deltaE(seen[i]!, seen[j]!));
        }
      }
    }
    return worst;
  };

  it('simulates normal vision as a no-op', () => {
    // Guards the matrix pair. A wrong inverse leaves the round trip lossy and
    // every number below becomes fiction.
    for (const piece of apothecary.pieces) {
      const value = parseInt(piece.slice(1), 16);
      const rgb = [
        toLinear((value >> 16) & 255),
        toLinear((value >> 8) & 255),
        toLinear(value & 255),
      ];
      expect(deltaE(apply(Mi, apply(M, rgb)), rgb)).toBeLessThan(0.01);
    }
  });

  it('holds the separation the ordering was chosen for', () => {
    // Regression pins, not aspirations. `pieces` was searched against exactly
    // these, subject to normal vision never dropping below dE 30. Reordering
    // to raise one of them lowers another — check the trade before moving any.
    expect(floorAt(4)).toBeGreaterThan(29); // level 6+
    expect(floorAt(6)).toBeGreaterThan(14); // level 51+
    expect(floorAt(8)).toBeGreaterThan(7); // level 201+
  });

  it('cannot separate a full board by colour alone, which is why marks exist', () => {
    // Twelve categories do not survive two working cone types. At the top of
    // the curve the closest pair is under dE 1 — the same pixel, in effect.
    //
    // This is asserted rather than lamented so the failure mode is loud: if
    // someone finds a palette that beats it, this test fails and the marks
    // become a choice instead of a requirement. Until then they are neither
    // decoration nor an accessibility checkbox; they are how a colourblind
    // player tells two segments apart at all past level 501.
    expect(floorAt(12)).toBeLessThan(2);
  });

  it('keeps the look-alike glyphs off the board until late', () => {
    // The pairs a player could confuse at a glance: filled against outlined,
    // one against two, and rotations of each other. One of each in the first
    // six, so a partner never lands before seven colours.
    const lookAlikes = [
      ['dot', 'ring'],
      ['wave', 'waves'],
      ['plus', 'cross'],
      ['square', 'diamond'],
      ['triangle', 'star'],
      ['stripe', 'grid'],
    ];
    const early = new Set(apothecary.symbols.slice(0, 6));
    for (const [a, b] of lookAlikes) {
      expect(early.has(a as never) && early.has(b as never)).toBe(false);
    }
  });
});

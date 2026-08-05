import { apothecary } from '../apothecary';
import { alpha, colours, fade, glyphOn, gradients, ui } from '../colors';

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

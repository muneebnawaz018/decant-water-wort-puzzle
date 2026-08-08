import { DEFAULT_SKIN, isFreeSkin, SKINS, skinFor } from '../skins';

describe('the skin catalogue', () => {
  it('ships exactly two unlocked and two priced', () => {
    const free = SKINS.filter((skin) => skin.price === null);
    const paid = SKINS.filter((skin) => skin.price !== null);

    // Two free rather than one is the whole reason this is testable state and
    // not a constant: with a single default there is nothing to switch
    // between, so the shop's first act would be to sell a control the player
    // has never seen work.
    expect(free).toHaveLength(2);
    expect(paid).toHaveLength(2);
  });

  it('defaults to a free skin', () => {
    expect(isFreeSkin(DEFAULT_SKIN)).toBe(true);
  });

  it('gives every skin a distinct id', () => {
    expect(new Set(SKINS.map((skin) => skin.id)).size).toBe(SKINS.length);
  });

  /**
   * A stored id outlives the build that wrote it. Renaming a skin then means
   * every player holding the old id has an unknown one, and the board has to
   * draw *something* — falling back is what stops a rename from shipping a
   * screen with no glass on it.
   */
  it('falls back to the default for an id it does not know', () => {
    expect(skinFor('skin.gone').id).toBe(DEFAULT_SKIN);
    expect(skinFor('').id).toBe(DEFAULT_SKIN);
  });

  /**
   * The renderer clamps these, but a skin that needs clamping is a skin drawn
   * wrong. Fractions of the tube's own box, so nothing may exceed one.
   */
  it('keeps every vessel fraction inside its box', () => {
    for (const { id, vessel } of SKINS) {
      expect({ id, ...vessel }).toMatchObject({
        shoulder: expect.any(Number),
        base: expect.any(Number),
      });
      expect(vessel.shoulder).toBeGreaterThanOrEqual(0);
      expect(vessel.shoulder).toBeLessThanOrEqual(0.5);
      expect(vessel.base).toBeGreaterThanOrEqual(0);
      expect(vessel.base).toBeLessThanOrEqual(0.5);
      // A mouth narrower than a fifth of the body is a straw, and the top
      // segment stops being comparable to the ones under it.
      expect(vessel.mouth).toBeGreaterThanOrEqual(0.3);
      expect(vessel.mouth).toBeLessThanOrEqual(1);
      // A neck is measured against height and may not eat a whole segment.
      expect(vessel.neck).toBeGreaterThanOrEqual(0);
      expect(vessel.neck).toBeLessThan(0.25);
    }
  });

  it('gives a straight-walled vessel no neck', () => {
    // `mouth: 1` and a neck height together describe a shape with a step in
    // the wall and no taper — the funnel-taped-to-a-jar the renderer's shoulder
    // curve exists to avoid.
    const straight = SKINS.filter((skin) => skin.vessel.mouth === 1);
    expect(straight.map((skin) => skin.vessel.neck)).toEqual(straight.map(() => 0));
  });
});

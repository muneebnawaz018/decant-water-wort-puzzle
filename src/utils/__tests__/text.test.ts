import { plural } from '../text';

describe('plural', () => {
  it('keeps the singular at one', () => {
    expect(plural(1, 'move')).toBe('1 move');
  });

  it('pluralises everything else, zero included', () => {
    expect(plural(0, 'move')).toBe('0 moves');
    expect(plural(7, 'move')).toBe('7 moves');
  });

  it('takes an irregular plural', () => {
    expect(plural(2, 'vial', 'vials')).toBe('2 vials');
  });
});

import { clearEvents, recordedEvents, track } from '../log';

describe('the event log', () => {
  beforeEach(() => clearEvents());

  it('records an event with its props', () => {
    track('level_complete', { level: 7, stars: 3 });

    const events = recordedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe('level_complete');
    expect(events[0]!.props).toEqual({ level: 7, stars: 3 });
    expect(typeof events[0]!.at).toBe('number');
  });

  it('keeps events in the order they happened', () => {
    track('level_start', { level: 1 });
    track('hint_shown');
    track('level_complete', { level: 1 });

    expect(recordedEvents().map((e) => e.event)).toEqual([
      'level_start',
      'hint_shown',
      'level_complete',
    ]);
  });

  it('omits props entirely when there are none', () => {
    track('undo');
    expect(recordedEvents()[0]).not.toHaveProperty('props');
  });

  /**
   * The cap is what makes this safe to call from the pour handler. Without it
   * the record grows for as long as the app is installed, and every write
   * serialises the whole thing.
   */
  it('drops the oldest once it is full, and stays at the cap', () => {
    for (let i = 0; i < 250; i += 1) track('undo', { i });

    const events = recordedEvents();
    expect(events).toHaveLength(200);
    // The 50 oldest are gone and the newest survived.
    expect(events[0]!.props).toEqual({ i: 50 });
    expect(events[199]!.props).toEqual({ i: 249 });
  });

  it('hands back a copy, so a caller cannot edit the buffer', () => {
    track('undo');
    const taken = recordedEvents() as unknown as unknown[];
    taken.push({ at: 0, event: 'purchase' });

    expect(recordedEvents()).toHaveLength(1);
  });

  it('clears', () => {
    track('undo');
    clearEvents();
    expect(recordedEvents()).toEqual([]);
  });
});

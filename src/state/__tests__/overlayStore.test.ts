import { overlay, useOverlayStore } from '../overlayStore';

/**
 * The queued toasts, which exist because of *when* a level is settled.
 *
 * Coins land the instant the board solves — deliberately, so backing out of the
 * win animation cannot cost them — but that moment is the start of the winning
 * pour, a whole `POUR_MS` before the Complete screen exists. A milestone bonus
 * toasted there appeared over the board mid-pour and had faded before the
 * player arrived anywhere it made sense.
 */
describe('the completion toast queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Drain anything a previous test left waiting; the queue is module state.
    useOverlayStore.getState().flushToasts();
    jest.runAllTimers();
    useOverlayStore.getState().clearToast();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows nothing until it is flushed', () => {
    overlay.queueToast('Block 1 complete · +120 coins');

    expect(useOverlayStore.getState().toast).toBeNull();

    useOverlayStore.getState().flushToasts();
    expect(useOverlayStore.getState().toast).toBe('Block 1 complete · +120 coins');
  });

  /**
   * Level 50 completes block 5 *and* crosses a skin threshold, so two messages
   * arrive for one completion. Shown together the second replaces the first
   * before it can be read — a reward nobody sees is not a reward.
   */
  it('spaces two messages rather than letting the second replace the first', () => {
    overlay.queueToast('Block 5 complete · +90 coins');
    overlay.queueToast('Amber unlocked · equip it in the Shop');

    useOverlayStore.getState().flushToasts();
    expect(useOverlayStore.getState().toast).toBe('Block 5 complete · +90 coins');

    // Still the first a second later: the gap is longer than a toast is shown.
    jest.advanceTimersByTime(1000);
    expect(useOverlayStore.getState().toast).toBe('Block 5 complete · +90 coins');

    jest.runAllTimers();
    expect(useOverlayStore.getState().toast).toBe('Amber unlocked · equip it in the Shop');
  });

  /**
   * The Complete screen flushes on mount, and a screen can mount more than once
   * — a remount, a Fast Refresh, coming back from a full-screen advert. Draining
   * before showing is what stops a bonus being announced twice.
   */
  it('drains, so a second flush replays nothing', () => {
    overlay.queueToast('Block 2 complete · +105 coins');

    useOverlayStore.getState().flushToasts();
    jest.runAllTimers();
    useOverlayStore.getState().clearToast();

    useOverlayStore.getState().flushToasts();
    jest.runAllTimers();
    expect(useOverlayStore.getState().toast).toBeNull();
  });

  it('does nothing at all when the queue is empty', () => {
    const before = useOverlayStore.getState().toastId;

    useOverlayStore.getState().flushToasts();

    expect(useOverlayStore.getState().toast).toBeNull();
    expect(useOverlayStore.getState().toastId).toBe(before);
  });
});

import { useEffect } from 'react';
import {
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Derives a Skia prop from an animation clock, on the UI thread.
 *
 * Why not `useDerivedValue`? Skia 2.6.2 does not pick up its output. Skia
 * detects animated props by scanning for shared values and subscribing to
 * them; with Reanimated 4 the readonly mutable a derived value returns never
 * drives a redraw, so the prop silently freezes at whatever it held when the
 * node was recorded. Plain mutables written from a worklet do work.
 *
 * So: compute in a reaction, write into a normal shared value, hand that to
 * Skia. Everything still happens on the UI thread — React does not re-render
 * while an animation plays.
 *
 * Verified by probe: an opacity bound to a `useSharedValue` tracked its value,
 * while the same opacity bound to a `useDerivedValue` stayed frozen.
 */
export function useUiValue<T>(
  source: SharedValue<number>,
  compute: (input: number) => T,
  initial: T
): SharedValue<T> {
  const target = useSharedValue<T>(initial);

  useAnimatedReaction(
    () => source.value,
    (input) => {
      target.value = compute(input);
    },
    [compute]
  );

  // The reaction only fires on change, so seed the first frame from JS.
  useEffect(() => {
    target.value = compute(source.value);
  }, [target, compute, source]);

  return target;
}

/**
 * Two values from one reaction.
 *
 * Same trade as `useUiValue3`, one arity down. The meniscus needs a width and
 * an x, and each bubble a y and an opacity — as separate `useUiValue` calls
 * that was two subscriptions each, so twelve moving shapes cost twenty-four
 * per-frame reactions where twelve will do.
 */
export function useUiValue2(
  source: SharedValue<number>,
  compute: (input: number) => [number, number],
  initial: [number, number]
): [SharedValue<number>, SharedValue<number>] {
  const a = useSharedValue(initial[0]);
  const b = useSharedValue(initial[1]);

  useAnimatedReaction(
    () => source.value,
    (input) => {
      const [x, y] = compute(input);
      a.value = x;
      b.value = y;
    },
    [compute]
  );

  // The reaction only fires on change, so seed the first frame from JS.
  useEffect(() => {
    const [x, y] = compute(source.value);
    a.value = x;
    b.value = y;
  }, [a, b, compute, source]);

  return [a, b];
}

/**
 * Three values from one reaction.
 *
 * Each `useUiValue` subscribes to the clock separately, so an element needing
 * x, y and opacity paid three per-frame reactions. The backdrop's fourteen
 * motes made that forty-two. This computes all three together and writes each
 * into its own plain shared value — still what Skia needs, since it ignores
 * derived values and cannot read separate numeric props out of one struct.
 *
 * Fixed arity rather than a variadic version on purpose: a loop over a `keys`
 * array would call `useSharedValue` a variable number of times.
 */
export function useUiValue3(
  source: SharedValue<number>,
  compute: (input: number) => [number, number, number],
  initial: [number, number, number]
): [SharedValue<number>, SharedValue<number>, SharedValue<number>] {
  const a = useSharedValue(initial[0]);
  const b = useSharedValue(initial[1]);
  const c = useSharedValue(initial[2]);

  useAnimatedReaction(
    () => source.value,
    (input) => {
      const [x, y, z] = compute(input);
      a.value = x;
      b.value = y;
      c.value = z;
    },
    [compute]
  );

  // The reaction only fires on change, so seed the first frame from JS.
  useEffect(() => {
    const [x, y, z] = compute(source.value);
    a.value = x;
    b.value = y;
    c.value = z;
  }, [a, b, c, compute, source]);

  return [a, b, c];
}

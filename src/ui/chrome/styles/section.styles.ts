import { StyleSheet } from 'react-native';

import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

/**
 * The heading above a group of cards — "GAME", "SOUND & FEEL", "BY DIFFICULTY".
 *
 * One object rather than four. Settings, Shop and Stats each wrote this out
 * with the same values, which is exactly the drift `typography.ts` exists to
 * stop: the eyebrow preset was already 10/0.8 on one screen and 10/0.9 on
 * another before it was shared.
 *
 * It lives here rather than in `typography.ts` because it sets layout. The
 * presets in that file are text-only on purpose, so they can be spread into any
 * position without dragging spacing along.
 *
 * Close to what it labels. At 8 below, with 16 above, a heading sat halfway
 * between the card above it and the card below and belonged to neither — a
 * label has to be nearer its own group than the previous one.
 */
export const section = StyleSheet.create({
  title: { ...text.eyebrow, marginBottom: s(6), marginLeft: s(4) },
});

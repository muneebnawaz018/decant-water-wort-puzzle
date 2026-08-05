import { Skia } from '@shopify/react-native-skia';

import { LIQUID_SKSL } from './liquid';

/**
 * Compiled once, at module load. Kept apart from `liquid.ts` so the shader
 * source and its helpers stay importable in tests — pulling in Skia outside a
 * native runtime throws, since it needs JSI bindings that only exist on device.
 *
 * `Make` returns null if the shader fails to compile. That is a programming
 * error, not a runtime condition, but callers still check: a blank tube would
 * be unplayable, and failing soft beats failing invisible.
 */
export const liquidEffect = Skia.RuntimeEffect.Make(LIQUID_SKSL);

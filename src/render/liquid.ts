/**
 * The liquid surface, as a GPU fragment shader.
 *
 * Every pixel asks "am I below the surface?", where the surface is a traveling
 * wave rather than a straight line. That is the difference between liquid and a
 * rectangle: the boundary moves, bulges, and settles, and it costs the same as
 * filling a rect because the GPU does it per pixel in parallel.
 *
 * Two waves at different frequencies keep it from looking like a single tidy
 * sine, and both are pinned at the walls — liquid climbs the glass, it does not
 * slosh through it.
 */
export const LIQUID_SKSL = `
uniform vec2 origin;    // left edge, and the top of the drawn region
uniform vec2 size;      // width and height of the drawn region
uniform float surface;  // resting y of the liquid surface
uniform float amp;      // wave height, decays to zero as it settles
uniform float phase;    // traveling-wave phase
uniform vec4 fill;      // liquid color, straight alpha

half4 main(vec2 pos) {
  float u = clamp((pos.x - origin.x) / max(size.x, 1.0), 0.0, 1.0);

  // Pinned at both walls, free in the middle: surface tension, roughly.
  float envelope = sin(u * 3.14159265);

  float wave =
      sin(u * 6.2831853 * 1.5 + phase) * 0.65 +
      sin(u * 6.2831853 * 2.7 - phase * 1.4) * 0.35;

  float top = surface + wave * amp * envelope;

  // One pixel of feathering, so the boundary is smooth without looking blurred.
  float inside = smoothstep(top - 1.0, top + 1.0, pos.y);
  float alpha = fill.a * inside;

  return half4(fill.rgb * alpha, alpha);
}
`;

/** Straight-alpha RGBA in 0..1, the form the shader expects. */
export function rgba(hex: string, alpha = 1): number[] {
  const value = parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha,
  ];
}

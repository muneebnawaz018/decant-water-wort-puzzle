/**
 * `src/theme/colors.ts` is the only file allowed to hold a color literal.
 *
 * Everything else imports from it, and translucency comes from `alpha(name, n)`
 * so that moving a base color carries to every translucent use of it. This
 * rule is the enforcement: the convention had already been broken twice by the
 * time it was written — a hard-coded white colorblind glyph that vanished on
 * two of twelve liquids, and an `rgba()` star tint on the Complete screen.
 */
const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow color literals outside the palette module',
    },
    messages: {
      raw: 'Color literal "{{value}}". Import from @/theme/colors — use alpha(name, opacity) for translucency.',
    },
    schema: [],
  },
  create(context) {
    const check = (node, value) => {
      if (typeof value !== 'string' || !COLOR.test(value)) return;
      context.report({ node, messageId: 'raw', data: { value } });
    };

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

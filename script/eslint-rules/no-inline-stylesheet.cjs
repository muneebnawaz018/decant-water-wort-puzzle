/**
 * A component file shows; a style file styles.
 *
 * `StyleSheet.create` belongs in `styles/<Component>.styles.ts` beside the
 * component, never in the `.tsx` itself. Without a rule this drifts back one
 * "just this one small style" at a time, and the split stops being a rule you
 * can rely on when reading a component.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep StyleSheet.create in a sibling *.styles.ts file',
    },
    messages: {
      inline:
        'StyleSheet.create belongs in styles/{{name}}.styles.ts, not in the component.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const name = filename
      .split('/')
      .pop()
      .replace(/\.[jt]sx?$/, '');

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.object.name !== 'StyleSheet' ||
          callee.property.name !== 'create'
        ) {
          return;
        }
        context.report({ node, messageId: 'inline', data: { name } });
      },
    };
  },
};

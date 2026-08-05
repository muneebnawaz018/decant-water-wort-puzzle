module.exports = {
  config: {
    default: true,
    // Not every file starts with an H1 — the handoff spec opens with a table.
    MD041: false,
    MD013: { line_length: 80, tables: false, code_blocks: false },
    MD024: { siblings_only: true },
    // Prettier rewrites *emphasis* to _emphasis_ in markdown, so the linter
    // has to agree with it or the two fight over every file forever.
    MD049: { style: 'underscore' },
  },
  globs: ['**/*.md'],
  ignores: [
    'node_modules',
    'android',
    'ios',
    'dist',
    'coverage',
    '.expo',
    '.husky/_',
    'CHANGELOG.md',
  ],
};

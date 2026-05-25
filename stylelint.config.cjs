// stylelint.config.cjs
module.exports = {
  extends: 'stylelint-config-recommended',
  ignoreFiles: ['**/scripts/**', 'node_modules/**', 'dist/**', 'public/**'],
  rules: {
    'at-rule-no-unknown': [true, { ignoreAtRules: ['plugin', 'theme'] }],
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'no-duplicate-selectors': true,
    'block-no-empty': true,
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
    'no-descending-specificity': null,
    // 自訂規則
    'max-nesting-depth': 3,
  },
};

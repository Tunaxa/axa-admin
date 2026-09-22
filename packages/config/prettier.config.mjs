/**
 * Shared Prettier configuration.
 *
 * Packages that need to override a rule should import this and spread it rather
 * than restating the whole configuration.
 *
 * @type {import('prettier').Config}
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
};

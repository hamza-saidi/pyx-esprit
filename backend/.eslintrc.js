module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  globals: {
    fetch: 'readonly',
  },
  extends: ['eslint:recommended', 'plugin:node/recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'node/no-unsupported-features/es-syntax': 'off', // Useful for dynamic imports or modern JS features supported by latest Node
    'node/no-missing-require': 'off', // Often conflicts with path aliases
    'prettier/prettier': 'error',
  },
};

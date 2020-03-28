module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'linebreak-style': 0,
    'no-param-reassign': 0,
    'import/prefer-default-export': 0,
    'prefer-rest-params': 0,
    'func-names': 0,
  },
};

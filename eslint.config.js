'use strict'

const tsEslintPlugin = require('@typescript-eslint/eslint-plugin')
const tsEslintParser = require('@typescript-eslint/parser')

module.exports = [
  {
    ignores: ['out/**', 'dist/**', '**/*.d.ts', 'node_modules/**']
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsEslintParser,
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin
    },
    rules: {
      '@typescript-eslint/naming-convention': 'warn',
      '@typescript-eslint/semi': 'off',
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'off'
    }
  }
]

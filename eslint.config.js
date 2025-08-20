import globals from 'globals';
import react from 'eslint-plugin-react';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['signaling-server.js'],
    plugins: {
      react,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': 'warn',
    },
     settings: {
        react: {
            version: 'detect'
        }
    }
  },
  {
    files: ['signaling-server.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);

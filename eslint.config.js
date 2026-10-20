import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import vueAccessibility from 'eslint-plugin-vuejs-accessibility';
import tseslint from 'typescript-eslint';
import { semanticStyles, sharedComponents } from './scripts/eslint/frontendArchitecture.mjs';

const everywhere = (config) => {
  const { files, ...rest } = config;
  return files === undefined ? config : rest;
};

export default defineConfig(
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**', 'src/components/ui/**']),
  tseslint.configs.recommended.map(everywhere),
  vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } },
    rules: { 'vue/block-lang': ['error', { script: { lang: 'ts' } }] },
  },
  ...vueAccessibility.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vuejs-accessibility/form-control-has-label': 'off',
      'vuejs-accessibility/label-has-for': [
        'error',
        { required: { some: ['nesting', 'id'] }, allowChildren: true },
      ],
    },
  },
  {
    files: ['src/**/*.vue', 'src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/test/**', 'src/lib/documentPalette.ts', 'src/lib/signature/**'],
    plugins: { frontend: { rules: { 'shared-components': sharedComponents, 'semantic-styles': semanticStyles } } },
    rules: { 'frontend/shared-components': 'error', 'frontend/semantic-styles': 'error' },
  },
  prettier,
);

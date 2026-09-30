import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import vueAccessibility from 'eslint-plugin-vuejs-accessibility';
import { semanticStyles, sharedComponents } from './scripts/eslint/frontendArchitecture.mjs';

export default defineConfigWithVueTs(
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**', 'src/components/ui/**']),
  vue.configs['flat/essential'],
  ...vueAccessibility.configs['flat/recommended'],
  vueTsConfigs.recommended,
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

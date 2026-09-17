import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import vueAccessibility from 'eslint-plugin-vuejs-accessibility';

export default defineConfigWithVueTs(
  // shadcn-vue primitives are copied verbatim from the canonical monolith.
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
  prettier,
);

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TemplateTableInsertMenu from '@/components/domain/configuration/template-table/TemplateTableInsertMenu.vue';

const passthrough = { template: '<div><slot /></div>' };

const mountMenu = () => mount(TemplateTableInsertMenu, {
  props: { disabled: false },
  global: {
    stubs: {
      DropdownMenu: passthrough,
      DropdownMenuTrigger: passthrough,
      DropdownMenuContent: passthrough,
      DropdownMenuGroup: passthrough,
      DropdownMenuSeparator: { template: '<hr />' },
      DropdownMenuItem: { emits: ['select'], template: '<button type="button" class="item" @click="$emit(\'select\')"><slot /></button>' },
    },
  },
});

describe('TemplateTableInsertMenu', () => {
  it('solo ofrece tabla, lista y docente', () => {
    expect(mountMenu().findAll('.item').map((item) => item.text())).toEqual(['Tabla', 'Lista', 'Docente']);
  });
});
